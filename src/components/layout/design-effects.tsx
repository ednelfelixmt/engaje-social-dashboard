'use client';
import {useEffect} from 'react';

/** Faz o brilho dos cartões seguir o cursor: grava a posição do mouse em --mx/--my no cartão sob o ponteiro. */
export function DesignEffects(){
  useEffect(()=>{
    const media=(query:string)=>window.matchMedia(query).matches;
    if(media('(prefers-reduced-motion: reduce)')||media('(pointer: coarse)'))return;
    let frame=0;let last:PointerEvent|null=null;
    const apply=()=>{
      frame=0;
      const event=last;if(!event)return;
      const target=event.target instanceof Element?event.target:null;
      const card=target?.closest<HTMLElement>('.glass-panel');
      if(!card)return;
      const box=card.getBoundingClientRect();
      card.style.setProperty('--mx',`${event.clientX-box.left}px`);
      card.style.setProperty('--my',`${event.clientY-box.top}px`);
    };
    const onMove=(event:PointerEvent)=>{last=event;if(!frame)frame=requestAnimationFrame(apply);};
    document.addEventListener('pointermove',onMove,{passive:true});
    return()=>{document.removeEventListener('pointermove',onMove);if(frame)cancelAnimationFrame(frame);};
  },[]);
  return null;
}
