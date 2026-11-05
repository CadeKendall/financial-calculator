export const validPreviewDecimals=value=>Number.isInteger(value)&&value>=2&&value<=6;
export const nextPreviewDecimals=value=>validPreviewDecimals(value)&&value<6?value+1:2;
const dateFields=new Set(['DATE.DT1','DATE.DT2','BOND.SDT','BOND.RDT','DEPR.DT1']);
export function canCyclePrecision(state,snapshot){
  return state.power==='on'&&!state.error&&!state.resetPending&&state.input===null&&!snapshot.indicators.set&&state.worksheet!=='FORMAT'&&!dateFields.has(snapshot.context);
}
/** Formatting a copy keeps FORMAT/ROUND and worksheet rounding independent. */
export function previewSnapshot(state,decimals,getSnapshot){
  const snapshot=getSnapshot(state);
  if(!validPreviewDecimals(decimals)||!canCyclePrecision(state,snapshot))return snapshot;
  return {...snapshot,display:getSnapshot({...state,settings:{...state.settings,decimals}}).display};
}
