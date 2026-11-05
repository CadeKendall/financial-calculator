import { Decimal } from 'decimal.js';

/** Private decimal constructor: never changes the host application's Decimal settings. */
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -100, toExpPos: 100 });
export type Numeric = string | number;
export type ErrorCode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export interface CalculationError { code: ErrorCode; kind: string; message: string }
export type Result<T> = { ok: true; value: T } | { ok: false; error: CalculationError };
export class Fault extends Error {
  constructor(public code: ErrorCode, public kind: string, message: string) { super(message); }
}
export function fail(code: ErrorCode, kind: string, message: string): never { throw new Fault(code, kind, message); }
export function requireValue(condition: boolean, message: string, code: ErrorCode = 2): asserts condition {
  if (!condition) fail(code, 'invalid-input', message);
}
export function dec(value: Numeric | Decimal): Decimal {
  try { const x = new D(value); if (!x.isFinite()) fail(2, 'invalid-number', 'A finite number is required.'); return x; }
  catch (e) { if (e instanceof Fault) throw e; return fail(2, 'invalid-number', 'A finite decimal number is required.'); }
}
export function register(value: Numeric | Decimal): string {
  if (Decimal.isDecimal(value) && !value.isFinite() && !value.isNaN()) fail(1, 'overflow', 'Result exceeds the calculator range.');
  const n = dec(value).toSignificantDigits(13);
  if (n.abs().gte('1e100')) fail(1, 'overflow', 'Result exceeds the calculator range.');
  return n.isZero() || n.abs().lt('1e-99') ? '0' : n.toString();
}
export function attempt<T>(fn: () => T): Result<T> {
  try { return { ok: true, value: fn() }; }
  catch (e) {
    if (e instanceof Fault) return { ok: false, error: { code: e.code, kind: e.kind, message: e.message } };
    return { ok: false, error: { code: 2, kind: 'invalid-calculation', message: e instanceof Error ? e.message : 'Calculation failed.' } };
  }
}
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) fail(result.error.code, result.error.kind, result.error.message);
  return result.value;
}
export function div(a: Decimal, b: Decimal): Decimal { if (b.isZero()) fail(1, 'division-by-zero', 'Cannot divide by zero.'); return a.div(b); }
export function positive(x: Decimal, label: string): void { requireValue(x.gt(0), `${label} must be greater than zero.`, 4); }
export function integer(x: Numeric, min: number, max: number, label: string): number {
  const n = dec(x); requireValue(n.isInteger() && n.gte(min) && n.lte(max), `${label} must be an integer from ${min} to ${max}.`, 4); return n.toNumber();
}
export function power(a: Decimal, b: Decimal): Decimal {
  if (a.isNegative() && !b.isInteger()) {
    const reciprocal = div(dec(1), b).toSignificantDigits(13);
    requireValue(reciprocal.isInteger() && reciprocal.abs().mod(2).eq(1), 'Negative bases require an integer power or reciprocal of an odd integer.');
    return a.abs().pow(b).neg();
  }
  if (a.isZero() && b.lte(0)) fail(2, 'invalid-power', 'Zero cannot be raised to this power.');
  return a.pow(b);
}
export interface FormatSettings { decimals: number; angle: 'DEG' | 'RAD'; date: 'US' | 'EUR'; separators: 'US' | 'EUR'; calculation: 'CHAIN' | 'AOS' }
export function formatNumber(value: Numeric, settings: Pick<FormatSettings, 'decimals' | 'separators'>): string {
  const n = dec(value); let text: string;
  const shown = n.toSignificantDigits(10);
  if (!n.isZero() && (shown.abs().gte('1e10') || shown.abs().lt('1e-9'))) text = shown.toExponential(9).replace(/(\.\d*?)0+e/, '$1e').replace('.e', 'e').replace('e+', 'e');
  else if (settings.decimals === 9) text = shown.toFixed(Math.max(0, 9 - shown.e)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  else text = n.toFixed(Math.min(settings.decimals, Math.max(0, 9 - Math.max(0, shown.e))));
  if (!text.includes('e')) {
    const [whole, fraction] = text.split('.');
    const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, settings.separators === 'EUR' ? '.' : ',');
    text = grouped + (fraction === undefined ? '' : (settings.separators === 'EUR' ? ',' : '.') + fraction);
  } else if (settings.separators === 'EUR') text = text.replace('.', ',');
  return text;
}
export function roundDisplay(value: Numeric, settings: FormatSettings): string {
  return register(formatNumber(value, { ...settings, separators: 'US' }).replaceAll(',', ''));
}

/** Financial worksheet rounding follows DEC; DEC=9 selects ten significant digits. */
export function quantize(value: Decimal, decimals: number): Decimal {
  return decimals === 9 ? value.toSignificantDigits(10) : value.toDecimalPlaces(decimals);
}

/** Safeguarded bisection, stopping on interval width, never solely on rounded output. */
export function bisect(fn: (x: Decimal) => Decimal, lo: Decimal, hi: Decimal): Decimal {
  let fl = fn(lo), fh = fn(hi);
  if (fl.isZero()) return lo; if (fh.isZero()) return hi;
  requireValue(fl.isFinite() && fh.isFinite() && fl.isPositive() !== fh.isPositive(), 'No bracketed solution.', 5);
  for (let i = 0; i < 1024; i++) {
    const mid = lo.plus(hi).div(2), fm = fn(mid);
    if (!fm.isFinite()) fail(7, 'non-convergence', 'The solver encountered an unstable evaluation.');
    if (fm.isZero() || hi.minus(lo).abs().lte(mid.abs().plus(1).times('1e-27'))) return mid;
    if (fm.isPositive() === fl.isPositive()) { lo = mid; fl = fm; } else { hi = mid; fh = fm; }
  }
  return fail(7, 'iteration-limit', 'The solver reached its iteration limit.');
}

/** Rate coordinate t=ln(1+i), avoiding the singularity i=-1. */
export function solveRate(fn: (rate: Decimal) => Decimal): Decimal {
  const candidates: Decimal[] = [];
  let prevT = dec(-40), prev = fn(prevT.exp().minus(1));
  for (let k = 1; k <= 320; k++) {
    const t = dec(-40).plus(dec(k).div(4)), value = fn(t.exp().minus(1));
    if (value.isZero()) candidates.push(t.exp().minus(1));
    else if (value.isFinite() && prev.isFinite() && !prev.isZero() && value.isPositive() !== prev.isPositive()) {
      candidates.push(bisect(x => fn(x.exp().minus(1)), prevT, t).exp().minus(1));
    }
    prev = value; prevT = t;
  }
  if (!candidates.length) fail(7, 'unresolved-rate', 'No solution was isolated within the bounded rate search.');
  return candidates.sort((a, b) => a.abs().cmp(b.abs()))[0]!;
}
