import { describe,it,expect } from 'vitest';
import { createInitialState,pressKey,pressKeys,getSnapshot,serializeState,restoreState,autoPowerDown,KEYS,SECONDARY,type Key,type CalculatorState,type Result } from '../src/index.js';
const aliases: Record<string,Key> = {'+':'ADD','-':'SUBTRACT','*':'MULTIPLY','/':'DIVIDE','=':'EQUALS','.':'DOT','(':'LPAREN',')':'RPAREN','^':'POWER','2nd':'SECOND','±':'SIGN'};
function run(keys: string[], s = createInitialState()): CalculatorState {
  for(const k of keys) { s=pressKey(s,aliases[k] ?? k as Key); if(s.error) throw new Error(`${k}: ${JSON.stringify(s.error)}`); } return s;
}
function type(n:string):string[]{return n.split('');}
function val<T>(r:Result<T>):T{if(!r.ok)throw new Error(JSON.stringify(r.error));return r.value;}
const display=(s:CalculatorState)=>getSnapshot(s).display;
describe('physical keys and arithmetic',()=>{
  it('has all 44 physical keys, each mapped independently of its visual label',()=>{
    expect(KEYS.length).toBe(44); expect(new Set(KEYS).size).toBe(44); expect(SECONDARY['4']).toBe('DEPR');
    for(const key of KEYS) expect(()=>pressKey(createInitialState(),key)).not.toThrow();
  });
  it('matches CHAIN and AOS precedence',()=>{
    expect(display(run(['3','+','2','*','4','=']))).toBe('20.00');
    const aos=run(['2nd','.','UP','2nd','ENTER','2nd','CPT']); expect(aos.worksheet).toBe(null);
    expect(display(run(['3','+','2','*','4','='],aos))).toBe('11.00');
  });
  it('handles nested parentheses, powers, automatic closing, and correction',()=>{
    expect(display(run(['7','*','(','3','+','5',')','=']))).toBe('56.00');
    expect(display(run(['2','*','(','3','+','(','4','*','5','=']))).toBe('46.00');
    expect(display(run(['3','*',...type('1234.86'),'BACKSPACE','BACKSPACE','5','6','=']))).toBe('3,703.68');
    expect(display(run(['3','^','2','=']))).toBe('9.00');
    expect(display(run(['2','+','3','CE_C','4','=']))).toBe('6.00');
  });
  it('uses internal precision, supports ROUND, and DEC9 floats',()=>{
    let s=run(['1','/','3','=','STO','1','CE_C','RCL','1','*','3','=']); expect(display(s)).toBe('1.00');
    s=run(['2','/','3','=','2nd','STO','*','3','=']); expect(display(s)).toBe('2.01');
    s=run(['2nd','.','9','ENTER','2nd','CPT','1','+','1','=']); expect(display(s)).toBe('2');
  });
  it('handles percentage arithmetic and constants',()=>{
    expect(display(run([...type('498'),'+','7','PERCENT','=']))).toBe('532.86');
    expect(display(run(['1','4','/','2','5','PERCENT','=']))).toBe('56.00');
    let s=run(['3','*','8','2nd','PERCENT','=']); expect(display(s)).toBe('24.00');
    s=run(['7','='],s); expect(display(s)).toBe('56.00'); s=run(['4','5','='],s);expect(display(s)).toBe('360.00');
    expect(display(run(['2','^','2nd','EQUALS','='],run(['3','+','1','='])))).toBe('16.00');
  });
  it('handles factorial, permutations, combinations and trig modifiers',()=>{
    expect(display(run(['5','2nd','MULTIPLY']))).toBe('120.00');
    expect(display(run(['8','2nd','SUBTRACT','3','=']))).toBe('336.00');
    expect(display(run(['5','2','2nd','ADD','5','=']))).toBe('2,598,960.00');
    expect(display(run(['1','2','0','2nd','RPAREN']))).toBe('-0.50');
    expect(display(run(['.','5','2nd','INV','LPAREN']))).toBe('0.52');
    expect(display(run(['5','2nd','INV','INV','LPAREN']))).toBe('2.31');
    expect(display(run(['.','2','INV','LPAREN']))).toBe('11.54');
  });
  it('preserves display during memory arithmetic and supports random seeds',()=>{
    let s=run(['1','0','STO','4','CE_C','5','STO','ADD','4']); expect(s.memory[4]).toBe('15');expect(display(s)).toBe('5.00');
    s=run(['CE_C','RCL','4'],s);expect(display(s)).toBe('15.00');
    const seeded=run(['4','2','STO','2nd','DIVIDE']); const a=run(['2nd','DIVIDE'],seeded),b=run(['2nd','DIVIDE'],seeded); expect(a.value).toBe(b.value);expect(Number(a.value)).toBeGreaterThan(0);expect(Number(a.value)).toBeLessThan(1);
  });
  it('reports recoverable errors and keeps reducers immutable',()=>{
    const start=createInitialState(),copy=JSON.stringify(start);let s=pressKeys(start,['1','DIVIDE','0','EQUALS']);expect(s.error?.code).toBe(1);expect(JSON.stringify(start)).toBe(copy);
    expect(display(s)).toBe('Error 1');s=pressKey(s,'CE_C');expect(s.error).toBe(null);expect(display(s)).toBe('0.00');
    s=pressKeys(start,Array(16).fill('LPAREN'));expect(s.error?.code).toBe(3);
  });
});
describe('financial key sequences',()=>{
  it('calculates the TI mortgage annual interest through the keypad',()=>{
    const s=run(['2nd','IY','1','2','ENTER','2nd','CPT',...type('360'),'N',...type('75000'),'PV',...type('425.84'),'±','PMT','CPT','IY']);
    expect(display(s)).toBe('5.50');expect(s.tvm.PY).toBe('12');expect(s.tvm.CY).toBe('12');expect(s.events[0]?.context).toBe('TVM.IY');
  });
  it('handles zero interest, BGN and changing C/Y independently',()=>{
    expect(display(run(['1','0','N','1','0','0','±','PV','CPT','FV']))).toBe('100.00');
    const s=run(['2nd','IY','1','2','ENTER','DOWN','2','ENTER','2nd','CPT','2nd','PMT','2nd','ENTER','2nd','CPT']);
    expect(s.tvm.PY).toBe('12');expect(s.tvm.CY).toBe('2');expect(s.tvm.timing).toBe('BGN');expect(getSnapshot(s).indicators.bgn).toBe(true);
  });
  it('enters grouped cash flows, then computes both NPV and IRR',()=>{
    let s=run(['CF',...type('7000'),'±','ENTER','DOWN',...type('3000'),'ENTER','DOWN','DOWN',...type('4000'),'ENTER','DOWN','DOWN',...type('5000'),'ENTER','DOWN','4','ENTER','NPV','2','0','ENTER','DOWN','CPT']);
    expect(display(s)).toBe('7,266.44');s=run(['IRR','CPT'],s);expect(display(s)).toBe('52.71');expect(s.cashflows.flows).toHaveLength(3);
  });
  it('inserts/deletes CF and data rows and clears only their worksheet',()=>{
    let s=run(['1','2','PV','CF','1','±','ENTER','DOWN','2','ENTER','2nd','DOWN']);expect(s.cashflows.flows).toHaveLength(2);
    s=run(['2nd','UP'],s);expect(s.cashflows.flows).toHaveLength(1);
    s=run(['2nd','CE_C'],s);expect(s.cashflows.flows).toHaveLength(0);expect(s.tvm.PV).toBe('12');expect(s.worksheet).toBe('CF');
    s=run(['2nd','7','2','ENTER','2nd','DOWN'],s);expect(s.data).toHaveLength(2);s=run(['2nd','UP'],s);expect(s.data).toHaveLength(1);
  });
  it('opens every formerly missing worksheet and computes its results',()=>{
    expect(display(run(['2nd','6',...type('3000'),'ENTER','DOWN','1','5','ENTER','DOWN','2','0','ENTER','DOWN','DOWN','CPT']))).toBe('600.00');
    expect(display(run(['2nd','3','DOWN',...type('125'),'ENTER','DOWN','2','0','ENTER','UP','UP','CPT']))).toBe('100.00');
    expect(display(run(['2nd','5',...type('500'),'ENTER','DOWN',...type('750'),'ENTER','DOWN','DOWN','5','ENTER','UP','CPT']))).toBe('8.45');
    expect(display(run(['2nd','0','DOWN','DOWN','9','5','ENTER','ADD','6','5','ENTER']))).toBe('160.00');
    const d=run(['2nd','4','DOWN',...type('31.5'),'ENTER','DOWN',...type('3.5'),'ENTER','DOWN',...type('1000000'),'ENTER','DOWN','DOWN','DOWN']);expect(display(d)).toBe('25,132.28');
  });
  it('uses dates in both local formats and calculates date results',()=>{
    let s=run(['2nd','1',...type('9.0403'),'ENTER','DOWN',...type('11.0103'),'ENTER','DOWN','CPT']);expect(display(s)).toBe('58.00');
    s=run(['2nd','CPT','2nd','.','DOWN','DOWN','2nd','ENTER','2nd','CPT','2nd','1',...type('4.0903'),'ENTER'],s);expect(display(s)).toBe('4-09-2003');expect(s.sheets.DATE.DT1).toBe('2003-09-04');
  });
  it('computes statistics automatically on navigation',()=>{
    const s=run(['2nd','7','1','ENTER','DOWN','3','ENTER','DOWN','2','ENTER','DOWN','5','ENTER','DOWN','3','ENTER','DOWN','7','ENTER','2nd','8','DOWN','DOWN']);expect(display(s)).toBe('2.00');
  });
});
describe('power, reset, snapshots and persistence',()=>{
  it('distinguishes explicit off from automatic sleep',()=>{
    const s=run(['4','2','STO','2','5','+','3']); const sleep=autoPowerDown(s);expect(display(sleep)).toBe('');
    const resumed=pressKey(sleep,'ON_OFF');expect(display(run(['='],resumed))).toBe('8.00');
    const off=pressKey(s,'ON_OFF');expect(display(off)).toBe('');const on=pressKey(off,'ON_OFF');expect(display(on)).toBe('0.00');expect(on.memory[2]).toBe('42');
  });
  it('requires ENTER to confirm reset and supports cancel',()=>{
    let s=run(['9','STO','1','2nd','SIGN']);expect(s.resetPending).toBe(true);s=run(['2nd','CPT'],s);expect(s.memory[1]).toBe('9');
    s=run(['2nd','SIGN','ENTER'],s);expect(s.memory.every(v=>v==='0')).toBe(true);expect(s).toEqual(createInitialState());
  });
  it('round-trips pending calculations and does not replay completion events',()=>{
    const s=run(['2','*','(','3','+','4']);const text=val(serializeState(s));const restored=val(restoreState(text));expect(restored).toEqual(s);expect(display(run(['='],restored))).toBe('14.00');
    const done=run(['1','+','2','=']);expect(done.events).toHaveLength(1);expect(val(restoreState(val(serializeState(done)))).events).toHaveLength(0);
    const snap=getSnapshot(done);snap.stored.memory[0]='999';expect(done.memory[0]).toBe('0');
  });
  it('rejects corrupt, oversized, future and inconsistent sessions',()=>{
    for(const text of ['{',JSON.stringify({schema:'ba-ii-plus-engine',version:2,state:createInitialState()}),' '.repeat(1000001)])expect(restoreState(text).ok).toBe(false);
    const root=JSON.parse(val(serializeState(createInitialState())));root.state.memory=['NaN'];expect(restoreState(JSON.stringify(root)).ok).toBe(false);
    const other=JSON.parse(val(serializeState(createInitialState())));other.state.settings.calculation='eval';expect(restoreState(JSON.stringify(other)).ok).toBe(false);
  });
});

