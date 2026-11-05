// A single motion score for the live WebView and the frame-driven Remotion preview.
// All milestones include visual preparation, measured from release of the X.
export const RESET_TIMING=Object.freeze({remove:180,outside:540,install:1040,seated:1500,commit:1540,interactive:1700,total:1800});
export const RESET_EASING=Object.freeze({lift:'cubic-bezier(.45,0,.8,.4)',install:'cubic-bezier(.12,.72,.22,1)'});
const pose=(offset,values={})=>({offset,x:0,y:0,z:0,rx:0,ry:0,blur:0,opacity:1,...values});
export const RESET_TRACKS=Object.freeze({
  outgoing:{delay:RESET_TIMING.remove,duration:RESET_TIMING.outside-RESET_TIMING.remove,fill:'both',frames:[
    pose(0,{easing:'cubic-bezier(.22,.65,.3,1)'}),
    pose(.38,{y:-1.2,z:64,rx:-1.6,ry:1.1,easing:RESET_EASING.lift}),
    pose(1,{x:3,y:-122,z:120,rx:-1.6,ry:1.1,blur:.8}),
  ]},
  incoming:{delay:RESET_TIMING.install,duration:RESET_TIMING.seated-RESET_TIMING.install,fill:'forwards',frames:[
    pose(0,{x:-1.5,y:112,z:90,rx:1,ry:-.6,blur:.7,easing:RESET_EASING.install}),
    pose(.80,{z:3,easing:'cubic-bezier(.35,0,.65,1)'}),
    pose(.90,{y:.12,z:-1,easing:'cubic-bezier(.2,.7,.3,1)'}),
    pose(1),
  ]},
  outgoingShadow:{delay:RESET_TIMING.remove,duration:RESET_TIMING.outside-RESET_TIMING.remove,fill:'both',frames:[{offset:0,opacity:0},{offset:.38,opacity:.8},{offset:1,opacity:.6}]},
  incomingShadow:{delay:RESET_TIMING.install,duration:RESET_TIMING.seated-RESET_TIMING.install,fill:'forwards',frames:[{offset:0,opacity:.8,easing:RESET_EASING.install},{offset:1,opacity:0}]},
  refresh:{delay:RESET_TIMING.seated,duration:RESET_TIMING.interactive-RESET_TIMING.seated,fill:'both',frames:[{offset:0,opacity:0},{offset:.2,opacity:.5},{offset:.35,opacity:.5},{offset:1,opacity:0}]},
  // The stationary assembly comes out of the faceplate's shadow, then darkens
  // as the new panel seats. Opacity only: no moving circuit parts or camera.
  cavityLight:{delay:RESET_TIMING.remove,duration:RESET_TIMING.seated-RESET_TIMING.remove,fill:'both',frames:[{offset:0,opacity:.50},{offset:.32,opacity:0},{offset:.67,opacity:0},{offset:1,opacity:.42}]},
});

export function poseToStyle(value){
  const style={opacity:value.opacity};
  if('x' in value)style.transform=`perspective(1200px) translate3d(${value.x}%,${value.y}%,${value.z}px) rotateX(${value.rx}deg) rotateY(${value.ry}deg)`;
  if('blur' in value)style.filter=`blur(${value.blur}px)`;
  return style;
}
export function trackToKeyframes(track){return track.frames.map(({offset,easing,...value})=>({...poseToStyle(value),offset,...(easing?{easing}:{})}));}

// Deterministic CSS cubic-bezier sampling for Remotion and endpoint checks.
// Live animations use these same control points on the browser compositor.
function easedProgress(t,easing){
  if(!easing)return t;
  const points=easing.match(/cubic-bezier\(([^)]+)\)/)?.[1].split(',').map(Number);
  if(!points)return t;
  const [x1,y1,x2,y2]=points;
  const curve=(u,a,b)=>3*(1-u)*(1-u)*u*a+3*(1-u)*u*u*b+u*u*u;
  let low=0,high=1;
  for(let i=0;i<24;i++){const middle=(low+high)/2;if(curve(middle,x1,x2)<t)low=middle;else high=middle;}
  return curve((low+high)/2,y1,y2);
}
export function sampleResetTrack(track,milliseconds){
  if(milliseconds<track.delay&&track.fill==='forwards')return {opacity:0};
  const progress=Math.max(0,Math.min(1,(milliseconds-track.delay)/track.duration));
  if(progress===0)return {...track.frames[0]};
  if(progress===1)return {...track.frames.at(-1)};
  const index=track.frames.findIndex(frame=>frame.offset>=progress);
  const left=track.frames[index-1],right=track.frames[index];
  const amount=easedProgress((progress-left.offset)/(right.offset-left.offset),left.easing);
  const result={};
  for(const property of Object.keys(left))if(property!=='offset'&&typeof left[property]==='number')result[property]=left[property]+(right[property]-left[property])*amount;
  return result;
}
