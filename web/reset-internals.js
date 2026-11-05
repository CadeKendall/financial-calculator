/**
 * Original vector illustration of the standard BA II Plus component side.
 * Visual reference: user's opened-calculator photo and iFixit's standard-model
 * battery replacement, step 4 (140160), not the Professional teardown (15352).
 * Layout is adapted to this app's proportions; it is not a circuit schematic.
 * No image assets, filters, external fonts, or individual key-contact clones.
 */
const n=value=>Math.round(value*100)/100;
const rect=(x,y,width,height,extra='')=>`<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" ${extra}/>`;
const circle=(x,y,r,extra='')=>`<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" ${extra}/>`;

/**
 * @typedef {{x:number,y:number,width:number,height:number}} InternalsRect
 * @typedef {{width:number,height:number,screen?:InternalsRect,keys?:InternalsRect[],prefix?:string}} InternalsOptions
 */

/**
 * Pure SVG source shared by the live animation and the Remotion composition.
 * @param {InternalsOptions} options
 * @returns {string}
 */
export function resetInternalsMarkup({width,height,screen,keys=[],prefix='reset-internals'}){
  const w=Math.max(160,width),h=Math.max(300,height);
  const id=String(prefix).replace(/[^a-zA-Z0-9_-]/g,'-');
  const paint=name=>`url(#${id}-${name})`;
  const scale=w/375;
  const sx=screen?.x??10,sy=screen?.y??12,sw=screen?.width??w-20,sh=screen?.height??h*.3;
  const lastKey=keys.length?Math.max(...keys.map(key=>key.y+key.height)):h-42*scale;
  const bx=25*scale,by=Math.min(sy+sh+20*scale,h*.48),bw=w-2*bx;
  const bh=Math.max(160*scale,Math.min(h-24*scale,lastKey+13*scale)-by);
  const lcd={x:sx+15*scale,y:sy+17*scale,width:sw-30*scale,height:sh-31*scale};
  const chip={x:bx+bw*.59,y:by+bh*.25,rx:bw*.14,ry:Math.min(bw*.11,bh*.09)};
  const battery={x:bx+bw*.35,y:by+bh*.73,r:Math.min(bw*.175,bh*.16)};
  const tracks=[];
  // Routed copper under a translucent solder mask: the short 45-degree turns
  // and via terminations make this a board, rather than a field of button pads.
  for(let i=0;i<12;i++){
    const x=bx+10*scale+i*5.3*scale,y=by+32*scale+i*4*scale;
    const endY=by+bh*(.43+(i%4)*.065),endX=bx+bw*(.48+(i%3)*.1);
    tracks.push(`<path d="M ${n(x)} ${n(by+8*scale)} V ${n(y)} L ${n(x+13*scale)} ${n(y+13*scale)} V ${n(endY-10*scale)} L ${n(x+23*scale)} ${n(endY)} H ${n(endX)}"/>`);
  }
  for(let i=0;i<9;i++){
    const x=bx+bw-12*scale-i*6*scale,y=by+bh*(.29+i*.045);
    tracks.push(`<path d="M ${n(chip.x+chip.rx+5*scale)} ${n(chip.y+(i-4)*4*scale)} H ${n(x-12*scale)} L ${n(x)} ${n(chip.y+(i-4)*4*scale+12*scale)} V ${n(y)} L ${n(x-12*scale)} ${n(y+12*scale)} H ${n(bx+bw*.52)}"/>`);
  }
  const solder=[];
  for(let i=0;i<22;i++){
    const x=bx+bw*(.08+((i*7)%17)/20),y=by+bh*(.13+((i*11)%19)/25);
    // Keep vias away from the dominant coin cell and epoxy package.
    if(Math.hypot(x-battery.x,y-battery.y)<battery.r+9*scale||Math.hypot((x-chip.x)/1.35,y-chip.y)<chip.ry+10*scale)continue;
    solder.push(circle(x,y,2.15*scale,`fill="#c9c3a0" stroke="#1f3923" stroke-width="${n(scale)}"`)+circle(x,y,.8*scale,'fill="#18301d"'));
  }
  const components=[];
  const placements=[[.18,.14,0],[.34,.11,0],[.79,.15,90],[.83,.32,90],[.21,.35,0],[.43,.38,90],[.67,.46,0],[.82,.54,90],[.12,.55,0],[.75,.69,90],[.77,.82,0],[.51,.9,0],[.15,.9,90],[.86,.9,0]];
  for(let i=0;i<placements.length;i++){
    const [x,y,angle]=placements[i],px=bx+bw*x,py=by+bh*y;
    const ceramic=i%3===0;
    components.push(`<g transform="translate(${n(px)} ${n(py)}) rotate(${angle})"><rect x="-6.8" y="-3.2" width="13.6" height="6.4" rx="1.2" fill="#12291a" opacity=".8" transform="translate(0 1.5)"/><rect x="-6" y="-2.6" width="12" height="5.2" rx=".8" fill="${paint('solder')}"/><rect x="-3.8" y="-2.8" width="7.6" height="5.6" rx=".65" fill="${ceramic?'#ab9470':'#242d28'}"/><path d="M -3 -1.5 H 3" stroke="${ceramic?'#d0bd9e':'#626c63'}" stroke-width=".6"/><text x="-5.5" y="-6" fill="#d8dfbd" opacity=".7" font-size="3.7" font-family="monospace">${ceramic?'C':'R'}${i+1}</text></g>`);
  }
  const screw=(x,y,r=4.2*scale)=>`<g>${circle(x,y,r+3*scale,'fill="#101a15"')}${circle(x,y,r+1.3*scale,'fill="#707b6d"')}${circle(x,y,r,`fill="${paint('steel')}"`)}<path d="M ${n(x-r*.65)} ${n(y)} H ${n(x+r*.65)} M ${n(x)} ${n(y-r*.65)} V ${n(y+r*.65)}" stroke="#29342e" stroke-width="${n(1.2*scale)}" stroke-linecap="round"/></g>`;
  const ribs=[];
  for(let i=0;i<8;i++){
    const y=by+bh*(.08+i*.12);
    ribs.push(rect(9*scale,y,10*scale,4*scale,'rx="1" fill="#3e453f"')+rect(w-19*scale,y,10*scale,4*scale,'rx="1" fill="#3e453f"'));
  }
  const ribbon={x:bx+bw*.28,y:lcd.y+lcd.height-8*scale,width:bw*.49,height:by-lcd.y-lcd.height+33*scale};
  const stripes=Array.from({length:37},(_,i)=>{
    const x=ribbon.x+3*scale+i*(ribbon.width-6*scale)/36;
    return `<path d="M ${n(x)} ${n(ribbon.y+2*scale)} V ${n(ribbon.y+ribbon.height-2*scale)}"/>`;
  }).join('');
  const board=`M ${n(bx+9*scale)} ${n(by)} H ${n(bx+bw-9*scale)} L ${n(bx+bw)} ${n(by+9*scale)} V ${n(by+bh-14*scale)} L ${n(bx+bw-14*scale)} ${n(by+bh)} H ${n(bx+14*scale)} L ${n(bx)} ${n(by+bh-14*scale)} V ${n(by+9*scale)} Z`;
  return `<svg class="reset-internals" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${n(w)} ${n(h)}" aria-hidden="true" focusable="false" style="display:block;overflow:visible">
  <defs>
    <linearGradient id="${id}-case" x2=".8" y2="1"><stop stop-color="#30362f"/><stop offset=".24" stop-color="#171e19"/><stop offset="1" stop-color="#111713"/></linearGradient>
    <linearGradient id="${id}-pcb" x2=".8" y2="1"><stop stop-color="#446e34"/><stop offset=".48" stop-color="#2f5729"/><stop offset="1" stop-color="#244a27"/></linearGradient>
    <linearGradient id="${id}-steel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0f0db"/><stop offset=".19" stop-color="#b9c2b3"/><stop offset=".46" stop-color="#e2e5d3"/><stop offset=".64" stop-color="#7d8c7d"/><stop offset=".82" stop-color="#c7d0bd"/><stop offset="1" stop-color="#647361"/></linearGradient>
    <linearGradient id="${id}-solder" x2="0" y2="1"><stop stop-color="#e1e4ca"/><stop offset=".45" stop-color="#a8b299"/><stop offset="1" stop-color="#788471"/></linearGradient>
    <linearGradient id="${id}-foil" x1="0" y1="0" x2="1" y2=".65"><stop stop-color="#c8d0c2"/><stop offset=".36" stop-color="#eeeee3"/><stop offset=".63" stop-color="#c1c9bb"/><stop offset="1" stop-color="#e3e5d8"/></linearGradient>
    <radialGradient id="${id}-chip" cx=".38" cy=".3" r=".72"><stop stop-color="#454e41"/><stop offset=".35" stop-color="#1e2b22"/><stop offset=".8" stop-color="#0d1911"/><stop offset="1" stop-color="#07110b"/></radialGradient>
    <radialGradient id="${id}-coin" cx=".3" cy=".2" r=".92"><stop stop-color="#f0f1dc"/><stop offset=".5" stop-color="#c2caba"/><stop offset=".73" stop-color="#abb6a2"/><stop offset="1" stop-color="#66775f"/></radialGradient>
    <clipPath id="${id}-board"><path d="${board}"/></clipPath>
    <clipPath id="${id}-battery">${circle(battery.x,battery.y,battery.r-3*scale)}</clipPath>
  </defs>
  <g data-component="chassis">
    ${rect(3*scale,4*scale,w-6*scale,h-8*scale,`rx="${n(24*scale)}" fill="${paint('case')}" stroke="#50574c" stroke-width="${n(1.2*scale)}"`)}
    ${rect(11*scale,12*scale,w-22*scale,h-24*scale,`rx="${n(18*scale)}" fill="none" stroke="#080e0a" stroke-width="${n(4*scale)}"`)}
    ${ribs.join('')}
  </g>
  <g data-component="lcd-backplate">
    ${rect(lcd.x-5*scale,lcd.y-4*scale,lcd.width+10*scale,lcd.height+10*scale,`rx="${n(4*scale)}" fill="#070d09" stroke="#485044" stroke-width="${n(2*scale)}"`)}
    ${rect(lcd.x,lcd.y,lcd.width,lcd.height,`rx="${n(2*scale)}" fill="${paint('foil')}" stroke="#939f8c" stroke-width="${n(scale)}"`)}
    <path d="M ${n(lcd.x+7*scale)} ${n(lcd.y+7*scale)} H ${n(lcd.x+lcd.width-7*scale)} V ${n(lcd.y+lcd.height-7*scale)}" fill="none" stroke="#fffef2" stroke-opacity=".5" stroke-width="${n(scale)}"/>
    ${rect(lcd.x+8*scale,lcd.y-3*scale,16*scale,8*scale,'rx="1" fill="#202b22"')}${rect(lcd.x+lcd.width-24*scale,lcd.y-3*scale,16*scale,8*scale,'rx="1" fill="#202b22"')}
    <text x="${n(lcd.x+lcd.width*.5)}" y="${n(lcd.y+lcd.height*.52)}" text-anchor="middle" fill="#6e7b67" opacity=".6" font-family="monospace" font-size="${n(6*scale)}" letter-spacing="${n(1.4*scale)}">LCD  /  REFLECTOR</text>
  </g>
  <path d="${board}" fill="#07120a" transform="translate(0 ${n(5*scale)})"/>
  <path data-component="circuit-board" d="${board}" fill="${paint('pcb')}" stroke="#6d8750" stroke-width="${n(scale)}"/>
  <g clip-path="${paint('board')}">
    <g fill="none" stroke="#91ae56" stroke-width="${n(1.1*scale)}" stroke-linejoin="round" opacity=".33">${tracks.join('')}</g>
    <path d="M ${n(bx+8*scale)} ${n(by+8*scale)} V ${n(by+bh-20*scale)} L ${n(bx+20*scale)} ${n(by+bh-8*scale)} H ${n(bx+bw-20*scale)} L ${n(bx+bw-8*scale)} ${n(by+bh-20*scale)} V ${n(by+8*scale)}" fill="none" stroke="#b0c48a" stroke-width="${n(.7*scale)}" opacity=".45"/>
    ${solder.join('')}${components.join('')}
    <text x="${n(bx+bw*.72)}" y="${n(by+bh-12*scale)}" fill="#d4dfb6" opacity=".75" font-family="monospace" font-size="${n(5.5*scale)}" letter-spacing="${n(.8*scale)}">BA II PLUS</text>
    <text x="${n(bx+12*scale)}" y="${n(by+16*scale)}" fill="#cedaab" opacity=".7" font-family="monospace" font-size="${n(5*scale)}">BF16-11-1</text>
  </g>
  <g data-component="lcd-ribbon">
    ${rect(ribbon.x,ribbon.y,ribbon.width,ribbon.height,`rx="${n(2*scale)}" fill="#a0aaa0" stroke="#414b40" stroke-width="${n(scale)}"`)}
    <g stroke="#2a352a" stroke-width="${n(1.2*scale)}" opacity=".85">${stripes}</g>
    ${rect(ribbon.x-4*scale,ribbon.y+ribbon.height-4*scale,ribbon.width+8*scale,8*scale,`rx="${n(1.5*scale)}" fill="#202c20" stroke="#8c9c7c" stroke-width="${n(.7*scale)}"`)}
    <path d="M ${n(ribbon.x)} ${n(ribbon.y+6*scale)} H ${n(ribbon.x+ribbon.width)}" stroke="#e2e5d3" stroke-opacity=".45" stroke-width="${n(scale)}"/>
  </g>
  <g data-component="epoxy-chip">
    <ellipse cx="${n(chip.x)}" cy="${n(chip.y+3*scale)}" rx="${n(chip.rx+5*scale)}" ry="${n(chip.ry+4*scale)}" fill="#122414" opacity=".8"/>
    <ellipse cx="${n(chip.x)}" cy="${n(chip.y)}" rx="${n(chip.rx+4*scale)}" ry="${n(chip.ry+3*scale)}" fill="none" stroke="#d4dfb6" stroke-width="${n(1.1*scale)}"/>
    <ellipse cx="${n(chip.x)}" cy="${n(chip.y)}" rx="${n(chip.rx)}" ry="${n(chip.ry)}" fill="${paint('chip')}" stroke="#06150a" stroke-width="${n(1.2*scale)}"/>
    <path d="M ${n(chip.x-chip.rx*.67)} ${n(chip.y-chip.ry*.36)} Q ${n(chip.x-chip.rx*.12)} ${n(chip.y-chip.ry*.94)} ${n(chip.x+chip.rx*.55)} ${n(chip.y-chip.ry*.52)}" fill="none" stroke="#a9b9a1" stroke-opacity=".22" stroke-width="${n(1.5*scale)}" stroke-linecap="round"/>
  </g>
  <g data-component="coin-cell">
    ${circle(battery.x,battery.y+4*scale,battery.r+6*scale,'fill="#0b1b10" opacity=".85"')}
    ${circle(battery.x,battery.y,battery.r+4*scale,'fill="#223c24" stroke="#c0c4a3" stroke-width="1"')}
    ${circle(battery.x,battery.y,battery.r,`fill="${paint('steel')}" stroke="#5e7154" stroke-width="${n(1.5*scale)}"`)}
    ${circle(battery.x,battery.y,battery.r-3*scale,`fill="${paint('coin')}" stroke="#e4e6cf" stroke-width="${n(.7*scale)}"`)}
    <g clip-path="${paint('battery')}" stroke="#f7f8e8" stroke-opacity=".13" stroke-width="${n(.6*scale)}">${Array.from({length:14},(_,i)=>`<path d="M ${n(battery.x-battery.r)} ${n(battery.y-battery.r+i*battery.r/7)} H ${n(battery.x+battery.r)}"/>`).join('')}</g>
    <g transform="rotate(-18 ${n(battery.x)} ${n(battery.y)})" fill="#53634c" font-family="sans-serif" text-anchor="middle">
      <text x="${n(battery.x)}" y="${n(battery.y-11*scale)}" font-size="${n(12*scale)}">+</text>
      <text x="${n(battery.x)}" y="${n(battery.y+2*scale)}" font-size="${n(8*scale)}" font-weight="700" letter-spacing="${n(.6*scale)}">CR2032</text>
      <text x="${n(battery.x)}" y="${n(battery.y+13*scale)}" font-size="${n(5.5*scale)}" letter-spacing="${n(.4*scale)}">LITHIUM 3V</text>
    </g>
    <path d="M ${n(battery.x-battery.r*.85)} ${n(battery.y-battery.r*.66)} Q ${n(battery.x)} ${n(battery.y-battery.r*1.15)} ${n(battery.x+battery.r*.83)} ${n(battery.y-battery.r*.55)} L ${n(battery.x+battery.r*.65)} ${n(battery.y-battery.r*.34)} Q ${n(battery.x)} ${n(battery.y-battery.r*.78)} ${n(battery.x-battery.r*.65)} ${n(battery.y-battery.r*.4)} Z" fill="${paint('steel')}" stroke="#6a7b61" stroke-width="${n(scale)}"/>
    ${rect(battery.x-7*scale,battery.y-battery.r-6*scale,14*scale,10*scale,`rx="${n(1.5*scale)}" fill="${paint('steel')}" stroke="#6a7b61" stroke-width="${n(scale)}"`)}
  </g>
  ${screw(bx+10*scale,by+bh*.43)}${screw(bx+bw-10*scale,by+bh*.4)}${screw(bx+14*scale,by+bh-12*scale)}${screw(bx+bw-14*scale,by+bh-12*scale)}
  ${screw(17*scale,sy+12*scale,3.2*scale)}${screw(w-17*scale,sy+12*scale,3.2*scale)}
  </svg>`;
}

let instance=0;
/**
 * DOM adapter: ids are unique even if more than one preview is on the page.
 * @param {InternalsOptions} options
 * @returns {Element|null}
 */
export function createResetInternals(options){
  const template=document.createElement('template');
  template.innerHTML=resetInternalsMarkup({...options,prefix:options.prefix??`reset-internals-${++instance}`});
  return template.content.firstElementChild;
}
