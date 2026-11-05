import {afterEach,describe,expect,it,vi} from 'vitest';
import {createDialogMotion} from '../web/dialog-motion.js';
afterEach(()=>vi.unstubAllGlobals());
function fixture(reduce=false){
  vi.stubGlobal('getComputedStyle',()=>({opacity:'.4',transform:'matrix(1,0,0,1,0,8)'}));
  const animations:any[]=[];
  const dialog=Object.assign(new EventTarget(),{open:false,dataset:{} as Record<string,string>,
    showModal(){this.open=true;},close(){this.open=false;this.dispatchEvent(new Event('close'));},
    getBoundingClientRect:()=>({left:20,right:200,top:20,bottom:200}),
    animate:vi.fn((frames,options)=>{
      let finish!:()=>void,cancel!:()=>void;
      const finished=new Promise<void>((resolve,reject)=>{finish=resolve;cancel=()=>reject(new Error('Canceled'));});
      const animation={frames,options,finish,cancel,finished};animations.push(animation);return animation;
    })});
  const root={style:{overflow:'auto'}},reduced={matches:reduce,addEventListener:vi.fn()};
  return {dialog,root,animations,reduced,motion:createDialogMotion(dialog,{root,reduced})};
}
describe('History presentation',()=>{
  it('closes smoothly even during entry, stays modal until finished, and restores scrolling',async()=>{
    const f=fixture();f.motion.open();expect(f.dialog.open).toBe(true);expect(f.root.style.overflow).toBe('hidden');
    f.motion.close();expect(f.animations[1].frames[0].opacity).toBe('.4');expect(f.dialog.open).toBe(true);
    f.motion.close();expect(f.animations).toHaveLength(2);
    f.animations[1].finish();await Promise.resolve();expect(f.dialog.open).toBe(false);expect(f.root.style.overflow).toBe('auto');
  });
  it('reopening cancels a pending exit without allowing it to close the new view',async()=>{
    const f=fixture();f.motion.open();f.motion.close();f.motion.open();
    f.animations[2].finish();await Promise.resolve();await Promise.resolve();
    expect(f.dialog.open).toBe(true);expect(f.dialog.dataset.closing).toBeUndefined();expect(f.root.style.overflow).toBe('hidden');
    f.dialog.close();expect(f.root.style.overflow).toBe('auto');
  });
  it('respects reduced motion and closes only a complete outside tap or Escape',()=>{
    const f=fixture(true);f.motion.open();expect(f.dialog.animate).not.toHaveBeenCalled();
    const pointer=(type:string,x:number)=>f.dialog.dispatchEvent(Object.assign(new Event(type),{clientX:x,clientY:x}));
    pointer('pointerdown',30);pointer('click',0);expect(f.dialog.open).toBe(true);
    pointer('pointerdown',0);pointer('click',0);expect(f.dialog.open).toBe(false);
    f.motion.open();const escape=new Event('cancel',{cancelable:true});f.dialog.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);expect(f.dialog.open).toBe(false);expect(f.root.style.overflow).toBe('auto');
  });
});
