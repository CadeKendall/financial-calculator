import {createInitialState,pressKey,pasteValue,getSnapshot,serializeState,restoreState,KEY_ROWS,SECONDARY,formatNumber} from '/dist/index.js';
import {expressionFromState,updateExpression,expressionText,validExpression} from './expression.js';
import {initialTVMNotes,updateTVMNotes,validTVMNotes,tvmReminder,THEMES,COLOR_FIELDS,validTheme,inkFor,lighterScreen} from './preferences.js';
import {bindHold} from './hold.js';
import {bindRestartGesture} from './restart-gesture.js';
import {createResetAnimation,createFaceplateView} from './reset-animation.js';
import {createJournal,worksheetNames} from './journal.js';
import {resolveHelp} from './help-content.js';
import {createHelpSheet} from './help-sheet.js';
import {createFlip} from './flip.js';
import {createTapSequence} from './tap-sequence.js';
import {createDialogMotion} from './dialog-motion.js';
import {canCyclePrecision,nextPreviewDecimals,validPreviewDecimals,previewSnapshot} from './display-precision.js';
const storageKey='ba-ii-plus-preview-v1';
let state=createInitialState(), persistence=true, keyboardEditing=false;
try { const saved=localStorage.getItem(storageKey); if(saved){const restored=restoreState(saved);if(restored.ok)state=restored.value;} }catch{persistence=false;}
// The browser preview is always on; older engine sessions may have saved it off.
if(state.power!=='on')state=pressKey(state,'ON_OFF');
let lastHelpAction='';
let expression=expressionFromState(state);
try {
  const saved=JSON.parse(localStorage.getItem(`${storageKey}-expression`)||'null');
  if(saved?.session===localStorage.getItem(storageKey) && validExpression(saved.trace))expression=saved.trace;
}catch{/* A missing/old display trail does not affect the calculator session. */}
let tvmNotes=initialTVMNotes(state),copied=null,theme={...THEMES[0]},toast='',toastTimer=null,copyRequest=0,displayDecimals=null;
try{
  const saved=JSON.parse(localStorage.getItem(`${storageKey}-ui`)||'null');
  if(saved?.version===1){
    if(saved.tvmSession===JSON.stringify(state.tvm) && validTVMNotes(saved.tvmNotes))tvmNotes=saved.tvmNotes;
    if(typeof saved.copied==='string' && saved.copied.length<=150 && /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(saved.copied) && Number.isFinite(Number(saved.copied)))copied=saved.copied;
    if(validTheme(saved.theme))theme={...saved.theme};
    if(validPreviewDecimals(saved.displayDecimals))displayDecimals=saved.displayDecimals;
  }
}catch{/* Ignore invalid UI preferences; calculator registers are validated separately. */}
let savedHistory=null;
try{const raw=localStorage.getItem(`${storageKey}-history`);if(raw && raw.length<=4000000)savedHistory=JSON.parse(raw);}catch{/* Invalid history must not prevent calculation. */}
const journal=createJournal({serializeState,restoreState},savedHistory);
const checkpoint=()=>journal.checkpoint(state,expression,tvmNotes);
const labels={ON_OFF:'ON/OFF',SECOND:'2ND',UP:'↑',DOWN:'↓',BACKSPACE:'→',IY:'I/Y',PERCENT:'%',SQRT:'√x',SQUARE:'x²',RECIPROCAL:'1/x',DIVIDE:'÷',LPAREN:'(',RPAREN:')',POWER:'yˣ',MULTIPLY:'×',SUBTRACT:'−',ADD:'+',EQUALS:'=',CE_C:'CE/C',DOT:'.',SIGN:'+/−'};
const secondaryLabels={XPY:'xP/Y',PYCY:'P/Y',CLR_TVM:'CLR TVM',EXP:'eˣ',FACTORIAL:'x!',PERCENT_CHANGE:'Δ%',BREAKEVEN:'BRKEVN',NPR:'nPr',NCR:'nCr',CLR_WORK:'CLR WORK'};
const names={UP:'Up',DOWN:'Down',BACKSPACE:'Backspace',SECOND:'2nd',ON_OFF:'On or off',SIGN:'Change sign',DOT:'Decimal point',DIVIDE:'Divide',MULTIPLY:'Multiply',SUBTRACT:'Subtract',ADD:'Add',EQUALS:'Equals',SQRT:'Square root',SQUARE:'Square',RECIPROCAL:'Reciprocal',POWER:'Power',LPAREN:'Left parenthesis',RPAREN:'Right parenthesis',CE_C:'Clear entry or calculation'};
const keypad=document.querySelector('#keypad');
const copyTaps=createTapSequence({single:copyCurrent,triple:clearCopied});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('.copy-key'))copyTaps.reset();});
for(const key of KEY_ROWS.flat()){
  const b=document.createElement('button');b.type='button';b.dataset.key=key;b.className='key';
  if(/^\d$/.test(key)||['DOT','SIGN'].includes(key))b.classList.add('numeric');
  if(['N','IY','PV','PMT','FV'].includes(key))b.classList.add('finance');
  if(['ADD','SUBTRACT','MULTIPLY','DIVIDE','EQUALS'].includes(key))b.classList.add('operator');
  if(['CPT','ENTER','ON_OFF','CE_C','STO','RCL'].includes(key))b.classList.add('small');
  if(key==='SECOND'){b.classList.add('secondary-key');b.setAttribute('aria-pressed','false');}
  const secondary=SECONDARY[key], secondaryText=secondaryLabels[secondary]||secondary||'';
  b.setAttribute('aria-label',names[key]||labels[key]||key);b.title=secondary?`${labels[key]||key} · 2ND: ${secondaryText}`:labels[key]||key;
  const top=document.createElement('span');top.className='secondary';top.textContent=secondaryText;top.setAttribute('aria-hidden','true');
  const face=document.createElement('span');face.className='face';face.textContent=labels[key]||key;face.setAttribute('aria-hidden','true');
  b.append(top,face);
  if(key==='ON_OFF'){
    b.classList.add('define-key');b.setAttribute('aria-label','Define current screen');b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-controls','define-dialog');b.title='Explain the current field or function';face.textContent='Define';
    b.addEventListener('click',()=>{keyboardEditing=false;definitionSheet.open();});
  }else if(key==='RCL'){
    b.classList.add('copy-key','secondary-key');b.setAttribute('aria-label','Copy value; hold to paste');b.title='Copy full value. Hold to paste the last value copied here. Keyboard: Shift+Enter pastes.';
    face.textContent='Copy';const small=document.createElement('small');small.textContent='Paste (hold)';face.append(small);
    bindHold(b,{tap:()=>copyTaps.tap(),hold:()=>{copyTaps.reset();pasteCopied();},onCancel:copyTaps.reset});
  }else b.addEventListener('click',()=>{keyboardEditing=false;dispatch(key);});
  keypad.append(b);
}
const calculator=document.querySelector('.calculator'),front=document.querySelector('#calculator-front'),back=document.querySelector('#calculator-back'),corner=document.querySelector('#theme-corner');
const getPreview=()=>previewSnapshot(state,displayDecimals,getSnapshot);
const definitionSheet=createHelpSheet({calculator,getContext:()=>resolveHelp(state,getPreview(),lastHelpAction)});
const historyDialog=document.querySelector('#history-dialog'),undoButton=document.querySelector('#undo-action'),historyButton=document.querySelector('#history-action');
const precisionButton=document.querySelector('#precision-action');
precisionButton.addEventListener('click',()=>{
  if(!canCyclePrecision(state,getSnapshot(state)))return;
  keyboardEditing=false;displayDecimals=nextPreviewDecimals(displayDecimals??state.settings.decimals);
  savePreferences();announce(`Showing ${displayDecimals} decimal places.`);
});
const historyMotion=createDialogMotion(historyDialog);
function alignScreenZones(){
  const screen=document.querySelector('.screen-actions'),bounds=screen.getBoundingClientRect();if(!bounds.width)return;
  const enter=keypad.querySelector('[data-key="ENTER"]').getBoundingClientRect(),irr=keypad.querySelector('[data-key="IRR"]').getBoundingClientRect();
  screen.style.setProperty('--undo-edge',`${enter.left+enter.width/2-bounds.left}px`);
  screen.style.setProperty('--history-edge',`${irr.right-bounds.left}px`);
  const answer=document.querySelector('#display').getBoundingClientRect();
  screen.style.setProperty('--answer-top',`${answer.top-bounds.top}px`);
  screen.style.setProperty('--answer-height',`${Math.max(44,answer.height)}px`);
}
new ResizeObserver(alignScreenZones).observe(keypad);
new ResizeObserver(alignScreenZones).observe(document.querySelector('.display-shell'));
function saveHistory(){try{localStorage.setItem(`${storageKey}-history`,journal.serialize());}catch{persistence=false;}}
function useCheckpoint(point){
  state=point.state;if(state.power!=='on')state=pressKey(state,'ON_OFF');expression=point.expression;tvmNotes=point.tvmNotes;lastHelpAction='';keyboardEditing=false;saveSession();
}
function undo(){
  const previous=journal.undo();if(!previous){announce('Nothing to undo yet.');return;}
  useCheckpoint(previous);announce(`Undid ${previous.label}.`);
}
undoButton.addEventListener('click',undo);
function renderHistory(){
  const list=document.querySelector('#history-list');list.replaceChildren();
  const entries=journal.entries;
  if(!entries.length){const empty=document.createElement('p');empty.className='history-empty';empty.textContent='No calculations yet. Complete a calculation with = or CPT and it will appear here.';list.append(empty);return;}
  for(const entry of entries){
    const article=document.createElement('article');article.className='history-entry';
    const time=document.createElement('time');time.dateTime=new Date(entry.time).toISOString();time.textContent=new Date(entry.time).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    const title=document.createElement('h3');title.textContent=entry.title;
    const value=document.createElement('p');value.className='history-result';value.textContent=entry.display;
    const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Inputs & full precision';
    const settings=document.createElement('p');settings.className='history-settings';settings.textContent=entry.settings;
    const inputs=document.createElement('dl');inputs.className='history-inputs';
    for(const row of [{label:'Stored result',value:entry.result},...entry.inputs]){const item=document.createElement('div'),label=document.createElement('dt'),number=document.createElement('dd');label.textContent=row.label;number.textContent=row.value;item.append(label,number);inputs.append(item);}
    details.append(summary,settings,inputs);
    const reopen=document.createElement('button');reopen.type='button';reopen.className='history-restore';reopen.textContent='Reopen calculation';reopen.setAttribute('aria-label',`Reopen ${entry.title}`);
    reopen.addEventListener('click',()=>{
      if(historyDialog.dataset.closing)return;
      const restored=journal.restore(entry.checkpoint);if(!restored){announce('This saved calculation could not be reopened.');return;}
      journal.remember(checkpoint(),entry.checkpoint,'reopening a calculation');useCheckpoint(restored);historyMotion.close();announce('Calculation reopened. Undo returns to your previous work.');
    });
    article.append(time,title,value,details,reopen);list.append(article);
  }
}
historyButton.addEventListener('click',()=>{keyboardEditing=false;renderHistory();historyMotion.open();});
document.querySelector('#close-history').addEventListener('click',()=>historyMotion.close());
function savePreferences(){
  try{localStorage.setItem(`${storageKey}-ui`,JSON.stringify({version:1,tvmSession:JSON.stringify(state.tvm),tvmNotes,copied,theme,displayDecimals}));}catch{persistence=false;}
}
function saveSession(){
  try{const saved=serializeState(state);if(saved.ok){localStorage.setItem(storageKey,saved.value);localStorage.setItem(`${storageKey}-expression`,JSON.stringify({session:saved.value,trace:expression}));}}catch{persistence=false;}
  savePreferences();
}
function announce(message){
  toast=message;if(toastTimer)clearTimeout(toastTimer);render();toastTimer=setTimeout(()=>{toast='';render();},4500);
}
function clearCopied(){
  ++copyRequest;copied=null;savePreferences();announce('Copied value cleared.');
}
async function copyCurrent(){
  if(state.power!=='on'||state.error||state.resetPending){announce('Show a valid value before copying.');return;}
  const request=++copyRequest,value=state.value;copied=value;savePreferences();
  announce('Copying full value…');
  try{await navigator.clipboard.writeText(value);if(request===copyRequest)announce('Copied to clipboard. Hold Copy to paste here.');}
  catch{if(request===copyRequest)announce('Saved here. Browser clipboard unavailable; hold Copy to paste.');}
}
function pasteCopied(){
  if(copied===null){announce('Copy a value first, then hold this key to paste it.');return;}
  const before=state,next=pasteValue(state,copied);
  if(next.error){announce(next.error.message);return;}
  const previous=checkpoint();state=next;expression=updateExpression(expression,before,state,'PASTE','PASTE');keyboardEditing=false;lastHelpAction='';journal.remember(previous,checkpoint(),'paste');saveSession();
  const snap=getSnapshot(state);announce(state.worksheet?`Pasted. Press ENTER to store in ${snap.label}.`:'Pasted. Choose a TVM key or continue calculating.');
}
function renderTVM(){
  const container=document.querySelector('#tvm-reminder'),items=tvmReminder(tvmNotes,state);container.hidden=!items.length;container.replaceChildren();
  for(const item of items){
    const cell=document.createElement('span');cell.className=`tvm-item${item.computed?' computed':''}${item.value==='?'?' unknown':''}`;
    const label=document.createElement('span');label.className='tvm-label';label.textContent=`${item.label}=`;
    const value=document.createElement('strong');value.textContent=item.value==='?'||item.value===''?item.value:formatNumber(item.value,{decimals:9,separators:state.settings.separators});
    cell.title=`${item.label}=${item.value}${item.computed?' (computed)':''}`;cell.setAttribute('aria-label',cell.title);cell.append(label,value);container.append(cell);
  }
  const preview=document.querySelector('#copied-value');preview.hidden=copied===null;preview.textContent=copied===null?'':`Copied  ${copied}`;preview.title=copied===null?'':`Last copied value: ${copied}`;
}
function applyTheme(){
  document.documentElement.style.setProperty('--app-case',theme.case);
  document.documentElement.style.setProperty('--app-screen',theme.screen);
  document.documentElement.style.setProperty('--app-screen-ink',inkFor(theme.screen));
  document.documentElement.style.setProperty('--app-case-ink',inkFor(theme.case));
  for(const field of Object.keys(COLOR_FIELDS)){calculator.style.setProperty(`--${field}`,theme[field]);calculator.style.setProperty(`--${field}-ink`,inkFor(theme[field]));}
  const helpSurface=lighterScreen(theme.screen);calculator.style.setProperty('--help-surface',helpSurface);calculator.style.setProperty('--help-ink',inkFor(helpSurface));
  for(const button of document.querySelectorAll('.theme-preset')){const preset=THEMES.find(item=>item.id===button.dataset.theme);button.setAttribute('aria-pressed',String(Object.keys(COLOR_FIELDS).every(key=>theme[key]===preset[key])));}
  for(const field of Object.keys(COLOR_FIELDS)){const input=document.querySelector(`#theme-${field}`);if(input && input.value!==theme[field])input.value=theme[field];}
}
function changeTheme(next){theme={...next};applyTheme();savePreferences();}
const flip=createFlip({element:calculator,showBack(){
  back.style.minHeight=`${front.offsetHeight}px`;front.hidden=true;back.hidden=false;corner.hidden=true;corner.setAttribute('aria-expanded','true');
  calculator.setAttribute('aria-label','Calculator back — Theme center');
},showFront(){
  back.hidden=true;front.hidden=false;corner.hidden=false;corner.setAttribute('aria-expanded','false');calculator.setAttribute('aria-label','Financial calculator');
}});
async function openThemes(){
  if(await flip.toBack())document.querySelector('#return-front').focus({preventScroll:true});
}
async function closeThemes(){
  if(await flip.toFront()){alignScreenZones();corner.focus({preventScroll:true});}
}
bindHold(corner,{tap:event=>event.detail===0?openThemes():announce('Hold the upper-right corner to open the theme center.'),hold:openThemes});
const restartScreen=document.querySelector('.display-shell');
// Removing worksheet rows must not pull the seated panel's keys upward. Native
// flex layout already fills the LCD; the browser keeps its pre-reset LCD height
// until the next viewport change, when responsive sizing takes ownership again.
window.addEventListener('resize',()=>{restartScreen.style.minHeight='';});
function restartCalculator(){
  const previous=checkpoint();
  if(!document.documentElement.classList.contains('native-shell'))restartScreen.style.minHeight=`${restartScreen.getBoundingClientRect().height}px`;
  state=createInitialState();expression=expressionFromState(state);tvmNotes=initialTVMNotes(state);
  lastHelpAction='';keyboardEditing=false;displayDecimals=null;copied=null;++copyRequest;copyTaps.reset();
  journal.remember(previous,checkpoint(),'calculator restart');saveSession();
  announce('Restarted. History kept. Undo to restore.');
  calculator.dispatchEvent(new Event('calculator-restarted',{bubbles:true}));
}
const resetAnimation=createResetAnimation({reset:restartCalculator,
  createView:()=>createFaceplateView(calculator,front),
  lock(locked){calculator.inert=locked;calculator.classList.toggle('resetting',locked);calculator.setAttribute('aria-busy',String(locked));},
  onComplete:()=>calculator.dispatchEvent(new Event('calculator-restart-finished',{bubbles:true})),
});
// Capture also blocks synthetic/trailing clicks and keyboard actions during seating.
for(const type of ['pointerdown','touchstart','touchmove','click','wheel'])calculator.addEventListener(type,event=>{
  if(resetAnimation.locked){event.preventDefault();event.stopImmediatePropagation();}
},{capture:true,passive:false});
bindRestartGesture(calculator,{enabled:()=>back.hidden&&!flip.busy&&!resetAnimation.busy&&!definitionSheet.isOpen&&!historyDialog.open,onRestart:()=>resetAnimation.run()});
document.querySelector('#return-front').addEventListener('click',closeThemes);
for(const preset of THEMES){
  const button=document.createElement('button');button.type='button';button.className='theme-preset';button.dataset.theme=preset.id;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',`${preset.name} theme`);
  const swatches=document.createElement('span');swatches.className='theme-swatches';swatches.setAttribute('aria-hidden','true');
  for(const field of ['case','screen','numbers','accent']){const swatch=document.createElement('i');swatch.style.background=preset[field];swatches.append(swatch);}
  button.append(swatches,document.createTextNode(preset.name));button.addEventListener('click',()=>changeTheme(preset));document.querySelector('#theme-presets').append(button);
}
for(const [field,label] of Object.entries(COLOR_FIELDS)){
  const row=document.createElement('label');row.htmlFor=`theme-${field}`;row.textContent=label;
  const input=document.createElement('input');input.type='color';input.id=`theme-${field}`;input.value=theme[field];input.addEventListener('input',()=>changeTheme({...theme,id:'custom',name:'Custom',[field]:input.value}));row.append(input);document.querySelector('#theme-colors').append(row);
}
document.querySelector('#reset-theme').addEventListener('click',()=>changeTheme(THEMES[0]));
applyTheme();
function render(){
  const snap=getPreview();document.body.classList.toggle('off',state.power!=='on');
  const display=document.querySelector('#display');display.textContent=snap.display;
  renderTVM();
  const trail=document.querySelector('#expression');trail.textContent=expressionText(expression);trail.scrollLeft=trail.scrollWidth;
  display.style.fontSize=snap.display.length>15?'24px':snap.display.length>12?'29px':'';
  document.querySelector('#variable').textContent=snap.label;
  document.querySelector('#context').textContent=worksheetNames[state.worksheet]||'';
  document.querySelector('#mode').textContent=`${snap.settings.calculation} · ${snap.settings.angle}`;
  document.querySelector('#bgn-indicator').hidden=!snap.indicators.bgn;
  const names={second:'2ND',inverse:'INV',hyperbolic:'HYP',compute:'CPT',enter:'ENTER',set:'SET',up:'↑',down:'↓',rad:'RAD',entered:'✓',computed:'*',constant:'K'};
  document.querySelector('#indicators').textContent=Object.entries(names).filter(([k])=>snap.indicators[k]).map(([,v])=>v).join('  ');
  document.querySelector('[data-key="SECOND"]').setAttribute('aria-pressed',String(state.second));
  document.querySelector('#status').textContent=toast||(state.error?`${state.error.message} Define can help.`:state.resetPending?'Press ENTER to reset all values. 2ND → CPT cancels.':state.second?'Choose a gold secondary function.':state.worksheet?'Use ↑ / ↓ to move. ENTER stores; Define explains.':'Enter a number or choose a worksheet.');
  document.querySelector('#save-status').textContent=persistence?(window.__BA_NATIVE__?'Saved on this device':window.__BA_DESKTOP__?'Saved on this computer':'Saved on this browser'):'Session saving unavailable';
  undoButton.disabled=!journal.canUndo;
  document.querySelector('#history-count').textContent=journal.count||'';
  precisionButton.disabled=!canCyclePrecision(state,snap);
  const places=displayDecimals??state.settings.decimals;
  precisionButton.setAttribute('aria-label',`Change displayed decimals: ${places} now; ${nextPreviewDecimals(places)} next`);
  alignScreenZones();
}
function dispatch(key){
  copyTaps.reset();
  const previous=checkpoint(),before=state,action=before.second ? SECONDARY[key]||key : key;
  state=pressKey(state,key);
  if(before.settings.decimals!==state.settings.decimals || (before.resetPending&&action==='ENTER') || (before.worksheet==='FORMAT'&&action==='CLR_WORK'))displayDecimals=null;
  lastHelpAction=['LPAREN','RPAREN','POWER','SIN','COS','TAN'].includes(action)&&(before.inverse||before.hyperbolic)?(before.hyperbolic?'HYP':'INV'):action;
  tvmNotes=updateTVMNotes(tvmNotes,before,state,action);toast='';
  expression=updateExpression(expression,before,state,key,action);
  const next=checkpoint();journal.remember(previous,next,labels[key]||key);
  if(state.events.length){for(const event of state.events)journal.record(event,next,getSnapshot(state).display);saveHistory();}
  saveSession();
  render();
}
document.addEventListener('keydown',event=>{
  if(flip.busy||resetAnimation.locked){event.preventDefault();return;}
  if(historyDialog.open || definitionSheet.isOpen)return;
  if(!back.hidden){if(event.key==='Escape'){event.preventDefault();closeThemes();}return;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&!event.shiftKey&&!event.altKey&&!event.target.closest('input,select,textarea')){event.preventDefault();if(!event.repeat)undo();return;}
  if(event.target.closest('.screen-zone') && (event.key===' ' || event.key==='Enter'&&!keyboardEditing))return;
  if(event.target.closest('#theme-corner,.copy-key')){
    if(['Enter',' '].includes(event.key))return;
  }
  if(event.key==='Tab')keyboardEditing=false;
  if(event.ctrlKey||event.metaKey||event.altKey||event.repeat||event.target.closest('summary,a,input,select,textarea'))return;
  if((event.key===' '||event.key==='Enter'&&!keyboardEditing)&&event.target.tagName==='BUTTON')return;
  const map={'+':'ADD','-':'SUBTRACT','*':'MULTIPLY','/':'DIVIDE','=':'EQUALS','.':'DOT',',':'DOT','(':'LPAREN',')':'RPAREN','^':'POWER',Enter:state.worksheet||state.resetPending?'ENTER':'EQUALS',Escape:'CE_C',Backspace:'BACKSPACE',ArrowUp:'UP',ArrowDown:'DOWN',F2:'SECOND'};
  const key=/^\d$/.test(event.key)?event.key:map[event.key];if(!key)return;
  event.preventDefault();keyboardEditing=event.key!=='Enter';dispatch(key);
  const button=keypad.querySelector(`[data-key="${key}"]`);button?.classList.add('pressed');setTimeout(()=>button?.classList.remove('pressed'),100);
});
render();

