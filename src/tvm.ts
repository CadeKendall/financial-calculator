import { Decimal } from 'decimal.js';
import { attempt, dec, div, integer, positive, quantize, register, requireValue, solveRate, type Numeric, type Result } from './numeric.js';

export interface TVMValues { N: Numeric; IY: Numeric; PV: Numeric; PMT: Numeric; FV: Numeric; PY: Numeric; CY: Numeric; timing: 'END' | 'BGN' }
export type TVMTarget = 'N' | 'IY' | 'PV' | 'PMT' | 'FV';
export function periodicRate(iy: Numeric, py: Numeric, cy: Numeric): Decimal {
  const p = dec(py), c = dec(cy); positive(p, 'P/Y'); positive(c, 'C/Y');
  const base = dec(1).plus(dec(iy).div(100).div(c)); positive(base, 'Compounding base');
  return base.pow(c.div(p)).minus(1);
}
function annuity(rate: Decimal, n: Decimal): Decimal { return rate.isZero() ? n : rate.plus(1).pow(n).minus(1).div(rate); }
export function calculateTVM(target: TVMTarget, input: TVMValues): Result<string> {
  return attempt(() => {
    requireValue(['N','IY','PV','PMT','FV'].includes(target), 'Invalid TVM target.');
    const n = dec(input.N), pv = dec(input.PV), pmt = dec(input.PMT), fv = dec(input.FV);
    positive(dec(input.PY), 'P/Y'); positive(dec(input.CY), 'C/Y');
    requireValue(input.timing === 'END' || input.timing === 'BGN', 'Invalid payment timing.');
    if (target !== 'N') requireValue(n.gt(0), 'N must be positive.', 4);
    if (target === 'IY') {
      const cash = [pv, pmt, fv].filter(x => !x.isZero());
      requireValue(cash.some(x => x.gt(0)) && cash.some(x => x.lt(0)), 'Cash flows must have opposite signs.', 5);
      const residual = (i: Decimal): Decimal => {
        const q = i.plus(1), adjust = input.timing === 'BGN' ? q : dec(1);
        // Discount for positive rates and compound for negative rates to avoid overflow/cancellation.
        if (i.gte(0)) {
          const discount = q.pow(n.neg());
          const a = i.isZero() ? n : dec(1).minus(discount).div(i);
          return pv.plus(pmt.times(adjust).times(a)).plus(fv.times(discount));
        }
        return pv.times(q.pow(n)).plus(pmt.times(adjust).times(annuity(i, n))).plus(fv);
      };
      const i = pmt.isZero() ? div(fv.neg(), pv).pow(div(dec(1), n)).minus(1) : solveRate(residual);
      requireValue(i.gt(-1), 'No valid periodic rate.', 5);
      return register(i.plus(1).pow(dec(input.PY).div(input.CY)).minus(1).times(input.CY).times(100));
    }
    const i = periodicRate(input.IY, input.PY, input.CY), q = i.plus(1), b = input.timing === 'BGN' ? q : dec(1), growth = q.pow(n), a = annuity(i, n).times(b);
    switch (target) {
      case 'PV': return register(div(fv.plus(pmt.times(a)).neg(), growth));
      case 'FV': return register(pv.times(growth).plus(pmt.times(a)).neg());
      case 'PMT': return register(div(fv.plus(pv.times(growth)).neg(), a));
      case 'N': {
        let result: Decimal;
        if (i.isZero()) result = div(pv.plus(fv).neg(), pmt);
        else { const k = pmt.times(b).div(i); const ratio = div(k.minus(fv), pv.plus(k)); positive(ratio, 'Logarithm argument'); result = ratio.ln().div(q.ln()); }
        requireValue(result.gt(0), 'No positive number of periods.', 5); return register(result);
      }
    }
  });
}
export interface AmortizationResult { BAL: string; PRN: string; INT: string }
export function calculateAmortization(input: TVMValues, first: Numeric, last: Numeric, decimals = 2): Result<AmortizationResult> {
  return attempt(() => {
    requireValue(input.timing === 'END' || input.timing === 'BGN', 'Invalid payment timing.');
    const p1 = integer(first, 1, 9999, 'P1'), p2 = integer(last, 1, 9999, 'P2');
    requireValue(p2 >= p1, 'P2 must be at least P1.'); integer(decimals, 0, 9, 'DEC');
    let balance = quantize(dec(input.PV),decimals), principal = dec(0), interest = dec(0);
    const payment = quantize(dec(input.PMT),decimals), i = periodicRate(input.IY, input.PY, input.CY);
    for (let period = 1; period <= p2; period++) {
      const charge = input.timing === 'BGN' && period === 1 ? dec(0) : quantize(balance.times(i).toDecimalPlaces(12),decimals);
      const reduction = payment.plus(charge);
      balance = quantize(balance.plus(reduction),decimals);
      if (period >= p1) { principal = principal.plus(reduction); interest = interest.minus(charge); }
    }
    return { BAL: register(balance), PRN: register(principal), INT: register(interest) };
  });
}
