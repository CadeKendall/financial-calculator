import { describe,it,expect } from 'vitest';
import { calculateTVM,calculateAmortization,calculateNPV,calculateIRR,calculateBond,calculateDate,calculateDepreciation,calculateStatistics,predictStatistics,calculateBreakeven,calculateProfit,calculatePercentChange,calculateInterestConversion, type Result, type TVMValues } from '../src/index.js';
function value<T>(r: Result<T>): T { if (!r.ok) throw new Error(JSON.stringify(r.error)); return r.value; }
const tvm: TVMValues = {N:10,IY:5,PV:-100,PMT:0,FV:0,PY:1,CY:1,timing:'END'};
const close = (actual: string, expected: number, places=8) => expect(Number(actual)).toBeCloseTo(expected,places);
describe('TVM independent identities and TI examples',()=>{
  it('compounds and handles the zero-rate limit in all targets',()=>{
    close(value(calculateTVM('FV',tvm)),162.8894626777);
    close(value(calculateTVM('FV',{...tvm,IY:0})),100);
    close(value(calculateTVM('PV',{...tvm,IY:0,FV:100})), -100);
    close(value(calculateTVM('PMT',{...tvm,IY:0,FV:0})),10);
    close(value(calculateTVM('N',{...tvm,IY:0,PMT:10})),10);
  });
  it('returns nominal annual interest, including differing frequencies',()=>{
    close(value(calculateTVM('IY',{...tvm,N:1,FV:101,PY:12,CY:12})),12);
    close(value(calculateTVM('IY',{...tvm,N:12,FV:110,PY:12,CY:12})),9.5689685147);
    const original = {...tvm,N:24,IY:6,PY:12,CY:2,PMT:4,FV:0};
    const fv = value(calculateTVM('FV',original)); close(value(calculateTVM('IY',{...original,FV:fv})),6,7);
  });
  it('reproduces TI mortgage and savings examples (guide pp26–28)',()=>{
    const mortgage = {...tvm,N:360,PV:75000,PMT:-425.84,PY:12,CY:12};
    expect(Number(value(calculateTVM('IY',mortgage))).toFixed(2)).toBe('5.50');
    expect(Number(value(calculateTVM('PMT',{...mortgage,IY:5.5}))).toFixed(2)).toBe('-425.84');
    expect(Number(value(calculateTVM('FV',{...tvm,N:20,IY:0.5,PV:-5000}))).toFixed(2)).toBe('5524.48');
  });
  it('BGN payments equal END payments divided by 1+periodic rate',()=>{
    const end = value(calculateTVM('PMT',{...tvm,PV:1000})), bgn = value(calculateTVM('PMT',{...tvm,PV:1000,timing:'BGN'})); close(bgn,Number(end)/1.05);
  });
  it('rejects impossible inputs and rounds amortization at each payment',()=>{
    expect(calculateTVM('IY',{...tvm,PV:100,FV:200}).ok).toBe(false);
    const a = value(calculateAmortization({...tvm,PV:1000,IY:12,PY:12,CY:12,PMT:-100},1,1)); expect(a).toEqual({BAL:'910',PRN:'-90',INT:'-10'});
    const b = value(calculateAmortization({...tvm,PV:1000,IY:12,PY:12,CY:12,PMT:-100,timing:'BGN'},1,1)); expect(b).toEqual({BAL:'900',PRN:'-100',INT:'0'});
    expect(calculateAmortization(tvm,3,2).ok).toBe(false);
  });
});
describe('cash flows',()=>{
  const groups = [{amount:3000,frequency:1},{amount:4000,frequency:1},{amount:5000,frequency:4}];
  it('matches TI grouped example to displayed precision',()=>{
    expect(Number(value(calculateNPV(-7000,groups,20))).toFixed(2)).toBe('7266.44');
    expect(Number(value(calculateIRR(-7000,groups)).rate).toFixed(2)).toBe('52.71');
  });
  it('is invariant under sign reversal for IRR',()=>{
    close(value(calculateIRR(-100,[{amount:110,frequency:1}])).rate,10);
    close(value(calculateIRR(100,[{amount:-110,frequency:1}])).rate,10);
    close(value(calculateNPV(-100,[{amount:10,frequency:10}],0)),0);
  });
  it('isolates multiple roots and selects the one closest to zero',()=>{
    const r = value(calculateIRR(-100,[{amount:230,frequency:1},{amount:-132,frequency:1}]));
    close(r.rate,10); expect(r.roots.length).toBe(2); close(r.roots[1]!,20);
    close(value(calculateIRR(100,[{amount:-230,frequency:1},{amount:132,frequency:1}])).rate,10);
  });
  it('finds a repeated root and rejects no-root polynomials',()=>{
    close(value(calculateIRR(-100,[{amount:220,frequency:1},{amount:-121,frequency:1}])).rate,10);
    const r = calculateIRR(-100,[{amount:50,frequency:1},{amount:-100,frequency:1}]); expect(r.ok).toBe(false); if(!r.ok) expect(r.error.code).toBe(5);
    expect(calculateIRR(100,[{amount:50,frequency:1}]).ok).toBe(false);
  });
  it('does not silently approximate a root beyond its isolation budget',()=>{
    const r = calculateIRR(-100,[{amount:230,frequency:129},{amount:-132,frequency:1}]); expect(r.ok).toBe(false); if(!r.ok) expect(r.error.code).toBe(7);
  });
});
describe('other worksheets',()=>{
  it('matches TI bond price and accrued interest (table dates, pp56–57)',()=>{
    const b = {SDT:'2006-06-12',RDT:'2007-12-31',CPN:7,RV:100,YLD:8,PRI:0,basis:'360' as const,frequency:2 as const};
    const r = value(calculateBond('PRI',b)); expect(Number(r.PRI).toFixed(2)).toBe('98.56'); expect(Number(r.AI).toFixed(2)).toBe('3.15');
    close(value(calculateBond('YLD',{...b,PRI:r.PRI})).YLD,8,7);
  });
  it('handles one-coupon and zero-yield bonds',()=>{
    const b = {SDT:'2025-01-01',RDT:'2025-07-01',CPN:6,RV:100,YLD:0,PRI:0,basis:'ACT' as const,frequency:2 as const};
    close(value(calculateBond('PRI',b)).PRI,103);
    close(value(calculateBond('PRI',{...b,YLD:6})).PRI,100);
  });
  it('matches TI partial-year straight-line depreciation (p62)',()=>{
    const d = {method:'SL' as const,LIF:'31.5',M01:'3.5',CST:1000000,SAL:0,YR:1,factor:200,DT1:'1990-12-31'};
    expect(value(calculateDepreciation(d))).toEqual({DEP:'25132.28',RBV:'974867.72',RDV:'974867.72'});
    expect(value(calculateDepreciation({...d,YR:2}))).toEqual({DEP:'31746.03',RBV:'943121.69',RDV:'943121.69'});
  });
  it('tests SYD, DB, crossover, and French variants against independent identities',()=>{
    const d = {LIF:5,M01:1,CST:1000,SAL:100,YR:1,factor:200,DT1:'2020-01-01'};
    close(value(calculateDepreciation({...d,method:'SYD'})).DEP,300);
    close(value(calculateDepreciation({...d,method:'DB'})).DEP,400);
    close(value(calculateDepreciation({...d,method:'DBX',YR:5})).RBV,100);
    close(value(calculateDepreciation({...d,method:'SLF'})).DEP,180);
    close(value(calculateDepreciation({...d,method:'DBF'})).DEP,400);
    expect(calculateDepreciation({...d,method:'SL',SAL:1200}).ok).toBe(false);
  });
  it('reproduces TI dates, interest conversion, margin, and breakeven examples',()=>{
    expect(value(calculateDate('DBD',{DT1:'2003-09-04',DT2:'2003-11-01',DBD:0,basis:'ACT'}))).toBe('58');
    expect(value(calculateDate('DT2',{DT1:'2024-02-28',DT2:'1990-12-31',DBD:2,basis:'ACT'}))).toBe('2024-03-01');
    expect(calculateDate('DT2',{DT1:'2024-02-28',DT2:'1990-12-31',DBD:2,basis:'360'}).ok).toBe(false);
    expect(calculateDate('DBD',{DT1:'2023-02-29',DT2:'2024-01-01',DBD:0,basis:'ACT'}).ok).toBe(false);
    expect(Number(value(calculateInterestConversion('EFF',{NOM:15,EFF:0,CY:4}))).toFixed(2)).toBe('15.87');
    expect(value(calculateProfit('CST',{CST:0,SEL:125,MAR:20}))).toBe('100');
    expect(value(calculateBreakeven('Q',{FC:3000,VC:15,P:20,PFT:0,Q:0}))).toBe('600');
    expect(Number(value(calculatePercentChange('CHANGE',{OLD:500,NEW:750,CHANGE:0,PERIODS:5}))).toFixed(2)).toBe('8.45');
  });
  it('computes all regression models and weighted one-variable statistics',()=>{
    const linear = [{x:1,y:3},{x:2,y:5},{x:3,y:7}]; const r = value(calculateStatistics(linear)); expect(r.a).toBe('1'); expect(r.b).toBe('2'); expect(r.r).toBe('1');
    expect(value(predictStatistics('Y',4,linear,'LIN'))).toBe('9'); expect(value(predictStatistics('X',9,linear,'LIN'))).toBe('4');
    const weighted = value(calculateStatistics([{x:1,y:2},{x:4,y:1}],'1-V')); expect(weighted.n).toBe('3'); expect(weighted.meanX).toBe('2'); close(weighted.Sx!,Math.sqrt(3));
    const exponential = [{x:0,y:2},{x:1,y:4},{x:2,y:8}]; close(value(predictStatistics('Y',3,exponential,'EXP')),16,7);
    close(value(predictStatistics('Y',4,[{x:1,y:2},{x:2,y:8},{x:3,y:18}],'PWR')),32,7);
    close(value(predictStatistics('Y',Math.E**3,[{x:1,y:1},{x:Math.E,y:3},{x:Math.E**2,y:5}],'Ln')),7,7);
    expect(value(calculateStatistics([{x:1,y:3},{x:1,y:4}])).b).toBe(null); expect(predictStatistics('Y',3,[{x:1,y:3},{x:1,y:4}],'LIN').ok).toBe(false);
  });
});

