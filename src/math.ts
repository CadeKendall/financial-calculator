import { Decimal } from 'decimal.js';
import { dec, div, integer, power, register, requireValue, type FormatSettings } from './numeric.js';
export type BinaryOperator = 'ADD' | 'SUBTRACT' | 'MULTIPLY' | 'DIVIDE' | 'POWER' | 'NPR' | 'NCR';
export interface Frame { values: string[]; operators: BinaryOperator[] }
export const frame = (): Frame => ({ values: [], operators: [] });
export const OPERATORS: readonly BinaryOperator[] = ['ADD','SUBTRACT','MULTIPLY','DIVIDE','POWER','NPR','NCR'];
export function binary(operator: BinaryOperator, left: string, right: string): string {
  const a = dec(left), b = dec(right); let result: Decimal;
  switch (operator) {
    case 'ADD': result = a.plus(b); break;
    case 'SUBTRACT': result = a.minus(b); break;
    case 'MULTIPLY': result = a.times(b); break;
    case 'DIVIDE': result = div(a, b); break;
    case 'POWER': result = power(a, b); break;
    case 'NPR': case 'NCR': {
      const n = integer(left, 0, 9999999999, 'n'), r = integer(right, 0, n, 'r');
      const count = operator === 'NCR' ? Math.min(r, n - r) : r;
      requireValue(count <= 10000, 'Combinatorial calculation exceeds the work limit.', 7);
      result = dec(1); for (let k = 1; k <= count; k++) { result = result.times(n - k + 1); if (operator === 'NCR') result = result.div(k); }
      break;
    }
  }
  return register(result);
}
export function precedence(operator: BinaryOperator, method: FormatSettings['calculation']): number {
  if (method === 'CHAIN') return 1;
  return operator === 'POWER' || operator === 'NPR' || operator === 'NCR' ? 3 : operator === 'MULTIPLY' || operator === 'DIVIDE' ? 2 : 1;
}
export function reduceFrame(f: Frame): void {
  const op = f.operators.pop(), b = f.values.pop(), a = f.values.pop();
  requireValue(!!op && a !== undefined && b !== undefined, 'Incomplete expression.');
  f.values.push(binary(op, a, b));
}
export function unary(operation: string, value: string, settings: FormatSettings, inverse = false, hyperbolic = false): string {
  const x = dec(value), pi = dec(-1).acos(); let r: Decimal;
  switch (operation) {
    case 'SQRT': requireValue(x.gte(0), 'Square root requires a nonnegative number.'); r = x.sqrt(); break;
    case 'SQUARE': r = x.pow(2); break;
    case 'RECIPROCAL': r = div(dec(1), x); break;
    case 'LN': requireValue(x.gt(0), 'Logarithm requires a positive number.'); r = x.ln(); break;
    case 'EXP': r = x.exp(); break;
    case 'FACTORIAL': { requireValue(x.isInteger() && x.gte(0) && x.lte(69), 'Factorial requires an integer from 0 to 69.'); const n = x.toNumber(); r = dec(1); for (let k = 2; k <= n; k++) r = r.times(k); break; }
    case 'SIN': case 'COS': case 'TAN': {
      if (!inverse && !hyperbolic && settings.angle === 'DEG' && x.mod(90).isZero()) {
        const quadrant = x.div(90).mod(4).plus(4).mod(4).toNumber();
        requireValue(operation !== 'TAN' || quadrant % 2 === 0, 'Tangent is undefined at this angle.');
        r = dec(operation === 'SIN' ? [0,1,0,-1][quadrant]! : operation === 'COS' ? [1,0,-1,0][quadrant]! : 0); break;
      }
      const angle = !inverse && !hyperbolic && settings.angle === 'DEG' ? x.times(pi).div(180) : x;
      if (hyperbolic) {
        if (inverse) { requireValue(operation !== 'COS' || x.gte(1), 'acosh requires x >= 1.'); requireValue(operation !== 'TAN' || x.abs().lt(1), 'atanh requires |x| < 1.'); r = operation === 'SIN' ? x.asinh() : operation === 'COS' ? x.acosh() : x.atanh(); }
        else r = operation === 'SIN' ? x.sinh() : operation === 'COS' ? x.cosh() : x.tanh();
      } else if (inverse) {
        requireValue(operation === 'TAN' || x.abs().lte(1), 'Inverse sine/cosine requires |x| <= 1.');
        r = operation === 'SIN' ? x.asin() : operation === 'COS' ? x.acos() : x.atan();
        if (settings.angle === 'DEG') r = r.times(180).div(pi);
      } else {
        requireValue(operation !== 'TAN' || angle.cos().abs().gt('1e-30'), 'Tangent is undefined at this angle.');
        r = operation === 'SIN' ? angle.sin() : operation === 'COS' ? angle.cos() : angle.tan();
      }
      break;
    }
    default: throw new Error('Unknown unary operation.');
  }
  return register(r);
}
