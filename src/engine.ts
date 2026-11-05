import { attempt, dec, formatNumber, register, requireValue, roundDisplay, unwrap } from './numeric.js';
import { KEYS, SECONDARY, type Key } from './keys.js';
import { binary, frame, OPERATORS, precedence, reduceFrame, unary, type BinaryOperator } from './math.js';
import { clone, createInitialState, type CalculatorState, type Worksheet } from './state.js';
import { calculateTVM, type TVMTarget } from './tvm.js';
import { clearWorksheet, computeField, currentField, enterField, event, fields, fieldValue, insertDelete, navigate, openWorksheet, refresh, setField } from './worksheet-control.js';
import { displayDate, weekday } from './dates.js';

function clearExpression(s: CalculatorState): void { s.frames = [frame()]; s.operandReady = true; s.justEvaluated = false; s.input = null; }
function quit(s: CalculatorState): void {
  clearExpression(s); s.value = '0'; s.label = ''; s.worksheet = null; s.index = 0; s.second = false; s.inverse = false; s.hyperbolic = false;
  s.computePending = false; s.resetPending = false; s.memoryPending = null; s.memoryOperator = null; s.constant = null; s.entered = false; s.computed = false;
}
function put(s: CalculatorState, value: string): void { s.value = register(value); s.input = null; s.operandReady = true; s.entered = false; s.computed = false; }
function digit(s: CalculatorState, key: string): void {
  if (s.input === null) { if (s.justEvaluated) clearExpression(s); s.input = key === 'DOT' ? '0.' : key; }
  else if (key === 'DOT') { if (!s.input.includes('.')) s.input += '.'; }
  else if (s.input.replace(/[^0-9]/g,'').length < 10) s.input = s.input === '0' ? key : s.input === '-0' ? `-${key}` : s.input + key;
  s.value = register(s.input); s.operandReady = true; s.justEvaluated = false; s.entered = false; s.computed = false;
  if (!s.worksheet) s.label = '';
}
function operator(s: CalculatorState, op: BinaryOperator): void {
  if (s.memoryPending === 'STO') { s.memoryOperator = op; return; }
  const current = s.frames.at(-1)!;
  if (!s.operandReady) { if (current.operators.length) current.operators[current.operators.length-1] = op; return; }
  current.values.push(s.value);
  while (current.operators.length && precedence(current.operators.at(-1)!,s.settings.calculation) >= precedence(op,s.settings.calculation)) reduceFrame(current);
  current.operators.push(op); s.value = current.values.at(-1)!; s.input = null; s.operandReady = false; s.justEvaluated = false;
  requireValue(s.frames.reduce((n,f)=>n+f.operators.length,0) <= 8,'Too many pending operations.',3);
}
function closeParen(s: CalculatorState): void {
  requireValue(s.frames.length > 1,'No open parenthesis.');
  const current = s.frames.at(-1)!; if (s.operandReady) current.values.push(s.value);
  requireValue(current.values.length > 0,'Empty parentheses.');
  while (current.operators.length) reduceFrame(current);
  const value = current.values[0]!; s.frames.pop(); put(s,value); s.justEvaluated = false;
}
function equals(s: CalculatorState): void {
  const input = {frames:clone(s.frames),current:s.value,constant:clone(s.constant)};
  while (s.frames.length > 1) closeParen(s);
  const current = s.frames[0]!;
  if (s.constant && !current.operators.length && s.constant.operand !== null) {
    const operand = s.constant.percent ? register(dec(s.value).times(s.constant.operand).div(100)) : s.constant.operand;
    put(s,binary(s.constant.operator,s.value,operand));
  } else {
    if (s.constant && s.constant.operand === null) s.constant.operand = s.value;
    if (s.operandReady) current.values.push(s.value);
    else if (current.operators.length) current.values.push(current.values.at(-1) ?? s.value);
    while (current.operators.length) reduceFrame(current);
    if (current.values.length) put(s,current.values.at(-1)!);
  }
  s.frames = [frame()]; s.justEvaluated = true; event(s,s.worksheet ? `${s.worksheet}.arithmetic` : 'arithmetic',input);
}
function doTVM(s: CalculatorState, key: TVMTarget): void {
  if (s.memoryPending === 'RCL') { put(s,s.tvm[key]); s.memoryPending = null; }
  else if (s.computePending && !s.worksheet) {
    const inputs = clone(s.tvm), result = unwrap(calculateTVM(key,s.tvm)); s.tvm[key] = result; put(s,result); s.computePending = false; s.justEvaluated = true; event(s,`TVM.${key}`,inputs);
  } else { s.tvm[key] = register(s.value); s.lastAnswer = s.value; s.input = null; s.entered = true; s.computed = false; s.justEvaluated = true; }
  s.label = key === 'IY' ? 'I/Y' : key;
}
function clearEntry(s: CalculatorState): void {
  s.error = null; s.second = false; s.inverse = false; s.hyperbolic = false; s.computePending = false; s.memoryPending = null; s.memoryOperator = null; s.constant = null;
  s.clearCount++;
  if (s.worksheet && s.clearCount >= 2) { clearExpression(s); refresh(s); return; }
  if (s.input === null || !s.operandReady || s.clearCount >= 2) clearExpression(s);
  s.input = null; s.value = '0'; s.operandReady = true; s.entered = false; s.computed = false;
}
function apply(s: CalculatorState, key: Key): void {
  if (key === 'ON_OFF') {
    if (s.power === 'sleep') { s.power = 'on'; return; }
    if (s.power === 'off') { s.power = 'on'; return; }
    quit(s); s.error = null; s.power = 'off'; return;
  }
  if (s.power !== 'on') return;
  if (s.error && key !== 'CE_C') return;
  if (key === 'SECOND') { s.second = !s.second; return; }
  const secondary = s.second; s.second = false;
  if (key !== 'CE_C') s.clearCount = 0;
  const action = secondary ? SECONDARY[key] ?? key : key;
  if (s.constant && !['K','EQUALS','DOT','SIGN','PERCENT'].includes(action) && !/^\d$/.test(action)) s.constant = null;
  if (action === 'QUIT') { quit(s); return; }
  if (action === 'RESET') { s.resetPending = true; s.label = 'RST ?'; s.input = null; return; }
  if (s.resetPending) { if (action === 'ENTER') Object.assign(s,createInitialState()); return; }
  if (action === 'CE_C') { clearEntry(s); return; }
  if (action === 'CLR_WORK') { if (s.worksheet) clearWorksheet(s); else quit(s); return; }
  if (action === 'CLR_TVM') { if (!s.worksheet) { for (const id of ['N','IY','PV','PMT','FV'] as const) s.tvm[id] = '0'; quit(s); } return; }
  if (['PYCY','BGN','AMORT','CF','NPV','IRR','BOND','DEPR','DATA','STAT','PERCENT_CHANGE','ICONV','DATE','PROFIT','BREAKEVEN','MEM','FORMAT'].includes(action)) { openWorksheet(s,action as Worksheet); return; }
  if (action === 'UP' || action === 'DOWN') { navigate(s,action === 'UP' ? -1 : 1); return; }
  if (action === 'DEL' || action === 'INS') { insertDelete(s,action === 'INS'); return; }
  if (action === 'SET') { setField(s); return; }
  if (action === 'CPT') { if (s.worksheet) computeField(s); else s.computePending = true; return; }
  if (action === 'ENTER') { if (s.frames.some(f=>f.operators.length)) equals(s); enterField(s); return; }
  if (action === 'INV') { s.inverse = !s.inverse; return; }
  if (action === 'HYP') { s.hyperbolic = !s.hyperbolic; return; }
  if (action === 'STO' || action === 'RCL') { s.memoryPending = action; s.memoryOperator = null; return; }
  if (action === 'ANS') { put(s,s.lastAnswer); s.justEvaluated = false; return; }
  if (/^\d$/.test(action) && s.memoryPending) {
    const i = Number(action);
    if (s.memoryPending === 'STO') s.memory[i] = s.memoryOperator ? binary(s.memoryOperator,s.memory[i]!,s.value) : register(s.value);
    else put(s,s.memory[i]!);
    s.input = null; s.memoryPending = null; s.memoryOperator = null; return;
  }
  if (/^\d$/.test(action) || action === 'DOT') { digit(s,action); return; }
  if (action === 'SIGN') {
    if (s.input !== null) s.input = s.input.startsWith('-') ? s.input.slice(1) : '-'+s.input;
    s.value = register(dec(s.value).neg()); return;
  }
  if (action === 'BACKSPACE') {
    if (s.input !== null) { s.input = s.input.slice(0,-1); if (!s.input || s.input === '-') s.input = '0'; s.value = register(s.input); } return;
  }
  if (['N','IY','PV','PMT','FV'].includes(action)) { doTVM(s,action as TVMTarget); return; }
  if (action === 'XPY') { put(s,register(dec(s.value).times(s.tvm.PY))); return; }
  if (action === 'ROUND') { put(s,roundDisplay(s.value,s.settings)); s.justEvaluated = true; return; }
  if (action === 'RAND') {
    if (s.memoryPending === 'STO') { requireValue(dec(s.value).isInteger() && dec(s.value).gt(0),'Random seed must be a positive integer.'); s.randomSeed = dec(s.value).mod(2147483646).toNumber() || 1; s.memoryPending = null; }
    else { s.randomSeed = s.randomSeed * 16807 % 2147483647; put(s,register(dec(s.randomSeed).div(2147483647))); s.justEvaluated = true; }
    return;
  }
  if (action === 'K') { const op = s.frames.at(-1)!.operators.at(-1); requireValue(!!op,'Enter an operation before storing a constant.'); s.constant = {operator:op,operand:s.operandReady ? s.value : null,percent:false}; return; }
  if (action === 'PERCENT') {
    const current = s.frames.at(-1)!, op = current.operators.at(-1), left = current.values.at(-1);
    if (s.constant) { s.constant.percent = true; s.constant.operand = s.value; }
    const result = (op === 'ADD' || op === 'SUBTRACT') && left !== undefined ? dec(left).times(s.value).div(100) : op === 'DIVIDE' ? dec(s.value).div(100) : dec(s.value).div(100);
    put(s,register(result)); return;
  }
  if (action === 'LPAREN' || action === 'RPAREN' || action === 'POWER') {
    if (s.inverse || s.hyperbolic) { const trig = action === 'LPAREN' ? 'SIN' : action === 'RPAREN' ? 'COS':'TAN'; put(s,unary(trig,s.value,s.settings,s.inverse,s.hyperbolic)); s.inverse = false; s.hyperbolic = false; s.justEvaluated = false; return; }
    if (action === 'LPAREN') {
      if (s.operandReady && (s.input !== null || s.justEvaluated || s.frames.at(-1)!.values.length)) operator(s,'MULTIPLY');
      requireValue(s.frames.length <= 15,'Too many parentheses.',3); s.frames.push(frame()); s.input = null; s.value = '0'; s.operandReady = false; s.justEvaluated = false; return;
    }
    if (action === 'RPAREN') { closeParen(s); return; }
  }
  if (OPERATORS.includes(action as BinaryOperator)) { operator(s,action as BinaryOperator); return; }
  if (action === 'EQUALS') { equals(s); return; }
  if (['SQRT','SQUARE','RECIPROCAL','LN','EXP','FACTORIAL','SIN','COS','TAN'].includes(action)) {
    const inputs = {value:s.value,operation:action,inverse:s.inverse,hyperbolic:s.hyperbolic};
    put(s,unary(action,s.value,s.settings,s.inverse,s.hyperbolic)); s.inverse = false; s.hyperbolic = false; s.justEvaluated = !s.frames.some(f=>f.operators.length); event(s,`math.${action}`,inputs); return;
  }
}

/** Pure reducer. Failed operations roll back changes and expose a structured error. */
export function pressKey(state: CalculatorState, key: Key): CalculatorState {
  const next = clone(state); next.events = [];
  const outcome = attempt(() => { requireValue(KEYS.includes(key),'Unknown physical key.'); apply(next,key); return next; });
  if (outcome.ok) return outcome.value;
  const failed = clone(state); failed.events = []; failed.second = false; failed.computePending = false; failed.error = outcome.error; return failed;
}
/** The app calls this after its own inactivity timer. No timers or platform APIs live here. */
export function autoPowerDown(state: CalculatorState): CalculatorState { const next = clone(state); next.events = []; if (next.power === 'on') next.power = 'sleep'; return next; }
export function pressKeys(state: CalculatorState, keys: readonly Key[]): CalculatorState { return keys.reduce(pressKey,state); }
/** Enter a decimal value from a host clipboard without truncating it to ten typed digits.
 * This edits the current entry; ENTER still commits prompted worksheet fields. */
export function pasteValue(state: CalculatorState, text: string): CalculatorState {
  const next = clone(state); next.events = [];
  const outcome = attempt(() => {
    requireValue(next.power === 'on' && !next.error && !next.resetPending, 'Turn on the calculator and clear any error before pasting.');
    const field = currentField(next);
    requireValue(!field || field.access === 'enter' || field.access === 'both', 'Select an editable entry before pasting.');
    requireValue(typeof text === 'string' && text.length <= 200 && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()), 'Paste a single decimal number.');
    const value = register(text.trim());
    if (next.justEvaluated) clearExpression(next);
    put(next,value); next.justEvaluated = false;
    if (!value.includes('e') && value.replace(/[^0-9]/g,'').length <= 10) next.input = value;
    next.second = false; next.inverse = false; next.hyperbolic = false; next.computePending = false;
    next.memoryPending = null; next.memoryOperator = null; next.clearCount = 0;
    if (!next.worksheet) next.label = '';
    return next;
  });
  if (outcome.ok) return outcome.value;
  const failed = clone(state); failed.events = []; failed.error = outcome.error; return failed;
}
export function getSnapshot(state: CalculatorState) {
  const s = clone(state), field = currentField(s); let display: string;
  if (s.power !== 'on') display = '';
  else if (s.error) display = `Error ${s.error.code}`;
  else if (s.resetPending) display = 'RST ?';
  else if (s.input !== null) display = s.settings.separators === 'EUR' ? s.input.replace('.',',') : s.input;
  else if (field?.date && !s.justEvaluated && !s.frames.some(f=>f.operators.length)) display = displayDate(fieldValue(s),s.settings.date);
  else if (field?.date && s.computed) display = `${displayDate(fieldValue(s),s.settings.date)} ${weekday(fieldValue(s))}`;
  else if (field?.access === 'setting') {
    display = fieldValue(s);
    if (s.worksheet === 'BOND' && field.id === 'frequency') display += '/Y';
    if (s.worksheet === 'DEPR' && ['DB','DBX'].includes(display)) display += ` ${s.sheets.DEPR.factor}`;
  } else display = formatNumber(s.value,s.settings);
  return {
    display, label:s.label, value:s.value, error:s.error,
    activeVariable:field?.id ?? (['N','I/Y','PV','PMT','FV'].includes(s.label) ? s.label.replace('/','') : null),
    context:s.worksheet ? `${s.worksheet}.${field?.id ?? ''}` : s.label ? `TVM.${s.label === 'I/Y' ? 'IY':s.label}` : 'calculator',
    indicators:{second:s.second,inverse:s.inverse,hyperbolic:s.hyperbolic,compute:s.computePending || field?.access === 'compute' || field?.access === 'both',enter:s.resetPending || field?.access === 'enter' || field?.access === 'both',set:field?.access === 'setting',up:!!s.worksheet,down:!!s.worksheet,bgn:s.tvm.timing === 'BGN',rad:s.settings.angle === 'RAD',entered:s.entered,computed:s.computed,constant:!!s.constant,
      insert:s.worksheet === 'CF' ? s.index > 0 && s.cashflows.flows.length < 24 : s.worksheet === 'DATA' && s.data.length < 50,
      delete:s.worksheet === 'CF' ? s.index > 0 && Math.floor((s.index-1)/2) < s.cashflows.flows.length : s.worksheet === 'DATA' && Math.floor(s.index/2) < s.data.length,
      negative:s.input?.startsWith('-') ?? dec(s.value).lt(0),equals:!!s.label && !s.resetPending},
    stored:{tvm:s.tvm,memory:s.memory,worksheets:s.sheets,cashflows:s.cashflows,data:s.data},settings:s.settings,events:s.events
  };
}
