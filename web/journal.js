import {validExpression,expressionText} from './expression.js';
import {validTVMNotes} from './preferences.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const labels={IY:'I/Y',PY:'P/Y',CY:'C/Y',timing:'Payment timing',initial:'CF0',frequency:'Frequency',amount:'Amount',current:'Active value',value:'Value',operation:'Operation',inverse:'Inverse',hyperbolic:'Hyperbolic',tvm:'TVM',constant:'Constant',frames:'Pending arithmetic',values:'Values',operators:'Operators'};
export const worksheetNames={PYCY:'Payment frequencies',BGN:'Payment timing',AMORT:'Amortization',CF:'Cash flows',NPV:'NPV',IRR:'IRR',BOND:'Bond',DEPR:'Depreciation',DATA:'Data',STAT:'Statistics',PERCENT_CHANGE:'Percent change',ICONV:'Interest conversion',DATE:'Date',PROFIT:'Profit',BREAKEVEN:'Breakeven',MEM:'Memory',FORMAT:'Format'};

export function inputRows(inputs,target=''){
  const rows=[];
  const operators={ADD:'+',SUBTRACT:'−',MULTIPLY:'×',DIVIDE:'÷',POWER:'^',NPR:'nPr',NCR:'nCr'};
  function visit(value,path){
    if(Array.isArray(value)){value.forEach((item,i)=>visit(item,`${path} ${i+1}`));return;}
    if(value && typeof value==='object'){for(const [key,item] of Object.entries(value))visit(item,[path,labels[key]||key].filter(Boolean).join(' · '));return;}
    rows.push({label:path,value:value===null?'None':typeof value==='boolean'?(value?'Yes':'No'):String(value)});
  }
  for(const [key,value] of Object.entries(inputs)){
    if(key===target)continue; // The old value of the solved variable is not an input.
    if(key==='frames' && Array.isArray(value)){let index=0;value.forEach(frame=>{frame.values.forEach(number=>visit(number,`Operand ${++index}`));if(frame.operators.length)visit(frame.operators.map(op=>operators[op]||op).join(' '),'Operations');});}
    else if(key==='flows' && Array.isArray(value))value.forEach((flow,i)=>{visit(flow.amount,`CF${i+1}`);visit(flow.frequency,`F${i+1}`);});
    else if(key==='points' && Array.isArray(value))value.forEach((point,i)=>{visit(point.x,`X${i+1}`);visit(point.y,`Y${i+1}`);});
    else visit(value,labels[key]||key);
  }
  return rows;
}

export function createJournal({serializeState,restoreState},saved=null){
  let undoStack=[],entries=[];
  function checkpoint(state,expression,tvmNotes){
    const encoded=serializeState(state);
    if(!encoded.ok)throw new Error('Unable to save this calculator state.');
    return {session:encoded.value,expression:clone(expression),tvmNotes:clone(tvmNotes)};
  }
  function restore(point){
    if(!point || !validExpression(point.expression) || !validTVMNotes(point.tvmNotes))return null;
    const decoded=restoreState(point.session);
    return decoded.ok?{state:decoded.value,expression:clone(point.expression),tvmNotes:clone(point.tvmNotes)}:null;
  }
  function validEntry(entry){
    return entry && typeof entry.id==='string' && entry.id.length<100 && typeof entry.title==='string' && entry.title.length<=2000 && typeof entry.result==='string' && entry.result.length<=200 && typeof entry.display==='string' && entry.display.length<=250 && Number.isFinite(entry.time) && entry.time>=0 && entry.time<=8640000000000000 && typeof entry.settings==='string' && entry.settings.length<=250 && Array.isArray(entry.inputs) && entry.inputs.length<=500 && entry.inputs.every(row=>row && typeof row.label==='string' && row.label.length<=250 && typeof row.value==='string' && row.value.length<=500) && restore(entry.checkpoint);
  }
  if(saved?.version===1 && Array.isArray(saved.entries) && saved.entries.length<=50)entries=saved.entries.filter(validEntry).map(clone);
  return {
    checkpoint,restore,
    get canUndo(){return undoStack.length>0;},
    get count(){return entries.length;},
    get entries(){return clone(entries);},
    remember(before,after,label){
      if(JSON.stringify(before)===JSON.stringify(after))return;
      undoStack.push({point:clone(before),label});if(undoStack.length>100)undoStack.shift();
    },
    undo(){const previous=undoStack.pop();return previous?{...restore(previous.point),label:previous.label}:null;},
    record(event,point,display,time=Date.now()){
      const [group,target]=event.context.split('.');
      const arithmetic=group==='arithmetic'||target==='arithmetic';
      const formula=arithmetic?expressionText(point.expression).replace(/\s*=\s*$/,''):'';
      const title=(formula|| (group==='TVM'?`Solve ${labels[target]||target}`:group==='math'?target:`${worksheetNames[group]||group}${target?' · '+target:''}`)).slice(0,2000);
      const entry={id:`${time}-${entries.length}-${Math.random().toString(36).slice(2,9)}`,time,title,result:event.result,display,settings:`${event.settings.calculation} · ${event.settings.angle} · ${event.settings.decimals} decimals · ${event.settings.date} dates`,inputs:inputRows(event.inputs,arithmetic||group==='math'?'':target),checkpoint:clone(point)};
      entries.unshift(entry);entries=entries.slice(0,50);return clone(entry);
    },
    serialize(){return JSON.stringify({version:1,entries});}
  };
}
