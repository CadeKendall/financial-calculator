import {describe,expect,it} from 'vitest';
import {RESET_TIMING,RESET_TRACKS,poseToStyle,sampleResetTrack,trackToKeyframes} from '../web/reset-motion.js';

const neutral={x:0,y:0,z:0,rx:0,ry:0,blur:0,opacity:1};

describe('shared live and Remotion reset motion',()=>{
  it('keeps the initial face precisely aligned and hides the replacement until its entrance',()=>{
    expect(sampleResetTrack(RESET_TRACKS.outgoing,0)).toMatchObject(neutral);
    expect(sampleResetTrack(RESET_TRACKS.outgoing,RESET_TIMING.remove)).toMatchObject(neutral);
    for(const time of [0,RESET_TIMING.remove,RESET_TIMING.outside,RESET_TIMING.install-.001]){
      expect(sampleResetTrack(RESET_TRACKS.incoming,time).opacity).toBe(0);
    }
    const entrance=sampleResetTrack(RESET_TRACKS.incoming,RESET_TIMING.install);
    expect(entrance.opacity).toBe(1);expect(entrance.y).toBeGreaterThan(100);
  });

  it('holds the faceplates outside the body while the internal components are visible',()=>{
    for(const fraction of [0,.25,.5,.75,.999]){
      const time=RESET_TIMING.outside+(RESET_TIMING.install-RESET_TIMING.outside)*fraction;
      expect(sampleResetTrack(RESET_TRACKS.outgoing,time).y).toBeLessThan(-100);
      expect(sampleResetTrack(RESET_TRACKS.incoming,time).opacity).toBe(0);
    }
  });

  it('lands exactly on the original geometry and removes the LCD refresh before input resumes',()=>{
    for(const time of [RESET_TIMING.seated,RESET_TIMING.commit,RESET_TIMING.interactive,RESET_TIMING.total]){
      expect(sampleResetTrack(RESET_TRACKS.incoming,time)).toMatchObject(neutral);
    }
    expect(sampleResetTrack(RESET_TRACKS.refresh,RESET_TIMING.seated).opacity).toBe(0);
    expect(sampleResetTrack(RESET_TRACKS.refresh,RESET_TIMING.commit).opacity).toBeGreaterThan(.4);
    expect(sampleResetTrack(RESET_TRACKS.refresh,RESET_TIMING.interactive).opacity).toBe(0);
  });

  it('has continuous finite poses at every internal keyframe and never warps the panel',()=>{
    for(const track of [RESET_TRACKS.outgoing,RESET_TRACKS.incoming]){
      for(const keyframe of track.frames.slice(1,-1)){
        const time=track.delay+keyframe.offset*track.duration;
        const before=sampleResetTrack(track,time-.001),after=sampleResetTrack(track,time+.001);
        for(const field of ['x','y','z','rx','ry','blur','opacity']){
          expect(Number.isFinite(before[field])&&Number.isFinite(after[field])).toBe(true);
          expect(Math.abs(before[field]-after[field])).toBeLessThan(.02);
        }
      }
      for(let time=0;time<=RESET_TIMING.total;time+=10){
        const pose=sampleResetTrack(track,time),style=poseToStyle(pose);
        expect(pose.opacity).toBeGreaterThanOrEqual(0);expect(pose.opacity).toBeLessThanOrEqual(1);
        if(style.transform){
          expect(style.transform).not.toMatch(/scale|skew|NaN|Infinity/);
          expect(Math.abs(pose.rx)).toBeLessThan(2);expect(Math.abs(pose.ry)).toBeLessThan(2);
        }
      }
    }
  });

  it('keeps authored frame poses consistent with the keyframes sent to the browser',()=>{
    for(const track of Object.values(RESET_TRACKS)){
      const frames=trackToKeyframes(track);
      for(const frame of frames){
        const time=track.delay+frame.offset*track.duration;
        const sampled=poseToStyle(sampleResetTrack(track,time));
        expect(sampled.opacity).toBeCloseTo(frame.opacity,5);
        // Exact endpoints ensure temporary layers can hand back to the real UI
        // without a position, perspective, opacity, or blur discontinuity.
        if(frame.offset===0||frame.offset===1){
          if(frame.transform)expect(sampled.transform).toBe(frame.transform);
          if(frame.filter)expect(sampled.filter).toBe(frame.filter);
        }
        expect(Object.keys(frame).every(key=>['offset','easing','opacity','transform','filter'].includes(key))).toBe(true);
      }
    }
  });
});
