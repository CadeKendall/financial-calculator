/** Native dialog focus/modal behavior with interruptible presentation motion. */
export function createDialogMotion(dialog,{root=document.documentElement,reduced=matchMedia('(prefers-reduced-motion: reduce)')}={}){
  let animation=null,revision=0,overflow=null,outside=false;
  function stop(){revision++;animation?.cancel();animation=null;}
  function cleanup(){
    stop();delete dialog.dataset.closing;
    if(overflow!==null){root.style.overflow=overflow;overflow=null;}
  }
  async function move(from,to,closing){
    stop();const current=revision;
    if(!reduced.matches && dialog.animate){
      animation=dialog.animate([from,to],{duration:closing?180:280,easing:closing?'cubic-bezier(.4,0,1,1)':'cubic-bezier(.2,.75,.25,1)',fill:'both'});
      try{await animation.finished;}catch{return;}
    }
    if(current!==revision)return;
    animation?.cancel();animation=null;
    if(closing)dialog.close();
  }
  function open(){
    if(dialog.open && !dialog.dataset.closing)return;
    const from=dialog.open?getComputedStyle(dialog):{opacity:0,transform:'translateY(18px) scale(.985)'};
    const start={opacity:from.opacity,transform:from.transform};
    delete dialog.dataset.closing;
    if(!dialog.open){overflow=root.style.overflow;root.style.overflow='hidden';dialog.showModal();}
    void move(start,{opacity:1,transform:'none'},false);
  }
  function close(){
    if(!dialog.open || dialog.dataset.closing)return;
    const current=getComputedStyle(dialog),start={opacity:current.opacity,transform:current.transform};
    dialog.dataset.closing='true';
    void move(start,{opacity:0,transform:'translateY(12px) scale(.99)'},true);
  }
  const isOutside=event=>{const r=dialog.getBoundingClientRect();return event.target===dialog && (event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom);};
  dialog.addEventListener('pointerdown',event=>{outside=isOutside(event);});
  dialog.addEventListener('pointercancel',()=>{outside=false;});
  dialog.addEventListener('click',event=>{if(outside&&isOutside(event))close();outside=false;});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',cleanup);
  reduced.addEventListener('change',()=>{if(reduced.matches)animation?.finish();});
  return {open,close};
}
