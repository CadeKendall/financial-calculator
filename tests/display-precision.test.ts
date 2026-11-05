import {describe,it,expect} from 'vitest';
import {createInitialState,pressKeys,getSnapshot,serializeState} from '../src/index.js';
import {previewSnapshot,nextPreviewDecimals,canCyclePrecision,validPreviewDecimals} from '../web/display-precision.js';
describe('answer precision shortcut',()=>{
  it('cycles 2 through 6 and back for 2 divided by 34 without changing the session',()=>{
    const state=pressKeys(createInitialState(),['2','DIVIDE','3','4','EQUALS']),before=serializeState(state);
    let decimals=2;const shown=[];
    for(let i=0;i<6;i++){shown.push(previewSnapshot(state,decimals,getSnapshot).display);decimals=nextPreviewDecimals(decimals);}
    expect(shown).toEqual(['0.06','0.059','0.0588','0.05882','0.058824','0.06']);
    expect(serializeState(state)).toEqual(before);expect(state.settings.decimals).toBe(2);
    expect(pressKeys(state,['STO','1']).memory[1]).toBe(state.value);
  });
  it('preserves raw entry text, errors, dates, settings, and reset prompts',()=>{
    const examples=[['1','DOT'],['1','SIGN','SQRT'],['SECOND','1'],['SECOND','9'],['SECOND','PMT'],['SECOND','DOT'],['SECOND','SIGN']] as const;
    for(const keys of examples){const state=pressKeys(createInitialState(),keys),snapshot=getSnapshot(state);
      expect(canCyclePrecision(state,snapshot)).toBe(false);expect(previewSnapshot(state,6,getSnapshot).display).toBe(snapshot.display);
    }
  });
  it('respects separators and leaves worksheet rounding and explicit ROUND unchanged',()=>{
    const state=pressKeys(createInitialState(),['2','DIVIDE','3','4','EQUALS']);state.settings.separators='EUR';
    expect(previewSnapshot(state,4,getSnapshot).display).toBe('0,0588');
    expect(pressKeys(state,['SECOND','STO']).value).toBe('0.06');
    const amort=pressKeys(createInitialState(),['1','0','N','7','IY','2','0','0','0','PV','CPT','PMT','SECOND','PV','DOWN','DOWN']);
    const before=serializeState(amort);previewSnapshot(amort,6,getSnapshot);expect(serializeState(amort)).toEqual(before);
    expect(pressKeys(amort,['DOWN']).value).toBe(pressKeys({...amort},['DOWN']).value);
  });
  it('validates persisted precision and returns to two from FORMAT values outside the cycle',()=>{
    for(const n of [2,3,4,5,6])expect(validPreviewDecimals(n)).toBe(true);
    for(const n of [null,'3',2.5,-1,0,1,7,8,9,NaN])expect(validPreviewDecimals(n)).toBe(false);
    for(const n of [0,1,6,7,8,9])expect(nextPreviewDecimals(n)).toBe(2);
  });
});
