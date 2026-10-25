import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTypescript} from './helpers/load-typescript';
import * as funnel from '../src/lib/metrics/funnel-config';
import {isValidTimezone} from '../src/lib/organization-options';
import {validateOrganizationUpdateRequest} from '../src/lib/auth/organization-update-guards';
import {adminMutationFailure} from '../src/lib/auth/admin-mutation-feedback';

type State={ok:boolean;message:string};
type Action=(previous:State,data:FormData)=>Promise<State>;
const org='22222222-2222-4222-8222-222222222222', user='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const initial={ok:false,message:''};
function form(values:Record<string,string>){const f=new FormData();for(const [key,value] of Object.entries(values))f.set(key,value);return f;}
function setup(options:{denied?:boolean;error?:{code?:string};data?:unknown}={}){
 const calls:{name:string;args:Record<string,unknown>}[]=[],paths:string[]=[];
 const actions=loadTypescript<{createOrganization:Action;updateOrganization:Action;saveMember:Action}>(new URL('../src/app/(agency)/admin/actions.ts',import.meta.url),(id,native)=>{
  if(id==='@/lib/auth/session')return {requireAdmin:async()=>{if(options.denied)throw new Error('synthetic access denied');return {db:{rpc:async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return {data:options.data??null,error:options.error??null};},from:()=>{throw new Error('unexpected separate write');}}};}};
  if(id==='next/cache')return {revalidatePath:(path:string)=>paths.push(path)};
  if(id==='@/lib/metrics/funnel-config')return funnel;
  if(id==='@/lib/organization-options')return {isValidTimezone};
  if(id==='@/lib/auth/organization-update-guards')return {validateOrganizationUpdateRequest};
  if(id==='@/lib/auth/admin-mutation-feedback')return {adminMutationFailure};
  return native(id);
 });return {...actions,calls,paths};
}
const settings={name:'Synthetic client',slug:'synthetic-client',niche:funnel.businessNiches[0].id,sales_model:funnel.salesModels[0].id};
const edit={...settings,id:org,status:'active',timezone:'America/Cuiaba',currency:'BRL',apply_funnel:'on'};
const member={organization_id:org,user_id:user,role:'viewer',is_active:'on'};

test('create action sends client and funnel in one atomic RPC',async()=>{
 const app=setup({data:{id:org,slug:settings.slug}});assert.equal((await app.createOrganization(initial,form(settings))).ok,true);
 assert.equal(app.calls.length,1);assert.equal(app.calls[0].name,'create_client_organization');assert.equal(app.calls[0].args.p_slug,settings.slug);assert.ok(Array.isArray(app.calls[0].args.p_funnel_steps));assert.ok(app.paths.includes('/admin/organizations'));
});
test('edit action sends all dependent settings together and refreshes client layout',async()=>{
 const app=setup({data:{id:org,slug:settings.slug}});assert.equal((await app.updateOrganization(initial,form(edit))).ok,true);
 assert.equal(app.calls.length,1);assert.equal(app.calls[0].name,'update_client_organization');assert.equal(app.calls[0].args.p_apply_funnel,true);assert.ok(app.paths.includes('/'+settings.slug));
});
test('editing without applying a funnel preserves its explicit unchanged state',async()=>{
 const app=setup({data:{id:org,slug:settings.slug}});await app.updateOrganization(initial,form({...edit,apply_funnel:'',niche:'',sales_model:''}));assert.equal(app.calls[0].args.p_apply_funnel,false);assert.deepEqual(app.calls[0].args.p_funnel_steps,[]);
});
test('incomplete funnel or malformed input is rejected before RPC',async()=>{
 const app=setup();assert.equal((await app.updateOrganization(initial,form({...edit,niche:''}))).ok,false);assert.equal((await app.createOrganization(initial,form({...settings,slug:'admin'}))).ok,false);assert.equal((await app.saveMember(initial,form({...member,role:'super_admin'}))).ok,false);assert.equal(app.calls.length,0);
});
test('unauthorized direct Server Action calls cannot reach the database',async()=>{
 const app=setup({denied:true});for(const [action,values] of [[app.createOrganization,settings],[app.updateOrganization,edit],[app.saveMember,member]] as const)await assert.rejects(action(initial,form(values)),/access denied/);assert.equal(app.calls.length,0);
});
test('membership save uses caller session and acknowledges complete scoped result',async()=>{
 const app=setup({data:{organization_id:org,user_id:user,is_active:true,revoked_invitations:1}});assert.equal((await app.saveMember(initial,form(member))).ok,true);assert.equal(app.calls.length,1);assert.equal(app.calls[0].name,'save_client_membership');assert.deepEqual(app.calls[0].args,{p_organization_id:org,p_user_id:user,p_is_active:true});assert.ok(app.paths.includes('/admin/users/'+user));
});
test('missing migration fails closed without falling back to separate writes',async()=>{
 const app=setup({error:{code:'PGRST202'}});const result=await app.saveMember(initial,form(member));assert.equal(result.ok,false);assert.match(result.message,/serviço pendente/);assert.equal(app.calls.length,1);assert.equal(app.paths.length,0);
});
test('SQL rejection does not report a partially completed access change',async()=>{
 const app=setup({error:{code:'22023'}});const result=await app.saveMember(initial,form(member));assert.equal(result.ok,false);assert.match(result.message,/Nenhuma alteração foi salva/);assert.doesNotMatch(result.message,/acesso foi atualizado/i);
});
test('lost acknowledgement requests refresh rather than promising rollback',async()=>{
 const app=setup({error:{code:''}});const result=await app.updateOrganization(initial,form(edit));assert.equal(result.ok,false);assert.match(result.message,/Recarregue os dados/);assert.doesNotMatch(result.message,/Nenhuma alteração foi salva/);
});
test('malformed or mismatched RPC acknowledgements cannot report success',async()=>{
 for(const data of [true,{}, {organization_id:org,user_id:user,is_active:false,revoked_invitations:0}]){const app=setup({data});assert.equal((await app.saveMember(initial,form(member))).ok,false);assert.equal(app.paths.length,0);}
 const app=setup({data:{id:user,slug:settings.slug}});assert.equal((await app.updateOrganization(initial,form(edit))).ok,false);
});
