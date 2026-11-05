import {afterEach,describe,expect,it,vi} from 'vitest';
import {createTapSequence} from '../web/tap-sequence.js';
import {createFlip} from '../web/flip.js';
import {bindHold} from '../web/hold.js';

afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});

describe('Copy gestures',()=>{
  it('copies immediately, clears on the third quick tap, and allows a fresh copy afterward',()=>{
    let time=0;const single=vi.fn(),triple=vi.fn();
    const taps=createTapSequence({single,triple,now:()=>time});
    taps.tap();expect(single).toHaveBeenCalledTimes(1);
    time=120;taps.tap();expect(single).toHaveBeenCalledTimes(1);
    time=240;taps.tap();expect(triple).toHaveBeenCalledTimes(1);
    time=300;taps.tap();expect(single).toHaveBeenCalledTimes(2);
  });
  it('separates slow taps and resets the sequence when another action intervenes',()=>{
    let time=0;const single=vi.fn(),triple=vi.fn();
    const taps=createTapSequence({single,triple,now:()=>time});
    taps.tap();time=500;taps.tap();time=600;taps.tap();taps.reset();time=650;taps.tap();
    expect(single).toHaveBeenCalledTimes(3);expect(triple).not.toHaveBeenCalled();
  });
  it('never copies on hold release or on a canceled pointer gesture',()=>{
    vi.useFakeTimers();
    const button=Object.assign(new EventTarget(),{classList:{add:vi.fn(),remove:vi.fn()},setPointerCapture:vi.fn()});
    const tap=vi.fn(),hold=vi.fn(),onCancel=vi.fn();bindHold(button,{tap,hold,onCancel});
    const fire=(type:string,extra={})=>button.dispatchEvent(Object.assign(new Event(type),{isPrimary:true,button:0,clientX:0,clientY:0,pointerId:1,...extra}));
    fire('pointerdown');vi.advanceTimersByTime(550);fire('pointerup');fire('lostpointercapture');fire('click');
    expect(hold).toHaveBeenCalledTimes(1);expect(tap).not.toHaveBeenCalled();
    fire('pointerdown');fire('pointermove',{clientX:20});fire('pointerup');fire('click');
    expect(onCancel).toHaveBeenCalledTimes(1);expect(tap).not.toHaveBeenCalled();
    fire('pointerdown');fire('lostpointercapture');fire('click');
    expect(onCancel).toHaveBeenCalledTimes(2);expect(tap).not.toHaveBeenCalled();
    fire('pointerdown');fire('pointerup');fire('click');expect(tap).toHaveBeenCalledTimes(1);
  });
});

function flipFixture(reduce=false){
  vi.stubGlobal('getComputedStyle',()=>({transform:'matrix3d(tilted)'}));
  const animations:any[]=[];
  const element={inert:false,classList:{add:vi.fn(),remove:vi.fn()},animate:vi.fn((frames,options)=>{
    let resolve!:()=>void,reject!:(reason:Error)=>void;
    const finished=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});
    const animation={frames,options,finished,finish:()=>resolve(),cancel:()=>reject(new Error('Canceled'))};
    animations.push(animation);return animation;
  })};
  const showBack=vi.fn(),showFront=vi.fn(),reduced={matches:reduce,addEventListener:vi.fn()};
  return {element,animations,showBack,showFront,reduced,flip:createFlip({element,showBack,showFront,reduced})};
}

describe('case flip',()=>{
  it('exchanges faces edge-on, blocks overlapping turns, then restores interaction in both directions',async()=>{
    const f=flipFixture();const opening=f.flip.toBack();
    expect(f.element.inert).toBe(true);expect(f.showBack).not.toHaveBeenCalled();
    expect(await f.flip.toBack()).toBe(false);
    expect(f.animations[0].frames[0].transform).toBe('matrix3d(tilted)');
    f.animations[0].finish();await vi.waitFor(()=>expect(f.animations).toHaveLength(2));
    expect(f.showBack).toHaveBeenCalledTimes(1);expect(f.element.inert).toBe(true);
    f.animations[1].finish();expect(await opening).toBe(true);expect(f.element.inert).toBe(false);
    expect(f.flip.side).toBe('back');expect(f.flip.busy).toBe(false);
    const closing=f.flip.toFront();expect(f.animations[2].frames[1].transform).toContain('-90deg');
    f.animations[2].finish();await vi.waitFor(()=>expect(f.animations).toHaveLength(4));
    f.animations[3].finish();await closing;
    expect(f.showFront).toHaveBeenCalledTimes(1);expect(f.flip.side).toBe('front');expect(f.element.inert).toBe(false);
  });
  it('skips animation for reduced motion and leaves an interrupted flip usable',async()=>{
    const reduced=flipFixture(true);await reduced.flip.toBack();expect(reduced.element.animate).not.toHaveBeenCalled();
    expect(reduced.flip.side).toBe('back');expect(reduced.element.inert).toBe(false);
    const interrupted=flipFixture();const opening=interrupted.flip.toBack();interrupted.animations[0].cancel();await opening;
    expect(interrupted.showBack).toHaveBeenCalledTimes(1);expect(interrupted.element.inert).toBe(false);expect(interrupted.flip.busy).toBe(false);
  });
});
