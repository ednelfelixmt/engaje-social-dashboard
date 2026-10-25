import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
type State={ok:boolean;message:string};
function renderForm(mode:'request'|'update',state:State={ok:false,message:''},pending=false){
 const {PasswordRecoveryForm}=loadTypescript<{PasswordRecoveryForm:React.ComponentType<{action:()=>Promise<State>;mode:'request'|'update'}>}>(new URL('../src/components/auth/password-recovery-form.tsx',import.meta.url),(id,native)=>{
  if(id==='react-dom')return {useFormState:()=>[state,'/synthetic-action'],useFormStatus:()=>({pending})};
  if(id==='@/components/ui/button')return {Button:({children,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>)=>React.createElement('button',props,children)};
  return native(id);
 });return renderToStaticMarkup(React.createElement(PasswordRecoveryForm,{action:async()=>state,mode}));
}
test('request form has a labeled email field and never asks for a password',()=>{
 const html=renderForm('request');assert.match(html,/name="email"/);assert.match(html,/type="email"/);assert.match(html,/autoComplete="email"/);assert.doesNotMatch(html,/type="password"/);
});
test('password form uses matching action fields and password-manager hints',()=>{
 const html=renderForm('update');assert.match(html,/name="password"/);assert.match(html,/name="confirm"/);assert.equal((html.match(/autoComplete="new-password"/g)??[]).length,2);assert.match(html,/minLength="12"/);
});
test('pending state disables submission and validation failures are announced',()=>{
 assert.match(renderForm('request',{ok:false,message:''},true),/disabled=""/);const html=renderForm('update',{ok:false,message:'As senhas não coincidem.'});assert.match(html,/role="alert"/);assert.match(html,/As senhas não coincidem/);
});
test('successful response removes editable password fields and announces the result',()=>{
 const html=renderForm('update',{ok:true,message:'Senha atualizada.'});assert.match(html,/role="status"/);assert.match(html,/Senha atualizada/);assert.doesNotMatch(html,/type="password"/);assert.doesNotMatch(html,/<form/);
});
function resetPage(options:{authenticated?:boolean;error?:boolean;throws?:boolean}={}){
 let checks=0;
 const {default:page}=loadTypescript<{default:(props:{searchParams:Promise<Record<string,string|undefined>>})=>Promise<React.ReactElement>}>(new URL('../src/app/auth/reset-password/page.tsx',import.meta.url),(id,native)=>{
  if(id==='@/lib/supabase/server')return {serverClient:async()=>({auth:{getUser:async()=>{checks++;if(options.throws)throw new Error('synthetic outage');return {data:{user:options.authenticated?{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}:null},error:options.error?{code:'synthetic'}:null};}}})};
  if(id==='@/components/auth/password-recovery-form')return {PasswordRecoveryForm:()=>React.createElement('form',{'data-password-update':'allowed'})};
  if(id==='../recovery/actions')return {updateRecoveredPassword:async()=>({ok:true,message:''})};
  if(id==='next/link')return ({children,...props}:{children:React.ReactNode})=>React.createElement('a',props,children);
  return native(id);
 });return {page,checks:()=>checks};
}
test('reset page presents a password form only after verified Auth identity',async()=>{
 const app=resetPage({authenticated:true});const html=renderToStaticMarkup(await app.page({searchParams:Promise.resolve({})}));assert.match(html,/data-password-update="allowed"/);assert.equal(app.checks(),1);
});
test('invalid link, expired identity and Auth outage never render update fields',async()=>{
 for(const [options,query] of [[{},{}],[{authenticated:true},{error:'invalid_link'}],[{authenticated:true,error:true},{}],[{throws:true},{}]] as const){const app=resetPage(options);const html=renderToStaticMarkup(await app.page({searchParams:Promise.resolve(query)}));assert.doesNotMatch(html,/data-password-update/);assert.match(html,/Solicitar novo link/);assert.match(html,/role="status"/);}
});
