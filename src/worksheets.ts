import { attempt, dec, div, positive, register, requireValue, type Numeric, type Result } from './numeric.js';

export function calculateInterestConversion(target: 'NOM' | 'EFF', values: { NOM: Numeric; EFF: Numeric; CY: Numeric }): Result<string> {
  return attempt(() => {
    requireValue(['NOM','EFF'].includes(target), 'Invalid interest conversion target.');
    const cy = dec(values.CY); positive(cy, 'C/Y');
    if (target === 'EFF') { const base = dec(1).plus(dec(values.NOM).div(100).div(cy)); positive(base, 'Compounding base'); return register(base.pow(cy).minus(1).times(100)); }
    const base = dec(1).plus(dec(values.EFF).div(100)); positive(base, 'Effective rate base');
    return register(base.pow(dec(1).div(cy)).minus(1).times(cy).times(100));
  });
}
export interface PercentValues { OLD: Numeric; NEW: Numeric; CHANGE: Numeric; PERIODS: Numeric }
export function calculatePercentChange(target: keyof PercentValues, v: PercentValues): Result<string> {
  return attempt(() => {
    requireValue(['OLD','NEW','CHANGE','PERIODS'].includes(target), 'Invalid percent change target.');
    const old = dec(v.OLD), next = dec(v.NEW), p = dec(v.PERIODS), base = dec(v.CHANGE).div(100).plus(1);
    if (target === 'NEW') { positive(base, 'Growth base'); return register(old.times(base.pow(p))); }
    if (target === 'OLD') { positive(base, 'Growth base'); return register(div(next, base.pow(p))); }
    const ratio = div(next, old); positive(ratio, 'Value ratio');
    if (target === 'CHANGE') { positive(p, 'Number of periods'); return register(ratio.pow(dec(1).div(p)).minus(1).times(100)); }
    positive(base, 'Growth base'); return register(div(ratio.ln(), base.ln()));
  });
}
export interface ProfitValues { CST: Numeric; SEL: Numeric; MAR: Numeric }
export function calculateProfit(target: keyof ProfitValues, v: ProfitValues): Result<string> {
  return attempt(() => {
    requireValue(['CST','SEL','MAR'].includes(target), 'Invalid profit target.');
    const cost = dec(v.CST), sell = dec(v.SEL), margin = dec(v.MAR).div(100);
    if (target === 'CST') return register(sell.times(dec(1).minus(margin)));
    if (target === 'SEL') return register(div(cost, dec(1).minus(margin)));
    return register(div(sell.minus(cost), sell).times(100));
  });
}
export interface BreakevenValues { FC: Numeric; VC: Numeric; P: Numeric; PFT: Numeric; Q: Numeric }
export function calculateBreakeven(target: keyof BreakevenValues, v: BreakevenValues): Result<string> {
  return attempt(() => {
    requireValue(['FC','VC','P','PFT','Q'].includes(target), 'Invalid breakeven target.');
    const f = dec(v.FC), c = dec(v.VC), p = dec(v.P), profit = dec(v.PFT), q = dec(v.Q);
    switch (target) {
      case 'FC': return register(p.minus(c).times(q).minus(profit));
      case 'VC': return register(p.minus(div(f.plus(profit), q)));
      case 'P': return register(c.plus(div(f.plus(profit), q)));
      case 'PFT': return register(p.minus(c).times(q).minus(f));
      case 'Q': return register(div(f.plus(profit), p.minus(c)));
    }
  });
}
