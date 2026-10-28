import {isPublicSupabaseKey} from './supabase-public-key';
/**
 * Fase 02: authenticated Supabase RLS verification against a dedicated staging project.
 * Does not create, mutate, or delete user data. Fails closed on missing fixtures.
 *
 * Required:
 * STAGING_SUPABASE_URL, STAGING_SUPABASE_PUBLISHABLE_KEY,
 * STAGING_USER_A_EMAIL, STAGING_USER_A_PASSWORD, STAGING_ORG_A_SLUG,
 * STAGING_USER_B_EMAIL, STAGING_USER_B_PASSWORD, STAGING_ORG_B_SLUG,
 * STAGING_PRIVATE_FILE_A, STAGING_PRIVATE_FILE_B.
 */
import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import {isolationTables,verifyTenantReadEvidence,IsolationEvidenceError} from './verify-production-isolation';

export const PRODUCTION_PROJECT_REF='ityidnsfhgotucgvcifq';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireStagingUrl(input:string):URL {
  const url=new URL(input);
  const host=url.hostname.toLowerCase();
  const match=host.match(/^([a-z0-9]{20})\.supabase\.co$/);
  if(url.protocol!=='https:'||!match||match[1]===PRODUCTION_PROJECT_REF||url.username||url.password||url.pathname!=='/'||url.search||url.hash){
    throw new Error('Target must be the dedicated non-production Supabase HTTPS project root');
  }
  return url;
}

type Fixture={slug:string;email:string;password:string;file:string};
type Context={client:SupabaseClient;orgId:string;assignedIds:string[];fixture:Fixture};
function required(env:NodeJS.ProcessEnv,key:string):string{
 const value=env[key]?.trim();
 if(!value)throw new Error('Missing required staging fixture configuration: '+key);
 return value;
}
function getFixture(env:NodeJS.ProcessEnv,suffix:'A'|'B'):Fixture{
 return {
  slug:required(env,'STAGING_ORG_'+suffix+'_SLUG'),
  email:required(env,'STAGING_USER_'+suffix+'_EMAIL'),
  password:required(env,'STAGING_USER_'+suffix+'_PASSWORD'),
  file:required(env,'STAGING_PRIVATE_FILE_'+suffix),
 };
}
export function distinctStagingFixtures(a:Fixture,b:Fixture):boolean {
 return a.email.trim().toLowerCase()!==b.email.trim().toLowerCase()
  && a.slug.trim().toLowerCase()!==b.slug.trim().toLowerCase()
  && a.file.trim()!==b.file.trim();
}
class StagingIsolationError extends Error{}
function invariant(cond:unknown,message:string):asserts cond{
 if(!cond)throw new StagingIsolationError('Isolation assertion failed: '+message);
}
async function login(url:URL,key:string,fixture:Fixture):Promise<Context>{
 const client=createClient(url.toString(),key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 try{
 const {data:login,error:authError}=await client.auth.signInWithPassword({email:fixture.email,password:fixture.password});
 invariant(!authError&&login.user?.id,'staging login and user identity');
 const {data:orgs,error:orgError}=await client.from('organizations').select('id,slug,is_agency').eq('slug',fixture.slug);
 invariant(!orgError&&orgs?.length===1&&UUID.test(orgs[0].id)&&orgs[0].is_agency===false,'own tenant must exist and be visible');
 const {data:members,error:memberError}=await client.from('organization_members').select('user_id,is_active,role').eq('organization_id',orgs[0].id).eq('user_id',login.user.id);
 invariant(!memberError&&members?.length===1&&members[0].is_active===true&&members[0].role!=='super_admin','own non-admin active membership');
 const {data:superAdmin,error:adminError}=await client.rpc('is_super_admin');
 invariant(!adminError&&superAdmin===false,'test identities must not be superadmins');
 const {data:assignments,error:assignmentError,count:assignmentCount}=await client.from('client_asset_assignments').select('asset_id',{count:'exact'}).eq('organization_id',orgs[0].id).eq('assignment_status','assigned').limit(101);
 if(assignmentError||!Array.isArray(assignments)||assignments.length<1||assignments.length>100||assignmentCount!==assignments.length)throw new IsolationEvidenceError('NOT PROVEN','complete assigned asset fixtures required');
 const assignedIds=assignments.map(a=>a.asset_id);
 return {client,orgId:orgs[0].id,assignedIds,fixture};
 }catch(error){
  await Promise.allSettled([client.auth.signOut({scope:'local'})]);
  if(error instanceof StagingIsolationError||error instanceof IsolationEvidenceError)throw error;
  throw new StagingIsolationError('Staging fixture service verification did not complete');
 }
}
async function mustDenyForeign(a:Context,b:Context):Promise<void>{
 for(const [table,field,access] of isolationTables){
  // All tables above have organization_id except organizations, whose tenant key is id.
  const {data,error}=await a.client.from(table).select(field).eq(field,b.orgId).limit(access==='denied'?0:1);
  if(access==='denied')invariant(error?.code==='42501'&&data===null,'administrative data denied: '+table);
  else invariant(!error&&data?.length===0,'foreign data denied: '+table);
 }
 const {data:assets,error:assetsError}=await a.client.from('platform_assets').select('id').in('id',b.assignedIds).limit(100);
 invariant(!assetsError&&assets?.length===0,'foreign platform assets denied');
 const {data:connections,error:connectionsError}=await a.client.from('platform_connections').select('id').eq('target_organization_id',b.orgId).limit(1);
 invariant(!connectionsError&&connections?.length===0,'foreign platform connections denied');
 const {data:foreignFile,error:fileError}=await a.client.storage.from('branding').createSignedUrl(b.fixture.file,60);
 invariant(!!fileError&&!foreignFile?.signedUrl,'foreign signed URL denied');
 // Account must still access its own object: otherwise a denial does not prove isolation.
 const {data:ownFile,error:ownError}=await a.client.storage.from('branding').createSignedUrl(a.fixture.file,60);
 invariant(!ownError&&Boolean(ownFile?.signedUrl),'own signed URL should be accessible');
}
export async function runStagingIsolation(env:NodeJS.ProcessEnv):Promise<void>{
 const target=requireStagingUrl(required(env,'STAGING_SUPABASE_URL'));
 const key=required(env,'STAGING_SUPABASE_PUBLISHABLE_KEY');
 // These are *public/publishable*, never secret/service_role keys.
 invariant(isPublicSupabaseKey(key),'use publishable key, not a privileged credential');
 const a=getFixture(env,'A'),b=getFixture(env,'B');
 invariant(distinctStagingFixtures(a,b),'distinct test identities, tenants and private storage fixtures required');
 const A=await login(target,key,a);
 let B:Context|undefined;
 try {
  B=await login(target,key,b);
  invariant(A.orgId!==B.orgId,'tenant identifiers must differ');
  if(A.assignedIds.some(id=>B.assignedIds.includes(id)))throw new IsolationEvidenceError('NOT PROVEN','assigned asset fixtures must be disjoint');
  await verifyTenantReadEvidence([A.client,B.client],[A.orgId,B.orgId]);
  await mustDenyForeign(A,B);
  await mustDenyForeign(B,A);
  process.stdout.write('PASS: authenticated cross-tenant read and signed URL isolation for both directions (staging only)\n');
 } catch(error) {
  if(error instanceof StagingIsolationError||error instanceof IsolationEvidenceError)throw error;
  throw new StagingIsolationError('Staging service verification did not complete');
 } finally {
  await Promise.allSettled([A.client.auth.signOut({scope:'local'}), ...(B?[B.client.auth.signOut({scope:'local'})]:[])]);
 }
}
if(process.argv[1]&&/verify-staging-isolation\.(ts|js)$/.test(process.argv[1])){
 runStagingIsolation(process.env).catch(err=>{
  process.stderr.write((err instanceof IsolationEvidenceError?err.message:err instanceof StagingIsolationError?'FAIL: '+err.message:'NOT PROVEN: staging configuration or service unavailable')+'\n');
  process.exitCode=1;
 });
}
