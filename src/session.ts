import { attempt, dec, integer, register, requireValue, type Result } from './numeric.js';
import { clone, createInitialState, type CalculatorState } from './state.js';
import { OPERATORS } from './math.js';
import { fields } from './worksheet-control.js';
import { dateParts } from './dates.js';
const SCHEMA = 'ba-ii-plus-engine';
const enums: Record<string,readonly string[]> = {
  power:['on','off','sleep'], 'settings.angle':['DEG','RAD'], 'settings.date':['US','EUR'], 'settings.separators':['US','EUR'], 'settings.calculation':['CHAIN','AOS'],
  'tvm.timing':['END','BGN'], 'sheets.BOND.basis':['ACT','360'], 'sheets.BOND.frequency':['1','2'], 'sheets.DATE.basis':['ACT','360'],
  'sheets.DEPR.method':['SL','SYD','DB','DBX','SLF','DBF'], 'sheets.STAT.model':['LIN','Ln','EXP','PWR','1-V']
};
function object(x: unknown): x is Record<string,unknown> { return !!x && typeof x === 'object' && !Array.isArray(x); }
function validateShape(value: unknown, template: unknown, path = ''): void {
  if (template === null) return; // Specific nullable unions are validated below.
  requireValue(typeof value === typeof template && value !== null, `Invalid session field: ${path}.`);
  if (Array.isArray(template)) { requireValue(Array.isArray(value),`Expected array: ${path}.`); return; }
  if (object(template)) {
    requireValue(object(value),`Expected object: ${path}.`);
    requireValue(Object.keys(value).length === Object.keys(template).length && Object.keys(template).every(k=>Object.hasOwn(value,k)),`Unexpected/missing fields in ${path || 'state'}.`);
    for (const k of Object.keys(template)) validateShape(value[k],template[k],path ? `${path}.${k}` : k);
  } else if (typeof value === 'string') {
    requireValue(value.length <= 200,`Session string too long: ${path}.`);
    if (enums[path]) requireValue(enums[path]!.includes(value),`Invalid setting: ${path}.`);
    else if (/\.(SDT|RDT|DT1|DT2)$/.test(path)) dateParts(value);
    else if (path !== 'label') { requireValue(/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value),`Invalid numeric string: ${path}.`); register(value); }
  } else if (typeof value === 'number') requireValue(Number.isFinite(value),`Nonfinite number: ${path}.`);
}
function validateState(value: unknown): CalculatorState {
  const template = createInitialState(); validateShape(value,template);
  const s = value as CalculatorState;
  requireValue(s.version === 1,'Unsupported state version.');
  integer(s.settings.decimals,0,9,'DEC'); integer(s.randomSeed,1,2147483646,'Random seed'); integer(s.clearCount,0,1000000,'Clear count');
  requireValue(s.input === null || typeof s.input === 'string' && /^-?\d{1,10}(\.\d{0,10})?$/.test(s.input) && s.input.replace(/[^0-9]/g,'').length <= 10,'Invalid pending number.');
  if (s.input !== null) requireValue(dec(s.input).eq(s.value),'Pending entry and numeric value disagree.');
  requireValue(s.memoryPending === null || ['STO','RCL'].includes(s.memoryPending),'Invalid memory operation.');
  requireValue(s.memoryOperator === null || OPERATORS.includes(s.memoryOperator),'Invalid memory operator.');
  const worksheets = ['PYCY','BGN','AMORT','CF','NPV','IRR','BOND','DEPR','DATA','STAT','PERCENT_CHANGE','ICONV','DATE','PROFIT','BREAKEVEN','MEM','FORMAT'];
  requireValue(s.worksheet === null || worksheets.includes(s.worksheet),'Invalid worksheet.');
  integer(s.index,0,s.worksheet ? fields(s).length-1 : 0,'Worksheet index');
  requireValue(s.memory.length === 10 && s.memory.every(v=>typeof v === 'string'),'Invalid memory registers.'); s.memory.forEach(register);
  requireValue(s.frames.length > 0 && s.frames.length <= 16,'Invalid parentheses stack.');
  let ops = 0;
  for (const f of s.frames) {
    requireValue(object(f) && Object.keys(f).length === 2 && Array.isArray(f.values) && Array.isArray(f.operators),'Invalid arithmetic frame.');
    requireValue(f.values.length <= 9 && f.operators.every(op=>OPERATORS.includes(op)),'Invalid pending operation.');
    requireValue(f.values.length === f.operators.length || f.values.length === f.operators.length+1,'Inconsistent expression stack.');
    f.values.forEach(v=>{requireValue(typeof v === 'string','Invalid operand.'); register(v);}); ops += f.operators.length;
  }
  requireValue(ops <= 8,'Too many pending operations.');
  requireValue(s.cashflows.flows.length <= 24,'Too many cash flows.');
  for (const f of s.cashflows.flows) { requireValue(object(f) && Object.keys(f).length === 2 && typeof f.amount === 'string','Invalid cash flow.'); register(f.amount); integer(f.frequency,1,9999,'Frequency'); }
  requireValue(s.data.length <= 50,'Too many data points.');
  for (const p of s.data) { requireValue(object(p) && Object.keys(p).length === 2 && typeof p.x === 'string' && typeof p.y === 'string','Invalid data point.'); register(p.x); register(p.y); }
  if (s.constant !== null) {
    requireValue(object(s.constant) && Object.keys(s.constant).length === 3 && OPERATORS.includes(s.constant.operator) && typeof s.constant.percent === 'boolean','Invalid constant.');
    requireValue(s.constant.operand === null || typeof s.constant.operand === 'string','Invalid constant operand.'); if (s.constant.operand !== null) register(s.constant.operand);
  }
  if (s.error !== null) { requireValue(object(s.error) && Object.keys(s.error).length === 3 && typeof s.error.kind === 'string' && typeof s.error.message === 'string' && s.error.message.length <= 1000,'Invalid error state.'); integer(s.error.code,1,8,'Error code'); }
  integer(s.tvm.PY,1,9999,'P/Y'); integer(s.tvm.CY,1,9999,'C/Y');
  return s;
}
/** Events are transient and deliberately excluded so reopening cannot replay history entries. */
export function serializeState(state: CalculatorState): Result<string> {
  return attempt(() => { const copy = clone(state); copy.events = []; validateState(copy); return JSON.stringify({schema:SCHEMA,version:1,state:copy}); });
}
export function restoreState(json: string): Result<CalculatorState> {
  return attempt(() => {
    requireValue(typeof json === 'string' && json.length <= 1000000,'Session exceeds the size limit.');
    const envelope: unknown = JSON.parse(json);
    requireValue(object(envelope) && Object.keys(envelope).length === 3 && envelope.schema === SCHEMA && envelope.version === 1,'Unrecognized session schema or version.');
    const s = clone(validateState(envelope.state)); s.events = []; return s;
  });
}
