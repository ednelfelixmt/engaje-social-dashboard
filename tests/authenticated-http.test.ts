import test from 'node:test';
import assert from 'node:assert/strict';
import {existingIsolationFixtures} from '../scripts/verify-production-isolation';
import {acceptanceOrigin,validateHttpAcceptance,type verifyAuthenticatedHttp} from '../scripts/verify-authenticated-http';
import {loadTypescript} from './helpers/load-typescript';

const canary='SYNTHETIC_SESSION_PASSWORD_DO_NOT_LOG';
const origin='http://127.0.0.1:3218';
const env={MEDIAHUB_HTTP_READONLY_ACK:'YES_AUTHENTICATED_READS',MEDIAHUB_APP_ORIGIN:origin,
 MEDIAHUB_SUPABASE_URL:'https://ityidnsfhgotucgvcifq.supabase.co',MEDIAHUB_PUBLISHABLE_KEY:'sb_publishable_synthetic_abcdefghijklmnopqrstuvwxyz',
 MEDIAHUB_A_EMAIL:'a@example.test',MEDIAHUB_A_PASSWORD:canary,MEDIAHUB_B_EMAIL:'b@example.test',MEDIAHUB_B_PASSWORD:canary};
type Options={loginIndex?:number;wrongUser?:boolean;agency?:boolean;role?:string;extraMembership?:boolean;admin?:boolean;noCookies?:boolean;
 status?:number;adminLocation?:string;noCache?:boolean;cacheControl?:string;noOwnLink?:boolean;foreignLink?:boolean;foreignName?:boolean;adminLink?:boolean;htmlError?:boolean;escapedError?:boolean;
 wrongName?:boolean;nonHtml?:boolean;largeBody?:boolean;fetchThrow?:boolean;logoutThrow?:boolean;escapedName?:boolean};
function fixture(options:Options={}){
 let created=0,appRequests=0,verified=0;
 const logouts:number[]=[],cookieJars:{getAll:()=>{name:string;value:string}[]}[]=[];
 const clients=(url:string,key:string,config:{cookies:{getAll:()=>{name:string;value:string}[];setAll:(items:{name:string;value:string}[])=>void}})=>{
  assert.equal(url,env.MEDIAHUB_SUPABASE_URL);assert.equal(key,env.MEDIAHUB_PUBLISHABLE_KEY);
  const index=created++,f=existingIsolationFixtures[index];cookieJars.push(config.cookies);
  const name=options.escapedName?'Fixture & <'+index+'>':'Fixture '+index;
  return {
   auth:{async signInWithPassword(input:{password:string}){assert.equal(input.password,canary);
    if(options.loginIndex===index)throw new Error(canary);
    if(!options.noCookies)config.cookies.setAll([{name:'sb-test-auth-token',value:canary}]);
    return {data:{user:{id:options.wrongUser?'wrong-id':f.userId}},error:null};},
    async signOut(input:{scope:string}){assert.equal(input.scope,'local');logouts.push(index);if(options.logoutThrow)throw new Error(canary);return {error:null};}},
   from(table:string){
    const builder={select(){return builder;},eq(){return builder;},single(){return builder;},
     then(resolve:(v:unknown)=>unknown,reject:(e:unknown)=>unknown){
      const org={id:f.organizationId,slug:f.slug,name,is_agency:options.agency??false};
      const member={user_id:f.userId,organization_id:f.organizationId,role:options.role??'viewer',is_active:true};
      return Promise.resolve({data:table==='organizations'?org:options.extraMembership?[member,member]:[member],error:null}).then(resolve,reject);
     }};return builder;
   },
   async rpc(){verified++;return {data:options.admin??false,error:null};},
  };
 };
 const fetcher:typeof fetch=async(input,init)=>{
  appRequests++;assert.equal(verified,2,'both viewers must be verified before app requests');
  assert.equal(init?.method,'GET');assert.equal(init?.redirect,'manual');assert.equal(init?.credentials,'omit');assert.ok(init?.signal);
  assert.equal(new Headers(init?.headers).get('Cookie'),'sb-test-auth-token='+canary);
  if(options.fetchThrow)throw new Error(canary);
  const u=new URL(String(input));assert.equal(u.origin,origin);
  const actor=appRequests<=8?0:1,f=existingIsolationFixtures[actor],peer=existingIsolationFixtures[1-actor];
  const own=u.pathname==='/'+f.slug+'/overview',admin=u.pathname==='/admin';
  const name=options.escapedName?'Fixture &amp; &lt;'+actor+'&gt;':'Fixture '+actor;
  let html=own?'<h1>'+(options.wrongName?'other fixture':name)+'</h1>'+(options.noOwnLink?'':'<a href="/'+f.slug+'/overview">Own</a>'):'not found';
  if(options.foreignLink)html+='<a href="/'+peer.slug+'/overview">Other</a>';
  if(options.foreignName)html+='Fixture '+(1-actor);
  if(options.adminLink)html+='<a href="/admin/users">Admin</a>';
  if(options.htmlError)html+='{"digest":"'+canary+'"}';
  if(options.escapedError)html+=JSON.stringify(JSON.stringify({digest:canary}));
  if(options.largeBody)html+='x'.repeat(6*1024*1024);
  return new Response(html,{status:options.status??(admin?307:own?200:404),headers:{
   'content-type':options.nonHtml?'application/json':'text/html',
   ...(!options.noCache?{'cache-control':options.cacheControl??'private, no-store'}:{}),
   ...(admin?{location:options.adminLocation??'/'}:{}),
  }});
 };
 const module=loadTypescript<{verifyAuthenticatedHttp:typeof verifyAuthenticatedHttp}>(new URL('../scripts/verify-authenticated-http.ts',import.meta.url),
  (id,native)=>id==='@supabase/ssr'?{createServerClient:clients}:native(id),{fetch:fetcher,process:{argv:[]}});
 return {run:(config=env)=>module.verifyAuthenticatedHttp(config),logouts,created:()=>created,requests:()=>appRequests,jars:cookieJars};
}

test('authenticated HTTP preflight rejects unknown origins and private credentials before creating sessions',async()=>{
 for(const value of ['https://example.test','http://mediahub.engajeperformance.com.br','https://mediahub.engajeperformance.com.br.evil.test',
  'https://user:password@mediahub.engajeperformance.com.br','https://mediahub.engajeperformance.com.br/path',
  'https://mediahub.engajeperformance.com.br?next=/','https://mediahub.engajeperformance.com.br/#fragment','https://other.vercel.app',
  'https://engaje-social-dashboard-fake-otherteam.vercel.app'])assert.throws(()=>acceptanceOrigin(value));
 assert.equal(acceptanceOrigin('https://engaje-social-dashboard-abc-ednelfelixmts-projects.vercel.app/'),'https://engaje-social-dashboard-abc-ednelfelixmts-projects.vercel.app');
 for(const config of [{...env,MEDIAHUB_HTTP_READONLY_ACK:''},{...env,MEDIAHUB_APP_ORIGIN:'https://evil.test'},
  {...env,MEDIAHUB_SUPABASE_URL:'https://other.supabase.co'},{...env,MEDIAHUB_PUBLISHABLE_KEY:'sb_secret_synthetic_abcdefghijklmnopqrstuvwxyz'},
  {...env,MEDIAHUB_B_EMAIL:env.MEDIAHUB_A_EMAIL},{...env,MEDIAHUB_B_PASSWORD:''}]){
  const f=fixture();await assert.rejects(f.run(config));assert.equal(f.created(),0);assert.equal(f.requests(),0);
 }
 assert.equal(validateHttpAcceptance(env).fixtures.length,2);
});

test('HTTP acceptance proves own HTML, cross-tenant and administrator denials for two identity-bound viewers',async()=>{
 for(const escapedName of [false,true]){
  const f=fixture({escapedName});const r=await f.run();assert.equal(r.status,'PASS');assert.equal(r.checks.length,16);
  assert.equal(r.checks.filter(x=>x.status===200).length,2);assert.equal(r.checks.filter(x=>x.status===404).length,12);
  assert.equal(r.checks.filter(x=>x.status===307).length,2);assert.ok(!JSON.stringify(r).includes(canary));
  assert.deepEqual(f.logouts,[0,1]);assert.ok(f.jars.every(j=>j.getAll().length===0));
 }
});

test('login, agency, role or membership mismatch cannot produce app probes or a false pass',async()=>{
 for(const options of [{loginIndex:0},{loginIndex:1},{wrongUser:true},{agency:true},{role:'editor'},{extraMembership:true},{admin:true},{noCookies:true}]){
  const f=fixture(options);await assert.rejects(f.run(),e=>e instanceof Error&&!e.message.includes(canary));
  assert.equal(f.requests(),0);assert.ok(f.logouts.length>0);assert.ok(f.jars.every(j=>j.getAll().length===0));
 }
});

test('redirect, cache, rendered errors, missing positives and foreign/admin links never pass',async()=>{
 for(const options of [{status:401},{status:500},{status:200},{adminLocation:'https://evil.test/'},{noCache:true},
  {cacheControl:'public, no-store'},{cacheControl:'private, max-age=3600'},
  {noOwnLink:true},{wrongName:true},{foreignLink:true},{foreignName:true},{adminLink:true},{htmlError:true},{escapedError:true},{nonHtml:true},{largeBody:true},{fetchThrow:true}]){
  const f=fixture(options);await assert.rejects(f.run(),e=>e instanceof Error&&!e.message.includes(canary));
  assert.deepEqual(f.logouts,[0,1]);assert.ok(f.jars.every(j=>j.getAll().length===0));
 }
});

test('cleanup failures never reveal SDK errors or mask an existing acceptance failure',async()=>{
 const f=fixture({fetchThrow:true,logoutThrow:true});await assert.rejects(f.run(),/AUTHENTICATED_HTTP_NOT_PROVEN/);assert.deepEqual(f.logouts,[0,1]);
 const success=fixture({logoutThrow:true});await assert.rejects(success.run(),/SESSION_CLEANUP_NOT_PROVEN/);assert.ok(success.jars.every(j=>j.getAll().length===0));
});
