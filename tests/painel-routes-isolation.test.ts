import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTypescript} from './helpers/load-typescript';

type Route={GET:(...args:unknown[])=>Promise<Response>};
const json=(body:unknown)=>({status:200,body} as unknown as Response);

function load(path:string,session:Record<string,unknown>,events:string[]){
 return loadTypescript<Route>(new URL('../src/app/'+path,import.meta.url),(id,native)=>{
  if(id==='@/lib/auth/session')return session;
  if(id==='next/server')return {NextResponse:{json}};
  if(id==='@/lib/metrics/query')return {all:async()=>{events.push('read');return [];}};
  if(id==='@/lib/painel/dataset')return {PAINEL_DAYS:60,buildPainelDataset:()=>({})};
  return native(id);
 });
}

test('dados do painel do cliente passam pela verificação de acesso ao cliente antes de qualquer leitura',async()=>{
 const events:string[]=[];
 const route=load('(tenant)/[organizationSlug]/painel/dados/route.ts',{tenant:async(slug:string)=>{events.push('tenant:'+slug);throw new Error('NOT_FOUND');}},events);
 await assert.rejects(route.GET(new Request('https://x.invalid'),{params:Promise.resolve({organizationSlug:'outro-cliente'})}),/NOT_FOUND/);
 assert.deepEqual(events,['tenant:outro-cliente']);
});

test('dados do painel do cliente leem somente o cliente autorizado',async()=>{
 const events:string[]=[];const filters:string[]=[];
 const chain=():unknown=>new Proxy(function(){} ,{get:(_t,key)=>(...args:unknown[])=>{if(key==='eq'&&args[0]==='organization_id')filters.push(String(args[1]));return chain();}});
 const route=loadTypescript<Route>(new URL('../src/app/(tenant)/[organizationSlug]/painel/dados/route.ts',import.meta.url),(id,native)=>{
  if(id==='@/lib/auth/session')return {tenant:async()=>({db:{from:()=>chain()},org:{id:'org-autorizada',timezone:'America/Cuiaba',currency:'BRL'}})};
  if(id==='next/server')return {NextResponse:{json}};
  if(id==='@/lib/metrics/query')return {all:async(q:(a:number,b:number)=>unknown)=>{q(0,999);events.push('read');return [];}};
  if(id==='@/lib/painel/dataset')return {PAINEL_DAYS:60,buildPainelDataset:()=>({})};
  return native(id);
 });
 await route.GET(new Request('https://x.invalid'),{params:Promise.resolve({organizationSlug:'cliente'})});
 assert.equal(events.length,4);
 assert.deepEqual([...new Set(filters)],['org-autorizada']);
});

test('dados do painel da carteira exigem administrador da agência antes de qualquer leitura',async()=>{
 const events:string[]=[];
 const route=load('(agency)/admin/painel/dados/route.ts',{requireAdmin:async()=>{events.push('admin');throw new Error('REDIRECT');}},events);
 await assert.rejects(route.GET(),/REDIRECT/);
 assert.deepEqual(events,['admin']);
});
