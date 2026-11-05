import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {execFile} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=8787, address=`http://127.0.0.1:${port}`;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.md':'text/plain; charset=utf-8'};
const server=createServer(async(req,res)=>{
  try{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    const pathname=new URL(req.url,address).pathname;
    let relative=pathname==='/'?'web/index.html':pathname==='/vendor/decimal.mjs'?'node_modules/decimal.js/decimal.mjs':decodeURIComponent(pathname).slice(1);
    if(!/^(web\/|dist\/|node_modules\/decimal\.js\/decimal\.mjs$|COVERAGE\.md$)/.test(relative))throw new Error('Not found');
    const path=resolve(root,relative);
    if(!path.startsWith(root.endsWith(sep)?root:root+sep))throw new Error('Not found');
    const content=await readFile(path);res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:content);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`The calculator may already be running. Open ${address}`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
  console.log(`Calculator ready: ${address}\nKeep this terminal open. Press Ctrl+C to stop.`);
  if(process.argv.includes('--open')&&process.platform==='win32')execFile('explorer.exe',[address],{windowsHide:true},()=>{});
});
