import {readFile,writeFile} from 'node:fs/promises';
const text=await readFile('generated/calculator.ts','utf8');
const html=JSON.parse(text.match(/export const calculatorHtml = ([\s\S]*);\s*$/)[1]);
const mock=`window.__BA_NATIVE__={storage:{},insets:{top:59,bottom:34,left:0,right:0}};
window.ReactNativeWebView={postMessage(raw){const data=JSON.parse(raw);let report=document.querySelector('#native-test-report');if(!report){report=document.createElement('output');report.id='native-test-report';report.hidden=true;document.body.append(report)}report.textContent+=raw+'\\n';if(data.type==='copy')setTimeout(()=>window.__nativeReply(data.id,true),0)}};`;
await writeFile('../web/mobile-smoke.html',html.replace('/*NATIVE_BOOTSTRAP*/',()=>mock));
