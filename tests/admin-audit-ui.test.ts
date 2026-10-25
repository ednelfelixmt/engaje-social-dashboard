import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import * as audit from '../src/lib/auth/admin-audit';
import {isValidTimezone} from '../src/lib/organization-options';
const org='22222222-2222-4222-8222-222222222222', actor='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const event={id:'11111111-1111-4111-8111-111111111111',occurred_at:'2026-10-25T18:00:00+00:00',actor_id:actor,subject_user_id:null,event:'client_updated',before_state:{},after_state:{changed_fields:['name','timezone']}};
function setup(options:{denied?:boolean;missing?:boolean;error?:boolean;data?:unknown}={}){
 const calls:unknown[]=[],filters:unknown[]=[];
 const query={select:()=>query,eq:(key:string,value:unknown)=>{filters.push({key,value});return query;},maybeSingle:async()=>({data:options.missing?null:{id:org,name:'Synthetic client',timezone:'America/Cuiaba'},error:null})};
 const {default:page}=loadTypescript<{default:(props:{params:Promise<{organizationId:string}>})=>Promise<React.ReactElement>}>(new URL('../src/app/(agency)/admin/organizations/[organizationId]/activity/page.tsx',import.meta.url),(id,native)=>{
  if(id==='@/lib/auth/session')return {requireAdmin:async()=>{if(options.denied)throw new Error('synthetic access denied');return {db:{from:(table:string)=>{calls.push(table);return query;},rpc:async(name:string,args:unknown)=>{calls.push({name,args});return {data:options.data??[],error:options.error?{code:'PGRST202'}:null};}}};}};
  if(id==='next/navigation')return {notFound:()=>{throw new Error('synthetic 404');}};
  if(id==='@/lib/auth/admin-audit')return audit;
  if(id==='@/lib/organization-options')return {isValidTimezone};
  if(id==='@/components/ui/card')return {Card:({children}:{children:React.ReactNode})=>React.createElement('section',null,children)};
  if(id==='next/link')return ({children,...props}:{children:React.ReactNode})=>React.createElement('a',props,children);
  return native(id);
 });return {page,calls,filters};
}

test('audit parser distinguishes empty history from malformed or unexpected data',()=>{
 assert.deepEqual(audit.parseAdminAudit([]),[]);for(const value of [null,{},[{}],[{...event,actor_id:'invalid'}],[{...event,occurred_at:'invalid'}],[{...event,after_state:{email:'synthetic@example.test'}}]])assert.equal(audit.parseAdminAudit(value),null);
 assert.equal(audit.parseAdminAudit(Array(101).fill(event)),null);
});
test('audit page renders real event labels, tenant time and administrative navigation',async()=>{
 const app=setup({data:[event]});const html=renderToStaticMarkup(await app.page({params:Promise.resolve({organizationId:org})}));assert.match(html,/Dados do cliente alterados/);assert.match(html,/nome, fuso horário/);assert.match(html,/14:00:00/);assert.ok(html.includes('/admin/users/'));assert.ok(app.filters.some(value=>JSON.stringify(value)===JSON.stringify({key:'is_agency',value:false})));assert.deepEqual(app.calls[1],{name:'client_admin_audit',args:{p_organization_id:org,p_limit:100}});
});
test('empty audit is visible without invented activity',async()=>{
 const app=setup();const html=renderToStaticMarkup(await app.page({params:Promise.resolve({organizationId:org})}));assert.match(html,/Nenhuma alteração administrativa registrada/);assert.doesNotMatch(html,/Dados do cliente alterados/);
});
test('RPC failure and invalid history show retry state instead of empty success',async()=>{
 for(const options of [{error:true},{data:[{...event,event:'unknown'}]}]){const app=setup(options);const html=renderToStaticMarkup(await app.page({params:Promise.resolve({organizationId:org})}));assert.match(html,/Não foi possível carregar/);assert.match(html,/Tentar novamente/);assert.doesNotMatch(html,/Nenhuma alteração administrativa registrada/);}
});
test('client denial, missing tenant and invalid identifier happen before audit lookup',async()=>{
 const denied=setup({denied:true});await assert.rejects(denied.page({params:Promise.resolve({organizationId:org})}),/access denied/);assert.equal(denied.calls.length,0);
 const invalid=setup();await assert.rejects(invalid.page({params:Promise.resolve({organizationId:'bad'})}),/404/);assert.equal(invalid.calls.length,0);
 const missing=setup({missing:true});await assert.rejects(missing.page({params:Promise.resolve({organizationId:org})}),/404/);assert.equal(missing.calls.length,1);
});
test('membership audit describes the recorded transition without inferring access',()=>{
 const parsed=audit.parseAdminAudit([{...event,event:'membership_changed',before_state:{role:'editor',is_active:true},after_state:{role:'viewer',is_active:false}}])!;
 assert.equal(audit.adminAuditDescription(parsed[0]),'Editor · ativo → Visualizador · inativo');
});
