import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTypescript} from './helpers/load-typescript';

const userId='20000000-0000-4000-8000-000000000001';
type Context={org:{id:string};superAdmin:boolean};
type SessionModule={agencyTenant:(slug:string)=>Promise<Context>;session:()=>Promise<Context>};
function loadSession(authorized:unknown,options:{roleError?:boolean;authError?:boolean;organization?:boolean}={}){
 let orgReads=0;
 const db={
  auth:{getClaims:async()=>({data:{claims:{sub:userId}},error:options.authError?new Error('synthetic auth failure'):null})},
  rpc:async()=>({data:authorized,error:options.roleError?new Error('synthetic role failure'):null}),
  from:()=>({select:()=>({eq:()=>({single:async()=>{orgReads++;return {data:options.organization===false?null:{id:'synthetic-organization',slug:'fixture-a'}};}})})}),
 };
 const denied=new Error('NOT_FOUND'),redirected=new Error('REDIRECT');
 const api=loadTypescript<SessionModule>(new URL('../src/lib/auth/session.ts',import.meta.url),(id,native)=>{
  if(id==='server-only')return {};
  if(id==='react')return {cache:<T>(fn:T)=>fn};
  if(id==='next/navigation')return {notFound:()=>{throw denied;},redirect:()=>{throw redirected;}};
  if(id==='@/lib/supabase/server')return {serverClient:async()=>db};
  return native(id);
 });
 return {api,denied,redirected,orgReads:()=>orgReads};
}

test('tenant settings reject viewer and every legacy client role',async()=>{
 for(const role of ['viewer','editor','client_admin']){
  const {api,denied,orgReads}=loadSession(false);
  await assert.rejects(api.agencyTenant('fixture-a'),error=>error===denied,role);
  assert.equal(orgReads(),1);
 }
});
test('only an explicitly authorized agency administrator reaches tenant settings',async()=>{
 const {api}=loadSession(true);
 assert.equal((await api.agencyTenant('fixture-a')).superAdmin,true);
});
test('truthy or unavailable role responses never grant tenant administration',async()=>{
 for(const value of ['true',1,null,undefined]){
  const {api,denied}=loadSession(value);
  await assert.rejects(api.agencyTenant('fixture-a'),error=>error===denied);
 }
 const {api,orgReads}=loadSession(true,{roleError:true});
 await assert.rejects(api.agencyTenant('fixture-a'),/Não foi possível validar o acesso/);
 assert.equal(orgReads(),0);
});
test('invalid session or invisible tenant fails before loading configuration',async()=>{
 const invalid=loadSession(true,{authError:true});
 await assert.rejects(invalid.api.agencyTenant('fixture-a'),error=>error===invalid.redirected);
 assert.equal(invalid.orgReads(),0);
 const missing=loadSession(true,{organization:false});
 await assert.rejects(missing.api.agencyTenant('fixture-b'),error=>error===missing.denied);
});

test('direct settings URLs deny clients before queries or configuration rendering',async()=>{
 const paths=['settings/branding','settings/dashboard','settings/integrations','settings/data-quality','sharing'];
 for(const path of paths){
  const denied=new Error('DENIED');
  let guards=0;
  const stub=()=>null;
  const placeholders=new Proxy({},{get:()=>stub});
  const page=loadTypescript<{default:(props:unknown)=>Promise<unknown>}>(
   new URL('../src/app/(tenant)/[organizationSlug]/'+path+'/page.tsx',import.meta.url),
   (id,native)=>{
    if(id==='react/jsx-runtime')return native(id);
    if(id==='@/lib/auth/session')return {
     agencyTenant:async(slug:string)=>{assert.equal(slug,'fixture-a');guards++;throw denied;},
     tenant:()=>{throw new Error('unprotected tenant load');},
     dashboardConfig:()=>{throw new Error('configuration loaded before authorization');},
    };
    return placeholders;
   },
  );
  await assert.rejects(page.default({params:Promise.resolve({organizationSlug:'fixture-a'}),searchParams:Promise.resolve({})}),error=>error===denied,path);
  assert.equal(guards,1,path);
 }
});
