import {describe,it,expect} from 'vitest';
import {createInitialState,pressKeys,getSnapshot,type Worksheet} from '../src/index.js';
import {fields} from '../src/worksheet-control.js';
import {HELP,resolveHelp,searchHelp,relatedHelp} from '../web/help-content.js';
import {sheetGeometry} from '../web/help-sheet.js';

describe('contextual definitions',()=>{
  it('resolves 2ND PV to P1 and navigation to the individual amortization field without mutation',()=>{
    const state=pressKeys(createInitialState(),['SECOND','PV']),before=JSON.stringify(state);
    expect(resolveHelp(state,getSnapshot(state)).id).toBe('AMORT.P1');expect(resolveHelp(state,getSnapshot(state)).title).toBe('First payment in the range');expect(JSON.stringify(state)).toBe(before);
    const next=pressKeys(state,['DOWN']);expect(resolveHelp(next,getSnapshot(next)).id).toBe('AMORT.P2');
  });
  it('has a specific definition for every worksheet field and model variant',()=>{
    const sheets:Worksheet[]=['PYCY','BGN','AMORT','CF','NPV','IRR','BOND','DEPR','DATA','STAT','PERCENT_CHANGE','ICONV','DATE','PROFIT','BREAKEVEN','MEM','FORMAT'];
    for(const worksheet of sheets)for(const method of ['SL','SLF'])for(const model of ['LIN','1-V']){
      const state=createInitialState();state.worksheet=worksheet;state.sheets.DEPR.method=method;state.sheets.STAT.model=model;
      state.cashflows.flows=Array.from({length:24},()=>({amount:'0',frequency:1}));state.data=Array.from({length:50},()=>({x:'1',y:'1'}));
      fields(state).forEach((field,index)=>{state.index=index;const topic=resolveHelp(state,getSnapshot(state));expect(topic.id,`${worksheet}.${field.id}`).not.toBe('GENERAL.ready');expect(topic.meaning.length).toBeGreaterThan(20);expect(topic.steps.length).toBeGreaterThan(15);});
    }
  });
  it('distinguishes repeated cash flows and one-variable frequencies from paired measurements',()=>{
    let state=pressKeys(createInitialState(),['CF','DOWN','DOWN']);expect(resolveHelp(state,getSnapshot(state)).id).toBe('CF.F');
    state=createInitialState();state.worksheet='DATA';state.index=1;expect(resolveHelp(state,getSnapshot(state)).tip).toContain('paired measurement');state.sheets.STAT.model='1-V';expect(resolveHelp(state,getSnapshot(state)).tip).toContain('positive frequency');
  });
  it('preserves pending modifiers and covers unfamiliar functions while skipping basic keys',()=>{
    for(const [keys,id] of [[['SECOND'],'KEY.SECOND'],[['STO'],'KEY.STO'],[['CPT'],'KEY.CPT'],[['INV'],'KEY.INV'],[['SECOND','INV'],'KEY.HYP'],[['SECOND','SIGN'],'KEY.RESET']] as const){const state=pressKeys(createInitialState(),keys);const before=JSON.stringify(state);expect(resolveHelp(state,getSnapshot(state)).id).toBe(id);expect(JSON.stringify(state)).toBe(before);}
    const state=createInitialState();for(const action of ['ROUND','NCR','LN','PERCENT','XPY'])expect(resolveHelp(state,getSnapshot(state),action).id).toBe('KEY.'+action);
    for(const action of ['7','ADD','PV'])expect(resolveHelp(state,getSnapshot(state),action).id).toBe('GENERAL.ready');
  });
  it('explains errors without clearing or modifying the failed calculator state',()=>{
    const state=pressKeys(createInitialState(),['1','SIGN','SQRT']),before=JSON.stringify(state),topic=resolveHelp(state,getSnapshot(state),'SQRT');expect(topic.id).toBe('KEY.SQRT');expect(topic.error.message).toContain('nonnegative');expect(topic.error.recovery).toContain('Undo');expect(JSON.stringify(state)).toBe(before);
    state.error={code:7,kind:'non-convergence',message:'Search stopped.'};expect(resolveHelp(state,getSnapshot(state)).error.recovery).toContain('not proof');
  });
  it('finds exact screen labels, dynamic field numbers, and related definitions',()=>{
    for(const [query,id] of [['P1','AMORT.P1'],['F24','CF.F'],['X03','DATA.X'],['M9','MEM.M'],['P/Y','PYCY.PY'],['%CH','PERCENT_CHANGE.CHANGE'],['σx','STAT.sigmaX'],['margin','PROFIT.MAR']])expect(searchHelp(query).map(item=>item.id)).toContain(id);
    expect(searchHelp('not-a-real-term')).toEqual([]);expect(relatedHelp(HELP['AMORT.P1']).map(item=>item.id)).toContain('AMORT.INT');expect(relatedHelp(HELP['KEY.LN']).map(item=>item.id)).toContain('KEY.EXP');
  });
  it('anchors the sheet below the LCD and clamps it to narrow and short viewports',()=>{
    expect(sheetGeometry({bottom:260},{left:100,width:390},614,686)).toEqual({left:100,width:390,top:266});
    const compact=sheetGeometry({bottom:280},{left:0,width:390},320,400);expect(compact.left).toBe(8);expect(compact.width).toBe(304);expect(compact.top).toBe(280);
  });
  it('never raises the native sheet over the LCD when the keyboard reduces available space',()=>{
    const result=sheetGeometry({bottom:430},{left:0,width:440},440,510,true);
    expect(result.top).toBe(436);
  });
});
