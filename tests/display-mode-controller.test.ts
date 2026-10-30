import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {loadTypescript} from './helpers/load-typescript';
function setup(active=false){
 const previous=new Map<string,PropertyDescriptor|undefined>();const events:Record<string,(event:KeyboardEvent)=>void>={},calls:{fullscreen:number;exit:number;urls:string[];moves:string[];prevented:number}={fullscreen:0,exit:0,urls:[],moves:[],prevented:0};const effects:(()=>void|(()=>void))[]=[];let state=0;
 class SyntheticElement{constructor(public editable=false){}closest(){return this.editable?this:null;}}
 const panels=[{getClientRects:()=>[],getBoundingClientRect:()=>({top:0}),scrollIntoView:()=>calls.moves.push('hidden')},{getClientRects:()=>[{}],getBoundingClientRect:()=>({top:0}),scrollIntoView:()=>calls.moves.push('first')},{getClientRects:()=>[{}],getBoundingClientRect:()=>({top:1000}),scrollIntoView:()=>calls.moves.push('second')}];
 const documentRoot={classList:{toggle(){}},requestFullscreen:async()=>{calls.fullscreen++;}};
 const doc={documentElement:documentRoot,fullscreenElement:active?documentRoot:null,querySelectorAll:()=>panels,exitFullscreen:async()=>{calls.exit++;}};
 const intervals:{callback:()=>void;ms:number}[]=[];
 const win={setInterval:(callback:()=>void,ms:number)=>{intervals.push({callback,ms});return intervals.length;},clearInterval(){},matchMedia:()=>({matches:true}),addEventListener:(name:string,fn:(event:KeyboardEvent)=>void)=>{events[name]=fn;},removeEventListener(){}};
 for(const [name,value]of Object.entries({document:doc,window:win,localStorage:{getItem(){throw new Error('Storage denied');},setItem(){throw new Error('Storage denied');}},Element:SyntheticElement})){previous.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});}
 const {DisplayModeController}=loadTypescript<typeof import('../src/components/dashboard/display-mode-controller')>(new URL('../src/components/dashboard/display-mode-controller.tsx',import.meta.url),(id,native)=>id==='react'?{useEffect:(fn:()=>void|(()=>void))=>effects.push(fn),useState:(initial:unknown)=>{const n=state++;return[n===0?true:initial,()=>{}];}}:id==='next/navigation'?{useRouter:()=>({replace:(url:string)=>calls.urls.push(url),refresh(){}}),usePathname:()=>'/synthetic/reports/analytics',useSearchParams:()=>new URLSearchParams('from=2026-10-20&to=2026-10-21'+(active?'&display=tv':''))}:native(id));
 const element=DisplayModeController();effects.forEach(effect=>effect());
 const buttons=element.type==='button'?[element]:React.Children.toArray(element.props.children).filter(React.isValidElement) as React.ReactElement<{onClick:()=>void;title?:string}>[];
 return{calls,buttons,rotate:()=>intervals.find(item=>item.ms===20_000)?.callback(),keyboard:(key:string,editable=false,ctrlKey=false)=>events.keydown?.({key,target:new SyntheticElement(editable),ctrlKey,preventDefault:()=>calls.prevented++} as unknown as KeyboardEvent),restore:()=>{for(const[name,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else Reflect.deleteProperty(globalThis,name);}};
}
test('TV entry requests fullscreen from the click and survives blocked localStorage, preserving applied date filters',async()=>{
 const f=setup();try{await f.buttons[0].props.onClick();assert.equal(f.calls.fullscreen,1);const u=new URL(f.calls.urls[0],'https://example.test');assert.equal(u.searchParams.get('display'),'tv');assert.equal(u.searchParams.get('from'),'2026-10-20');assert.equal(u.searchParams.get('to'),'2026-10-21');}finally{f.restore();}
});
test('TV remote skips hidden panels and does not hijack typing or modified keys',()=>{
 const f=setup(true);try{f.keyboard('ArrowRight',true);f.keyboard('ArrowRight',false,true);assert.equal(f.calls.moves.length,0);f.keyboard('ArrowRight');assert.deepEqual(f.calls.moves,['second']);assert.equal(f.calls.prevented,1);}finally{f.restore();}
});
test('TV exit leaves browser fullscreen and removes only its mode parameter',async()=>{
 const f=setup(true);try{const exit=f.buttons.find(button=>button.props.title==='Sair do modo TV');assert.ok(exit);await exit.props.onClick();assert.equal(f.calls.exit,1);const u=new URL(f.calls.urls[0],'https://example.test');assert.equal(u.searchParams.has('display'),false);assert.equal(u.searchParams.get('from'),'2026-10-20');}finally{f.restore();}
});

test('TV automatic rotation uses visible panels and honors reduced motion',()=>{
 const f=setup(true);try{f.rotate();assert.deepEqual(f.calls.moves,['second']);}finally{f.restore();}
});
