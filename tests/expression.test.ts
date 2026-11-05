import {describe,it,expect} from 'vitest';
import {createInitialState,pressKey,SECONDARY,type Key} from '../src/index.js';
import {emptyExpression,updateExpression,expressionText,expressionFromState,validExpression} from '../web/expression.js';
function run(keys:Key[]){
  let state=createInitialState(),trace=emptyExpression();
  for(const key of keys){const before=state;state=pressKey(state,key);trace=updateExpression(trace,before,state,key,before.second?SECONDARY[key]??key:key);}
  return {state,trace,text:expressionText(trace)};
}
describe('display-only expression trail',()=>{
  it('keeps the earlier operand visible while PV and N receive only the active number',()=>{
    for(const target of ['PV','N'] as const){
      const result=run(['6','ADD','4',target]);expect(result.text).toBe('6 +');expect(result.state.value).toBe('4');expect(result.state.tvm[target]).toBe('4');expect(result.trace.current).toBe('4');
    }
  });
  it('retains the original entered sequence across CHAIN reductions',()=>{
    const result=run(['6','ADD','4','MULTIPLY','2','EQUALS']);expect(result.text).toBe('6 + 4 × 2 =');expect(result.state.value).toBe('20');
  });
  it('corrects an entry and replaces a pending operator',()=>{
    const result=run(['6','ADD','SUBTRACT','4','5','BACKSPACE','EQUALS']);expect(result.text).toBe('6 − 4 =');expect(result.state.value).toBe('2');
  });
  it('clears stale context when a new calculation or worksheet starts',()=>{
    expect(run(['6','ADD','4','PV','2']).text).toBe('');
    expect(run(['6','ADD','4','CE_C','CE_C']).text).toBe('');
    expect(run(['6','ADD','4','CF']).text).toBe('');
    expect(run(['6','ADD','4','ON_OFF']).text).toBe('');
    expect(run(['6','ADD','4','EQUALS','2']).text).toBe('');
  });
  it('handles parentheses and preserves context through a recoverable error',()=>{
    expect(run(['6','MULTIPLY','LPAREN','4','ADD','2','RPAREN','EQUALS']).text).toBe('6 × (4 + 2) =');
    const replacement=run(['6','ADD','LPAREN','4','RPAREN','2','EQUALS']);expect(replacement.text).toBe('6 + 2 =');expect(replacement.state.value).toBe('8');
    const result=run(['6','DIVIDE','0','EQUALS']);expect(result.state.error?.code).toBe(1);expect(result.text).toBe('6 ÷');
  });
  it('can recover pending context from older sessions and validate saved display metadata',()=>{
    const result=run(['6','ADD','4']);expect(expressionText(expressionFromState(result.state))).toBe('6 +');
    expect(validExpression(JSON.parse(JSON.stringify(result.trace)))).toBe(true);expect(validExpression({tokens:[42],current:'4',completed:false})).toBe(false);
  });
});
