import {describe,it,expect} from 'vitest';
import {createInitialState,pressKey,pressKeys,pasteValue,serializeState,restoreState,SECONDARY,type Key} from '../src/index.js';
import {initialTVMNotes,updateTVMNotes,tvmReminder,validTVMNotes,validTheme,THEMES,inkFor} from '../web/preferences.js';
import {emptyExpression,updateExpression,expressionText} from '../web/expression.js';
function run(keys:Key[]){
  let state=createInitialState(),notes=initialTVMNotes(state);
  for(const key of keys){const before=state;state=pressKey(state,key);notes=updateTVMNotes(notes,before,state,before.second?SECONDARY[key]??key:key);}
  return {state,notes,items:tvmReminder(notes,state)};
}
describe('TVM reminder',()=>{
  it('appears after the first assignment and lists all five keys in physical order',()=>{
    expect(run([]).items).toEqual([]);const result=run(['7','PV']);expect(result.items.map(item=>item.label)).toEqual(['N','I/Y','PV','PMT','FV']);expect(result.items.map(item=>item.value)).toEqual(['','','7','','']);
  });
  it('counts an explicit zero, marks the fifth unknown, and shows the solved result',()=>{
    const keys:Key[]=['1','0','N','0','IY','1','0','0','SIGN','PV','0','PMT'];
    expect(run(keys).items.at(-1)?.value).toBe('?');const solved=run([...keys,'CPT','FV']);expect(solved.state.tvm.FV).toBe('100');expect(solved.items.at(-1)).toMatchObject({value:'100',computed:true});
    expect(run([...keys,'CPT','FV','2','0','0','SIGN','PV']).items.at(-1)?.value).toBe('?');
  });
  it('does not count recall as entry and retains inputs through power cycling',()=>{
    expect(run(['RCL','PV']).items).toEqual([]);expect(run(['0','PV','ON_OFF','ON_OFF']).items[2]?.value).toBe('0');
    expect(run(['7','PV','SECOND','FV']).items).toEqual([]);expect(run(['7','PV','SECOND','SIGN','ENTER']).items).toEqual([]);
  });
  it('validates saved entry metadata and conservatively migrates older sessions',()=>{
    const state=createInitialState();state.tvm.PV='7';expect(initialTVMNotes(state)).toEqual({entered:['PV'],computed:null});
    expect(validTVMNotes({entered:['PV'],computed:null})).toBe(true);expect(validTVMNotes({entered:['PV','PV'],computed:null})).toBe(false);expect(validTVMNotes({entered:['PV'],computed:'PV'})).toBe(false);
  });
});
describe('full-precision pasted entries',()=>{
  it('preserves 13 significant digits through CF entry, calculation, and session restore',()=>{
    const start=pressKey(createInitialState(),'CF');const pasted=pasteValue(start,'450385.4958123');expect(pasted.value).toBe('450385.4958123');expect(pasted.cashflows.initial).toBe('0');
    const entered=pressKey(pasted,'ENTER');expect(entered.cashflows.initial).toBe('450385.4958123');expect(start.value).toBe('0');
    const saved=serializeState(pasted);expect(saved.ok).toBe(true);if(saved.ok){const restored=restoreState(saved.value);expect(restored.ok).toBe(true);if(restored.ok)expect(restored.value.value).toBe('450385.4958123');}
  });
  it('replaces the active operand and supports assigning the pasted value to TVM',()=>{
    const pending=pressKeys(createInitialState(),['6','ADD','4']);const pasted=pasteValue(pending,'7');expect(pressKey(pasted,'PV').tvm.PV).toBe('7');expect(pressKey(pasted,'EQUALS').value).toBe('13');
    const entry=pasteValue(createInitialState(),'450385.4958');expect(entry.input).toBe('450385.4958');expect(pressKey(entry,'BACKSPACE').value).toBe('450385.495');
  });
  it('rejects malformed, overflowing, off, and read-only destinations',()=>{
    for(const text of ['1,000','abc','NaN','1e100'])expect(pasteValue(createInitialState(),text).error).not.toBe(null);
    expect(pasteValue(pressKey(createInitialState(),'ON_OFF'),'7').error).not.toBe(null);
    expect(pasteValue(pressKeys(createInitialState(),['NPV','DOWN']),'7').error).not.toBe(null);
  });
  it('clears an old completed expression even when pasting the identical result',()=>{
    const before=pressKeys(createInitialState(),['2','ADD','2','EQUALS']),after=pasteValue(before,'4');
    const trace=updateExpression({tokens:['2','+','2','='],current:'4',completed:true},before,after,'PASTE');expect(expressionText(trace)).toBe('');expect(trace.current).toBe('4');expect(after.justEvaluated).toBe(false);
  });
});
describe('saved themes',()=>{
  it('accepts every preset and custom colors but rejects invalid CSS values',()=>{
    for(const theme of THEMES)expect(validTheme(theme)).toBe(true);
    expect(validTheme({...THEMES[0],case:'#123abc'})).toBe(true);expect(validTheme({...THEMES[0],screen:'url(x)'})).toBe(false);
    expect(inkFor('#000000')).toBe('#ffffff');expect(inkFor('#ffffff')).toBe('#111512');
  });
});
