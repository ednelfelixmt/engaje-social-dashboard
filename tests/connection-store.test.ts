import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTypescript} from './helpers/load-typescript';
import type {ProviderToken} from '../src/lib/integrations/provider-authorization';

const pending={id:'10000000-0000-4000-8000-000000000001',organizationId:'20000000-0000-4000-8000-000000000002',actorId:'30000000-0000-4000-8000-000000000003',product:'rd_station_crm' as const,nonce:'40000000-0000-4000-8000-000000000004',slug:'synthetic-client',status:'authorizing'};
function service(){
 const calls:{table:string;steps:{method:string;args:unknown[]}[]}[]=[],rpcCalls:unknown[]=[];
 let result:unknown={data:{id:pending.id},error:null};
 const db={from:(table:string)=>{const call={table,steps:[] as {method:string;args:unknown[]}[]};calls.push(call);const chain:Record<string,unknown>={then:(resolve:(value:unknown)=>unknown)=>Promise.resolve(result).then(resolve)};for(const method of ['select','eq','insert','update','maybeSingle','single'])chain[method]=(...args:unknown[])=>{call.steps.push({method,args});return chain;};return chain;},rpc:async(...args:unknown[])=>{rpcCalls.push(args);return{error:null};}};
 const {connectionService}=loadTypescript<typeof import('../src/lib/integrations/connection-service')>(new URL('../src/lib/integrations/connection-service.ts',import.meta.url),(id,native)=>{
  if(id==='server-only')return{};
  if(id==='@supabase/supabase-js')return{createClient:()=>db};
  if(id==='@/lib/auth/administration-key')return{administrationKey:()=> 'synthetic-server-key-only'};
  if(id==='@/lib/supabase/config')return{supabaseUrl:'https://synthetic.invalid'};
  return native(id);
 });return{store:connectionService({}).store,calls,rpcCalls,setResult:(next:unknown)=>{result=next;}};
}
const filters=(call:ReturnType<typeof service>['calls'][number])=>call.steps.filter(s=>s.method==='eq').map(s=>s.args);
test('OAuth state consumption is an atomic tenant-scoped pending transition with a nonce',async()=>{
 const h=service();assert.equal(await h.store.consume(pending),true);
 assert.deepEqual(filters(h.calls[0]),[['id',pending.id],['organization_id',pending.organizationId],['status','pending'],['config->>connection_hub','true'],['config->>oauth_nonce',pending.nonce],['config->>authorization_status','authorizing']]);
 assert.deepEqual(h.calls[0].steps.find(s=>s.method==='update')?.args,[{status:'syncing',is_enabled:false}]);
 h.setResult({data:null,error:null});assert.equal(await h.store.consume(pending),false);
});
test('verified authorizations remain disabled and credentials go only to the private RPC',async()=>{
 const h=service();const token:ProviderToken={version:1,product:'rd_station_crm',method:'api',accessToken:'SYNTHETIC_PRIVATE_CANARY'};
 await h.store.storeToken(pending.id,token);await h.store.verified(pending,'api');
 assert.deepEqual(h.rpcCalls,[['store_integration_token',{p_id:pending.id,p_token:JSON.stringify(token)}]]);
 assert.doesNotMatch(JSON.stringify(h.calls),/SYNTHETIC_PRIVATE_CANARY/);
 const update=h.calls[0].steps.find(s=>s.method==='update')!.args[0] as {is_enabled:boolean;status:string;config:Record<string,unknown>};
 assert.equal(update.is_enabled,false);assert.equal(update.status,'pending');assert.equal(update.config.authorization_status,'verified');assert.equal(update.config.selection_pending,true);assert.equal(update.config.sync_status,'not_started');assert.equal(update.config.oauth_nonce,undefined);
 assert.ok(filters(h.calls[0]).some(([key,value])=>key==='organization_id'&&value===pending.organizationId));assert.ok(filters(h.calls[0]).some(([key,value])=>key==='status'&&value==='pending'));
});
test('database errors and a missing scoped update cannot report successful authorization',async()=>{
 const h=service();h.setResult({data:null,error:{message:'SYNTHETIC_DATABASE_PRIVATE_CANARY'}});
 assert.equal(await h.store.consume(pending),false);await assert.rejects(h.store.verified(pending,'oauth'),e=>e instanceof Error&&!e.message.includes('CANARY'));
});
