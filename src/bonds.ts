import { Decimal } from 'decimal.js';
import { attempt, dec, positive, register, requireValue, solveRate, type Numeric, type Result } from './numeric.js';
import { dateParts, daysBetween, monthsBefore, type DayBasis } from './dates.js';
export interface BondValues { SDT: string; RDT: string; CPN: Numeric; RV: Numeric; YLD: Numeric; PRI: Numeric; basis: DayBasis; frequency: 1 | 2 }
export interface BondResult { PRI: string; YLD: string; AI: string }
function bondTerms(v: BondValues): { count: number; remaining: Decimal; elapsed: Decimal; coupon: Decimal } {
  dateParts(v.SDT); dateParts(v.RDT); requireValue(v.RDT > v.SDT, 'Redemption must follow settlement.', 6);
  requireValue(v.frequency === 1 || v.frequency === 2, 'Coupon frequency must be 1 or 2.', 4);
  positive(dec(v.RV), 'Redemption value'); requireValue(dec(v.CPN).gte(0), 'Coupon cannot be negative.', 4);
  let count = 0, next = v.RDT, previous = v.RDT;
  while (previous > v.SDT) { next = previous; count++; previous = monthsBefore(v.RDT, count * 12 / v.frequency); }
  const e = daysBetween(previous, next, v.basis, true), a = daysBetween(previous, v.SDT, v.basis, true), d = daysBetween(v.SDT, next, v.basis, true);
  return { count, remaining: dec(d).div(e), elapsed: dec(a).div(e), coupon: dec(v.CPN).div(v.frequency) };
}
function priceAt(v: BondValues, yieldPercent: Decimal): { price: Decimal; accrued: Decimal } {
  const t = bondTerms(v), r = yieldPercent.div(100).div(v.frequency), base = r.plus(1); positive(base, 'Yield base');
  const accrued = t.coupon.times(t.elapsed); let dirty: Decimal;
  if (t.count === 1) dirty = dec(v.RV).plus(t.coupon).div(dec(1).plus(r.times(t.remaining)));
  else {
    dirty = dec(v.RV).div(base.pow(t.remaining.plus(t.count - 1)));
    for (let k = 0; k < t.count; k++) dirty = dirty.plus(t.coupon.div(base.pow(t.remaining.plus(k))));
  }
  return { price: dirty.minus(accrued), accrued };
}
export function calculateBond(target: 'PRI' | 'YLD' | 'AI', v: BondValues): Result<BondResult> {
  return attempt(() => {
    requireValue(['PRI','YLD','AI'].includes(target), 'Invalid bond target.');
    if (target === 'AI') {
      const terms = bondTerms(v);
      return { PRI: register(v.PRI), YLD: register(v.YLD), AI: register(terms.coupon.times(terms.elapsed)) };
    }
    let yieldPercent = dec(v.YLD);
    if (target === 'YLD') { positive(dec(v.PRI), 'Price'); yieldPercent = solveRate(r => priceAt(v, r.times(v.frequency).times(100)).price.minus(v.PRI)).times(v.frequency).times(100); }
    const result = priceAt(v, yieldPercent);
    return { PRI: register(result.price), YLD: register(yieldPercent), AI: register(result.accrued) };
  });
}
