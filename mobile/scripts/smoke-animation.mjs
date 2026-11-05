// Local-only visual and interaction checks; never shipped in the Expo bundle.
import './smoke-html.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {createInitialState} from '../../dist/index.js';
const desktop=process.argv.includes('--desktop');
let html=await readFile(desktop?'../web/index.html':'../web/mobile-smoke.html','utf8');
if(desktop)html=html.replace('<head>','<head><script>const testStorage=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:key=>testStorage.get(key)??null,setItem:(key,value)=>testStorage.set(key,String(value)),removeItem:key=>testStorage.delete(key)}});</script>');
const script=`
import {createFaceplateView} from '/web/reset-animation.js';
const calculator=document.querySelector('.calculator'),front=document.querySelector('#calculator-front');
const key=k=>document.querySelector('[data-key="'+k+'"]').click();
const name='ba-ii-plus-preview-v1',wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const toolbar=document.createElement('div');toolbar.id='animation-checks';toolbar.style='position:fixed;left:0;bottom:0;z-index:80;display:flex;gap:3px;flex-wrap:wrap;font:10px Arial;background:#fff;color:#111;max-width:100%';document.body.append(toolbar);
const button=(label,run)=>{const b=document.createElement('button');b.textContent=label;b.onclick=run;toolbar.append(b);return b;};
const output=document.createElement('pre');output.id='animation-result';output.hidden=true;toolbar.append(output);
const show=value=>{output.textContent=JSON.stringify(value);output.hidden=false;output.style='white-space:pre-wrap;font-size:9px;max-width:98vw;margin:0';};
let view=null;
function cleanup(){view?.dispose();view=null;}
function stroke(){
 const target=document.querySelector('.display-shell'),r=target.getBoundingClientRect();
 const points=[[r.left+35,r.top+35],[r.left+180,r.top+170],[r.left+180,r.top+35],[r.left+35,r.top+170]];
 const fire=(type,p)=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'mouse',pointerId:91,button:0,clientX:p[0],clientY:p[1]}));
 fire('pointerdown',points[0]);points.slice(1).forEach(p=>fire('pointermove',p));fire('pointerup',points[3]);
}
for(const time of [0,320,540,800,1160,1420,1500])button(time+'ms',()=>{
 cleanup();output.hidden=true;
 const start=performance.now();view=createFaceplateView(calculator,front);view.play(()=>{});
 const animations=document.querySelector('.reset-scene').getAnimations({subtree:true});
 for(const animation of animations){animation.pause();animation.currentTime=time;}
 const panel=document.querySelector(time===1500?'.reset-panel-in':'.reset-panel-out');
 const source=front.querySelector('#display').getBoundingClientRect(),clone=panel.querySelector('[data-faceplate-part="display"]').getBoundingClientRect();
 toolbar.dataset.frame=String(time);toolbar.dataset.captureMs=String(Math.round(performance.now()-start));
 const elements=[...front.querySelectorAll('.key .face,.display-shell,.calculator-foot,#display,#variable,#status')],copies=[...panel.querySelectorAll('.key .face,.display-shell,.calculator-foot,[data-faceplate-part="display"],[data-faceplate-part="variable"],[data-faceplate-part="status"]')];
 toolbar.dataset.alignError=String(Math.max(...elements.map((element,i)=>{const a=element.getBoundingClientRect(),b=copies[i].getBoundingClientRect();return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.width-b.width),Math.abs(a.height-b.height));})));
});
button('Live check',async()=>{
 cleanup();output.hidden=true;
 for(const k of ['2','ADD','3','EQUALS','7','7','PV','STO','4','CF','8','0','0','SIGN','ENTER','DOWN','9','0','0','ENTER','NPV','1','2','ENTER'])key(k);
 const before=localStorage.getItem(name),history=localStorage.getItem(name+'-history'),theme=JSON.parse(localStorage.getItem(name+'-ui')).theme;
 const bounds=calculator.getBoundingClientRect().toJSON();
 const done=new Promise(resolve=>calculator.addEventListener('calculator-restart-finished',resolve,{once:true}));
 const frames=[];let previous=performance.now(),tracking=true;
 function frame(now){frames.push(now-previous);previous=now;if(tracking)requestAnimationFrame(frame);}requestAnimationFrame(frame);
 const start=performance.now();stroke();
 await wait(350);key('9');document.dispatchEvent(new KeyboardEvent('keydown',{key:'9',bubbles:true,cancelable:true}));stroke();
 const locked=calculator.inert,unchangedBeforeCommit=before===localStorage.getItem(name);
 await done;tracking=false;
 const elapsed=Math.round(performance.now()-start),state=JSON.parse(localStorage.getItem(name)).state;
 const report={elapsed,locked,unchangedBeforeCommit,allRegistersDefault:JSON.stringify(state)===JSON.stringify(${JSON.stringify(createInitialState())}),historyKept:history===localStorage.getItem(name+'-history'),themeKept:JSON.stringify(theme)===JSON.stringify(JSON.parse(localStorage.getItem(name+'-ui')).theme),layersRemoved:!document.querySelector('.reset-scene'),inputUnlocked:!calculator.inert,geometryKept:JSON.stringify(bounds)===JSON.stringify(calculator.getBoundingClientRect().toJSON()),beforeBounds:bounds,afterBounds:calculator.getBoundingClientRect().toJSON(),frames:frames.length,maxFrameMs:Math.round(Math.max(...frames))};
 document.querySelector('#undo-action').click();report.undoRestoresRegisters=localStorage.getItem(name)===before;
 key('2');key('ADD');key('3');key('EQUALS');report.calculatesAfterReset=document.querySelector('#display').textContent==='5.00';
 show(report);
});
button('Close checks',()=>{cleanup();toolbar.hidden=true;});
button('Hide controls',()=>{toolbar.hidden=true;});
`;
await writeFile(desktop?'../web/animation-smoke.html':'../web/mobile-smoke.html',html.replace('</body>',()=>`<script type="module">${script}</script></body>`));

