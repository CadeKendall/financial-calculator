import {afterEach,describe,expect,it,vi} from 'vitest';
import {isRestartStroke,bindRestartGesture} from '../web/restart-gesture.js';
type Point={x:number,y:number};
const interpolate=(corners:Point[],noise=0)=>corners.slice(1).flatMap((b,index)=>{
  const a=corners[index];return Array.from({length:20},(_,i)=>({x:a.x+(b.x-a.x)*i/20+Math.sin(i*1.7)*noise,y:a.y+(b.y-a.y)*i/20+Math.cos(i*1.1)*noise}));
}).concat(corners.at(-1)!);
const corners=[{x:20,y:30},{x:160,y:30},{x:160,y:180},{x:20,y:180}];
afterEach(()=>vi.unstubAllGlobals());
describe('continuous X restart',()=>{
  it('accepts every starting corner and either connecting edge, with uneven strokes',()=>{
    for(let i=0;i<4;i++)for(const step of [-1,1]){
      const indices=[i,(i+2)%4,(i+2+step+4)%4,(i+step+4)%4];
      const path=indices.map(n=>corners[n]);
      expect(isRestartStroke(interpolate(path),900),indices.join(',')).toBe(true);
      expect(isRestartStroke(interpolate(path.map((p,j)=>({x:p.x+j*6,y:p.y-j*3})),2),1900)).toBe(true);
    }
  });
  it('is independent of location and tolerates moderately tilted, differently sized Xs',()=>{
    const path=[corners[0],corners[2],corners[1],corners[3]];
    for(const scale of [.6,1,2]){
      const transformed=path.map(p=>({x:140+scale*(p.x*Math.cos(.15)-p.y*Math.sin(.15)),y:500+scale*(p.x*Math.sin(.15)+p.y*Math.cos(.15))}));
      expect(isRestartStroke(interpolate(transformed),1300)).toBe(true);
    }
  });
  it('rejects scrolls, Zs, checkmarks, loops, scribbles, tiny crosses and excessive duration',()=>{
    const paths=[
      [{x:50,y:10},{x:52,y:80},{x:49,y:150},{x:51,y:230}],
      [corners[0],corners[1],corners[3],corners[2]],
      [corners[0],{x:60,y:120},corners[1]],
      [...corners,corners[0]],
      [corners[0],corners[2],corners[1],corners[3],corners[2],corners[0]],
      [corners[0],corners[2],corners[1],corners[3]].map(p=>({x:p.x/4,y:p.y/4})),
    ];
    for(const path of paths)expect(isRestartStroke(interpolate(path),1000)).toBe(false);
    const x=interpolate([corners[0],corners[2],corners[1],corners[3]]);
    expect(isRestartStroke(x,0)).toBe(false);expect(isRestartStroke(x,5000)).toBe(false);
    expect(isRestartStroke([{x:NaN,y:1},...x],1000)).toBe(false);
  });
  it('accepts fast sparse strokes and rough rounded turns in every direction',()=>{
    const rough=[{x:0,y:0},{x:35,y:40},{x:82,y:76},{x:100,y:72},{x:108,y:55},{x:103,y:17},{x:91,y:10},{x:76,y:22},{x:45,y:60},{x:-6,y:90}];
    for(const flipX of [-1,1])for(const flipY of [-1,1])for(const reverse of [false,true]){
      const path=rough.map(p=>({x:180+p.x*flipX,y:250+p.y*flipY}));if(reverse)path.reverse();
      expect(isRestartStroke(path,70)).toBe(true);
      expect(isRestartStroke([corners[0],corners[2],corners[1],corners[3]],45)).toBe(true);
    }
  });
  it('accepts a rapid touch stroke after an initially axis-aligned wobble',()=>{
    const f=fixture();f.fire('touchstart',{x:20,y:30});
    expect(f.fire('touchmove',{x:21,y:42}).defaultPrevented).toBe(false);
    expect(f.fire('touchmove',{x:32,y:50}).defaultPrevented).toBe(true);
    f.fire('touchmove',corners[2]);f.fire('touchmove',corners[1]);f.fire('touchend',corners[3]);
    expect(f.restart).toHaveBeenCalledTimes(1);
  });
  it('resets only on release, consumes its trailing click, and permits the next tap',()=>{
    const f=fixture(),path=interpolate([corners[0],corners[2],corners[1],corners[3]]);
    f.fire('touchstart',path[0]);for(const p of path.slice(1))f.fire('touchmove',p);
    expect(f.restart).not.toHaveBeenCalled();f.fire('touchend',path.at(-1)!);
    expect(f.restart).toHaveBeenCalledTimes(1);
    const click=new Event('click',{cancelable:true});f.surface.dispatchEvent(click);expect(click.defaultPrevented).toBe(true);
    f.advance(600);const tap=new Event('click',{cancelable:true});f.surface.dispatchEvent(tap);expect(tap.defaultPrevented).toBe(false);
  });
  it('cancels on a second finger, interruption, and disabled contexts; vertical pans stay native',()=>{
    for(const interruption of ['touchcancel','multitouch','disabled']){
      const f=fixture(),path=interpolate([corners[0],corners[2],corners[1],corners[3]]);
      f.fire('touchstart',path[0]);path.slice(1,20).forEach(p=>f.fire('touchmove',p));
      if(interruption==='disabled')f.disable();else f.fire(interruption==='multitouch'?'touchstart':'touchcancel',path[20],2);
      path.slice(20).forEach(p=>f.fire('touchmove',p));f.fire('touchend',path.at(-1)!);expect(f.restart).not.toHaveBeenCalled();
    }
    const f=fixture();f.fire('touchstart',{x:40,y:50});expect(f.fire('touchmove',{x:41,y:100}).defaultPrevented).toBe(false);
  });
});
function fixture(){
  const doc=Object.assign(new EventTarget(),{hidden:false});vi.stubGlobal('document',doc);vi.stubGlobal('window',new EventTarget());
  const surface=Object.assign(new EventTarget(),{contains:()=>true,closest:()=>null});
  let time=0,enabled=true;const restart=vi.fn();bindRestartGesture(surface,{enabled:()=>enabled,onRestart:restart,now:()=>time});
  return {surface,restart,advance:(ms:number)=>{time+=ms;},disable:()=>{enabled=false;},fire:(type:string,p:Point,count=1)=>{
    time+=15;const touches=Array.from({length:count},(_,i)=>({clientX:p.x,clientY:p.y,identifier:i+1}));
    const event=Object.assign(new Event(type,{cancelable:true}),{touches:type==='touchend'?[]:touches,changedTouches:touches});surface.dispatchEvent(event);return event;
  }};
}
