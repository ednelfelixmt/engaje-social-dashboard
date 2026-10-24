import {createClient} from '@supabase/supabase-js';

/** One-time synthetic-only Storage upload. Credentials must be sourced from a secure runner. */
export function validateStorageFixtures(env:NodeJS.ProcessEnv){
 if(env.MEDIAHUB_FIXTURE_UPLOAD_ACK!=='UPLOAD_ONLY_SYNTHETIC_BRANDING')throw new Error('Explicit fixture-only acknowledgement required');
 if(env.MEDIAHUB_SUPABASE_URL!=='https://ityidnsfhgotucgvcifq.supabase.co')throw new Error('Wrong project');
 const key=env.MEDIAHUB_SERVICE_ROLE_KEY||'';
 if(!key||key.startsWith('sb_publishable_')||key.length<30)throw new Error('A protected server-side service credential is required');
 const ids=[
  {slug:'homologacao-a-20261024',id:'c4c77b35-03a4-417a-94c2-e845d48679c1'},
  {slug:'homologacao-b-20261024',id:'10289f2d-23b9-4c86-a10e-0503bcc2de79'}
 ];
 return {key,url:env.MEDIAHUB_SUPABASE_URL,ids};
}
export async function uploadSyntheticBranding(env:NodeJS.ProcessEnv){
 const cfg=validateStorageFixtures(env);
 const db=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});
 const payload=new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="#777"/></svg>');
 for(const fixture of cfg.ids){
  const {data:org,error:orgError}=await db.from('organizations').select('id,is_agency').eq('id',fixture.id).eq('slug',fixture.slug).single();
  if(orgError||!org||org.is_agency)throw new Error('Synthetic organization verification failed');
  const {data:members,error:memberError}=await db.from('organization_members').select('role,is_active').eq('organization_id',fixture.id);
  if(memberError||members?.length!==1||members[0].role!=='viewer'||members[0].is_active!==true)throw new Error('Expected exactly one synthetic viewer');
 }
 for(const fixture of cfg.ids){
  const path=fixture.id+'/phase02-isolation-fixture.svg';
  const {error}=await db.storage.from('branding').upload(path,payload,{contentType:'image/svg+xml',upsert:false});
  if(error)throw new Error('Storage fixture upload failed for '+fixture.slug+': '+error.message);
  process.stdout.write('CREATED '+fixture.slug+' '+path+'\n');
 }
}
if(process.argv[1]&&/upload-phase02-branding-fixtures\.(ts|js)$/.test(process.argv[1]))
 uploadSyntheticBranding(process.env).catch(e=>{process.stderr.write('FAIL: '+(e instanceof Error?e.message:'unknown')+'\n');process.exitCode=1;});
