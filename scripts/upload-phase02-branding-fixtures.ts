import {createClient} from '@supabase/supabase-js';

/** Recognize an absent object, never a generic failure or a missing bucket. */
export async function isMissingFixture(error:unknown,expectedUrl:string):Promise<boolean>{
 if(!error||typeof error!=='object')return false;
 const value=error as {statusCode?:unknown;code?:unknown;message?:unknown;originalError?:unknown};
 const isObjectMissing=(body:{statusCode?:unknown;code?:unknown;message?:unknown})=>
  (body.statusCode===404||body.statusCode==='404')&&body.code==='NoSuchKey'&&body.message==='Object not found';
 if(isObjectMissing(value))return true;
 // Older storage-js wraps a modern JSON error in StorageUnknownError/Response.
 const response=value.originalError;
 if(!(response instanceof Response)||![400,404].includes(response.status))return false;
 let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 try{
  const actual=new URL(response.url),expected=new URL(expectedUrl);
  if(actual.origin!==expected.origin||actual.pathname!==expected.pathname||actual.username||actual.password
   ||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return false;
  reader=response.clone().body?.getReader();
  if(!reader)return false;
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>2048)return false;chunks.push(chunk.value);}
  const body:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  return !!body&&typeof body==='object'&&isObjectMissing(body);
 }catch{return false;}finally{void reader?.cancel().catch(()=>{});}
}

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
 const db=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(request,options)=>{
  const target=new URL(typeof request==='string'?request:request instanceof URL?request.href:request.url);
  if(target.origin!==cfg.url)throw new Error('Unexpected fixture backend');
  return fetch(request,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});
 }}});
 const payload=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPIy8sDAAKYAUtMZgaRAAAAAElFTkSuQmCC', 'base64'));
 for(const fixture of cfg.ids){
  const {data:org,error:orgError}=await db.from('organizations').select('id,is_agency').eq('id',fixture.id).eq('slug',fixture.slug).single();
  if(orgError||!org||org.is_agency)throw new Error('Synthetic organization verification failed');
  const {data:members,error:memberError}=await db.from('organization_members').select('role,is_active').eq('organization_id',fixture.id);
  if(memberError||members?.length!==1||members[0].role!=='viewer'||members[0].is_active!==true)throw new Error('Expected exactly one synthetic viewer');
 }
 for(const fixture of cfg.ids){
  const path=fixture.id+'/phase02-isolation-fixture.png';
  const {data:existing,error:downloadError}=await db.storage.from('branding').download(path);
  if(existing){
   const bytes=new Uint8Array(await existing.arrayBuffer());
   if(bytes.length!==payload.length||!bytes.every((value,index)=>value===payload[index]))
    throw new Error('Existing private fixture differs: refusing to overwrite '+fixture.slug);
   process.stdout.write('VERIFIED '+fixture.slug+' '+path+'\n');
   continue;
  }
  // Only an actual object-not-found response permits provisioning a new fixture.
  if(!await isMissingFixture(downloadError,cfg.url+'/storage/v1/object/branding/'+path))
   throw new Error('Cannot verify private fixture absence');
  const {error}=await db.storage.from('branding').upload(path,payload,{contentType:'image/png',upsert:false});
  if(error)throw new Error('Storage fixture upload failed');
  process.stdout.write('CREATED '+fixture.slug+' '+path+'\n');
 }
}
if(process.argv[1]&&/upload-phase02-branding-fixtures\.(ts|js)$/.test(process.argv[1]))
 uploadSyntheticBranding(process.env).catch(e=>{process.stderr.write('FAIL: '+(e instanceof Error?e.message:'unknown')+'\n');process.exitCode=1;});
