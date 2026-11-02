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
type Query={table:string;operation:string;filters:Record<string,unknown>};
type Options={role?:string;authError?:boolean;roleError?:boolean;
 query?:(query:Query)=>Result;cronAuthorized?:unknown;storage?:Parameters<typeof listTenantStorage>[0]};
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
    update(){query.operation='update';return builder;},
    delete(){query.operation='delete';return builder;},
    eq(field:string,value:unknown){query.filters[field]=value;return builder;},
    neq(field:string,value:unknown){query.filters[field+'!=']=value;return builder;},
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
  ()=>{throw new Error('provider/network access forbidden in fixture');},
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

const hubDraftId='40000000-0000-4000-8000-000000000004';
const legacyAccountId='50000000-0000-4000-8000-000000000005';
const hubDraft={id:hubDraftId,organization_id:organizationId,provider:'hubspot',status:'pending',is_enabled:false,config:{connection_hub:true,selection_pending:true,authorization_status:'verified'}};
test('new authorization drafts cannot be activated through legacy account assignment',async()=>{const f=fixture({role:'super_admin',query:q=>q.table==='integrations'?{data:[hubDraft],error:null}:{data:null,error:null}});const response=await f.handler(request('assign_accounts','Bearer synthetic',{provider:'hubspot',integrationIds:[hubDraftId]}));assert.equal(response.status,400);assert.match((await response.json()).message,/não pertence/);assert.equal(f.queries.filter(q=>q.operation!=='select').length,0);assert.deepEqual(f.calls,['getUser','is_super_admin']);});
test('legacy account selection preserves unrelated authorization drafts for the same product provider',async()=>{const f=fixture({role:'super_admin',query:q=>q.table==='integrations'&&q.operation==='select'?{data:[hubDraft,{id:legacyAccountId,organization_id:organizationId,provider:'hubspot',config:{selection_pending:true}}],error:null}:{data:null,error:null}});const response=await f.handler(request('assign_accounts','Bearer synthetic',{provider:'hubspot',integrationIds:[legacyAccountId]}));assert.equal(response.status,200);assert.equal(f.queries.filter(q=>q.operation!=='select'&&q.filters.id===hubDraftId).length,0);assert.equal(f.queries.filter(q=>q.operation==='update'&&q.filters.id===legacyAccountId).length,1);});
test('manual sync refuses an authorization draft before locks, Vault or provider calls',async()=>{const f=fixture({role:'super_admin',query:()=>({data:hubDraft,error:null})});const response=await f.handler(request('sync','Bearer synthetic',{integrationId:hubDraftId}));assert.equal(response.status,400);assert.match((await response.json()).message,/seleção da conta/);assert.equal(f.queries.filter(q=>q.operation!=='select').length,0);assert.deepEqual(f.calls,['getUser','is_super_admin']);});

test('scheduled sync skips authorization drafts even if their legacy enabled flag is incorrectly set',async()=>{const f=fixture({cronAuthorized:true,query:()=>({data:{...hubDraft,provider:'windsor',is_enabled:true,organizations:{status:'active'}},error:null})});const req=new Request(request('scheduled_sync','Bearer synthetic',{integrationId:hubDraftId}),{headers:{'Content-Type':'application/json','x-cron-secret':'s'.repeat(32)}});const response=await f.handler(req);assert.equal(response.status,200);assert.equal((await response.json()).skipped,true);assert.equal(f.queries.filter(q=>q.operation!=='select').length,0);assert.deepEqual(f.calls,['verify_cron_secret']);});
