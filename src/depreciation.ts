import { Decimal } from 'decimal.js';
import { attempt, dec, integer, positive, quantize, register, requireValue, type Numeric, type Result } from './numeric.js';
import { dateParts, daysBetween, isoDate } from './dates.js';
export type DepreciationMethod = 'SL' | 'SYD' | 'DB' | 'DBX' | 'SLF' | 'DBF';
export interface DepreciationValues { method: DepreciationMethod; LIF: Numeric; M01: Numeric; CST: Numeric; SAL: Numeric; YR: Numeric; factor: Numeric; DT1: string }
export interface DepreciationResult { DEP: string; RBV: string; RDV: string }
export function calculateDepreciation(v: DepreciationValues, decimals = 2): Result<DepreciationResult> {
  return attempt(() => {
    requireValue(['SL','SYD','DB','DBX','SLF','DBF'].includes(v.method), 'Invalid depreciation method.');
    const life = dec(v.LIF), cost = dec(v.CST), salvage = dec(v.SAL), month = dec(v.M01);
    positive(life, 'Asset life'); requireValue(cost.gte(0) && salvage.gte(0) && salvage.lte(cost), 'Cost and salvage must be nonnegative, with salvage no greater than cost.');
    requireValue(month.gte(1) && month.lt(13), 'Starting month must be in [1,13).', 4);
    if (!['SL','SLF'].includes(v.method)) integer(v.LIF, 1, 9999, 'Life');
    const year = integer(v.YR, 1, 9999, 'Year'); integer(decimals, 0, 9, 'DEC');
    const basis = cost.minus(salvage);
    let fraction = dec(13).minus(month).div(12);
    if (v.method === 'SLF') { const [y] = dateParts(v.DT1); fraction = dec(daysBetween(v.DT1, isoDate(y, 12, 30), '360') + 1).div(360); }
    let rate = dec(v.factor).div(100).div(life); positive(dec(v.factor), 'Declining balance percentage');
    if (v.method === 'DBF') rate = dec(life.lt(3) ? 1 : life.lte(4) ? 1.5 : life.lte(6) ? 2 : 2.5).div(life);
    let book = cost, dep = dec(0), elapsed = dec(0);
    for (let y = 1; y <= year; y++) {
      const remaining = Decimal.max(0, book.minus(salvage)), duration = y === 1 ? fraction : dec(1);
      if (remaining.isZero()) { dep = dec(0); continue; }
      const usable = Decimal.min(duration, Decimal.max(0, life.minus(elapsed)));
      switch (v.method) {
        case 'SL': case 'SLF': dep = basis.div(life).times(usable); break;
        case 'SYD': {
          // Integrate the annual SYD weights across the partial calendar year.
          const sum = life.times(life.plus(1)).div(2); let t = elapsed, left = usable; dep = dec(0);
          while (left.gt(0)) { const length = Decimal.min(left, t.floor().plus(1).minus(t)); dep = dep.plus(basis.times(life.minus(t.floor())).div(sum).times(length)); t = t.plus(length); left = left.minus(length); }
          break;
        }
        case 'DB': case 'DBX': case 'DBF': {
          dep = book.times(rate).times(duration);
          if (v.method !== 'DB' && life.gt(elapsed)) dep = Decimal.max(dep, remaining.div(life.minus(elapsed)).times(usable));
          break;
        }
      }
      if (elapsed.plus(duration).gte(life)) dep = remaining;
      dep = Decimal.min(remaining, Decimal.max(0, quantize(dep,decimals)));
      book = quantize(book.minus(dep),decimals); elapsed = elapsed.plus(duration);
    }
    return { DEP: register(dep), RBV: register(book), RDV: register(book.minus(salvage)) };
  });
}
