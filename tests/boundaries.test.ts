import { describe,it,expect } from 'vitest';
import { createInitialState,pressKeys,pressKey,getSnapshot,formatNumber,calculateTVM,calculateAmortization,calculateBond,calculateNPV,calculateIRR,calculateStatistics,calculateInterestConversion,calculatePercentChange,calculateProfit,calculateBreakeven,calculateDate,serializeState,restoreState,type Result,type TVMValues,type Key } from '../src/index.js';
function value<T>(r:Result<T>):T { if(!r.ok)throw new Error(JSON.stringify(r.error));return r.value; }
const fmt=(v:string,decimals=2,separators:'US'|'EUR'='US')=>formatNumber(v,{decimals,separators});
const tvm:TVMValues={N:360,IY:6.125,PV:120000,PMT:0,FV:0,PY:12,CY:12,timing:'END'};
describe('rounding and reference schedules',()=>{
  it('avoids double rounding and respects both separator conventions',()=>{
    expect(fmt('1.23499999996')).toBe('1.23'); expect(fmt('1234567.895')).toBe('1,234,567.90');expect(fmt('1234567.895',2,'EUR')).toBe('1.234.567,90');
    expect(fmt('1234567890')).toBe('1,234,567,890'); expect(fmt('12345678901')).toBe('1.23456789e10');expect(fmt('0.0000000001')).toBe('1e-10');
  });
  it('retains stored digits through a format change and rounds explicitly',()=>{
    let s=pressKeys(createInitialState(),['1','DIVIDE','3','EQUALS','STO','1','SECOND','DOT','4','ENTER','SECOND','CPT','RCL','1']);
    expect(getSnapshot(s).display).toBe('0.3333');expect(s.memory[1]).toBe('0.3333333333333');
    s=pressKeys(s,['SECOND','STO']);expect(s.value).toBe('0.3333');expect(s.memory[1]).toBe('0.3333333333333');
  });
  it('matches all three years of the official amortization schedule',()=>{
    const loan={...tvm,PMT:value(calculateTVM('PMT',tvm))};expect(fmt(String(loan.PMT))).toBe('-729.13');
    expect(value(calculateAmortization(loan,1,9))).toEqual({BAL:'118928.63',PRN:'-1071.37',INT:'-5490.8'});
    expect(value(calculateAmortization(loan,10,21))).toEqual({BAL:'117421.6',PRN:'-1507.03',INT:'-7242.53'});
    expect(value(calculateAmortization(loan,22,33))).toEqual({BAL:'115819.62',PRN:'-1601.98',INT:'-7147.58'});
  });
  it('matches the official quarterly-compounding monthly-deposit example',()=>{
    expect(fmt(value(calculateTVM('PMT',{...tvm,N:120,IY:0.5,PV:0,FV:25000,CY:4,timing:'BGN'})))).toBe('-203.13');
  });
});
describe('independent inverse and boundary checks',()=>{
  it('checks unary inverse identities and secondary exponential keys',()=>{
    expect(Number(pressKeys(createInitialState(),['2','LN','SECOND','LN']).value)).toBeCloseTo(2,10);
    expect(pressKeys(createInitialState(),['4','SQRT','SQUARE']).value).toBe('4');
    expect(pressKeys(createInitialState(),['8','RECIPROCAL','MULTIPLY','8','EQUALS']).value).toBe('1');
    expect(pressKeys(createInitialState(),['1','SIGN','SQRT']).error?.code).toBe(2);
    const s=pressKeys(createInitialState(),['CF','DOWN','2','ENTER']);expect(getSnapshot(s).activeVariable).toBe('C1');expect(getSnapshot(s).indicators.insert).toBe(true);expect(getSnapshot(s).indicators.delete).toBe(true);
  });
  it('handles exact degree quadrants and negative cube roots',()=>{
    expect(pressKeys(createInitialState(),['9','0','SECOND','RPAREN']).value).toBe('0');
    expect(pressKeys(createInitialState(),['1','8','0','SECOND','LPAREN']).value).toBe('0');
    expect(pressKeys(createInitialState(),['9','0','SECOND','POWER']).error?.code).toBe(2);
    expect(Number(pressKeys(createInitialState(),['8','SIGN','POWER','LPAREN','1','DIVIDE','3','RPAREN','EQUALS']).value)).toBeCloseTo(-2,9);
  });
  it('solves every algebraic worksheet target',()=>{
    const p={CST:80,SEL:100,MAR:20};for(const k of ['CST','SEL','MAR'] as const)expect(Number(value(calculateProfit(k,p)))).toBe(p[k]);
    const b={FC:3000,VC:15,P:20,PFT:1000,Q:800};for(const k of ['FC','VC','P','PFT','Q'] as const)expect(Number(value(calculateBreakeven(k,b)))).toBe(b[k]);
    const c={OLD:100,NEW:121,CHANGE:10,PERIODS:2};for(const k of ['OLD','NEW','CHANGE','PERIODS'] as const)expect(Number(value(calculatePercentChange(k,c)))).toBeCloseTo(c[k],9);
    const effective=value(calculateInterestConversion('EFF',{NOM:12,EFF:0,CY:12}));expect(Number(value(calculateInterestConversion('NOM',{NOM:0,EFF:effective,CY:12})))).toBeCloseTo(12,9);
    expect(value(calculateDate('DT1',{DT1:'1990-12-31',DT2:'2024-03-01',DBD:2,basis:'ACT'}))).toBe('2024-02-28');
  });
  it('handles a negative IRR and a long grouped zero-rate schedule',()=>{
    expect(Number(value(calculateIRR(-100,[{amount:90,frequency:1}])).rate)).toBeCloseTo(-10,9);
    expect(value(calculateNPV(-9999,[{amount:1,frequency:9999}],0))).toBe('0');
    expect(calculateNPV(0,[{amount:1,frequency:10000}],0).ok).toBe(false);
    const r=calculateIRR(0,[{amount:0,frequency:1}]);expect(r.ok).toBe(false);if(!r.ok)expect(r.error.code).toBe(5);
  });
  it('accepts valid 1980 bonds whose preceding coupon lies in 1979',()=>{
    const b={SDT:'1980-01-01',RDT:'1980-07-31',CPN:6,RV:100,YLD:6,PRI:100,basis:'ACT' as const,frequency:2 as const};
    expect(calculateBond('PRI',b).ok).toBe(true);expect(calculateBond('PRI',{...b,SDT:'1979-12-31'}).ok).toBe(false);
    expect(calculateBond('AI',{...b,YLD:-1000}).ok).toBe(true);
  });
  it('returns available moments when a regression is undefined',()=>{
    const r=value(calculateStatistics([{x:2,y:3}]));expect(r.n).toBe('1');expect(r.meanX).toBe('2');expect(r.Sx).toBe(null);expect(r.b).toBe(null);
    const s=pressKeys(createInitialState(),['SECOND','7','2','ENTER','DOWN','3','ENTER','SECOND','8','DOWN']);expect(s.error).toBe(null);expect(s.value).toBe('1');expect(s.events[0]?.context).toBe('STAT.n');
  });
  it('returns structured errors for invalid JavaScript callers',()=>{
    expect(calculateTVM('invalid' as never,tvm).ok).toBe(false);expect(calculateBreakeven('invalid' as never,{FC:0,VC:0,P:0,PFT:0,Q:0}).ok).toBe(false);
    expect(calculateProfit('MAR',{CST:'NaN',SEL:100,MAR:0}).ok).toBe(false);expect(pressKey(createInitialState(),'invalid' as Key).error?.code).toBe(2);
  });
});
describe('state isolation and recoverability',()=>{
  it('clears TVM amounts without changing frequencies or payment timing',()=>{
    let s=pressKeys(createInitialState(),['SECOND','IY','1','2','ENTER','DOWN','4','ENTER','SECOND','CPT','SECOND','PMT','SECOND','ENTER','SECOND','CPT','9','PV','SECOND','FV']);
    expect(s.tvm).toEqual({N:'0',IY:'0',PV:'0',PMT:'0',FV:'0',PY:'12',CY:'4',timing:'BGN'});
    s=pressKeys(s,['NPV','7','ENTER','CF','SECOND','CE_C']);expect(s.sheets.NPV.I).toBe('7');
  });
  it('advances an amortization range from either P1 or P2',()=>{
    let s=createInitialState();s.tvm={N:'360',IY:'6.125',PV:'120000',PMT:'-729.13',FV:'0',PY:'12',CY:'12',timing:'END'};
    s=pressKeys(s,['SECOND','PV','DOWN','9','ENTER','CPT']);expect(s.sheets.AMORT.P1).toBe('10');expect(s.sheets.AMORT.P2).toBe('18');expect(s.value).toBe('18');
  });
  it('starts a fresh digit entry after storing without losing pending arithmetic',()=>{
    expect(pressKeys(createInitialState(),['4','2','STO','2','5']).value).toBe('5');
    const s=pressKeys(createInitialState(),['2','ADD','3','STO','1','4','EQUALS']);expect(s.value).toBe('6');expect(s.memory[1]).toBe('3');
  });
  it('rejects internally inconsistent session entries',()=>{
    const data=JSON.parse(value(serializeState(createInitialState())));data.state.input='123';data.state.value='7';expect(restoreState(JSON.stringify(data)).ok).toBe(false);
  });
});
