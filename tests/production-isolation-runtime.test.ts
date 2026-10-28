import test from 'node:test';
import {isPublicSupabaseKey} from '../scripts/supabase-public-key';
import {createClient as realCreateClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import {loadTypescript} from './helpers/load-typescript';
import {existingIsolationFixtures,isolationTables,validate} from '../scripts/verify-production-isolation';
import type {verifyProductionIsolation} from '../scripts/verify-production-isolation';
import type {runStagingIsolation} from '../scripts/verify-staging-isolation';
import type {verifyAuthPreflight} from '../scripts/verify-phase02-auth-preflight';

const root='https://ityidnsfhgotucgvcifq.supabase.co';
const canary='SYNTHETIC_PASSWORD_TOKEN_DO_NOT_LOG';
type Options={existing?:boolean;staging?:boolean;authThrowIndex?:number;badOrganization?:boolean;ownCount?:number|null;visibleCount?:number|null;foreignCount?:number|null;countError?:boolean;countThrow?:boolean;foreignRow?:boolean;authThrow?:boolean;logoutThrow?:boolean;url?:string;httpStatus?:number;emptyBody?:boolean;fetchThrow?:boolean;credentialReadable?:boolean;credentialCodeMissing?:boolean;credentialStatus?:number;integrationDenied?:boolean;integrationForeignCount?:number;readThrow?:boolean;filename?:string;sharedAssets?:boolean;assetCount?:number|null};
function fixture(options:Options={}){
 const orgs=options.existing?existingIsolationFixtures.map(x=>x.organizationId):['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
 const users=options.existing?existingIsolationFixtures.map(x=>x.userId):['33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444'];
 const env={
  MEDIAHUB_PROD_READONLY_ACK:'YES_READ_ONLY',MEDIAHUB_SUPABASE_URL:root,
  MEDIAHUB_PUBLISHABLE_KEY:'sb_publishable_synthetic_abcdefghijklmnopqrstuvwxyz',
  MEDIAHUB_A_EMAIL:'fixture-a@example.test',MEDIAHUB_A_PASSWORD:canary,MEDIAHUB_A_SLUG:options.existing?existingIsolationFixtures[0].slug:'fixture-a',
  MEDIAHUB_B_EMAIL:'fixture-b@example.test',MEDIAHUB_B_PASSWORD:canary,MEDIAHUB_B_SLUG:options.existing?existingIsolationFixtures[1].slug:'fixture-b',
  MEDIAHUB_A_BRANDING_FILE:orgs[0]+'/'+(options.filename??'fixture.png'),MEDIAHUB_B_BRANDING_FILE:orgs[1]+'/'+(options.filename??'fixture.png'),
  ...(options.existing?{MEDIAHUB_PROD_EXISTING_FIXTURE_ACK:'YES_EXPLICIT_FIXTURE_USERS',MEDIAHUB_A_USER_ID:users[0],MEDIAHUB_B_USER_ID:users[1]}:{}),
 };
 const queries:{table:string;head:boolean;field:string;filters:Record<string,unknown>}[]=[];
 const logouts:{index:number;scope:unknown}[]=[];
 const requests:{url:string;redirect:unknown}[]=[];
 let created=0,cancelled=0,output='';
 function createClient(url:string,key:string){
  assert.equal(url,options.staging?'https://fixturestagingabcdef.supabase.co/':root);assert.equal(key,env.MEDIAHUB_PUBLISHABLE_KEY);
  const index=created++;
  return {
   auth:{
    async signInWithPassword(input:{email:string;password:string}){
     assert.equal(input.password,canary);
     if(options.authThrow||options.authThrowIndex===index)throw new Error(canary);
     return {data:{user:{id:users[index]}},error:null};
    },
    async signOut(input:unknown){logouts.push({index,scope:input});if(options.logoutThrow)throw new Error(canary);return {error:null};},
   },
   async rpc(name:string){assert.equal(name,'is_super_admin');return {data:false,error:null};},
   from(table:string){
    const query={table,head:false,field:'',countRequested:false,filters:{} as Record<string,unknown>,single:false};
    const builder={
     select(field:string,config?:{head?:boolean;count?:string}){query.field=field;query.countRequested=config?.count==='exact';query.head=config?.head===true;if(query.head)assert.equal(config?.count,'exact');return builder;},
     eq(field:string,value:unknown){query.filters[field]=value;return builder;},
     neq(field:string,value:unknown){query.filters['not_'+field]=value;return builder;},
     in(field:string,value:unknown){query.filters[field]=value;return builder;},
     limit(){return builder;},
     single(){query.single=true;return builder;},
     then(resolve:(value:unknown)=>unknown,reject:(reason:unknown)=>unknown){
      queries.push({...query,filters:{...query.filters}});
      if(table==='integrations'&&query.field==='credential_secret_id'&&!options.credentialReadable)return Promise.resolve({data:null,error:{code:options.credentialCodeMissing?undefined:'42501',message:canary},count:null,status:options.credentialStatus??403}).then(resolve,reject);
      if(table==='integrations'&&options.integrationDenied)return Promise.resolve({data:null,error:{code:'42501'},count:null,status:403}).then(resolve,reject);
      if(query.head){
       if(options.countThrow)return Promise.reject(new Error(canary)).then(resolve,reject);
       const outside=Object.keys(query.filters).some(k=>k.startsWith('not_'));
       const own=Object.keys(query.filters).length>0;
       const count=outside&&table==='integrations'&&options.integrationForeignCount!==undefined?options.integrationForeignCount:outside?(options.foreignCount===undefined?0:options.foreignCount):own?(options.ownCount===undefined?1:options.ownCount):(options.visibleCount===undefined?1:options.visibleCount);
       return Promise.resolve({data:null,count,error:options.countError?{code:'42501',message:canary}:null,status:options.countError?403:200}).then(resolve,reject);
      }
      if(options.readThrow&&table==='metrics_ads')return Promise.reject(new Error(canary)).then(resolve,reject);
      let data:unknown=[];
      if(table==='organizations'&&query.filters.slug)data=[{id:options.badOrganization?'55555555-5555-4555-8555-555555555555':orgs[index],is_agency:false}];
      else if(table==='organizations'&&query.filters.id===orgs[index])data=[{id:orgs[index]}];
      else if(table==='organization_members'&&query.filters.user_id)data=query.single?{is_active:true,role:'viewer'}:[{is_active:true,role:'viewer'}];
      else if(table==='client_asset_assignments'&&query.filters.organization_id===orgs[index])data=[{asset_id:'synthetic-asset-'+(options.sharedAssets?0:index)}];
      else if(table==='metrics_ads'&&options.foreignRow)data=[{organization_id:orgs[1-index]}];
      return Promise.resolve({data,error:null,count:query.countRequested&&Array.isArray(data)?(table==='client_asset_assignments'&&options.assetCount!==undefined?options.assetCount:data.length):null,status:200}).then(resolve,reject);
     },
    };
    return builder;
   },
   storage:{from(bucket:string){assert.equal(bucket,'branding');return {async createSignedUrl(path:string){
    if(!path.startsWith(orgs[index]+'/'))return {data:null,error:{message:canary}};
    return {data:{signedUrl:options.url??root+'/storage/v1/object/sign/branding/'+path+'?token='+canary},error:null};
   }};}},
  };
 }
 const resolver=(id:string,native:NodeRequire)=>id==='@supabase/supabase-js'?{createClient}:native(id);
 async function run(preflight=false){
  const fetcher:typeof fetch=async(input,init)=>{
   requests.push({url:String(input),redirect:init?.redirect});
   assert.ok(init?.signal);assert.equal(init?.redirect,'manual');
   if(options.fetchThrow)throw new Error(canary);
   if(options.emptyBody)return new Response('',{status:200});
   return new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(Uint8Array.of(1,2,3));},cancel(){cancelled++;}}),{status:options.httpStatus??200});
  };
  const runtime={process:{argv:[],stdout:{write(chunk:unknown){output+=String(chunk);return true;}},stderr:{write(chunk:unknown){output+=String(chunk);return true;}}},fetch:fetcher};
  const production=loadTypescript<{verifyProductionIsolation:typeof verifyProductionIsolation}>(new URL('../scripts/verify-production-isolation.ts',import.meta.url),resolver,runtime);
  if(options.staging){
   const module=loadTypescript<{runStagingIsolation:typeof runStagingIsolation}>(new URL('../scripts/verify-staging-isolation.ts',import.meta.url),(id,native)=>id==='./verify-production-isolation'?production:resolver(id,native),runtime);
   await module.runStagingIsolation({
    STAGING_SUPABASE_URL:'https://fixturestagingabcdef.supabase.co',
    STAGING_SUPABASE_PUBLISHABLE_KEY:env.MEDIAHUB_PUBLISHABLE_KEY,
    STAGING_USER_A_EMAIL:env.MEDIAHUB_A_EMAIL,STAGING_USER_A_PASSWORD:canary,STAGING_ORG_A_SLUG:env.MEDIAHUB_A_SLUG,
    STAGING_USER_B_EMAIL:env.MEDIAHUB_B_EMAIL,STAGING_USER_B_PASSWORD:canary,STAGING_ORG_B_SLUG:env.MEDIAHUB_B_SLUG,
    STAGING_PRIVATE_FILE_A:env.MEDIAHUB_A_BRANDING_FILE,STAGING_PRIVATE_FILE_B:env.MEDIAHUB_B_BRANDING_FILE,
   });
  }else if(preflight){
   const pre=loadTypescript<{verifyAuthPreflight:typeof verifyAuthPreflight}>(new URL('../scripts/verify-phase02-auth-preflight.ts',import.meta.url),resolver,runtime);
   await pre.verifyAuthPreflight(env);
  }else{
   const module=loadTypescript<{verifyProductionIsolation:typeof verifyProductionIsolation}>(new URL('../scripts/verify-production-isolation.ts',import.meta.url),resolver,runtime);
   await module.verifyProductionIsolation(env);
  }
 }
 return {env,queries,logouts,requests,run,output:()=>output,cancelled:()=>cancelled};
}
test('real isolation runner requires scoped positives and administrative denial and checks full visible scope without returning rows',async()=>{
 assert.equal(isolationTables.length,12);assert.equal(new Set(isolationTables.map(x=>x[0])).size,12);
 const f=fixture();await f.run();
 assert.equal(f.queries.filter(q=>q.head).length,72);
 for(const [table,field] of isolationTables){
  const head=f.queries.filter(q=>q.head&&q.table===table);assert.equal(head.length,6);assert.ok(head.every(q=>q.field===field));
 }
 assert.equal(f.requests.length,2);assert.equal(f.cancelled(),2);
 assert.deepEqual(f.logouts,[{index:0,scope:{scope:'local'}},{index:1,scope:{scope:'local'}}]);
 assert.match(f.output(),/^PASS:/);assert.ok(!f.output().includes(canary));
});
test('empty, absent, unsafe or forbidden own counts are NOT PROVEN and never produce a pass',async()=>{
 for(const ownCount of [0,null,-1,Number.NaN,1.5,Number.MAX_SAFE_INTEGER+1]){
  const f=fixture({ownCount});await assert.rejects(f.run(),/NOT PROVEN: positive own/);assert.equal(f.requests.length,0);assert.equal(f.output(),'');assert.equal(f.logouts.length,2);
 }
 const denied=fixture({countError:true});await assert.rejects(denied.run(),/NOT PROVEN/);assert.equal(denied.output(),'');
 for(const visibleCount of [null,-1,Number.NaN,1.5]){
  const f=fixture({visibleCount});await assert.rejects(f.run(),/NOT PROVEN: visible count/);assert.equal(f.output(),'');
 }
});
test('foreign count or returned row fails while a smaller inconsistent count remains unproven',async()=>{
 const extra=fixture({foreignCount:1});await assert.rejects(extra.run(),/FAIL: foreign rows observed/);
 const concurrent=fixture({visibleCount:2});await assert.rejects(concurrent.run(),/NOT PROVEN: visible count differs/);
 const fewer=fixture({visibleCount:0});await assert.rejects(fewer.run(),/NOT PROVEN: visible count differs/);
 const row=fixture({foreignRow:true});await assert.rejects(row.run(),/FAIL: foreign table metrics_ads/);
 for(const f of [extra,concurrent,fewer,row]){assert.equal(f.output(),'');assert.equal(f.logouts.length,2);}
});
test('existing fixture mode binds exact users AND organizations, preserving independent .test fixtures',async()=>{
 const f=fixture({existing:true});assert.equal(validate(f.env).existingAuthorized,true);await f.run();
 for(const id of ['99999999-9999-4999-8999-999999999999',existingIsolationFixtures[1].userId]){
  assert.throws(()=>validate({...f.env,MEDIAHUB_A_EMAIL:'synthetic@example.com',MEDIAHUB_A_USER_ID:id}),/identity-bound/);
 }
 assert.throws(()=>validate({...f.env,MEDIAHUB_A_USER_ID:'99999999-9999-4999-8999-999999999999'}),/identity-bound/);
 assert.throws(()=>validate({...f.env,MEDIAHUB_PROD_EXISTING_FIXTURE_ACK:'UNKNOWN_MODE'}),/Unsupported/);
 const wrong=fixture({existing:true,badOrganization:true});await assert.rejects(wrong.run(),/exact authorized synthetic organization/);assert.equal(wrong.requests.length,0);
});
test('signed file retrieval rejects foreign origins, paths, credentials, missing token, redirects and unavailable bytes without logging secrets',async()=>{
 const paths=[
  'http://ityidnsfhgotucgvcifq.supabase.co/storage/v1/object/sign/branding/11111111-1111-4111-8111-111111111111/fixture.png?token='+canary,
  'https://example.test/?token='+canary,
  root+'/storage/v1/object/sign/branding/other.png?token='+canary,
  root.replace('https://','https://user:password@')+'/storage/v1/object/sign/branding/11111111-1111-4111-8111-111111111111/fixture.png?token='+canary,
  root+'/storage/v1/object/sign/branding/11111111-1111-4111-8111-111111111111/fixture.png',
 ];
 for(const url of paths){const f=fixture({url});await assert.rejects(f.run(),/FAIL: own signed URL target/);assert.equal(f.requests.length,0);assert.equal(f.output(),'');}
 for(const options of [{httpStatus:302},{httpStatus:404},{emptyBody:true},{fetchThrow:true}]){
  const f=fixture(options);await assert.rejects(f.run(),error=>error instanceof Error&&error.message.startsWith('NOT PROVEN')&&!error.message.includes(canary));
  assert.equal(f.output(),'');assert.equal(f.logouts.length,2);
 }
});
test('unexpected service and cleanup errors do not reveal canaries or mask the original result',async()=>{
 for(const options of [{authThrow:true,logoutThrow:true},{countThrow:true,logoutThrow:true}]){
  const f=fixture(options);await assert.rejects(f.run(),error=>error instanceof Error&&error.message==='NOT PROVEN: authenticated service verification did not complete');
  assert.equal(f.output(),'');assert.equal(f.logouts.length,2);
 }
 const success=fixture({logoutThrow:true});await success.run();assert.match(success.output(),/^PASS:/);
});
test('real credential preflight only signs out its local synthetic sessions on success and failure',async()=>{
 const f=fixture({existing:true});await f.run(true);
 assert.deepEqual(f.logouts,[{index:0,scope:{scope:'local'}},{index:1,scope:{scope:'local'}}]);assert.ok(!f.output().includes(canary));
 const broken=fixture({existing:true,authThrow:true});await assert.rejects(broken.run(true));assert.deepEqual(broken.logouts,[{index:0,scope:{scope:'local'}}]);
});

test('real staging login cleans up locally even when either fixture fails before a context is returned',async()=>{
 for(const authThrowIndex of [0,1]){
  const f=fixture({staging:true,authThrowIndex,logoutThrow:true});
  await assert.rejects(f.run(),error=>error instanceof Error&&!error.message.includes(canary));
  assert.equal(f.output(),'');
  assert.deepEqual(f.logouts.map(x=>x.index).sort(),authThrowIndex===0?[0]:[0,1]);
  assert.ok(f.logouts.every(x=>JSON.stringify(x.scope)==='{"scope":"local"}'));
 }
});

test('integration metadata is scoped while credential references must deny SELECT in every scope',async()=>{
 for(const staging of [false,true]){
  const readable=fixture({staging,credentialReadable:true});
  await assert.rejects(readable.run(),/FAIL: protected credential column unexpectedly readable for integrations/);
  const missingCode=fixture({staging,credentialCodeMissing:true});
  await assert.rejects(missingCode.run(),/NOT PROVEN: administrative denial unavailable/);
  for(const credentialStatus of [400,401,503]){const wrong=fixture({staging,credentialStatus});await assert.rejects(wrong.run(),/NOT PROVEN: administrative denial unavailable/);assert.equal(wrong.output(),'');assert.equal(wrong.logouts.length,2);}
  const denied=fixture({staging,integrationDenied:true});
  await assert.rejects(denied.run(),/NOT PROVEN: positive own fixture.*required for integrations/);
  const foreign=fixture({staging,integrationForeignCount:1});
  await assert.rejects(foreign.run(),/FAIL: foreign rows observed for integrations/);
  for(const f of [readable,missingCode,denied,foreign]){assert.equal(f.output(),'');assert.equal(f.logouts.length,2);}
 }
 const success=fixture();await success.run();
 const protectedQueries=success.queries.filter(q=>q.table==='integrations'&&q.field==='credential_secret_id');
 assert.equal(protectedQueries.length,6);assert.ok(protectedQueries.every(q=>!q.head));
 for(const prefix of ['organization_id','not_organization_id'])assert.equal(protectedQueries.filter(q=>Object.hasOwn(q.filters,prefix)).length,2);
 assert.equal(protectedQueries.filter(q=>Object.keys(q.filters).length===0).length,2);
 assert.ok(isolationTables.every(([,,access])=>access==='scoped'));
});

test('read errors after login remain unproven and staging unexpected errors remain sanitized',async()=>{
 const production=fixture({readThrow:true});
 await assert.rejects(production.run(),/NOT PROVEN: authenticated service verification did not complete/);
 const staging=fixture({staging:true,readThrow:true});
 await assert.rejects(staging.run(),/Staging service verification did not complete/);
 for(const f of [production,staging]){assert.equal(f.output(),'');assert.equal(f.logouts.length,2);}
});
test('signed fixture names with legal reserved characters preserve the same exact object path',async()=>{
 const f=fixture({filename:'snapshot + @ (test).png'});await f.run();assert.equal(f.requests.length,2);assert.match(f.output(),/^PASS:/);
});

test('installed PostgREST SDK cannot expose SQLSTATE from bodyless HEAD but preserves it in a GET denial',async()=>{
 const methods:string[]=[];
 const db=realCreateClient(root,'sb_publishable_synthetic_abcdefghijklmnopqrstuvwxyz',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(_input,init)=>{
  methods.push(String(init?.method));
  return new Response(init?.method==='HEAD'?null:JSON.stringify({code:'42501',message:'permission denied'}),{status:403,headers:{'Content-Type':'application/json'}});
 }}});
 const head=await db.from('integrations').select('credential_secret_id',{head:true,count:'exact'});
 assert.equal(head.error?.code,undefined);
 const get=await db.from('integrations').select('credential_secret_id').limit(0);
 assert.equal(get.error?.code,'42501');assert.equal(get.data,null);
 assert.deepEqual(methods,['HEAD','GET']);
});
test('staging also requires positive table evidence and disjoint synthetic assets',async()=>{
 const empty=fixture({staging:true,ownCount:0});
 await assert.rejects(empty.run(),/NOT PROVEN: positive own fixture/);assert.equal(empty.output(),'');assert.equal(empty.logouts.length,2);
 for(const staging of [false,true]){
  const shared=fixture({staging,sharedAssets:true});
  await assert.rejects(shared.run(),/NOT PROVEN: assigned asset fixtures must be disjoint/);assert.equal(shared.output(),'');assert.equal(shared.logouts.length,2);
 }
 const complete=fixture({staging:true});await complete.run();assert.match(complete.output(),/^PASS:/);
});

test('truncated or unavailable assigned-asset counts remain unproven in production and staging',async()=>{
 for(const staging of [false,true])for(const assetCount of [null,0,2]){
  const f=fixture({staging,assetCount});await assert.rejects(f.run(),/NOT PROVEN: complete assigned asset fixtures/);assert.equal(f.output(),'');assert.equal(f.logouts.length,staging?1:2);
 }
});

test('public key classification accepts public formats but never legacy service-role JWT credentials',()=>{
 const legacy=(role:string)=>Buffer.from('{"alg":"HS256"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.synthetic-signature';
 assert.equal(isPublicSupabaseKey('sb_publishable_abcdefghijklmnopqrstuvwxyz'),true);
 assert.equal(isPublicSupabaseKey(legacy('anon')),true);
 for(const value of [undefined,'','sb_secret_abcdefghijklmnopqrstuvwxyz',legacy('service_role'),legacy('authenticated'),'malformed.token.value','sb_publishable_abcdefghijklmnopqrstuvwxyz\n',legacy('anon')+'\n']){
  assert.equal(isPublicSupabaseKey(value),false);
 }
});
test('all acceptance entrypoints refuse a legacy privileged key before constructing user clients',async()=>{
 const key=Buffer.from('{"alg":"HS256"}').toString('base64url')+'.'+Buffer.from('{"role":"service_role"}').toString('base64url')+'.synthetic-signature';
 for(const variant of ['production','preflight','staging']){
  const f=fixture({staging:variant==='staging'});f.env.MEDIAHUB_PUBLISHABLE_KEY=key;
  const messages={production:'Requires publishable key',preflight:'Publishable key missing or privileged',staging:'Isolation assertion failed: use publishable key, not a privileged credential'};
  await assert.rejects(f.run(variant==='preflight'),{message:messages[variant as keyof typeof messages]});assert.equal(f.logouts.length,0);assert.equal(f.queries.length,0);assert.equal(f.requests.length,0);
 }
});
