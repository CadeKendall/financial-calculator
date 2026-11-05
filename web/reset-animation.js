import {RESET_TIMING,RESET_TRACKS,trackToKeyframes} from './reset-motion.js';
import {createResetInternals} from './reset-internals.js';
export {RESET_TIMING,RESET_EASING} from './reset-motion.js';

/** Owns the reset transaction, independently of its temporary visual layers. */
export function createResetAnimation({reset,lock,createView,reduced=matchMedia('(prefers-reduced-motion: reduce)'),host=window,doc=document,onComplete=()=>{},now=()=>performance.now()}){
  let busy=false,locked=false,committed=false,view=null,timers=[],started=0;
  const commit=()=>{if(!committed){committed=true;reset();}};
  const release=()=>{
    try{view?.dispose();}finally{view=null;if(locked){locked=false;lock(false);}}
  };
  const finish=()=>{
    if(!busy)return;
    timers.forEach(clearTimeout);timers=[];
    try{commit();}finally{try{release();}finally{busy=false;onComplete();}}
  };
  const at=(time,fn)=>timers.push(setTimeout(()=>{
    if(!busy)return;
    try{fn();}catch{finish();}
  },Math.max(0,time-(now()-started))));
  function run(){
    if(busy)return false;
    busy=true;committed=false;locked=true;started=now();
    try{
      lock(true);
      if(reduced.matches||doc.hidden){finish();return true;}
      view=createView();view.play(finish);
      at(RESET_TIMING.seated,()=>view?.reveal());
      at(RESET_TIMING.commit,commit);
      at(RESET_TIMING.interactive,release);
      at(RESET_TIMING.total,finish);
    }catch{finish();} // A missing animation API must never prevent a real reset.
    return true;
  }
  // App switching, rotation, or scrolling invalidates a frozen visual snapshot.
  host.addEventListener('pagehide',finish);
  host.addEventListener('blur',finish);
  host.addEventListener('resize',finish);
  host.addEventListener('scroll',()=>{if(locked)finish();},true);
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)finish();});
  reduced.addEventListener('change',()=>{if(reduced.matches)finish();});
  return {run,finish,get busy(){return busy;},get locked(){return locked;}};
}

// Copy resolved styles once, before any DOM writes. This keeps the moving face
// faithful to custom themes, narrow layouts and ID-based rules without duplicate
// IDs, event handlers, live regions, focus targets, or a second calculator state.
// Only layout/paint properties are needed. Copying every CSS longhand costs
// hundreds of milliseconds on WebViews and bloats the temporary layer.
const SNAPSHOT_PROPERTIES=('display position top right bottom left z-index box-sizing width height min-width min-height max-width max-height margin padding border-width border-style border-color border-radius background box-shadow color opacity visibility font letter-spacing text-align text-transform text-decoration text-shadow white-space word-break overflow-wrap line-height text-overflow overflow flex flex-direction flex-wrap align-items align-content align-self justify-content order gap grid-template-columns grid-template-rows grid-column grid-row transform transform-origin vertical-align').split(' ');
function snapshot(source){
  const copy=source.cloneNode(true),originals=[source,...source.querySelectorAll('*')],copies=[copy,...copy.querySelectorAll('*')];
  for(let i=0;i<originals.length;i++){
    const original=originals[i],node=copies[i],style=getComputedStyle(original);
    node.style.cssText=SNAPSHOT_PROPERTIES.map(property=>`${property}:${style.getPropertyValue(property)};`).join('');
    if(original.id)node.dataset.faceplatePart=original.id;
    for(const attribute of [...node.attributes])if(attribute.name==='id'||attribute.name==='role'||attribute.name.startsWith('aria-')||attribute.name.startsWith('on'))node.removeAttribute(attribute.name);
    node.style.setProperty('transition','none','important');node.style.setProperty('animation','none','important');
    node.style.setProperty('pointer-events','none','important');
    if(node.matches('button,input,a,summary,[tabindex]'))node.setAttribute('tabindex','-1');
  }
  return {copy,restoreScroll(){originals.forEach((original,i)=>{copies[i].scrollLeft=original.scrollLeft;copies[i].scrollTop=original.scrollTop;});}};
}
const px=value=>`${value}px`;
function place(element,rect,origin){Object.assign(element.style,{left:px(rect.left-origin.left),top:px(rect.top-origin.top),width:px(rect.width),height:px(rect.height)});}
function part(className){const element=document.createElement('div');element.className=className;return element;}

/** A frozen faceplate above a stationary, recessed chassis; no live UI reparenting. */
export function createFaceplateView(calculator,front){
  // One shared compositor clock includes snapshot preparation in the initial
  // hold, rather than adding that work to the requested 1.8-second sequence.
  const timelineStart=document.timeline.currentTime;
  const bounds=calculator.getBoundingClientRect(),frontBounds=front.getBoundingClientRect();
  const screen=front.querySelector('.display-shell'),screenBounds=screen.getBoundingClientRect();
  const caseStyle=getComputedStyle(calculator),screenStyle=getComputedStyle(screen);
  const faces=[...front.querySelectorAll('.key .face')].map(face=>face.getBoundingClientRect());
  const captured=snapshot(front);
  const scene=part('reset-scene'),stage=part('reset-stage'),chassis=part('reset-chassis');
  const outgoing=part('reset-panel reset-panel-out'),incoming=part('reset-panel reset-panel-in'),refresh=part('reset-refresh');
  scene.setAttribute('aria-hidden','true');scene.inert=true;
  place(stage,bounds,{left:0,top:0});
  scene.style.setProperty('--reset-case',caseStyle.backgroundColor);
  scene.style.setProperty('--reset-radius',caseStyle.borderRadius);
  scene.style.setProperty('--reset-screen',screenStyle.backgroundColor);
  for(const panel of [outgoing,incoming]){
    for(const property of ['background-color','background-image','border-radius','box-shadow','border-top','border-right','border-bottom','border-left'])panel.style.setProperty(property,caseStyle.getPropertyValue(property));
  }
  // The stationary case already casts the external shadow. Keep only the
  // face's inset highlights here, so the first/last frames don't darken it twice.
  const insetShadow=caseStyle.boxShadow.split(/,(?![^()]*\))/).filter(shadow=>shadow.includes('inset')).join(',');
  outgoing.style.boxShadow=incoming.style.boxShadow=insetShadow||'none';
  const outgoingShadow=part('reset-panel-shadow'),incomingShadow=part('reset-panel-shadow');
  outgoing.append(outgoingShadow);incoming.append(incomingShadow);
  // Absolute children are measured from the panel's padding edge, inside its border.
  const origin={left:bounds.left+parseFloat(caseStyle.borderLeftWidth),top:bounds.top+parseFloat(caseStyle.borderTopWidth)};
  Object.assign(captured.copy.style,{position:'absolute',margin:'0',minHeight:'0',maxWidth:'none'});place(captured.copy,frontBounds,origin);
  outgoing.append(captured.copy);
  const local=rect=>({x:rect.left-bounds.left,y:rect.top-bounds.top,width:rect.width,height:rect.height});
  const internals=createResetInternals({width:bounds.width,height:bounds.height,screen:local(screenBounds),keys:faces.map(local),prefix:'reset-board'});
  chassis.append(internals);
  const cavityLight=part('reset-cavity-light');chassis.append(cavityLight);
  place(refresh,screenBounds,bounds);refresh.style.borderRadius=screenStyle.borderRadius;
  stage.append(chassis,outgoing,incoming,refresh);scene.append(stage);
  const previousVisibility=front.style.visibility,animations=[];
  let disposed=false;
  function dispose(){
    if(disposed)return;disposed=true;
    for(const animation of animations)animation.cancel();
    scene.remove();front.style.visibility=previousVisibility;
  }
  function play(onInterrupted){
    document.body.append(scene);captured.restoreScroll();
    incoming.append(captured.copy.cloneNode(true));
    // cloneNode does not preserve scroll positions (notably a long expression).
    const incomingFace=incoming.lastChild;
    const first=[captured.copy,...captured.copy.querySelectorAll('*')],second=[incomingFace,...incomingFace.querySelectorAll('*')];
    first.forEach((node,i)=>{second[i].scrollLeft=node.scrollLeft;second[i].scrollTop=node.scrollTop;});
    front.style.visibility='hidden';
    const animate=(target,frames,options)=>{
      const animation=target.animate(frames,{fill:'both',...options});animations.push(animation);
      if(timelineStart!==null)animation.startTime=timelineStart;
      animation.finished.catch(()=>{if(!disposed)onInterrupted();});
    };
    for(const [name,target] of Object.entries({outgoing,incoming,outgoingShadow,incomingShadow,refresh,cavityLight})){
      const track=RESET_TRACKS[name];
      animate(target,trackToKeyframes(track),{delay:track.delay,duration:track.duration,fill:track.fill});
    }
  }
  return {play,reveal(){outgoing.hidden=true;incoming.hidden=true;chassis.hidden=true;front.style.visibility=previousVisibility;},dispose};
}
