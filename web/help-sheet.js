import {helpLabel,searchHelp,relatedHelp} from './help-content.js';
import {worksheetNames} from './journal.js';

export function sheetGeometry(display,calculator,width,height,keepDisplayBoundary=false){
  const sheetWidth=Math.min(calculator.width,width-16);
  return {left:Math.max(8,Math.min(calculator.left,width-sheetWidth-8)),width:sheetWidth,top:Math.max(8,keepDisplayBoundary?display.bottom+6:Math.min(display.bottom+6,height-120))};
}

export function createHelpSheet({calculator,getContext}){
  const dialog=document.querySelector('#define-dialog'),sheet=document.querySelector('#definition-sheet'),scrim=document.querySelector('#define-scrim');
  const viewport=document.querySelector('#definition-viewport');
  const body=document.querySelector('#definition-body'),search=document.querySelector('#definition-search');
  const closeButton=document.querySelector('#close-definition'),handle=document.querySelector('#definition-handle');
  let context,progress=0,animation=0,drag=null,dragged=false,previousOverflow='',previousMainOverflow='';
  const native=!!window.__BA_NATIVE__,main=document.querySelector('main');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function setProgress(value){
    progress=Math.max(0,Math.min(1,value));
    // Use the untransformed available height so reversing/dragging never accumulates offsets.
    sheet.style.transform=`translate3d(0,${(1-progress)*Number(sheet.dataset.travel)}px,0)`;
    scrim.style.backdropFilter=`blur(${progress*3}px)`;scrim.style.webkitBackdropFilter=`blur(${progress*3}px)`;scrim.style.background=`rgba(20,26,23,${progress*.12})`;
  }
  function layout(){
    const geometry=sheetGeometry(document.querySelector('.display-shell').getBoundingClientRect(),calculator.getBoundingClientRect(),innerWidth,innerHeight,native);
    const viewportBottom=window.visualViewport?visualViewport.offsetTop+visualViewport.height:innerHeight;
    const keyboardInset=native?Math.max(0,innerHeight-viewportBottom):0;
    viewport.style.left=`${geometry.left}px`;viewport.style.width=`${geometry.width}px`;viewport.style.top=`${geometry.top}px`;
    viewport.style.bottom=`${keyboardInset}px`;sheet.dataset.travel=String(Math.max(0,innerHeight-geometry.top)+8);setProgress(progress);
  }
  function animate(to){
    cancelAnimationFrame(animation);
    if(reduced.matches){setProgress(to);if(!to)dialog.close();return;}
    const from=progress,distance=Math.abs(to-from),duration=(to?720:540)*Math.sqrt(distance);
    // Start on the first painted frame, not while the dialog is being laid out.
    // A longer eased rise gives the sheet time to arrive without a rushed middle.
    let start=null;
    function frame(now){
      start??=now;
      const t=Math.min(1,(now-start)/Math.max(duration,1)),eased=t*t*(3-2*t);
      setProgress(from+(to-from)*eased);
      if(t<1)animation=requestAnimationFrame(frame);else if(!to)dialog.close();
    }
    animation=requestAnimationFrame(frame);
  }
  function showTopic(next){
    document.querySelector('#definition-category').textContent=worksheetNames[next.group]||'Calculator functions';
    document.querySelector('#definition-title').textContent=next.title;
    document.querySelector('#definition-code').textContent=next.id===context.id?`${context.screenLabel||next.id.split('.').at(-1)}${context.screenValue?' · '+context.screenValue:''}`:next.id.replace('KEY.','').replace('.', ' · ');
    document.querySelector('#definition-meaning').textContent=next.meaning;
    document.querySelector('#definition-example').textContent=next.example;
    document.querySelector('#definition-steps').textContent=next.steps;
    document.querySelector('#definition-tip').textContent=next.tip;
    document.querySelector('#definition-tip').hidden=!next.tip;
    document.querySelector('#definition-error').hidden=!context.error;
    document.querySelector('#definition-error-message').textContent=context.error?.message||'';
    document.querySelector('#definition-recovery').textContent=context.error?.recovery||'';
    const related=document.querySelector('#definition-related');related.replaceChildren();
    document.querySelector('#definition-related-section h3').textContent=next.group==='KEY'?'Related functions':'In this worksheet';
    for(const item of relatedHelp(next)){
      const button=document.createElement('button');button.type='button';button.textContent=helpLabel(item.id);button.title=item.title;button.setAttribute('aria-label',item.title);button.addEventListener('click',()=>{showTopic(item.id===context.id?context:item);body.scrollTop=0;closeButton.focus({preventScroll:true});});related.append(button);
    }
    document.querySelector('#definition-related-section').hidden=!related.children.length;
    document.querySelector('#definition-current').hidden=next.id===context.id;
  }
  function renderSearch(){
    const results=document.querySelector('#definition-results');results.replaceChildren();
    const topics=searchHelp(search.value);document.querySelector('#definition-search-count').textContent=`${topics.length} ${topics.length===1?'definition':'definitions'}`;
    for(const item of topics){const button=document.createElement('button');button.type='button';button.textContent=`${item.id.replace('KEY.','').replace('.', ' · ')} — ${item.title}`;button.addEventListener('click',()=>{showTopic(item.id===context.id?context:item);document.querySelector('#definition-browse').open=false;body.scrollTop=0;closeButton.focus({preventScroll:true});});results.append(button);}
    if(!topics.length){const empty=document.createElement('p');empty.textContent='No match. Try a label such as PRN, a worksheet such as bond, or a word such as interest.';results.append(empty);}
  }
  function close(){drag=null;animate(0);}
  closeButton.addEventListener('click',close);scrim.addEventListener('click',close);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{cancelAnimationFrame(animation);progress=0;drag=null;document.documentElement.style.overflow=previousOverflow;if(native)main.style.overflowY=previousMainOverflow;});
  document.querySelector('#definition-current').addEventListener('click',()=>{showTopic(context);body.scrollTop=0;});
  search.addEventListener('input',renderSearch);
  handle.addEventListener('pointerdown',event=>{if(event.button!==0)return;cancelAnimationFrame(animation);drag={y:event.clientY,progress};dragged=false;handle.setPointerCapture(event.pointerId);});
  handle.addEventListener('pointermove',event=>{if(!drag)return;const distance=event.clientY-drag.y;if(Math.abs(distance)>5)dragged=true;setProgress(drag.progress-distance/Number(sheet.dataset.travel));});
  handle.addEventListener('pointerup',()=>{if(!drag)return;drag=null;if(dragged)animate(progress<.75?0:1);});
  handle.addEventListener('pointercancel',()=>{drag=null;animate(1);});
  handle.addEventListener('click',()=>{if(!dragged)close();dragged=false;});
  window.addEventListener('resize',()=>{if(dialog.open)layout();});
  window.visualViewport?.addEventListener('resize',()=>{if(dialog.open)layout();});
  reduced.addEventListener('change',()=>{if(dialog.open && reduced.matches){cancelAnimationFrame(animation);setProgress(1);}});
  return {
    get isOpen(){return dialog.open;},
    open(){
      context=getContext();showTopic(context);search.value='';renderSearch();document.querySelector('#definition-browse').open=false;
      const display=document.querySelector('.display-shell'),rect=display.getBoundingClientRect();
      if(!native && (rect.top<0 || rect.bottom>innerHeight-160))display.scrollIntoView({block:'start',behavior:'instant'});
      if(native){previousMainOverflow=main.style.overflowY;main.style.overflowY='hidden';}
      previousOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
      // Focus the stationary dialog, not a button travelling in from offscreen.
      // Otherwise WebKit can scroll the dialog to reveal that button mid-animation.
      layout();setProgress(0);dialog.showModal();dialog.scrollTop=0;body.scrollTop=0;
      dialog.focus({preventScroll:true});animate(1);
    },close
  };
}
