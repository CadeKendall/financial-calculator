/** Rotate the whole case, exchanging faces only while it is edge-on. */
export function createFlip({element,showBack,showFront,reduced=matchMedia('(prefers-reduced-motion: reduce)')}){
  let busy=false,active=null,side='front';
  const neutral='perspective(1100px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) translateY(0px)';
  async function segment(from,to,easing){
    if(reduced.matches || !element.animate)return;
    active=element.animate([{transform:from},{transform:to}],{duration:240,easing,fill:'forwards'});
    await active.finished;
  }
  async function turn(next){
    if(busy || next===side)return false;
    busy=true;
    const initial=getComputedStyle(element).transform;
    element.classList.add('flipping');element.inert=true;
    const direction=next==='back'?1:-1;
    let swapped=false;
    const swap=()=>{if(swapped)return;swapped=true;side=next;(next==='back'?showBack:showFront)();};
    try{
      await segment(initial==='none'?neutral:initial,`perspective(1100px) rotateY(${direction*90}deg)`,'cubic-bezier(.45,0,.85,.55)');
      swap();
      const first=active;
      // Install the arriving face's animation before removing the outgoing one.
      const arriving=segment(`perspective(1100px) rotateY(${-direction*90}deg)`,neutral,'cubic-bezier(.15,.45,.55,1)');
      first?.cancel();await arriving;
    }catch{swap();} // Interrupted animation still leaves one usable face.
    finally{active?.cancel();active=null;element.classList.remove('flipping');element.inert=false;busy=false;}
    return true;
  }
  reduced.addEventListener('change',()=>{if(reduced.matches)active?.finish();});
  return {get busy(){return busy;},get side(){return side;},toBack:()=>turn('back'),toFront:()=>turn('front')};
}
