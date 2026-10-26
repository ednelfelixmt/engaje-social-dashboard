import {pathToFileURL} from 'node:url';

const productionHost='mediahub.engajeperformance.com.br';

/** Only the local build or an Engaje/Vercel HTTPS deployment can be probed. */
export function releaseOrigin(input:string):string{
  const url=new URL(input);
  const local=url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname);
  const deployed=url.protocol==='https:'&&!url.port&&
    (url.hostname===productionHost||url.hostname.endsWith('.vercel.app'));
  if((!local&&!deployed)||url.username||url.password||url.pathname!=='/'||url.search||url.hash){
    throw new Error('Expected a local build or Engaje/Vercel deployment origin');
  }
  return url.origin;
}

function check(value:unknown,path:string,message:string):asserts value{
  if(!value)throw new Error(`HTTP smoke failed for ${path}: ${message}`);
}

/** Anonymous GETs only: no cookies, passwords, e-mails, mutations or real fixtures. */
export async function verifyReleaseHttp(baseInput:string,callbackInput=baseInput,request:typeof fetch=fetch){
  const base=releaseOrigin(baseInput),callback=releaseOrigin(callbackInput);
  const results:{path:string;status:number}[]=[];
  for(const path of ['/login','/auth/forgot-password','/auth/reset-password','/admin','/admin/organizations','/auth/recovery/callback']){
    const response=await request(new URL(path,base),{
      method:'GET',redirect:'manual',cache:'no-store',credentials:'omit',
      headers:{Accept:'text/html'},signal:AbortSignal.timeout(15000),
    });
    check(/\bno-store\b/i.test(response.headers.get('cache-control')??''),path,'response must not be cached');
    if(path.startsWith('/admin')){
      check(response.status===307,path,'anonymous admin access must redirect');
      const location=response.headers.get('location');
      check(location&&new URL(location,base).href===new URL('/login',base).href,path,'redirect must point to this app login');
    }else if(path==='/auth/recovery/callback'){
      check(response.status===307,path,'missing recovery code must redirect');
      check(response.headers.get('location')===new URL('/auth/reset-password?error=invalid_link',callback).href,path,'missing code must fail closed at the configured origin');
      check(response.headers.get('referrer-policy')==='no-referrer',path,'recovery redirects must not send a referrer');
    }else{
      check(response.status===200,path,'page must render successfully');
      check(response.headers.get('content-type')?.includes('text/html'),path,'page must return HTML');
      const html=await response.text();
      const email=/<input\b[^>]*\btype=["']email["']/i.test(html);
      const password=/<input\b[^>]*\btype=["']password["']/i.test(html);
      if(path==='/login')check(email&&password,path,'login fields missing');
      if(path==='/auth/forgot-password')check(email&&!password,path,'recovery must request only the e-mail');
      if(path==='/auth/reset-password'){
        check(!password,path,'anonymous visitor must not receive a password form');
        check(/href=["']\/auth\/forgot-password["']/i.test(html),path,'invalid recovery page must offer a new link');
      }
    }
    if(!response.bodyUsed)await response.body?.cancel();
    results.push({path,status:response.status});
  }
  return results;
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
  const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3000';
  verifyReleaseHttp(base,process.env.SMOKE_CALLBACK_ORIGIN||process.env.APP_ORIGIN||base)
    .then(results=>{for(const result of results)console.log(`PASS ${result.path}: ${result.status}`);})
    .catch(error=>{console.error('FAIL: '+(error instanceof Error?error.message:'anonymous HTTP smoke checks did not pass'));process.exitCode=1;});
}
