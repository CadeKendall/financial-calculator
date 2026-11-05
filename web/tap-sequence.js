/** A single tap remains immediate; a quick third tap invokes the private action. */
export function createTapSequence({single,triple,now=()=>performance.now(),interval=380}){
  let count=0,last=-Infinity;
  const reset=()=>{count=0;last=-Infinity;};
  return {reset,tap(){const time=now();count=time-last<=interval?count+1:1;last=time;if(count===3){reset();triple();}else if(count===1)single();}};
}
