/** One action per gesture: moving/scrolling cancels, releasing a hold never taps. */
export function bindHold(button,{tap,hold,delay=550,onCancel=()=>{}}){
  let timer=null,held=false,start=null;
  const cancel=()=>{if(timer!==null)clearTimeout(timer);timer=null;button.classList.remove('holding');button.dispatchEvent(new Event('calculator-hold-cancel',{bubbles:true}));};
  button.addEventListener('pointerdown',event=>{
    if(!event.isPrimary || event.button!==0)return;
    cancel();held=false;start={x:event.clientX,y:event.clientY};
    button.setPointerCapture(event.pointerId);button.classList.add('holding');
    button.dispatchEvent(new Event('calculator-hold-start',{bubbles:true}));
    timer=setTimeout(()=>{timer=null;held=true;button.classList.remove('holding');button.dispatchEvent(new Event('calculator-hold-complete',{bubbles:true}));hold();},delay);
  });
  button.addEventListener('pointermove',event=>{if(start && Math.hypot(event.clientX-start.x,event.clientY-start.y)>12){cancel();held=true;onCancel();}});
  button.addEventListener('pointerup',()=>{cancel();start=null;});
  button.addEventListener('pointercancel',()=>{cancel();held=true;start=null;onCancel();});
  button.addEventListener('lostpointercapture',()=>{cancel();if(start){held=true;start=null;onCancel();}});
  button.addEventListener('contextmenu',event=>event.preventDefault());
  button.addEventListener('click',event=>{if(held){held=false;event.preventDefault();return;}tap(event);});
  button.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.shiftKey){event.preventDefault();cancel();hold();}});
}
