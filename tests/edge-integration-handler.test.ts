import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {createHmac} from 'node:crypto';
import type {listTenantStorage} from '../supabase/functions/_shared/tenant-storage';

const organizationId='10000000-0000-4000-8000-000000000001';
const userId='20000000-0000-4000-8000-000000000001';
const actions=['disconnect_client','delete_client','assign_assets','refresh_assets','unassign_asset',
 'assign_accounts','disconnect','diagnose','prepare_connector','register_candidate_account',
 'create_ingest_key','configure_extractor','connect','sync'];
type Result={data:unknown;error:unknown};
type Query={table:string;operation:string;filters:Record<string,unknown>;values?:Record<string,unknown>};
type Options={role?:string;authError?:boolean;roleError?:boolean;
 query?:(query:Query)=>Result;providerFetch?:(url:URL)=>Promise<Response>;rpc?:(name:string)=>Result;cronAuthorized?:unknown;storage?:Parameters<typeof listTenantStorage>[0]};
function fixture(options:Options={}){
 const native=createRequire(import.meta.url);
 const queries:Query[]=[];
 const calls:string[]=[];
 let handler:(req:Request)=>Promise<Response>=()=>{throw new Error('handler not registered');};
 const service={
  storage:{from:()=>options.storage},
  from(table:string){
   const query:Query={table,operation:'select',filters:{}};
   const builder={
    select(){return builder;},
    update(values:Record<string,unknown>){query.operation='update';query.values=values;return builder;},
    insert(values:Record<string,unknown>){query.operation='insert';query.values=values;return builder;},
    upsert(values:Record<string,unknown>){query.operation='upsert';query.values=values;return builder;},
    delete(){query.operation='delete';return builder;},
    order(){return builder;},limit(){return builder;},in(){return builder;},
    eq(field:string,value:unknown){query.filters[field]=value;return builder;},
    single(){return builder;},
    maybeSingle(){return builder;},
    then(resolve:(value:Result)=>unknown){
     queries.push(query);
     return Promise.resolve(options.query?.(query)??{data:null,error:null}).then(resolve);
    },
   };
   return builder;
  },
  rpc:async(name:string)=>{
   calls.push(name);
   if(options.rpc)return options.rpc(name);
   assert.equal(name,'verify_cron_secret');
   return {data:options.cronAuthorized??false,error:null};
  },
 };
 const createClient=(_url:string,_key:string,config?:{global?:unknown})=>{
  if(!config?.global)return service;
  return {
   auth:{getUser:async()=>{calls.push('getUser');return {data:{user:options.authError?null:{id:userId}},error:options.authError?new Error('synthetic'):null};}},
   rpc:async(name:string)=>{calls.push(name);return {data:options.role==='super_admin',error:options.roleError?new Error('synthetic'):null};},
  };
 };
 const source=readFileSync('supabase/functions/engaje-integrations/index.ts','utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 new Function('Deno','fetch','require','module','exports',code)(
  {env:{get:(name:string)=>name==='SUPABASE_URL'?'https://synthetic.invalid':'synthetic-only'},
   serve:(callback:typeof handler)=>{handler=callback;}},
  (url:URL)=>{if(options.providerFetch)return options.providerFetch(url);throw new Error('provider/network access forbidden in fixture');},
  (id:string)=>{
   if(id==='npm:@supabase/supabase-js@2.76.1')return {createClient};
   if(id.startsWith('../_shared/'))return native('../supabase/functions/engaje-integrations/'+id);
   throw new Error('Unexpected handler dependency: '+id);
  },
  module,module.exports,
 );
 return {handler,queries,calls};
}
function request(action:string,authorization:string|null='Bearer synthetic',extra:Record<string,unknown>={}){
 const headers:Record<string,string>={'Content-Type':'application/json'};
 if(authorization!==null)headers.Authorization=authorization;
 return new Request('https://synthetic.invalid/functions/v1/meta-auth',{
  method:'POST',headers,body:JSON.stringify({organizationId,action,...extra}),
 });
}
test('actual Edge handler denies all client management actions before service access',async()=>{
 for(const role of ['viewer','editor','client_admin']){
  const f=fixture({role});
  for(const action of actions){
   const response=await f.handler(request(action));
   assert.equal(response.status,403,role+': '+action);
  }
  assert.deepEqual(f.queries,[]);
  assert.equal(f.calls.filter(name=>name==='is_super_admin').length,actions.length);
 }
});
test('actual Edge handler rejects missing, malformed, expired and unconfirmed authorization',async()=>{
 for(const header of [null,'Basic synthetic','Bearer two tokens']){
  const f=fixture({role:'super_admin'});
  assert.equal((await f.handler(request('unassign_asset',header))).status,401);
  assert.deepEqual(f.calls,[]);
  assert.deepEqual(f.queries,[]);
 }
 for(const options of [{authError:true},{role:'super_admin',roleError:true}]){
  const f=fixture(options);
  assert.equal((await f.handler(request('unassign_asset'))).status,options.authError?401:403);
  assert.deepEqual(f.queries,[]);
 }
});
test('actual Edge handler permits an agency admin to reach a tenant-scoped operation',async()=>{
 const f=fixture({role:'super_admin',query:query=>{
  assert.equal(query.table,'client_asset_assignments');
  assert.equal(query.filters.organization_id,organizationId);
  return {data:null,error:null};
 }});
 const response=await f.handler(request('unassign_asset'));
 assert.equal(response.status,400);
 assert.equal((await response.json()).message,'Vínculo não encontrado.');
 assert.deepEqual(f.calls,['getUser','is_super_admin']);
 assert.equal(f.queries.length,1);
});
test('actual scheduled handler requires its own verified secret independently of user roles',async()=>{
 const f=fixture({role:'super_admin'});
 assert.equal((await f.handler(request('scheduled_sync'))).status,401);
 const req=new Request(request('scheduled_sync'),{headers:{'Content-Type':'application/json','x-cron-secret':'s'.repeat(32)}});
 assert.equal((await f.handler(req)).status,401);
 assert.deepEqual(f.calls,['verify_cron_secret']);
 assert.deepEqual(f.queries,[]);
 const allowed=fixture({cronAuthorized:true});
 const permitted=new Request(request('scheduled_sync'),{headers:{'Content-Type':'application/json','x-cron-secret':'s'.repeat(32)}});
 assert.equal((await allowed.handler(permitted)).status,400); // missing integration, after the secret check
 assert.deepEqual(allowed.calls,['verify_cron_secret']);
});

function callbackState(signatureOverride?:string){
 const signed=[organizationId,Date.now()+60000,'synthetic-nonce'].join('.');
 const signature=signatureOverride??createHmac('sha256','oauth-state:synthetic-only').update(signed).digest('hex');
 return signed+'.'+signature;
}
test('actual OAuth callback revalidates revoked, paused and legacy memberships before provider exchange',async()=>{
 const active={role:'super_admin',is_active:true,organizations:{is_agency:true,status:'active'}};
 const scenarios=[
  {members:[active],error:null,expected:'Código ausente.'},
  ...['viewer','editor','client_admin'].map(role=>({members:[{...active,role}],error:null,expected:'Permissão revogada durante a autorização.'})),
  {members:[{...active,is_active:false}],error:null,expected:'Permissão revogada durante a autorização.'},
  {members:[{...active,organizations:{is_agency:true,status:'paused'}}],error:null,expected:'Permissão revogada durante a autorização.'},
  {members:[active],error:new Error('synthetic'),expected:'Permissão revogada durante a autorização.'},
 ];
 for(const scenario of scenarios){
  const f=fixture({query:query=>{
   if(query.table==='organization_members')return {data:scenario.members,error:scenario.error};
   if(query.table==='organizations')return {data:{slug:'synthetic',status:'active'},error:null};
   if(query.table==='integrations'&&query.filters.status==='pending')
    return {data:{id:organizationId,organization_id:organizationId,config:{user_id:userId,nonce:'synthetic-nonce'}},error:null};
   return {data:{config:{}},error:null};
  }});
  const response=await f.handler(new Request('https://synthetic.invalid/functions/v1/meta-auth/callback?state='+callbackState()));
  assert.equal(response.status,400);
  assert.equal((await response.json()).message,scenario.expected);
  assert.equal(f.queries.filter(q=>q.table==='organization_members').length,1);
 }
});
test('actual OAuth callback rejects forged states and consumed nonce without provider access',async()=>{
 const forged=fixture();
 assert.equal((await forged.handler(new Request('https://synthetic.invalid/callback?state='+callbackState('forged')))).status,400);
 assert.deepEqual(forged.queries,[]);
 const replay=fixture();
 const response=await replay.handler(new Request('https://synthetic.invalid/callback?state='+callbackState()));
 assert.equal((await response.json()).message,'Autorização já utilizada.');
 assert.equal(replay.queries.length,1);
});
test('actual delete handler stops before database deletion if Storage cannot be enumerated',async()=>{
 const f=fixture({role:'super_admin',
  query:query=>query.table==='organizations'?{data:{name:'Synthetic fixture',is_agency:false},error:null}:{data:null,error:null},
  storage:{list:async()=>({data:null,error:new Error('synthetic')}),remove:async()=>{throw new Error('must not delete');}},
 });
 const response=await f.handler(request('delete_client','Bearer synthetic',{confirmation:'Synthetic fixture'}));
 assert.equal(response.status,400);
 assert.match((await response.json()).message,/conferir os arquivos/);
 assert.ok(!f.calls.includes('delete_client_organization'));
});


type ExistingConnection={id:string;target_organization_id:string|null};
function oauthOwnershipFixture(existing:ExistingConnection|null,options:{lookupError?:boolean;insertConflict?:boolean;changedOwner?:boolean}={}){
 return fixture({rpc:()=>({data:null,error:null}),providerFetch:async(url)=>{
  const endpoint=url.pathname.split('/').slice(2).join('/');
  const payload=endpoint==='oauth/access_token'?{access_token:'synthetic-token-only'}:endpoint==='me'?{id:'synthetic-meta-user',name:'Synthetic account'}:endpoint==='me/permissions'?{data:[{permission:'ads_read',status:'granted'}]}:{data:[]};
  return Response.json(payload);
 },query:q=>{
  if(q.table==='organization_members')return {data:[{role:'super_admin',is_active:true,organizations:{is_agency:true,status:'active'}}],error:null};
  if(q.table==='organizations')return {data:q.filters.is_agency?{id:'synthetic-agency'}:{slug:'synthetic',status:'active'},error:null};
  if(q.table==='integrations')return {data:q.filters.status==='pending'?{id:organizationId,organization_id:organizationId,provider:'meta_ads',config:{user_id:userId,nonce:'synthetic-nonce'}}:{config:{}},error:null};
  if(q.table==='platform_connections'){
   if(q.operation==='select')return {data:existing,error:options.lookupError?new Error('synthetic lookup failed'):null};
   if(q.operation==='insert'&&options.insertConflict)return {data:null,error:new Error('synthetic unique conflict')};
   if(q.operation==='update'&&q.values?.status==='syncing'&&options.changedOwner)return {data:null,error:null};
   return {data:{id:existing?.id??'synthetic-new-connection'},error:null};
  }
  return {data:[],error:null};
 }});
}
const ownershipCallback=()=>new Request('https://synthetic.invalid/functions/v1/meta-auth/callback?state='+callbackState()+'&code=synthetic-code');

test('actual OAuth callback never retargets or overwrites credentials belonging to another tenant',async()=>{
 for(const owner of ['synthetic-other-tenant',null]){
  const f=oauthOwnershipFixture({id:'synthetic-existing',target_organization_id:owner});const response=await f.handler(ownershipCallback());
  assert.equal(response.status,400);assert.match((await response.json()).message,/outro cliente|destino/);
  assert.equal(f.queries.filter(q=>q.table==='platform_connections'&&q.operation!=='select').length,0);
  assert.ok(!f.calls.includes('store_platform_connection_token'));
 }
});
test('actual OAuth refresh updates only its existing tenant-owned connection without retargeting',async()=>{
 const f=oauthOwnershipFixture({id:'synthetic-existing',target_organization_id:organizationId});const response=await f.handler(ownershipCallback());assert.equal(response.status,303);
 const write=f.queries.find(q=>q.table==='platform_connections'&&q.values?.status==='syncing');assert.ok(write);assert.equal(write.operation,'update');assert.equal(write.filters.target_organization_id,organizationId);assert.equal(write.filters.id,'synthetic-existing');assert.ok(!Object.hasOwn(write.values!,'target_organization_id'));assert.ok(!Object.hasOwn(write.values!,'external_user_id'));
 assert.ok(f.calls.includes('store_platform_connection_token'));
});
test('actual OAuth callback stops if ownership changes between lookup and guarded update',async()=>{
 const f=oauthOwnershipFixture({id:'synthetic-existing',target_organization_id:organizationId},{changedOwner:true});const response=await f.handler(ownershipCallback());assert.equal(response.status,400);assert.ok(!f.calls.includes('store_platform_connection_token'));
});
test('actual OAuth callback never turns a lookup failure or concurrent unique conflict into an overwrite',async()=>{
 for(const options of [{lookupError:true},{insertConflict:true}]){
  const f=oauthOwnershipFixture(null,options);const response=await f.handler(ownershipCallback());assert.equal(response.status,400);assert.ok(!f.calls.includes('store_platform_connection_token'));assert.equal(f.queries.filter(q=>q.table==='platform_connections'&&['update','upsert'].includes(q.operation)).length,0);
 }
});
test('actual OAuth first connection inserts a real provider identity scoped to its requested tenant',async()=>{
 const f=oauthOwnershipFixture(null);const response=await f.handler(ownershipCallback());assert.equal(response.status,303);const write=f.queries.find(q=>q.table==='platform_connections'&&q.values?.status==='syncing');assert.ok(write);assert.equal(write.operation,'insert');assert.equal(write.values?.target_organization_id,organizationId);assert.equal(write.values?.external_user_id,'synthetic-meta-user');assert.ok(f.calls.includes('store_platform_connection_token'));
});
