import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AgencyAuthorizationError,requireAgencyAdministrator,isActiveAgencyAdministrator} from '../supabase/functions/_shared/agency-authorization';

const user={id:'20000000-0000-4000-8000-000000000001'};
function client(authorized:unknown,options:{missingUser?:boolean;authError?:boolean;roleError?:boolean}={}){
 return {
  auth:{getUser:async()=>({data:{user:options.missingUser?null:user},error:options.authError?new Error('synthetic'):null})},
  rpc:async()=>({data:authorized,error:options.roleError?new Error('synthetic'):null}),
 };
}
test('Edge rejects absent or malformed bearer tokens without creating a client',async()=>{
 for(const header of [null,'','Basic synthetic','Bearer ','Bearer two tokens']){
  await assert.rejects(requireAgencyAdministrator(header,()=>{throw new Error('client must not be created');}),
   error=>error instanceof AgencyAuthorizationError&&error.status===401);
 }
});
test('Edge validates Auth before attempting any privileged operation',async()=>{
 for(const options of [{missingUser:true},{authError:true}]){
  await assert.rejects(requireAgencyAdministrator('Bearer synthetic',()=>client(true,options)),
   error=>error instanceof AgencyAuthorizationError&&error.status===401);
 }
});
test('Edge denies clients, malformed role results and lookup errors even with a valid token',async()=>{
 for(const value of [false,null,undefined,'true',1]){
  await assert.rejects(requireAgencyAdministrator('Bearer synthetic',()=>client(value)),
   error=>error instanceof AgencyAuthorizationError&&error.status===403);
 }
 await assert.rejects(requireAgencyAdministrator('Bearer synthetic',()=>client(true,{roleError:true})),
  error=>error instanceof AgencyAuthorizationError&&error.status===403);
});
test('Edge returns the verified identity and original scoped client only for agency admins',async()=>{
 const scoped=client(true);
 const result=await requireAgencyAdministrator('Bearer synthetic',()=>scoped);
 assert.equal(result.user,user);assert.equal(result.client,scoped);
});
test('OAuth callback only accepts an active superadmin of an active agency',()=>{
 const active={role:'super_admin',is_active:true,organizations:{status:'active',is_agency:true}};
 assert.equal(isActiveAgencyAdministrator(active),true);
 for(const value of [
  null,{},[active],{...active,is_active:false},
  {...active,organizations:null},{...active,organizations:[active.organizations]},
  {...active,organizations:{status:'paused',is_agency:true}},
  {...active,organizations:{status:'active',is_agency:false}},
  ...['viewer','editor','client_admin'].map(role=>({...active,role})),
 ])assert.equal(isActiveAgencyAdministrator(value),false);
});
test('Edge wiring uses the tested gates and preserves the scheduled service path',()=>{
 const source=readFileSync('supabase/functions/engaje-integrations/index.ts','utf8');
 assert.match(source,/return requireAgencyAdministrator\(req.headers.get\('Authorization'\)/);
 assert.match(source,/members.some\(isActiveAgencyAdministrator\)/);
 assert.doesNotMatch(source,/\['client_admin','editor'\]\.includes/);
 assert.match(source,/body.action==='scheduled_sync'\)return await scheduledSync/);
 assert.match(source,/e instanceof AgencyAuthorizationError\?e.status:400/);
});
