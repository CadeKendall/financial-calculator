// Display-only context. Never evaluated or used to populate calculator registers.
export const emptyExpression = () => ({ tokens: [], current: '', completed: false });
const operators = {ADD:'+',SUBTRACT:'−',MULTIPLY:'×',DIVIDE:'÷',POWER:'^',NPR:'nPr',NCR:'nCr'};
const pending = state => state.frames.some(frame => frame.operators.length) || state.frames.length > 1;

export function expressionFromState(state) {
  const trace = emptyExpression();
  state.frames.forEach((frame,index) => {
    if(index)trace.tokens.push('(');
    frame.operators.forEach((operator,i) => trace.tokens.push(frame.values[i],operators[operator]));
  });
  trace.current=state.operandReady ? state.input ?? state.value : '';
  return trace;
}

export function updateExpression(previous,before,after,key,action=key) {
  const trace={tokens:[...previous.tokens],current:previous.current,completed:previous.completed};
  if(after.error || before.power!=='on')return trace;
  if(action==='PASTE'){
    if(before.justEvaluated || trace.completed){trace.tokens=[];trace.completed=false;}
    trace.current=after.value;return trace;
  }
  if(after.power!=='on' || after.worksheet!==before.worksheet || action==='QUIT' || action==='CLR_WORK' || action==='CLR_TVM' || before.resetPending && action==='ENTER')return emptyExpression();
  if(action==='CE_C') {
    if(!pending(after))return emptyExpression();
    trace.current='0';return trace;
  }
  const isDigit=/^\d$/.test(action)||action==='DOT';
  if(isDigit && !before.memoryPending){
    if(before.justEvaluated || trace.completed){trace.tokens=[];trace.completed=false;}
    trace.current=after.input ?? after.value;
  } else if(operators[action] && !before.memoryPending && !(action==='POWER' && (before.inverse||before.hyperbolic))){
    if(trace.completed){trace.tokens=[];trace.current=before.value;trace.completed=false;}
    if(!before.operandReady && Object.values(operators).includes(trace.tokens.at(-1)))trace.tokens.pop();
    else if(trace.current)trace.tokens.push(trace.current);
    else if(!trace.tokens.length)trace.tokens.push(before.value);
    trace.tokens.push(operators[action]);trace.current='';
  } else if(action==='LPAREN' && !before.inverse && !before.hyperbolic){
    if(trace.completed){trace.tokens=[];trace.current=before.value;trace.completed=false;}
    if(before.operandReady && (before.input!==null || before.justEvaluated || before.frames.at(-1).values.length)){
      trace.tokens.push(trace.current || before.value,'×');
    }
    trace.tokens.push('(');trace.current='';
  } else if(action==='RPAREN' && !before.inverse && !before.hyperbolic){
    if(trace.current)trace.tokens.push(trace.current);
    const start=trace.tokens.lastIndexOf('(');
    const group=trace.tokens.splice(start<0?0:start);
    trace.current=group.concat(')').join(' ').replace(/\( /g,'(').replace(/ \)/g,')');
  } else if(action==='EQUALS' || action==='ENTER' && before.frames.some(f=>f.operators.length)){
    if(trace.completed)return emptyExpression(); // Repeated equals/constants use the engine result, not an invented formula.
    if(trace.current)trace.tokens.push(trace.current);
    else if(Object.values(operators).includes(trace.tokens.at(-1)))trace.tokens.push(before.value);
    for(let i=1;i<before.frames.length;i++)trace.tokens.push(')');
    if(trace.tokens.length)trace.tokens.push('=');
    trace.current=after.value;trace.completed=true;
  } else if(['N','IY','PV','PMT','FV'].includes(action) && before.computePending || action==='CPT' && before.worksheet){
    return emptyExpression();
  } else if(after.value!==before.value || action==='SIGN' || action==='BACKSPACE'){
    if(trace.completed){trace.tokens=[];trace.completed=false;}
    trace.current=after.input ?? after.value;
  }
  if(trace.tokens.length>100)trace.tokens=['…',...trace.tokens.slice(-99)];
  return trace;
}

export function expressionText(trace) {
  const tokens=!trace.completed && trace.current.startsWith('(') ? [...trace.tokens,trace.current] : trace.tokens;
  return tokens.join(' ').replace(/\( /g,'(').replace(/ \)/g,')');
}

export function validExpression(value) {
  return value && Array.isArray(value.tokens) && value.tokens.length<=100 && value.tokens.every(token=>typeof token==='string' && token.length<=150) && typeof value.current==='string' && value.current.length<=150 && typeof value.completed==='boolean';
}
