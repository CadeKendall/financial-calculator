import {describe,it,expect} from 'vitest';
import {createInitialState,pressKey,serializeState,restoreState,SECONDARY,getSnapshot,pasteValue,type Key} from '../src/index.js';
import {createJournal} from '../web/journal.js';
import {emptyExpression,updateExpression,expressionText} from '../web/expression.js';
import {initialTVMNotes,updateTVMNotes} from '../web/preferences.js';
const codec={serializeState,restoreState};
function harness(){
  let state=createInitialState(),expression=emptyExpression(),notes=initialTVMNotes(state);
  const journal=createJournal(codec),checkpoint=()=>journal.checkpoint(state,expression,notes);
  return {journal,checkpoint,get state(){return state;},get expression(){return expression;},get notes(){return notes;},
    keys(...keys:Key[]){for(const key of keys){const old=checkpoint(),before=state,action=before.second?SECONDARY[key]??key:key;state=pressKey(state,key);expression=updateExpression(expression,before,state,key,action);notes=updateTVMNotes(notes,before,state,action);const next=checkpoint();journal.remember(old,next,key);for(const event of state.events)journal.record(event,next,getSnapshot(state).display,1700000000000);}},
    undo(){const prev=journal.undo();if(prev){state=prev.state;expression=prev.expression;notes=prev.tvmNotes;}},
  };
}
describe('undo and persistent calculation history',()=>{
  it('restores an overwritten TVM register, entry trail, and entered-value metadata',()=>{
    const h=harness();h.keys('7','PV','8','PV');expect(h.state.tvm.PV).toBe('8');h.undo();expect(h.state.tvm.PV).toBe('7');expect(h.state.input).toBe('8');expect(h.notes.entered).toEqual(['PV']);h.undo();expect(h.state.value).toBe('7');expect(h.expression.current).toBe('7');
  });
  it('undoes equals back to pending arithmetic and keeps the completed result in history',()=>{
    const h=harness();h.keys('6','ADD','4','EQUALS');expect(h.journal.entries[0]).toMatchObject({title:'6 + 4',result:'10'});h.undo();expect(h.state.frames[0].operators).toEqual(['ADD']);expect(h.state.value).toBe('4');expect(expressionText(h.expression)).toBe('6 +');expect(h.state.events).toEqual([]);h.keys('BACKSPACE','5','EQUALS');expect(h.state.value).toBe('11');expect(h.journal.count).toBe(2);
  });
  it('recovers from errors, clear, and full reset',()=>{
    const h=harness();h.keys('7','PV','1','DIVIDE','0','EQUALS');expect(h.state.error).not.toBeNull();expect(h.journal.count).toBe(0);h.undo();expect(h.state.error).toBeNull();h.keys('CE_C');h.undo();expect(h.state.frames[0].operators).toEqual(['DIVIDE']);h.keys('SECOND','SIGN','ENTER');expect(h.state.tvm.PV).toBe('0');h.undo();expect(h.state.tvm.PV).toBe('7');expect(h.state.resetPending).toBe(true);
  });
  it('saves TVM inputs including explicit zeros and restores complete state after reloading history',()=>{
    const h=harness();h.keys('1','0','N','0','IY','1','0','0','SIGN','PV','0','PMT','CPT','FV');
    const entry=h.journal.entries[0];expect(entry.title).toBe('Solve FV');expect(entry.inputs).toContainEqual({label:'PMT',value:'0'});expect(entry.inputs.some(row=>row.label==='FV')).toBe(false);
    const reloaded=createJournal(codec,JSON.parse(h.journal.serialize())),restored=reloaded.restore(reloaded.entries[0].checkpoint);expect(restored.state.tvm.FV).toBe('100');expect(restored.tvmNotes.computed).toBe('FV');expect(restored.state.events).toEqual([]);expect(reloaded.canUndo).toBe(false);
  });
  it('records cash flow amounts and repetitions with an NPV result',()=>{
    const h=harness();h.keys('CF','1','0','0','SIGN','ENTER','DOWN','6','0','ENTER','DOWN','2','ENTER','NPV','0','ENTER','DOWN','CPT');
    const entry=h.journal.entries[0];expect(entry.result).toBe('20');expect(entry.inputs).toEqual(expect.arrayContaining([{label:'CF0',value:'-100'},{label:'CF1',value:'60'},{label:'F1',value:'2'},{label:'I',value:'0'}]));
  });
  it('can undo reopening a saved calculation, and pasting preserves full precision',()=>{
    const h=harness();h.keys('2','ADD','2','EQUALS');const saved=h.journal.entries[0].checkpoint;h.keys('9');const current=h.checkpoint();h.journal.remember(current,saved,'reopen');expect(h.journal.restore(saved).state.value).toBe('4');expect(h.journal.undo().state.value).toBe('9');
    const next=pasteValue(h.state,'450385.4958123'),point=h.journal.checkpoint(next,h.expression,h.notes);h.journal.remember(current,point,'paste');expect(h.journal.restore(point).state.value).toBe('450385.4958123');expect(h.journal.undo().state.value).toBe('9');
  });
  it('bounds storage and ignores malformed saved history',()=>{
    const h=harness();for(let i=0;i<55;i++)h.keys('2','ADD','2','EQUALS');expect(h.journal.count).toBe(50);let count=0;while(h.journal.canUndo){h.journal.undo();count++;}expect(count).toBe(100);
    const valid=JSON.parse(h.journal.serialize()),broken=structuredClone(valid.entries[0]);broken.checkpoint.session='bad';const badDate={...valid.entries[0],time:1e100};const badRows={...valid.entries[0],inputs:[null]};expect(createJournal(codec,{version:1,entries:[broken,badDate,badRows,...valid.entries.slice(0,1)]}).count).toBe(1);expect(createJournal(codec,{version:2,entries:valid.entries}).count).toBe(0);
  });
});
