// Generate a local-only, manually triggered end-to-end gesture check.
import './smoke-html.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {createInitialState} from '../../dist/index.js';
const html=await readFile('../web/mobile-smoke.html','utf8');
const script=`
const run=document.createElement('button');run.textContent='Run restart integration check';run.id='run-restart-check';run.style='position:fixed;bottom:0;left:0;z-index:50';document.body.append(run);
run.onclick=async()=>{
 run.disabled=true;
 const key=k=>document.querySelector('[data-key="'+k+'"]').click();
 for(const k of ['2','ADD','3','EQUALS','7','7','PV','STO','4','CF','8','0','0','SIGN','ENTER','DOWN','9','0','0','ENTER','NPV','1','2','ENTER'])key(k);
 const name='ba-ii-plus-preview-v1',before=localStorage.getItem(name),history=localStorage.getItem(name+'-history');
 const target=document.querySelector('.display-shell');
 const points=[[60,110],[240,280],[240,110],[60,280]];
 const fire=(type,p)=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'mouse',pointerId:91,button:0,clientX:p[0],clientY:p[1]}));
 fire('pointerdown',points[0]);
 for(let i=0;i<3;i++)for(let j=1;j<=20;j++){
  fire('pointermove',[points[i][0]+(points[i+1][0]-points[i][0])*j/20,points[i][1]+(points[i+1][1]-points[i][1])*j/20]);
  await new Promise(resolve=>setTimeout(resolve,15));
 }
 const finished=new Promise(resolve=>document.querySelector('.calculator').addEventListener('calculator-restart-finished',resolve,{once:true}));
 fire('pointerup',points[3]);
 await finished;
 const state=JSON.parse(localStorage.getItem(name)).state;
 const report={allRegistersDefault:JSON.stringify(state)===JSON.stringify(${JSON.stringify(createInitialState())}),historyUnchanged:history===localStorage.getItem(name+'-history'),historyCount:JSON.parse(history).entries.length,display:document.querySelector('#display').textContent,layersRemoved:document.querySelectorAll('.reset-scene').length===0,inputUnlocked:!document.querySelector('.calculator').inert};
 await new Promise(resolve=>setTimeout(resolve,550));document.querySelector('#undo-action').click();
 report.undoRestoresRegisters=localStorage.getItem(name)===before;
 const output=document.createElement('pre');output.id='restart-result';output.textContent=JSON.stringify(report);output.style='position:fixed;bottom:25px;left:0;z-index:51;background:white;color:black;font-size:12px;white-space:pre-wrap';document.body.append(output);
};`;
await writeFile('../web/mobile-smoke.html',html.replace('</body>',()=>`<script>${script}</script></body>`));
