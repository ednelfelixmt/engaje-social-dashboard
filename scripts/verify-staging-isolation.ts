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
function invariant(cond:unknown,message:string):asserts cond{
 if(!cond)throw new Error('Isolation assertion failed: '+message);
}
async function login(url:URL,key:string,fixture:Fixture):Promise<Context>{
 const client=createClient(url.toString(),key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data:login,error:authError}=await client.auth.signInWithPassword({email:fixture.email,password:fixture.password});
 invariant(!authError&&login.user?.id,'staging login and user identity');
 const {data:orgs,error:orgError}=await client.from('organizations').select('id,slug,is_agency').eq('slug',fixture.slug);
 invariant(!orgError&&orgs?.length===1&&UUID.test(orgs[0].id)&&orgs[0].is_agency===false,'own tenant must exist and be visible');
 const {data:members,error:memberError}=await client.from('organization_members').select('user_id,is_active,role').eq('organization_id',orgs[0].id).eq('user_id',login.user.id);
 invariant(!memberError&&members?.length===1&&members[0].is_active===true&&members[0].role!=='super_admin','own non-admin active membership');
 const {data:superAdmin,error:adminError}=await client.rpc('is_super_admin');
 invariant(!adminError&&superAdmin===false,'test identities must not be superadmins');
 const {data:assignments,error:assignmentError}=await client.from('client_asset_assignments').select('asset_id').eq('organization_id',orgs[0].id).limit(100);
 invariant(!assignmentError&&assignments&&assignments.length>0,'each test tenant needs at least one assigned asset');
 const assignedIds=assignments.map(a=>a.asset_id);
 return {client,orgId:orgs[0].id,assignedIds,fixture};
}
async function mustDenyForeign(a:Context,b:Context):Promise<void>{
 const scopedTables=['organizations','organization_members','dashboard_configs','integrations','metrics_ads','metrics_ads_breakdowns','metrics_organic','metrics_crm','creatives','client_asset_assignments','sync_jobs','integration_alerts'] as const;
 for(const table of scopedTables){
  // All tables above have organization_id except organizations, whose tenant key is id.
  const field=table==='organizations'?'id':'organization_id';
  const {data,error}=await a.client.from(table).select(field).eq(field,b.orgId).limit(1);
  invariant(!error&&data?.length===0,'foreign data denied: '+table);
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
 invariant(!key.startsWith('sb_secret_')&&!key.includes('service_role'),'use publishable key, not a privileged credential');
 const a=getFixture(env,'A'),b=getFixture(env,'B');
 invariant(distinctStagingFixtures(a,b),'distinct test identities, tenants and private storage fixtures required');
 const A=await login(target,key,a);
 let B:Context|undefined;
 try {
  B=await login(target,key,b);
  invariant(A.orgId!==B.orgId,'tenant identifiers must differ');
  await mustDenyForeign(A,B);
  await mustDenyForeign(B,A);
  process.stdout.write('PASS: authenticated cross-tenant read and signed URL isolation for both directions (staging only)\n');
 } finally {
  await Promise.allSettled([A.client.auth.signOut(), ...(B?[B.client.auth.signOut()]:[])]);
 }
}
if(process.argv[1]&&/verify-staging-isolation\.(ts|js)$/.test(process.argv[1])){
 runStagingIsolation(process.env).catch(err=>{
  process.stderr.write('FAIL: '+(err instanceof Error?err.message:'unknown error')+'\n');
  process.exitCode=1;
 });
}
