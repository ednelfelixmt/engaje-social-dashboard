import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTypescript} from './helpers/load-typescript';
function route(options:{authenticated?:boolean;admin?:boolean}={}){let privateCalls=0,starts=0;
 const {POST}=loadTypescript<typeof import('../src/app/api/integrations/connect/route')>(new URL('../src/app/api/integrations/connect/route.ts',import.meta.url),(id,native)=>{
  if(id==='next/server')return {NextResponse:{json:(body:unknown,init:ResponseInit)=>Response.json(body,init)}};
  if(id==='@/lib/supabase/server')return {serverClient:async()=>({auth:{getUser:async()=>({data:{user:options.authenticated?{id:'synthetic-user'}:null},error:null})},rpc:async()=>({data:options.admin===true,error:null})})};
  if(id==='@/lib/integrations/connection-service')return {connectionService:()=>{privateCalls++;return{store:{},secret:'synthetic-private'};}};
  if(id==='@/lib/integrations/connection-flow')return {beginConnection:async()=>{starts++;return {id:'synthetic-draft',authorized:true};}};
  return native(id);
 });return{POST,counts:()=>({privateCalls,starts})};
}
const request=(origin='https://synthetic.invalid',body='{}')=>new Request('https://synthetic.invalid/api/integrations/connect',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body});
test('connection API rejects cross-origin, anonymous and non-admin requests before private database access',async()=>{for(const [options,origin,status] of [[{authenticated:true,admin:true},'https://foreign.invalid',403],[{},'https://synthetic.invalid',401],[{authenticated:true,admin:false},'https://synthetic.invalid',403]] as const){const r=route(options);assert.equal((await r.POST(request(origin))).status,status);assert.deepEqual(r.counts(),{privateCalls:0,starts:0});}});
test('connection API rejects malformed or excessive input before creating a private service',async()=>{for(const [body,status] of [['not-json',400],['[]',400],[' '.repeat(12001),413]] as const){const r=route({authenticated:true,admin:true});assert.equal((await r.POST(request(undefined,body))).status,status);assert.deepEqual(r.counts(),{privateCalls:0,starts:0});}});
test('authorized admin requests are processed without caching the credential response',async()=>{const r=route({authenticated:true,admin:true});const response=await r.POST(request(undefined,JSON.stringify({product:'rd_station_crm',organizationId:'synthetic-organization',method:'api',apiToken:'synthetic-api-key'})));assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual(r.counts(),{privateCalls:1,starts:1});assert.doesNotMatch(await response.text(),/synthetic-api-key/);});
test('OAuth callback rejects forged state before obtaining a privileged database client',async()=>{let privateCalls=0;const {GET}=loadTypescript<typeof import('../src/app/api/integrations/oauth/callback/route')>(new URL('../src/app/api/integrations/oauth/callback/route.ts',import.meta.url),(id,native)=>{
 if(id==='next/server')return {NextResponse:{redirect:(url:string,init:ResponseInit)=>new Response(null,{...init,headers:{...init.headers,Location:url}})}};
 if(id==='@/lib/auth/administration-key')return {administrationKey:()=> 'synthetic-state-secret-never-production-123456'};
 if(id==='@/lib/integrations/connection-service')return {connectionService:()=>{privateCalls++;throw Error('must not access');}};return native(id);
 });const response=await GET(new Request('https://synthetic.invalid/api/integrations/oauth/callback?state=forged&code=synthetic-secret-code'));assert.equal(response.status,303);assert.equal(response.headers.get('Location'),'https://mediahub.engajeperformance.com.br/admin/integrations?authorization=failed');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(privateCalls,0);});
