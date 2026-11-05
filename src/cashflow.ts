import { Decimal } from 'decimal.js';
import { attempt, bisect, dec, fail, integer, register, requireValue, solveRate, type Numeric, type Result } from './numeric.js';
export interface CashFlow { amount: Numeric; frequency: number }
export function validateCashFlows(initial: Numeric, flows: readonly CashFlow[]): void {
  dec(initial); requireValue(flows.length <= 24, 'At most 24 cash-flow groups are supported.', 4);
  for (const flow of flows) { dec(flow.amount); integer(flow.frequency, 1, 9999, 'Frequency'); }
}
export function npvRaw(initial: Numeric, flows: readonly CashFlow[], rate: Decimal): Decimal {
  const q = rate.plus(1); requireValue(q.gt(0), 'Discount rate must exceed -100%.', 5);
  let total = dec(initial), time = 0;
  for (const flow of flows) {
    const f = flow.frequency;
    const sum = rate.isZero() ? dec(f) : dec(1).minus(q.pow(-f)).div(rate);
    total = total.plus(dec(flow.amount).times(q.pow(-time)).times(sum)); time += f;
  }
  return total;
}
export function calculateNPV(initial: Numeric, flows: readonly CashFlow[], interestPercent: Numeric): Result<string> {
  return attempt(() => { validateCashFlows(initial, flows); return register(npvRaw(initial, flows, dec(interestPercent).div(100))); });
}

/** Isolate all positive roots using derivative roots to split monotone intervals.
 * This also finds even-multiplicity roots that sign-change scans miss.
 * Bounded degree/work budgets return Error 7 rather than inventing a root.
 */
function positivePolynomialRoots(coefficients: Decimal[], budget: { left: number }): Decimal[] {
  const c = [...coefficients]; while (c.length > 1 && c.at(-1)!.isZero()) c.pop();
  while (c.length > 1 && c[0]!.isZero()) c.shift();
  if (c.length <= 1) return [];
  if (c.length === 2) { const root = c[0]!.neg().div(c[1]!); return root.gt(0) ? [root] : []; }
  const lead = c.at(-1)!.abs(), bound = c.slice(0, -1).reduce((m, v) => Decimal.max(m, v.abs().div(lead)), dec(0)).plus(1);
  const derivative = c.slice(1).map((v, i) => v.times(i + 1));
  const critical = positivePolynomialRoots(derivative, budget).filter(x => x.lt(bound));
  const fn = (x: Decimal): Decimal => {
    if (--budget.left < 0) fail(7, 'solver-budget', 'Root isolation exceeded its work budget.');
    return c.reduceRight((a, v) => a.times(x).plus(v), dec(0));
  };
  const nearZero = (x: Decimal, y: Decimal): boolean => {
    const scale = c.reduceRight((a, v) => a.times(x.abs()).plus(v.abs()), dec(0));
    return y.abs().lte(scale.times('1e-24'));
  };
  const cuts = [dec(0), ...critical, bound], roots: Decimal[] = [];
  for (const x of critical) if (nearZero(x, fn(x))) roots.push(x);
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i]!, b = cuts[i + 1]!, fa = fn(a), fb = fn(b);
    if ((a.gt(0) && nearZero(a, fa)) || nearZero(b, fb)) continue;
    if (fa.isPositive() !== fb.isPositive()) roots.push(bisect(fn, a, b));
  }
  return roots.sort((a, b) => a.cmp(b));
}
export interface IRRResult { rate: string; roots: string[] }
export function calculateIRR(initial: Numeric, flows: readonly CashFlow[]): Result<IRRResult> {
  return attempt(() => {
    validateCashFlows(initial, flows);
    const values = [dec(initial), ...flows.map(f => dec(f.amount))].filter(v => !v.isZero());
    let changes = 0; for (let i = 1; i < values.length; i++) if (values[i]!.isPositive() !== values[i - 1]!.isPositive()) changes++;
    requireValue(changes > 0, 'IRR requires at least one cash-flow sign change.', 5);
    let rates: Decimal[];
    if (changes === 1) {
      // Grouped evaluation avoids expanding long, single-sign-change schedules.
      rates = [solveRate(r => npvRaw(initial, flows, r))];
    } else {
      const periods = flows.reduce((n, f) => n + f.frequency, 0);
      if (periods > 128) fail(7, 'solver-degree-limit', 'Multiple-sign-change schedules above 128 periods exceed the bounded root-isolation limit.');
      const coefficients = [dec(initial)]; for (const f of flows) for (let i = 0; i < f.frequency; i++) coefficients.push(dec(f.amount));
      rates = positivePolynomialRoots(coefficients, { left: 100000 }).map(q => dec(1).div(q).minus(1));
      requireValue(rates.length > 0, 'No real IRR above -100% exists.', 5);
    }
    rates.sort((a, b) => a.abs().cmp(b.abs()) || a.cmp(b));
    return { rate: register(rates[0]!.times(100)), roots: [...new Set(rates.map(r => register(r.times(100))))] };
  });
}
