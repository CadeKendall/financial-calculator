export const TVM_KEYS=['N','IY','PV','PMT','FV'];
export const TVM_LABELS={N:'N',IY:'I/Y',PV:'PV',PMT:'PMT',FV:'FV'};
export function initialTVMNotes(state){
  // Existing sessions did not record explicit zero entries. Nonzero values can be recovered.
  return {entered:TVM_KEYS.filter(key=>Number(state.tvm[key])!==0),computed:null};
}
export function validTVMNotes(notes){
  return notes && Array.isArray(notes.entered) && notes.entered.length<=5 && new Set(notes.entered).size===notes.entered.length && notes.entered.every(key=>TVM_KEYS.includes(key)) && (notes.computed===null || TVM_KEYS.includes(notes.computed) && !notes.entered.includes(notes.computed));
}
export function updateTVMNotes(notes,before,after,action){
  const next={entered:[...notes.entered],computed:notes.computed};
  if(after.error || before.power!=='on')return next;
  if(before.resetPending && action==='ENTER' || action==='CLR_TVM' && !before.worksheet)return {entered:[],computed:null};
  const result=after.events.find(event=>event.context.startsWith('TVM.'));
  if(result){const key=result.context.slice(4);if(next.computed && next.computed!==key && !next.entered.includes(next.computed))next.entered.push(next.computed);next.entered=next.entered.filter(id=>id!==key);next.computed=key;return next;}
  const assigned=TVM_KEYS.includes(action) && before.memoryPending!=='RCL' && !before.computePending;
  if(assigned){next.computed=null;if(!next.entered.includes(action))next.entered.push(action);}
  else if(['PY','CY','timing'].some(key=>before.tvm[key]!==after.tvm[key]))next.computed=null;
  return next;
}
export function tvmReminder(notes,state){
  if(!notes.entered.length && !notes.computed)return [];
  return TVM_KEYS.map(key=>({key,label:TVM_LABELS[key],value:notes.entered.includes(key)||notes.computed===key ? state.tvm[key] : notes.entered.length===4 ? '?' : '',computed:notes.computed===key}));
}
export const THEMES=[
  {id:'classic',name:'Classic',case:'#272a29',screen:'#c8d3b8',keys:'#383c39',numbers:'#d6d8d0',finance:'#f0f1e9',accent:'#d8c382'},
  {id:'midnight',name:'Midnight',case:'#17232d',screen:'#c6ddd8',keys:'#2c4354',numbers:'#416175',finance:'#a9c1cc',accent:'#e5ae63'},
  {id:'porcelain',name:'Porcelain',case:'#e5e0d4',screen:'#ebeedb',keys:'#c8c0af',numbers:'#fffaf0',finance:'#eeeade',accent:'#b86843'},
  {id:'graphite',name:'Graphite',case:'#24262c',screen:'#d9dce4',keys:'#373b47',numbers:'#686d7c',finance:'#e6e9f2',accent:'#a9bdf0'}
];
export const COLOR_FIELDS={case:'Case',screen:'Screen',keys:'Function keys',numbers:'Number keys',finance:'TVM keys',accent:'Accent keys'};
export function validTheme(theme){return theme && Object.keys(COLOR_FIELDS).every(key=>typeof theme[key]==='string' && /^#[0-9a-f]{6}$/i.test(theme[key]));}
export function inkFor(hex){
  const rgb=hex.slice(1).match(/../g).map(part=>parseInt(part,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const luminance=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  return (luminance+.05)/.05 >= 1.05/(luminance+.05) ? '#111512' : '#ffffff';
}
export function lighterScreen(hex){
  return '#'+hex.slice(1).match(/../g).map(part=>Math.round(parseInt(part,16)*.8+255*.2).toString(16).padStart(2,'0')).join('');
}
