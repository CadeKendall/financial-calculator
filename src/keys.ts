/** Row-major physical layout. IDs are independent of translated labels and rendering. */
export const KEY_ROWS = [
  ['CPT','ENTER','UP','DOWN','ON_OFF'], ['SECOND','CF','NPV','IRR','BACKSPACE'],
  ['N','IY','PV','PMT','FV'], ['PERCENT','SQRT','SQUARE','RECIPROCAL','DIVIDE'],
  ['INV','LPAREN','RPAREN','POWER','MULTIPLY'], ['LN','7','8','9','SUBTRACT'],
  ['STO','4','5','6','ADD'], ['RCL','1','2','3','EQUALS'], ['CE_C','0','DOT','SIGN']
] as const;
export type Key = typeof KEY_ROWS[number][number];
export const KEYS: readonly Key[] = KEY_ROWS.flat();
export const SECONDARY: Partial<Record<Key, string>> = {
  CPT:'QUIT', ENTER:'SET', UP:'DEL', DOWN:'INS', N:'XPY', IY:'PYCY', PV:'AMORT', PMT:'BGN', FV:'CLR_TVM',
  PERCENT:'K', DIVIDE:'RAND', INV:'HYP', LPAREN:'SIN', RPAREN:'COS', POWER:'TAN', MULTIPLY:'FACTORIAL',
  LN:'EXP', '7':'DATA', '8':'STAT', '9':'BOND', SUBTRACT:'NPR', STO:'ROUND', '4':'DEPR', '5':'PERCENT_CHANGE',
  '6':'BREAKEVEN', ADD:'NCR', '1':'DATE', '2':'ICONV', '3':'PROFIT', EQUALS:'ANS', CE_C:'CLR_WORK', '0':'MEM', DOT:'FORMAT', SIGN:'RESET'
};
