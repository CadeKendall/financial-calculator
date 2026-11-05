import { dec, integer, register, requireValue, unwrap } from './numeric.js';
import { clone, createInitialState, SHEET_DEFAULTS, type CalculatorState, type SheetName, type Worksheet } from './state.js';
import { calculateTVM, calculateAmortization } from './tvm.js';
import { calculateNPV, calculateIRR } from './cashflow.js';
import { calculateBond, type BondValues } from './bonds.js';
import { calculateDepreciation, type DepreciationValues } from './depreciation.js';
import { calculateStatistics, predictStatistics, type Regression } from './statistics.js';
import { calculateDate, parseCalculatorDate, dateParts, type DayBasis } from './dates.js';
import { calculateBreakeven, calculateInterestConversion, calculatePercentChange, calculateProfit } from './worksheets.js';
export interface Field { id: string; label: string; access: 'enter' | 'compute' | 'both' | 'auto' | 'setting'; date?: boolean }
const f = (id: string, access: Field['access'] = 'enter', label = id, date = false): Field => ({ id, label, access, date });
export function fields(s: CalculatorState): Field[] {
  switch (s.worksheet) {
    case 'PYCY': return [f('PY','enter','P/Y'), f('CY','enter','C/Y')];
    case 'BGN': return [f('timing','setting','')];
    case 'FORMAT': return [f('decimals','enter','DEC'),f('angle','setting',''),f('date','setting',''),f('separators','setting',''),f('calculation','setting','')];
    case 'CF': {
      const out = [f('CF0')]; for (let i = 1; i <= Math.min(24, s.cashflows.flows.length + 1); i++) out.push(f(`C${i}`,'enter',`C${String(i).padStart(2,'0')}`), f(`F${i}`,'enter',`F${String(i).padStart(2,'0')}`)); return out;
    }
    case 'NPV': return [f('I'),f('NPV','compute')];
    case 'IRR': return [f('IRR','compute')];
    case 'AMORT': return [f('P1'),f('P2'),f('BAL','auto'),f('PRN','auto'),f('INT','auto')];
    case 'BOND': return [f('SDT','enter','SDT',true),f('CPN'),f('RDT','enter','RDT',true),f('RV'),f('basis','setting',''),f('frequency','setting',''),f('YLD','both'),f('PRI','both'),f('AI','auto')];
    case 'DEPR': return [f('method','setting',''),f('LIF'),f(s.sheets.DEPR.method === 'SLF' ? 'DT1' : 'M01','enter',s.sheets.DEPR.method === 'SLF' ? 'DT1' : 'M01',s.sheets.DEPR.method === 'SLF'),f('CST'),f('SAL'),f('YR'),f('DEP','auto'),f('RBV','auto'),f('RDV','auto')];
    case 'DATA': {
      const out: Field[] = []; for (let i = 0; i < Math.min(50, s.data.length + 1); i++) out.push(f(`X${i}`,'enter',`X${String(i + 1).padStart(2,'0')}`),f(`Y${i}`,'enter',`Y${String(i + 1).padStart(2,'0')}`)); return out;
    }
    case 'STAT': {
      const out = [f('model','setting',''),f('n','auto'),f('meanX','auto','x̄'),f('Sx','auto'),f('sigmaX','auto','σx')];
      if (s.sheets.STAT.model !== '1-V') out.push(f('meanY','auto','ȳ'),f('Sy','auto'),f('sigmaY','auto','σy'),f('a','auto'),f('b','auto'),f('r','auto'),f('X','both',"X′"),f('Y','both',"Y′"));
      out.push(f('sumX','auto','Σx'),f('sumX2','auto','Σx²'));
      if (s.sheets.STAT.model !== '1-V') out.push(f('sumY','auto','Σy'),f('sumY2','auto','Σy²'),f('sumXY','auto','Σxy')); return out;
    }
    case 'PERCENT_CHANGE': return [f('OLD','both'),f('NEW','both'),f('CHANGE','both','%CH'),f('PERIODS','both','#PD')];
    case 'ICONV': return [f('NOM','both'),f('EFF','both'),f('CY','enter','C/Y')];
    case 'DATE': return [f('DT1','both','DT1',true),f('DT2','both','DT2',true),f('DBD','both'),f('basis','setting','')];
    case 'PROFIT': return [f('CST','both'),f('SEL','both'),f('MAR','both')];
    case 'BREAKEVEN': return ['FC','VC','P','PFT','Q'].map(id => f(id,'both'));
    case 'MEM': return Array.from({length:10},(_,i)=>f(`M${i}`));
    default: return [];
  }
}
export function currentField(s: CalculatorState): Field | undefined { return fields(s)[s.index]; }
export function fieldValue(s: CalculatorState, field = currentField(s)): string {
  if (!field) return s.value;
  const id = field.id;
  switch (s.worksheet) {
    case 'PYCY': return s.tvm[id as 'PY'|'CY'];
    case 'BGN': return s.tvm.timing;
    case 'FORMAT': return String(s.settings[id as keyof typeof s.settings]);
    case 'CF': if (id === 'CF0') return s.cashflows.initial; return String(id[0] === 'C' ? s.cashflows.flows[Number(id.slice(1))-1]?.amount ?? '0' : s.cashflows.flows[Number(id.slice(1))-1]?.frequency ?? 1);
    case 'DATA': return s.data[Number(id.slice(1))]?.[id[0] === 'X' ? 'x' : 'y'] ?? (id[0] === 'X' ? '0' : '1');
    case 'MEM': return s.memory[Number(id.slice(1))]!;
    case 'STAT': if (field.access === 'auto') { const result = unwrap(calculateStatistics(s.data,s.sheets.STAT.model as Regression)); const v = result[id as keyof typeof result]; requireValue(v !== null && v !== undefined, 'This statistic is undefined for the supplied data.', 1); return v; }
  }
  return (s.sheets[s.worksheet as SheetName] as Record<string,string>)[id]!;
}
function dateAsNumber(iso: string, s: CalculatorState): string {
  const [y,m,d] = dateParts(iso), head = s.settings.date === 'US' ? m : d, tail = s.settings.date === 'US' ? d : m;
  return register(`${head}.${String(tail).padStart(2,'0')}${String(y%100).padStart(2,'0')}`);
}
export function refresh(s: CalculatorState): void {
  const field = currentField(s); if (!field) return;
  s.input = null; s.entered = false; s.computed = false; s.label = field.label;
  if (field.access === 'auto' && s.worksheet !== 'STAT') computeField(s);
  const value = fieldValue(s,field);
  if (field.date) s.value = dateAsNumber(value,s);
  else if (field.access !== 'setting') s.value = value;
  s.operandReady = true; s.justEvaluated = false;
  if (field.access === 'auto') {
    s.computed = true;
    if (s.worksheet === 'STAT') event(s,`STAT.${field.id}`,{points:clone(s.data),model:s.sheets.STAT.model});
  }
}
export function openWorksheet(s: CalculatorState, sheet: Worksheet): void {
  s.worksheet = sheet; s.index = 0; s.frames = [{values:[],operators:[]}]; s.computePending = false; s.second = false; s.constant = null;
  refresh(s);
}
export function navigate(s: CalculatorState, direction: number): void {
  const list = fields(s); if (!list.length) return;
  if (s.worksheet === 'DEPR' && direction > 0 && s.index === list.length - 1) s.index = 5;
  else s.index = (s.index + direction + list.length) % list.length;
  s.frames = [{values:[],operators:[]}]; refresh(s);
}
export function event(s: CalculatorState, context: string, inputs: Record<string,unknown>): void {
  s.events.push({type:'calculation-completed',context,result:s.value,inputs:clone(inputs),settings:clone(s.settings)});
  s.lastAnswer = s.value; s.computed = true; s.entered = false;
}
export function computeField(s: CalculatorState): void {
  const field = currentField(s); requireValue(!!field, 'No active worksheet.');
  const id = field.id, sheet = s.worksheet!;
  let result: string | null = null; const inputs: Record<string,unknown> = clone(sheet in s.sheets ? s.sheets[sheet as SheetName] : {});
  switch (sheet) {
    case 'NPV': requireValue(id === 'NPV', 'Select NPV before computing.'); Object.assign(inputs,s.cashflows); result = unwrap(calculateNPV(s.cashflows.initial,s.cashflows.flows,s.sheets.NPV.I)); break;
    case 'IRR': Object.assign(inputs,s.cashflows); result = unwrap(calculateIRR(s.cashflows.initial,s.cashflows.flows)).rate; break;
    case 'AMORT': {
      const a = s.sheets.AMORT;
      if (id === 'P1' || id === 'P2') { const size = dec(a.P2).minus(a.P1).plus(1); a.P1 = register(dec(a.P2).plus(1)); a.P2 = register(dec(a.P1).plus(size).minus(1)); }
      const values = unwrap(calculateAmortization(s.tvm,a.P1,a.P2,s.settings.decimals)); Object.assign(a,values); Object.assign(inputs,{tvm:clone(s.tvm)}); result = a[id as keyof typeof a]; break;
    }
    case 'BOND': requireValue(['PRI','YLD','AI'].includes(id), 'Select PRI, YLD, or AI.'); Object.assign(s.sheets.BOND,unwrap(calculateBond(id as 'PRI'|'YLD'|'AI',{...s.sheets.BOND,basis:s.sheets.BOND.basis as DayBasis,frequency:Number(s.sheets.BOND.frequency) as 1|2}))); result = fieldValue(s); break;
    case 'DEPR':
      if (id === 'YR') { s.sheets.DEPR.YR = register(dec(s.sheets.DEPR.YR).plus(1)); result = s.sheets.DEPR.YR; }
      else { requireValue(['DEP','RBV','RDV'].includes(id), 'Select a depreciation result.'); Object.assign(s.sheets.DEPR,unwrap(calculateDepreciation(s.sheets.DEPR as unknown as DepreciationValues,s.settings.decimals))); result = fieldValue(s); }
      break;
    case 'STAT':
      if (id === 'X' || id === 'Y') { result = unwrap(predictStatistics(id,id === 'X' ? s.sheets.STAT.Y : s.sheets.STAT.X,s.data,s.sheets.STAT.model as Regression)); s.sheets.STAT[id] = result; }
      else { requireValue(field.access === 'auto', 'Select a statistics result.'); result = fieldValue(s); } Object.assign(inputs,{points:clone(s.data)}); break;
    case 'PERCENT_CHANGE': result = unwrap(calculatePercentChange(id as 'OLD'|'NEW'|'CHANGE'|'PERIODS',s.sheets.PERCENT_CHANGE)); break;
    case 'ICONV': requireValue(id !== 'CY','C/Y is enter-only.'); result = unwrap(calculateInterestConversion(id as 'NOM'|'EFF',s.sheets.ICONV)); break;
    case 'DATE': requireValue(id !== 'basis','Select a date or DBD.'); result = unwrap(calculateDate(id as 'DT1'|'DT2'|'DBD',{...s.sheets.DATE,basis:s.sheets.DATE.basis as DayBasis})); break;
    case 'PROFIT': result = unwrap(calculateProfit(id as 'CST'|'SEL'|'MAR',s.sheets.PROFIT)); break;
    case 'BREAKEVEN': result = unwrap(calculateBreakeven(id as 'FC'|'VC'|'P'|'PFT'|'Q',s.sheets.BREAKEVEN)); break;
    default: requireValue(false,'This variable cannot be computed.');
  }
  if (sheet in s.sheets && id in s.sheets[sheet as SheetName]) (s.sheets[sheet as SheetName] as Record<string,string>)[id] = result!;
  s.value = field.date ? dateAsNumber(result!,s) : result!; s.input = null; s.operandReady = true; s.justEvaluated = true;
  event(s,`${sheet}.${id}`,inputs);
}
export function enterField(s: CalculatorState): void {
  const field = currentField(s); if (!field) return;
  const id = field.id;
  if (s.worksheet === 'DEPR' && id === 'method' && ['DB','DBX'].includes(s.sheets.DEPR.method)) {
    const value = register(s.input ?? s.value); requireValue(dec(value).gt(0),'Declining balance factor must be positive.',4); s.sheets.DEPR.factor = value; s.input = null; s.entered = true; return;
  }
  requireValue(field.access === 'enter' || field.access === 'both','This variable is not editable.');
  const value = field.date ? parseCalculatorDate(s.input ?? s.value,s.settings.date) : register(s.input ?? s.value);
  if (s.worksheet === 'PYCY') { integer(value,1,9999,id); s.tvm[id as 'PY'|'CY'] = value; if (id === 'PY') s.tvm.CY = value; }
  else if (s.worksheet === 'FORMAT') s.settings.decimals = integer(value,0,9,'DEC');
  else if (s.worksheet === 'CF') {
    if (id === 'CF0') s.cashflows.initial = value;
    else { const index = Number(id.slice(1))-1; if (!s.cashflows.flows[index]) s.cashflows.flows[index] = {amount:'0',frequency:1};
      if (id[0] === 'C') s.cashflows.flows[index]!.amount = value;
      else s.cashflows.flows[index]!.frequency = integer(dec(value).toDecimalPlaces(0).toString(),1,9999,'Frequency');
    }
  } else if (s.worksheet === 'DATA') { const index = Number(id.slice(1)); if (!s.data[index]) s.data[index] = {x:'0',y:'1'}; s.data[index]![id[0] === 'X' ? 'x':'y'] = value; }
  else if (s.worksheet === 'MEM') s.memory[Number(id.slice(1))] = value;
  else {
    if (s.worksheet === 'AMORT') integer(value,1,9999,id);
    if (s.worksheet === 'ICONV' && id === 'CY') requireValue(dec(value).gt(0),'C/Y must be positive.',4);
    if (s.worksheet === 'DEPR') {
      if (id === 'YR') integer(value,1,9999,'Year');
      if (id === 'LIF') requireValue(dec(value).gt(0),'Life must be positive.',4);
      if (id === 'M01') requireValue(dec(value).gte(1)&&dec(value).lt(13),'Month must be in [1,13).',4);
      if (id === 'CST'||id === 'SAL') requireValue(dec(value).gte(0),'Cost/salvage cannot be negative.',4);
    }
    (s.sheets[s.worksheet as SheetName] as Record<string,string>)[id] = value;
  }
  refresh(s); s.lastAnswer = s.value; s.entered = true; s.computed = false;
}
export function setField(s: CalculatorState): void {
  const field = currentField(s); if (!field || field.access !== 'setting') return;
  const id = field.id;
  const rotate = (choices: string[], current: string): string => choices[(choices.indexOf(current)+1)%choices.length]!;
  if (s.worksheet === 'BGN') s.tvm.timing = s.tvm.timing === 'END' ? 'BGN':'END';
  else if (s.worksheet === 'FORMAT') {
    if (id === 'angle') s.settings.angle = s.settings.angle === 'DEG' ? 'RAD':'DEG';
    if (id === 'date') s.settings.date = s.settings.date === 'US' ? 'EUR':'US';
    if (id === 'separators') s.settings.separators = s.settings.separators === 'US' ? 'EUR':'US';
    if (id === 'calculation') s.settings.calculation = s.settings.calculation === 'CHAIN' ? 'AOS':'CHAIN';
  } else if (s.worksheet === 'DEPR') s.sheets.DEPR.method = rotate(s.settings.date === 'EUR' || s.settings.separators === 'EUR' ? ['SL','SYD','DB','DBX','SLF','DBF'] : ['SL','SYD','DB','DBX'],s.sheets.DEPR.method);
  else if (s.worksheet === 'STAT') s.sheets.STAT.model = rotate(['LIN','Ln','EXP','PWR','1-V'],s.sheets.STAT.model);
  else if (s.worksheet === 'BOND' && id === 'frequency') s.sheets.BOND.frequency = s.sheets.BOND.frequency === '2' ? '1':'2';
  else if ((s.worksheet === 'BOND' || s.worksheet === 'DATE') && id === 'basis') { const obj = s.sheets[s.worksheet]; obj.basis = obj.basis === 'ACT' ? '360':'ACT'; }
  refresh(s);
}
export function insertDelete(s: CalculatorState, insert: boolean): void {
  if (s.worksheet === 'CF' && s.index > 0) {
    const i = Math.floor((s.index-1)/2); if (insert) { requireValue(s.cashflows.flows.length < 24,'Cash-flow storage is full.',4); s.cashflows.flows.splice(i,0,{amount:'0',frequency:1}); } else s.cashflows.flows.splice(i,1);
    s.index = Math.min(1+i*2,fields(s).length-2); refresh(s);
  } else if (s.worksheet === 'DATA') {
    const i = Math.floor(s.index/2); if (insert) { requireValue(s.data.length < 50,'Data storage is full.',4); s.data.splice(i,0,{x:'0',y:'1'}); } else s.data.splice(i,1);
    s.index = Math.min(i*2,fields(s).length-2); refresh(s);
  }
}
export function clearWorksheet(s: CalculatorState): void {
  const sheet = s.worksheet;
  if (sheet === 'FORMAT') s.settings = createInitialState().settings;
  else if (sheet === 'PYCY') { s.tvm.PY = '1'; s.tvm.CY = '1'; }
  else if (sheet === 'BGN') s.tvm.timing = 'END';
  else if (sheet === 'CF') s.cashflows = {initial:'0',flows:[]};
  else if (sheet === 'DATA') s.data = [];
  else if (sheet === 'MEM') s.memory.fill('0');
  else if (sheet && sheet in s.sheets) {
    const preserved: Record<string,string> = {};
    if (sheet === 'ICONV') preserved.CY = s.sheets.ICONV.CY;
    if (sheet === 'DATE') preserved.basis = s.sheets.DATE.basis;
    if (sheet === 'DEPR') { const d = s.sheets.DEPR; Object.assign(preserved,{method:d.method,M01:d.M01,DT1:d.DT1,factor:d.factor}); }
    Object.assign(s.sheets[sheet as SheetName],clone(SHEET_DEFAULTS[sheet as SheetName]),preserved);
  }
  s.index = 0; if (sheet) refresh(s);
}
