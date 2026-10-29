import {createServerClient} from '@supabase/ssr';
import {existingIsolationFixtures} from './verify-production-isolation';
import {isPublicSupabaseKey} from './supabase-public-key';

const backend='https://ityidnsfhgotucgvcifq.supabase.co';
export class HttpAcceptanceError extends Error{}
function requireEvidence(value:unknown,code:string):asserts value{
 if(!value)throw new HttpAcceptanceError(code);
}

/** Only the local app, the canonical domain or this project's own previews receive cookies. */
export function acceptanceOrigin(value:string):string{
 const url=new URL(value);
 const local=url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname);
 const hosted=url.protocol==='https:'&&!url.port&&(url.hostname==='mediahub.engajeperformance.com.br'
  ||/^engaje-social-dashboard-[a-z0-9-]+-ednelfelixmts-projects\.vercel\.app$/.test(url.hostname));
 requireEvidence((local||hosted)&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash,'APP_ORIGIN_REJECTED');
 return url.origin;
}
export function validateHttpAcceptance(env:NodeJS.ProcessEnv){
 requireEvidence(env.MEDIAHUB_HTTP_READONLY_ACK==='YES_AUTHENTICATED_READS','HTTP_ACK_REQUIRED');
 const origin=acceptanceOrigin(env.MEDIAHUB_APP_ORIGIN||'');
 requireEvidence(env.MEDIAHUB_SUPABASE_URL===backend,'BACKEND_REJECTED');
 const key=env.MEDIAHUB_PUBLISHABLE_KEY||'';
 requireEvidence(isPublicSupabaseKey(key),'PUBLIC_KEY_REQUIRED');
 const fixtures=existingIsolationFixtures.map((f,i)=>{
  const label=i===0?'A':'B';
  const email=env['MEDIAHUB_'+label+'_EMAIL']||'',password=env['MEDIAHUB_'+label+'_PASSWORD']||'';
  requireEvidence(email.includes('@')&&email===email.trim()&&!!password,'TWO_FIXTURE_CREDENTIALS_REQUIRED');
  return {...f,label,email,password};
 });
 requireEvidence(fixtures[0].email.toLowerCase()!==fixtures[1].email.toLowerCase(),'DISTINCT_FIXTURES_REQUIRED');
 return {origin,key,fixtures};
}

async function htmlBody(response:Response){
 requireEvidence(response.headers.get('content-type')?.toLowerCase().includes('text/html'),'HTML_RESPONSE_REQUIRED');
 const reader=response.body?.getReader();requireEvidence(reader,'HTML_BODY_REQUIRED');
 const chunks:Uint8Array[]=[];let size=0;
 try{
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;
   requireEvidence(size<=6*1024*1024,'HTML_RESPONSE_TOO_LARGE');chunks.push(part.value);}
  return Buffer.concat(chunks).toString('utf8');
 }finally{await reader.cancel().catch(()=>{});}
}
function htmlEscape(value:string){return value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');}

/** No application writes: Auth creates and revokes only these synthetic local sessions. */
export async function verifyAuthenticatedHttp(env:NodeJS.ProcessEnv){
 const cfg=validateHttpAcceptance(env);
 const clients:ReturnType<typeof createServerClient>[]=[];
 const jars:Map<string,string>[]=[];
 const names:string[]=[];
 const evidence:{actor:string;kind:string;status:number}[]=[];
 let completed=false;
 try{
  // Verify BOTH bound synthetic viewers before sending any authenticated app request.
  for(const fixture of cfg.fixtures){
   const jar=new Map<string,string>();jars.push(jar);
   const client=createServerClient(backend,cfg.key,{
    cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(item=>jar.set(item.name,item.value))},
    auth:{autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:(request,options)=>{
     const url=new URL(typeof request==='string'?request:request instanceof URL?request.href:request.url);
     requireEvidence(url.origin===backend,'AUTH_BACKEND_REJECTED');
     return fetch(request,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});
    }},
   });clients.push(client);
   const login=await client.auth.signInWithPassword({email:fixture.email,password:fixture.password});
   requireEvidence(!login.error&&login.data.user?.id===fixture.userId,'FIXTURE_LOGIN_NOT_PROVEN');
   const org=await client.from('organizations').select('id,name,slug,is_agency').eq('id',fixture.organizationId).eq('slug',fixture.slug).single();
   requireEvidence(!org.error&&org.data?.id===fixture.organizationId&&org.data.slug===fixture.slug
    &&org.data.is_agency===false&&typeof org.data.name==='string'&&org.data.name.length>0,'FIXTURE_ORGANIZATION_NOT_PROVEN');
   const members=await client.from('organization_members').select('user_id,organization_id,role,is_active');
   requireEvidence(!members.error&&members.data?.length===1&&members.data[0].user_id===fixture.userId
    &&members.data[0].organization_id===fixture.organizationId&&members.data[0].role==='viewer'&&members.data[0].is_active===true,'EXCLUSIVE_VIEWER_NOT_PROVEN');
   const admin=await client.rpc('is_super_admin');
   requireEvidence(!admin.error&&admin.data===false,'NON_ADMIN_NOT_PROVEN');
   requireEvidence(jar.size>0,'SSR_COOKIES_NOT_PROVEN');names.push(org.data.name);
  }
  requireEvidence(names[0]!==names[1],'DISTINCT_ORGANIZATION_NAMES_REQUIRED');
  for(let i=0;i<2;i++){
   const own=cfg.fixtures[i],peer=cfg.fixtures[1-i];
   const cases=[
    {kind:'own-dashboard',path:'/'+own.slug+'/overview',status:200},
    {kind:'foreign-dashboard',path:'/'+peer.slug+'/overview',status:404},
    {kind:'agency-denied',path:'/admin',status:307},
    ...['settings/dashboard','settings/integrations','settings/data-quality','settings/branding','sharing']
     .map(path=>({kind:'admin-only-'+path,path:'/'+own.slug+'/'+path,status:404})),
   ];
   for(const probe of cases){
    const response=await fetch(new URL(probe.path,cfg.origin),{method:'GET',redirect:'manual',cache:'no-store',credentials:'omit',
     headers:{Cookie:[...jars[i]].map(([name,value])=>name+'='+value).join('; '),Accept:'text/html'},signal:AbortSignal.timeout(30000)});
    try{
     requireEvidence(response.status===probe.status,'HTTP_STATUS_NOT_PROVEN');
     const cache=response.headers.get('cache-control')||'';
     requireEvidence(/\bprivate\b/i.test(cache)&&/\bno-store\b/i.test(cache),'PRIVATE_NO_STORE_REQUIRED');
     if(probe.status===307){
      const location=response.headers.get('location');
      requireEvidence(!!location&&new URL(location,cfg.origin).href===cfg.origin+'/','ADMIN_REDIRECT_REJECTED');
     }else{
      const html=await htmlBody(response);
      requireEvidence(!html.includes('href="/'+peer.slug+'/')&&!html.includes(htmlEscape(names[1-i])),'FOREIGN_CONTENT_OBSERVED');
      if(probe.status===200){
       requireEvidence(!html.includes('NEXT_HTTP_ERROR_FALLBACK')&&!html.includes('data-next-error')&&!/\\?"digest\\?"\s*:/.test(html),'RENDERED_ERROR_OBSERVED');
       requireEvidence(html.includes('href="/'+own.slug+'/overview"')&&html.includes(htmlEscape(names[i])),'OWN_DASHBOARD_NOT_PROVEN');
       requireEvidence(!/href=["']\/admin(?:[\/"'])/.test(html)
        &&!html.includes('href="/'+own.slug+'/settings/')&&!html.includes('href="/'+own.slug+'/sharing"'),'ADMIN_NAVIGATION_OBSERVED');
      }
     }
     evidence.push({actor:own.label,kind:probe.kind,status:response.status});
    }finally{if(!response.bodyUsed)await response.body?.cancel().catch(()=>{});}
   }
  }
  completed=true;
  return {status:'PASS' as const,origin:cfg.origin,checks:evidence};
 }catch(error){
  if(error instanceof HttpAcceptanceError)throw error;
  throw new HttpAcceptanceError('AUTHENTICATED_HTTP_NOT_PROVEN');
 }finally{
  const cleanup=await Promise.allSettled(clients.map(client=>client.auth.signOut({scope:'local'})));
  jars.forEach(jar=>jar.clear());
  if(completed&&cleanup.some(result=>result.status==='rejected'||result.value.error))throw new HttpAcceptanceError('SESSION_CLEANUP_NOT_PROVEN');
 }
}

if(process.argv[1]&&/verify-authenticated-http\.(ts|js)$/.test(process.argv[1])){
 verifyAuthenticatedHttp(process.env).then(result=>console.log('PASS: '+result.checks.length+' authenticated SSR HTTP checks; browser UX not tested'))
  .catch(error=>{console.error('NOT PROVEN: '+(error instanceof HttpAcceptanceError?error.message:'CONFIGURATION_REJECTED'));process.exitCode=1;});
}
