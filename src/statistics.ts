import { Decimal } from 'decimal.js';
import { attempt, dec, div, positive, register, requireValue, unwrap, type Numeric, type Result } from './numeric.js';
export type Regression = 'LIN' | 'Ln' | 'EXP' | 'PWR' | '1-V';
export interface DataPoint { x: Numeric; y: Numeric }
export interface StatisticsResult { n: string; meanX: string; Sx: string | null; sigmaX: string; sumX: string; sumX2: string; meanY?: string; Sy?: string | null; sigmaY?: string; sumY?: string; sumY2?: string; sumXY?: string; a?: string | null; b?: string | null; r?: string | null }
export function calculateStatistics(points: readonly DataPoint[], model: Regression = 'LIN'): Result<StatisticsResult> {
  return attempt(() => {
    requireValue(points.length > 0 && points.length <= 50, 'Enter between 1 and 50 data points.', 4);
    requireValue(['LIN','Ln','EXP','PWR','1-V'].includes(model), 'Invalid regression model.');
    const rows = points.map(p => ({ x: dec(p.x), y: dec(p.y), w: model === '1-V' ? dec(p.y) : dec(1) }));
    rows.forEach(p => requireValue(p.w.gt(0), 'Data frequency must be positive.', 4));
    const sum = (fn: (p: typeof rows[number]) => Decimal): Decimal => rows.reduce((a, p) => a.plus(fn(p).times(p.w)), dec(0));
    const n = sum(() => dec(1)), sx = sum(p => p.x), sy = sum(p => p.y), sx2 = sum(p => p.x.pow(2)), sy2 = sum(p => p.y.pow(2)), sxy = sum(p => p.x.times(p.y));
    const mx = sx.div(n), my = sy.div(n), vx = sum(p => p.x.minus(mx).pow(2)), vy = sum(p => p.y.minus(my).pow(2));
    const out: StatisticsResult = { n: register(n), meanX: register(mx), Sx: n.gt(1) ? register(vx.div(n.minus(1)).sqrt()) : null, sigmaX: register(vx.div(n).sqrt()), sumX: register(sx), sumX2: register(sx2) };
    if (model === '1-V') return out;
    Object.assign(out, { meanY: register(my), Sy: n.gt(1) ? register(vy.div(n.minus(1)).sqrt()) : null, sigmaY: register(vy.div(n).sqrt()), sumY: register(sy), sumY2: register(sy2), sumXY: register(sxy) });
    const transform = rows.map(p => {
      if (model === 'Ln' || model === 'PWR') positive(p.x, 'X for logarithmic regression');
      if (model === 'EXP' || model === 'PWR') positive(p.y, 'Y for logarithmic regression');
      return { x: model === 'Ln' || model === 'PWR' ? p.x.ln() : p.x, y: model === 'EXP' || model === 'PWR' ? p.y.ln() : p.y };
    });
    const tx = transform.reduce((s, p) => s.plus(p.x), dec(0)).div(n), ty = transform.reduce((s, p) => s.plus(p.y), dec(0)).div(n);
    const xx = transform.reduce((s, p) => s.plus(p.x.minus(tx).pow(2)), dec(0)), yy = transform.reduce((s, p) => s.plus(p.y.minus(ty).pow(2)), dec(0)), xy = transform.reduce((s, p) => s.plus(p.x.minus(tx).times(p.y.minus(ty))), dec(0));
    if (xx.isZero()) { Object.assign(out,{a:null,b:null,r:null}); return out; }
    const b = div(xy, xx), intercept = ty.minus(b.times(tx)), a = model === 'EXP' || model === 'PWR' ? intercept.exp() : intercept;
    Object.assign(out, { a: register(a), b: register(b), r: yy.isZero() ? null : register(xy.div(xx.times(yy).sqrt())) }); return out;
  });
}
export function predictStatistics(target: 'X' | 'Y', value: Numeric, points: readonly DataPoint[], model: Regression): Result<string> {
  return attempt(() => {
    const result = unwrap(calculateStatistics(points, model));
    requireValue(target === 'X' || target === 'Y', 'Invalid prediction target.');
    requireValue(model !== '1-V', 'Regression predictions require a two-variable model.');
    requireValue(result.a !== null && result.b !== null, 'Regression requires variation in X.', 1);
    const a = dec(result.a!), b = dec(result.b!), v = dec(value); let answer: Decimal;
    if (target === 'Y') {
      if (model === 'LIN') answer = a.plus(b.times(v));
      else if (model === 'Ln') { positive(v, 'X'); answer = a.plus(b.times(v.ln())); }
      else if (model === 'EXP') answer = a.times(b.times(v).exp());
      else { positive(v, 'X'); answer = a.times(v.pow(b)); }
    } else {
      if (model === 'LIN') answer = div(v.minus(a), b);
      else if (model === 'Ln') answer = div(v.minus(a), b).exp();
      else { const ratio = div(v, a); positive(ratio, 'Y/a'); answer = model === 'EXP' ? div(ratio.ln(), b) : ratio.pow(div(dec(1), b)); }
    }
    return register(answer);
  });
}
