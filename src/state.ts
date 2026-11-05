import type { CalculationError, FormatSettings } from './numeric.js';
import { frame, type Frame, type BinaryOperator } from './math.js';
export type Worksheet = 'PYCY' | 'BGN' | 'AMORT' | 'CF' | 'NPV' | 'IRR' | 'BOND' | 'DEPR' | 'DATA' | 'STAT' | 'PERCENT_CHANGE' | 'ICONV' | 'DATE' | 'PROFIT' | 'BREAKEVEN' | 'MEM' | 'FORMAT';
export const SHEET_DEFAULTS = {
  AMORT: { P1:'1', P2:'1', BAL:'0', PRN:'0', INT:'0' },
  NPV: { I:'0', NPV:'0' }, IRR: { IRR:'0' },
  BOND: { SDT:'1990-12-31', CPN:'0', RDT:'1990-12-31', RV:'100', basis:'ACT', frequency:'2', YLD:'0', PRI:'0', AI:'0' },
  DEPR: { method:'SL', LIF:'1', M01:'1', DT1:'1990-12-31', CST:'0', SAL:'0', YR:'1', factor:'200', DEP:'0', RBV:'0', RDV:'0' },
  STAT: { model:'LIN', X:'0', Y:'0' },
  PERCENT_CHANGE: { OLD:'0', NEW:'0', CHANGE:'0', PERIODS:'1' },
  ICONV: { NOM:'0', EFF:'0', CY:'1' }, DATE: { DT1:'1990-12-31', DT2:'1990-12-31', DBD:'0', basis:'ACT' },
  PROFIT: { CST:'0', SEL:'0', MAR:'0' }, BREAKEVEN: { FC:'0', VC:'0', P:'0', PFT:'0', Q:'0' }
} as const;
export type SheetName = keyof typeof SHEET_DEFAULTS;
export type Sheets = { -readonly [S in SheetName]: { -readonly [F in keyof typeof SHEET_DEFAULTS[S]]: string } };
export interface CalculationEvent { type: 'calculation-completed'; context: string; result: string; inputs: Record<string, unknown>; settings: FormatSettings }
export interface CalculatorState {
  version: 1; power: 'on' | 'off' | 'sleep'; value: string; input: string | null; label: string;
  settings: FormatSettings; second: boolean; inverse: boolean; hyperbolic: boolean;
  computePending: boolean; resetPending: boolean; operandReady: boolean; justEvaluated: boolean; clearCount: number;
  entered: boolean; computed: boolean; error: CalculationError | null;
  frames: Frame[]; lastAnswer: string;
  constant: { operator: BinaryOperator; operand: string | null; percent: boolean } | null;
  memoryPending: 'STO' | 'RCL' | null; memoryOperator: BinaryOperator | null;
  memory: string[]; randomSeed: number;
  tvm: { N:string; IY:string; PV:string; PMT:string; FV:string; PY:string; CY:string; timing:'END' | 'BGN' };
  worksheet: Worksheet | null; index: number; sheets: Sheets;
  cashflows: { initial: string; flows: { amount: string; frequency: number }[] };
  data: { x: string; y: string }[]; events: CalculationEvent[];
}
export function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
export function createInitialState(): CalculatorState {
  return {
    version:1, power:'on', value:'0', input:null, label:'', settings:{ decimals:2, angle:'DEG', date:'US', separators:'US', calculation:'CHAIN' },
    second:false, inverse:false, hyperbolic:false, computePending:false, resetPending:false, operandReady:true, justEvaluated:false, clearCount:0,
    entered:false, computed:false, error:null, frames:[frame()], lastAnswer:'0', constant:null, memoryPending:null, memoryOperator:null,
    memory:Array(10).fill('0'), randomSeed:1, tvm:{ N:'0', IY:'0', PV:'0', PMT:'0', FV:'0', PY:'1', CY:'1', timing:'END' },
    worksheet:null, index:0, sheets:clone(SHEET_DEFAULTS) as Sheets, cashflows:{ initial:'0', flows:[] }, data:[], events:[]
  };
}
