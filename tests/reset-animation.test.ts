import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createResetAnimation,RESET_TIMING} from '../web/reset-animation.js';

beforeEach(()=>vi.useFakeTimers());
afterEach(()=>vi.useRealTimers());
function fixture(reduce=false){
  const host=new EventTarget(),doc=Object.assign(new EventTarget(),{hidden:false});
  const reduced=Object.assign(new EventTarget(),{matches:reduce});
  let interrupt=()=>{};
  const view={play:vi.fn(fn=>{interrupt=fn;}),reveal:vi.fn(),dispose:vi.fn()};
  const reset=vi.fn(),lock=vi.fn(),complete=vi.fn(),createView=vi.fn(()=>view);
  const animation=createResetAnimation({reset,lock,createView,host,doc,reduced,onComplete:complete,now:()=>Date.now()});
  return {animation,host,doc,reduced,view,reset,lock,complete,createView,interrupt:()=>interrupt()};
}
describe('faceplate reset transaction',()=>{
  it('stays below two seconds while leaving the components fully exposed long enough to recognize',()=>{
    const stages=[0,RESET_TIMING.remove,RESET_TIMING.outside,RESET_TIMING.install,RESET_TIMING.seated,RESET_TIMING.commit,RESET_TIMING.interactive,RESET_TIMING.total];
    expect(stages.every((time,index)=>index===0||time>stages[index-1])).toBe(true);
    expect(RESET_TIMING.total).toBeLessThan(2000);
    expect(RESET_TIMING.install-RESET_TIMING.outside).toBeGreaterThanOrEqual(350);
  });
  it('keeps registers until seating, resets once under the LCD refresh, then restores input and removes layers',()=>{
    const f=fixture();expect(f.animation.run()).toBe(true);
    expect(f.lock).toHaveBeenLastCalledWith(true);expect(f.animation.locked).toBe(true);
    vi.advanceTimersByTime(RESET_TIMING.seated-1);expect(f.view.reveal).not.toHaveBeenCalled();expect(f.reset).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);expect(f.view.reveal).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(RESET_TIMING.commit-RESET_TIMING.seated);expect(f.reset).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(RESET_TIMING.interactive-RESET_TIMING.commit);
    expect(f.view.dispose).toHaveBeenCalledTimes(1);expect(f.lock).toHaveBeenLastCalledWith(false);expect(f.animation.locked).toBe(false);
    vi.advanceTimersByTime(RESET_TIMING.total-RESET_TIMING.interactive);
    expect(f.reset).toHaveBeenCalledTimes(1);expect(f.complete).toHaveBeenCalledTimes(1);expect(f.animation.busy).toBe(false);
  });
  it('ignores overlapping restarts and supports repeated complete runs',()=>{
    const f=fixture();
    for(let i=0;i<5;i++){
      expect(f.animation.run()).toBe(true);expect(f.animation.run()).toBe(false);
      vi.advanceTimersByTime(RESET_TIMING.interactive);expect(f.animation.run()).toBe(false);
      expect(f.animation.locked).toBe(false);
      vi.advanceTimersByTime(RESET_TIMING.total-RESET_TIMING.interactive);expect(f.animation.busy).toBe(false);
    }
    expect(f.reset).toHaveBeenCalledTimes(5);expect(f.createView).toHaveBeenCalledTimes(5);expect(f.view.dispose).toHaveBeenCalledTimes(5);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('includes snapshot preparation in the initial hold instead of extending the sequence',()=>{
    const preparation=95,f=fixture();f.createView.mockImplementation(()=>{vi.advanceTimersByTime(preparation);return f.view;});
    f.animation.run();vi.advanceTimersByTime(RESET_TIMING.commit-preparation-1);expect(f.reset).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);expect(f.reset).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(RESET_TIMING.total-RESET_TIMING.commit);expect(f.animation.busy).toBe(false);expect(f.complete).toHaveBeenCalledTimes(1);
  });
  it('resets immediately without visual layers for reduced motion',()=>{
    const f=fixture(true);f.animation.run();
    expect(f.createView).not.toHaveBeenCalled();expect(f.reset).toHaveBeenCalledTimes(1);
    expect(f.animation.locked).toBe(false);expect(f.animation.busy).toBe(false);expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['blur','pagehide','resize','scroll','hidden','reduced','canceled'])('finishes and cleans up if interrupted by %s',reason=>{
    const f=fixture();f.animation.run();vi.advanceTimersByTime(RESET_TIMING.outside);
    if(reason==='hidden'){f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));}
    else if(reason==='reduced'){f.reduced.matches=true;f.reduced.dispatchEvent(new Event('change'));}
    else if(reason==='canceled')f.interrupt();
    else f.host.dispatchEvent(new Event(reason));
    expect(f.reset).toHaveBeenCalledTimes(1);expect(f.view.dispose).toHaveBeenCalledTimes(1);expect(f.animation.locked).toBe(false);expect(f.animation.busy).toBe(false);
    vi.runAllTimers();expect(f.reset).toHaveBeenCalledTimes(1);expect(f.complete).toHaveBeenCalledTimes(1);
  });
  it('does not clear a new entry during the final quiet rest or a late interruption',()=>{
    const f=fixture();let value=17;f.reset.mockImplementation(()=>{value=0;});
    f.animation.run();vi.advanceTimersByTime(RESET_TIMING.interactive);value=42;
    f.host.dispatchEvent(new Event('blur'));vi.runAllTimers();expect(value).toBe(42);expect(f.reset).toHaveBeenCalledTimes(1);
  });
  it('falls back to a normal reset if capture or animation startup fails',()=>{
    for(const source of ['capture','play']){
      const f=fixture();(source==='capture'?f.createView:f.view.play).mockImplementation(()=>{throw new Error('Unavailable');});
      expect(()=>f.animation.run()).not.toThrow();expect(f.reset).toHaveBeenCalledTimes(1);expect(f.animation.locked).toBe(false);expect(f.animation.busy).toBe(false);expect(vi.getTimerCount()).toBe(0);
      if(source==='play')expect(f.view.dispose).toHaveBeenCalledTimes(1);
    }
  });
  it.each(['reveal','dispose'])('releases input and does not repeat the reset if visual %s fails',source=>{
    const f=fixture();f.view[source].mockImplementation(()=>{throw new Error('Visual cleanup unavailable');});
    f.animation.run();expect(()=>vi.runAllTimers()).not.toThrow();
    expect(f.reset).toHaveBeenCalledTimes(1);expect(f.animation.locked).toBe(false);expect(f.animation.busy).toBe(false);
    expect(f.lock).toHaveBeenLastCalledWith(false);expect(f.complete).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);
  });
  it('uses a real reset even if the app is already hidden when the gesture completes',()=>{
    const f=fixture();f.doc.hidden=true;f.animation.run();
    expect(f.createView).not.toHaveBeenCalled();expect(f.reset).toHaveBeenCalledTimes(1);
    expect(f.animation.locked).toBe(false);expect(f.animation.busy).toBe(false);expect(vi.getTimerCount()).toBe(0);
  });
});
