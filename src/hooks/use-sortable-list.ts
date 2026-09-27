'use client';

import {useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent} from 'react';

const interactiveSelector='button,input,select,textarea,a,[contenteditable="true"]';
const dragThreshold=6;
const edgeSize=72;

export function useSortableList<T extends string>({selector,attribute,onMove}:{
  selector:string;
  attribute:string;
  onMove:(active:T,target:T)=>void;
}){
  const [dragging,setDragging]=useState<T|null>(null);
  const [over,setOver]=useState<T|null>(null);
  const [selected,setSelected]=useState<T|null>(null);
  const active=useRef<T|null>(null);
  const pointerId=useRef<number|null>(null);
  const origin=useRef({x:0,y:0});
  const moved=useRef(false);
  const lastTarget=useRef<T|null>(null);
  const suppressClick=useRef(false);
  const captureTarget=useRef<HTMLElement|null>(null);
  const onMoveRef=useRef(onMove);

  useEffect(()=>{onMoveRef.current=onMove;},[onMove]);

  const reset=useCallback(()=>{
    const target=captureTarget.current;
    const id=pointerId.current;
    if(target&&id!==null&&target.hasPointerCapture(id))target.releasePointerCapture(id);
    active.current=null;
    pointerId.current=null;
    captureTarget.current=null;
    lastTarget.current=null;
    moved.current=false;
    setDragging(null);
    setOver(null);
  },[]);

  useEffect(()=>{
    const track=(event:PointerEvent)=>{
      const item=active.current;
      if(!item||pointerId.current!==event.pointerId)return;
      const distance=Math.hypot(event.clientX-origin.current.x,event.clientY-origin.current.y);
      if(!moved.current&&distance<dragThreshold)return;
      if(!moved.current){
        moved.current=true;
        suppressClick.current=true;
        setSelected(null);
        setDragging(item);
      }
      event.preventDefault();
      if(event.clientY<edgeSize)window.scrollBy({top:-18,behavior:'auto'});
      else if(event.clientY>window.innerHeight-edgeSize)window.scrollBy({top:18,behavior:'auto'});
      const element=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>(selector);
      const target=element?.getAttribute(attribute) as T|null;
      setOver(target&&target!==item?target:null);
      if(target&&target!==item&&target!==lastTarget.current){
        onMoveRef.current(item,target);
        lastTarget.current=target;
      }
    };
    const finish=(event:PointerEvent)=>{
      if(pointerId.current!==event.pointerId)return;
      const didMove=moved.current;
      reset();
      if(didMove)window.setTimeout(()=>{suppressClick.current=false;},250);
    };
    window.addEventListener('pointermove',track,{passive:false});
    window.addEventListener('pointerup',finish);
    window.addEventListener('pointercancel',finish);
    return()=>{
      window.removeEventListener('pointermove',track);
      window.removeEventListener('pointerup',finish);
      window.removeEventListener('pointercancel',finish);
    };
  },[attribute,reset,selector]);

  const start=useCallback((item:T,event:ReactPointerEvent<HTMLElement>,force=false)=>{
    if(event.button!==0||(!force&&(event.target as HTMLElement).closest(interactiveSelector)))return;
    active.current=item;
    pointerId.current=event.pointerId;
    origin.current={x:event.clientX,y:event.clientY};
    lastTarget.current=null;
    moved.current=false;
    captureTarget.current=event.currentTarget;
    event.currentTarget.setPointerCapture(event.pointerId);
  },[]);

  const selectOrMove=useCallback((item:T,event:ReactMouseEvent<HTMLElement>,force=false)=>{
    if(suppressClick.current){event.preventDefault();event.stopPropagation();suppressClick.current=false;return;}
    if(!force&&(event.target as HTMLElement).closest(interactiveSelector))return;
    if(selected&&selected!==item){onMoveRef.current(selected,item);setSelected(null);return;}
    setSelected(selected===item?null:item);
  },[selected]);

  return {dragging,over,selected,start,selectOrMove};
}
