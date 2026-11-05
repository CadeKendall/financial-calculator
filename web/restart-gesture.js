const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const vector=(a,b)=>({x:b.x-a.x,y:b.y-a.y});
function simplify(points,tolerance){
  const a=points[0],b=points.at(-1),v=vector(a,b),length=distance(a,b);
  let farthest=0,index=0;
  for(let i=1;i<points.length-1;i++){
    const offset=length?Math.abs(cross(v,vector(a,points[i])))/length:distance(a,points[i]);
    if(offset>farthest+1e-6){farthest=offset;index=i;}
  }
  if(farthest<=tolerance)return [a,b];
  return [...simplify(points.slice(0,index+1),tolerance).slice(0,-1),...simplify(points.slice(index),tolerance)];
}
function softenTurns(corners,tolerance){
  const result=[...corners];
  // A curved connecting edge can create an extra vertex that recursive
  // simplification retains. Remove only shallow bends, never a large reversal.
  while(result.length>4&&result.length<=6){
    let smallest=Infinity,index=-1;
    for(let i=1;i<result.length-1;i++){
      const a=result[i-1],b=result[i+1],length=distance(a,b);
      if(!length)continue;
      const deviation=Math.abs(cross(vector(a,b),vector(a,result[i])))/length;
      if(deviation<smallest){smallest=deviation;index=i;}
    }
    if(index<0||smallest>tolerance)break;
    result.splice(index,1);
  }
  return result;
}

/** A single stroke: diagonal, connecting edge, crossing diagonal, from any corner. */
export function isRestartStroke(points,duration){
  if(!Number.isFinite(duration)||duration<=0||duration>4000||points.length<4||points.length>1500)return false;
  if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false;
  const width=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x));
  const height=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
  if(width<48||height<48||width/height>4||height/width>4)return false;
  const span=Math.hypot(width,height);
  // Fast drags round the turns and provide fewer samples. Try several levels of
  // smoothing, but always require the same three-part crossing geometry.
  return [.075,.11,.15,.18].some(tolerance=>matchesCrossing(softenTurns(simplify(points,span*tolerance),span*.2),points,width,height,span));
}
function matchesCrossing(corners,points,width,height,span){
  if(corners.length!==4)return false;
  const [a,b,c,d]=corners,u=vector(a,b),v=vector(c,d),denominator=cross(u,v);
  const first=distance(a,b),last=distance(c,d);
  if(first<span*.5||last<span*.5||distance(b,c)<Math.max(width,height)*.3)return false;
  // Both diagonals must cross well inside their lengths, rather than just touch.
  if(Math.abs(denominator)/(first*last)<.35)return false;
  const offset=vector(a,c),t=cross(offset,v)/denominator,s=cross(offset,u)/denominator;
  if(t<.1||t>.9||s<.1||s>.9)return false;
  for(const line of [u,v])if(Math.min(Math.abs(line.x),Math.abs(line.y))/Math.max(Math.abs(line.x),Math.abs(line.y))<.18)return false;
  const travelled=points.slice(1).reduce((sum,p,i)=>sum+distance(p,points[i]),0);
  return travelled<(first+distance(b,c)+last)*1.6;
}

/** Touch arbitration keeps vertical scrolls and ordinary taps out of the recognizer. */
export function bindRestartGesture(surface,{enabled,onRestart,now=()=>performance.now()}){
  let stroke=null,suppressUntil=0;
  const start=(point,target,id)=>{
    if(!enabled()||!surface.contains(target)||target.closest('input,textarea,select,dialog'))return;
    suppressUntil=0;
    stroke={points:[point],target,id,time:now(),claimed:false,moved:false,rejected:false};
  };
  const cancel=()=>{if(stroke?.moved)suppressUntil=now()+500;stroke=null;};
  const move=(point,event)=>{
    if(!stroke)return;
    if(!enabled()||now()-stroke.time>4000){cancel();return;}
    const first=stroke.points[0],dx=Math.abs(point.x-first.x),dy=Math.abs(point.y-first.y);
    if(!stroke.moved&&Math.hypot(dx,dy)>10){
      stroke.moved=true;suppressUntil=now()+500;
      stroke.target.closest('button')?.dispatchEvent(new Event('pointercancel'));
    }
    // Don't permanently reject an X because its first few pixels wobble toward
    // an axis. Commit only once its direction is clear; leave vertical pans alone.
    if(stroke.moved&&!stroke.claimed&&!stroke.rejected){
      stroke.claimed=Math.min(dx,dy)>=3&&Math.min(dx,dy)/Math.max(dx,dy)>.16;
      stroke.rejected=!stroke.claimed&&Math.hypot(dx,dy)>32;
    }
    if(stroke.claimed&&event.cancelable)event.preventDefault();
    if(distance(stroke.points.at(-1),point)>=3)stroke.points.push(point);
    if(stroke.points.length>1500)cancel();
  };
  const finish=(point,event)=>{
    if(!stroke)return;
    move(point,event);if(!stroke)return;
    const completed=stroke;stroke=null;
    if(completed.moved){suppressUntil=now()+500;if(event.cancelable)event.preventDefault();}
    if(completed.claimed&&!completed.rejected&&enabled()&&isRestartStroke(completed.points,now()-completed.time))onRestart();
  };
  const point=p=>({x:p.clientX,y:p.clientY});
  surface.addEventListener('touchstart',event=>{
    if(event.touches.length!==1){cancel();return;}
    const touch=event.touches[0];start(point(touch),event.target,touch.identifier);
  },{capture:true,passive:true});
  surface.addEventListener('touchmove',event=>{
    if(event.touches.length!==1){cancel();return;}
    if(stroke?.id===event.touches[0].identifier)move(point(event.touches[0]),event);
  },{capture:true,passive:false});
  surface.addEventListener('touchend',event=>{
    const touch=[...event.changedTouches].find(t=>t.identifier===stroke?.id);
    if(touch)finish(point(touch),event);
  },{capture:true,passive:false});
  surface.addEventListener('touchcancel',cancel,{capture:true});
  surface.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch'||event.button!==0)return;
    start(point(event),event.target,event.pointerId);
  },true);
  document.addEventListener('pointermove',event=>{if(event.pointerType!=='touch'&&stroke?.id===event.pointerId)move(point(event),event);},true);
  document.addEventListener('pointerup',event=>{if(event.pointerType!=='touch'&&stroke?.id===event.pointerId)finish(point(event),event);},true);
  document.addEventListener('pointercancel',event=>{if(event.pointerType&&event.pointerType!=='touch')cancel();},true);
  surface.addEventListener('click',event=>{
    if(now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
  window.addEventListener('blur',cancel);
}
