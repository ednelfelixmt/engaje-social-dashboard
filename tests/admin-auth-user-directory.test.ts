import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {administrationKey} from '../src/lib/auth/administration-key';

let authorized=true,adminReads=0,adminError=false,invitationError=false,serviceKey:string|undefined='synthetic-key';
const member={organization_id:'synthetic-org',user_id:'synthetic-person',role:'viewer',is_active:true,created_at:'2026-10-01'};
const query=(result:unknown)=>{const q={select:()=>q,order:()=>q,limit:async()=>result,then:(resolve:(value:unknown)=>unknown)=>Promise.resolve(result).then(resolve)};return q;};
const {default:Page}=loadTypescript<typeof import('../src/app/(agency)/admin/users/page')>(new URL('../src/app/(agency)/admin/users/page.tsx',import.meta.url),(id,native)=>{
 if(id==='@/lib/auth/session')return{requireAdmin:async()=>{if(!authorized)throw new Error('Denied');return{db:{from:(table:string)=>query({data:table==='organizations'?[{id:'synthetic-org',name:'Organização sintética',status:'active',slug:'synthetic',is_agency:false}]:[member],error:null})}};}};
 if(id==='@/lib/auth/administration-key')return {administrationKey:()=>serviceKey};
 if(id==='@supabase/supabase-js')return{createClient:()=>({auth:{admin:{listUsers:async()=>{adminReads++;return{data:{users:adminError?[]:[{id:'synthetic-person',email:'person@example.invalid',email_confirmed_at:'2026-10-01',created_at:'2026-10-01',last_sign_in_at:null}]},error:adminError?{}:null};}}},from:()=>query({data:[],error:invitationError?{}:null})})};
 if(id==='@/lib/supabase/config')return{supabaseUrl:'https://synthetic.invalid'};
 if(id==='@/components/admin/collection')return{AdminCollection:({entries}:{entries:{id:string;content:React.ReactNode}[]})=>React.createElement('div',null,entries.map(entry=>React.createElement('div',{key:entry.id},entry.content)))};
 if(id==='@/components/action-form')return{ActionForm:({children}:{children:React.ReactNode})=>React.createElement('div',null,children)};
 if(id==='../actions')return{inviteClientUser:async()=>({ok:true,message:''})};
 return native(id);
});

test('administrative directory requires verified agency authorization before privileged reads',async()=>{
 authorized=false;adminReads=0;await assert.rejects(Page(),/Denied/);assert.equal(adminReads,0);authorized=true;
});
test('directory identifies members by email and preserves client links without requiring an invitation',async()=>{
 const html=renderToStaticMarkup(await Page());assert.ok(html.includes('person@example.invalid'));assert.ok(html.includes('Organização sintética'));assert.ok(html.includes('/admin/users/synthetic-person'));assert.ok(!html.includes('Vínculos sem identificação'));
});
test('missing administrative configuration does not masquerade as an empty directory or erase memberships',async()=>{
 serviceKey=undefined;adminReads=0;const html=renderToStaticMarkup(await Page());assert.equal(adminReads,0);assert.ok(html.includes('Não foi possível consultar as contas'));assert.ok(html.includes('Organização sintética'));assert.ok(html.includes('Nenhum vínculo foi removido'));assert.ok(!html.includes('Nenhum convite registrado'));serviceKey='synthetic-key';
});
test('provider errors remain explicit without displaying secrets or upstream details',async()=>{
 adminError=true;invitationError=true;const html=renderToStaticMarkup(await Page());assert.ok(html.includes('Não foi possível consultar as contas'));assert.ok(html.includes('Não foi possível consultar os convites'));assert.ok(!html.includes('synthetic-key'));adminError=false;invitationError=false;
});
test('server administration accepts modern secret keys and legacy service-role configuration, never public keys',()=>{
 assert.equal(administrationKey({SUPABASE_SECRET_KEY:' modern ',SUPABASE_SERVICE_ROLE_KEY:'legacy'}),'modern');assert.equal(administrationKey({SUPABASE_SERVICE_ROLE_KEY:'legacy'}),'legacy');assert.equal(administrationKey({NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public'}),null);
});
