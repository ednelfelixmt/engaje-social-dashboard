import {isPublicSupabaseKey} from './supabase-public-key';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
export const existingIsolationFixtures=[
 {slug:'homologacao-a-20261024',userId:'079b2713-a99a-41a6-acc3-b129863ef7a6',organizationId:'c4c77b35-03a4-417a-94c2-e845d48679c1'},
 {slug:'homologacao-b-20261024',userId:'4fd21c94-e93d-4e35-923b-b1ec4622fd94',organizationId:'10289f2d-23b9-4c86-a10e-0503bcc2de79'},
] as const;
export const isolationTables=[
 ['organizations','id','scoped'],['organization_members','organization_id','scoped'],['dashboard_configs','organization_id','scoped'],
 ['integrations','organization_id','scoped'],['metrics_ads','organization_id','scoped'],['metrics_ads_breakdowns','organization_id','scoped'],
 ['metrics_organic','organization_id','scoped'],['metrics_crm','organization_id','scoped'],['creatives','organization_id','scoped'],
 ['client_asset_assignments','organization_id','scoped'],['sync_jobs','organization_id','scoped'],['integration_alerts','organization_id','scoped'],
] as const;

/** Production-only, read-only authenticated isolation; synthetic identities must already exist. */
export function validate(env:NodeJS.ProcessEnv){
 if(env.MEDIAHUB_PROD_READONLY_ACK!=='YES_READ_ONLY')throw new Error('Explicit production acknowledgement required');
 const url=env.MEDIAHUB_SUPABASE_URL;
 if(url!=='https://ityidnsfhgotucgvcifq.supabase.co')throw new Error('Wrong Supabase project');
 const key=env.MEDIAHUB_PUBLISHABLE_KEY||'';
 if(!isPublicSupabaseKey(key))throw new Error('Requires publishable key');
 const a={email:env.MEDIAHUB_A_EMAIL||'',password:env.MEDIAHUB_A_PASSWORD||'',slug:env.MEDIAHUB_A_SLUG||''};
 const b={email:env.MEDIAHUB_B_EMAIL||'',password:env.MEDIAHUB_B_PASSWORD||'',slug:env.MEDIAHUB_B_SLUG||''};
 const files=[env.MEDIAHUB_A_BRANDING_FILE||'',env.MEDIAHUB_B_BRANDING_FILE||''];
 const requestedMode=env.MEDIAHUB_PROD_EXISTING_FIXTURE_ACK;
 if(requestedMode&&requestedMode!=='YES_EXPLICIT_FIXTURE_USERS')throw new Error('Unsupported fixture authorization mode');
 const allowExisting=requestedMode==='YES_EXPLICIT_FIXTURE_USERS';
 const expectedUserIds=[env.MEDIAHUB_A_USER_ID||'',env.MEDIAHUB_B_USER_ID||''];
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const existingAuthorized=allowExisting&&a.slug==='homologacao-a-20261024'&&b.slug==='homologacao-b-20261024'
  &&expectedUserIds.every(id=>uuid.test(id))&&expectedUserIds[0].toLowerCase()!==expectedUserIds[1].toLowerCase()
  &&existingIsolationFixtures.every((fixture,index)=>expectedUserIds[index].toLowerCase()===fixture.userId);
 if(allowExisting&&!existingAuthorized)throw new Error('Requires exact identity-bound fixture authorization');
 if((!a.email.endsWith('.test')||!b.email.endsWith('.test'))&&!existingAuthorized)throw new Error('Requires synthetic .test accounts or explicit, identity-bound fixture authorization');
 if(!a.password||!b.password||!a.slug||!b.slug||a.email.toLowerCase()===b.email.toLowerCase()||a.slug.toLowerCase()===b.slug.toLowerCase())throw new Error('Two distinct synthetic fixtures required');
 if(files.some(path=>!path||path.includes('..')||path.startsWith('/'))||files[0]===files[1])throw new Error('Two distinct private branding file fixtures required');
 if(files.some(path=>!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/.+/.test(path)))throw new Error('Private file fixtures require organization UUID prefix');
 return {url,key,a,b,files,expectedUserIds,existingAuthorized};
}
export class IsolationEvidenceError extends Error{
 constructor(status:'FAIL'|'NOT PROVEN',message:string){super(status+': '+message);}
}
function assert(value:unknown,message:string,status:'FAIL'|'NOT PROVEN'='FAIL'):asserts value{
 if(!value)throw new IsolationEvidenceError(status,message);
}
function requireDenied(result:{data:unknown;error:{code?:string}|null;count?:number|null;status?:number},table:string){
 assert(!!result.error,'protected credential column unexpectedly readable for '+table);
 assert(result.status===403&&result.error.code==='42501'&&result.data===null&&(result.count===null||result.count===undefined),'administrative denial unavailable for '+table,'NOT PROVEN');
}
async function verifyPrivateFile(url:string,backend:string,path:string){
 try{
  const parsed=new URL(url);
  const expected='/storage/v1/object/sign/branding/'+path;
  assert(parsed.protocol==='https:'&&parsed.origin===backend&&!parsed.username&&!parsed.password&&decodeURIComponent(parsed.pathname)===expected&&!!parsed.searchParams.get('token'),'own signed URL target');
  const response=await fetch(parsed,{redirect:'manual',signal:AbortSignal.timeout(10000)});
  if(response.status!==200){await response.body?.cancel().catch(()=>{});assert(false,'own private fixture HTTP response','NOT PROVEN');}
  assert(response.body,'own private fixture HTTP response','NOT PROVEN');
  const reader=response.body.getReader();
  try{
   const first=await reader.read();
   assert(!first.done&&first.value.byteLength>0,'own private fixture HTTP body','NOT PROVEN');
  }finally{await reader.cancel().catch(()=>{});}
 }catch(error){
  if(error instanceof IsolationEvidenceError)throw error;
  throw new IsolationEvidenceError('NOT PROVEN','own private fixture HTTP verification did not complete');
 }
}
/** Requires two already authenticated fixture contexts; does not grant access. */
export async function verifyTenantReadEvidence(clients:readonly SupabaseClient[],ids:readonly string[]){
 assert(clients.length===2&&ids.length===2&&ids[0]!==ids[1],'two distinct fixture contexts');
  // Empty datasets or denied own reads do not prove cross-tenant isolation.
  for(let i=0;i<2;i++)for(const [table,field] of isolationTables){
   const own=await clients[i].from(table).select(field,{head:true,count:'exact'}).eq(field,ids[i]);
   assert(!own.error&&typeof own.count==='number'&&Number.isSafeInteger(own.count)&&own.count>0,'positive own fixture/read required for '+table,'NOT PROVEN');
   const foreign=await clients[i].from(table).select(field,{head:true,count:'exact'}).neq(field,ids[i]);
   assert(!foreign.error&&typeof foreign.count==='number'&&Number.isSafeInteger(foreign.count)&&foreign.count>=0,'foreign count unavailable for '+table,'NOT PROVEN');
   assert(foreign.count===0,'foreign rows observed for '+table);
   const visible=await clients[i].from(table).select(field,{head:true,count:'exact'});
   assert(!visible.error&&typeof visible.count==='number'&&Number.isSafeInteger(visible.count)&&visible.count>=0,'visible count unavailable for '+table,'NOT PROVEN');
   assert(visible.count===own.count,'visible count differs from own scope for '+table,'NOT PROVEN');
   // Safe integration metadata is readable under tenant RLS; the Vault reference is not.
   // GET limit(0) preserves SQLSTATE without retrieving any credential references.
   if(table==='integrations'){
    requireDenied(await clients[i].from(table).select('credential_secret_id').eq(field,ids[i]).limit(0),table);
    requireDenied(await clients[i].from(table).select('credential_secret_id').neq(field,ids[i]).limit(0),table);
    requireDenied(await clients[i].from(table).select('credential_secret_id').limit(0),table);
   }
  }
}
export async function verifyProductionIsolation(env:NodeJS.ProcessEnv){
 const cfg=validate(env);
 const clients=[cfg.a,cfg.b].map(()=>createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}));
 try{
  const ids:string[]=[];
  const users:string[]=[];
  for(let i=0;i<2;i++){
   const client=clients[i], fixture=i===0?cfg.a:cfg.b;
   const {data:auth,error:authError}=await client.auth.signInWithPassword({email:fixture.email,password:fixture.password});
   assert(!authError&&auth?.user?.id,'fixture sign in','NOT PROVEN');
   if(cfg.existingAuthorized)assert(auth.user.id.toLowerCase()===cfg.expectedUserIds[i].toLowerCase(),'signed-in user must match exact authorized synthetic identity');
   users.push(auth.user.id);
   const {data:org,error:orgError}=await client.from('organizations').select('id,is_agency').eq('slug',fixture.slug);
   assert(!orgError&&Array.isArray(org)&&org.length===1,'visible non-agency organization','NOT PROVEN');
   assert(!org[0].is_agency,'fixture must not be an agency');
   if(cfg.existingAuthorized)assert(org[0].id.toLowerCase()===existingIsolationFixtures[i].organizationId,'exact authorized synthetic organization');
   ids.push(org[0].id);
   const {data:member,error:memberError}=await client.from('organization_members').select('is_active,role').eq('user_id',auth.user.id).eq('organization_id',org[0].id);
   assert(!memberError&&Array.isArray(member)&&member.length===1,'own membership available','NOT PROVEN');
   assert(member[0].is_active===true&&member[0].role==='viewer','limited own membership');
   const {data:admin,error:adminError}=await client.rpc('is_super_admin');
   assert(!adminError,'admin role validation available','NOT PROVEN');
   assert(admin===false,'not superadmin');
  }
  assert(ids[0]!==ids[1]&&users[0]!==users[1],'different orgs and users');
  assert(cfg.files.every((path,i)=>path.split('/')[0].toLowerCase()===ids[i].toLowerCase()),'private fixtures must use actual organization UUID prefix');
  const assigned:string[][]=[];
  for(let i=0;i<2;i++){
   const result=await clients[i].from('client_asset_assignments').select('asset_id',{count:'exact'}).eq('organization_id',ids[i]).eq('assignment_status','assigned').limit(101);
   assert(!result.error&&Array.isArray(result.data)&&result.data.length>0&&result.data.length<=100&&result.count===result.data.length,'complete assigned asset fixtures required','NOT PROVEN');
   assert(result.data.every(row=>typeof row.asset_id==='string'&&row.asset_id.length>0),'assigned asset identities available','NOT PROVEN');
   assigned.push(result.data.map(row=>row.asset_id));
  }
  assert(!assigned[0].some(id=>assigned[1].includes(id)),'assigned asset fixtures must be disjoint','NOT PROVEN');
  await verifyTenantReadEvidence(clients,ids);
  for(let i=0;i<2;i++){
   const client=clients[i],foreign=ids[1-i];
   for(const [table,field] of isolationTables){
    const {data,error}=await client.from(table).select(field).eq(field,foreign).limit(1);
     assert(!error&&Array.isArray(data),'foreign read unavailable for '+table,'NOT PROVEN');
     assert(data.length===0,'foreign table '+table);
   }
   const {data:connections,error:connectionError}=await client.from('platform_connections').select('id').eq('target_organization_id',foreign).limit(1);
   assert(!connectionError&&Array.isArray(connections),'foreign platform connections unavailable','NOT PROVEN');
   assert(connections.length===0,'foreign platform connections');
   const foreignAssets=assigned[1-i];
   if(foreignAssets.length){
    const {data:assets,error:assetsError}=await client.from('platform_assets').select('id').in('id',foreignAssets).limit(100);
    assert(!assetsError&&Array.isArray(assets),'foreign platform assets unavailable','NOT PROVEN');
    assert(assets.length===0,'foreign platform assets');
   }
   const {data:otherSigned,error:otherSignedError}=await client.storage.from('branding').createSignedUrl(cfg.files[1-i],60);
   assert(!otherSigned?.signedUrl,'foreign private file signed URL exposed');
   assert(!!otherSignedError,'foreign private file denial unavailable','NOT PROVEN');
   const {data:ownSigned,error:ownSignedError}=await client.storage.from('branding').createSignedUrl(cfg.files[i],60);
   assert(!ownSignedError&&!!ownSigned?.signedUrl,'own private file signed URL permitted','NOT PROVEN');
   await verifyPrivateFile(ownSigned.signedUrl,cfg.url,cfg.files[i]);
   const {data:own,error:ownError}=await client.from('organizations').select('id').eq('id',ids[i]);
   assert(!ownError&&Array.isArray(own)&&own.length===1,'own org accessible','NOT PROVEN');
  }
  process.stdout.write('PASS: two-way authenticated reads with positive fixtures, full visible-scope counts and private file HTTP (production; read-only)\n');
 }catch(error){
  if(error instanceof IsolationEvidenceError)throw error;
  throw new IsolationEvidenceError('NOT PROVEN','authenticated service verification did not complete');
 }finally{await Promise.allSettled(clients.map(c=>c.auth.signOut({scope:'local'})));}
}
if(process.argv[1]&&/verify-production-isolation\.(ts|js)$/.test(process.argv[1])){
 verifyProductionIsolation(process.env).catch(e=>{process.stderr.write((e instanceof IsolationEvidenceError?e.message:'NOT PROVEN: configuration invalid')+'\n');process.exitCode=1;});
}
