import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseOrigin,verifyReleaseHttp} from '../scripts/verify-release-http';

const base='http://127.0.0.1:3000';
type Override=(path:string,response:Response)=>Response;
function responses(override:Override=(_path,response)=>response):typeof fetch{
  return async(input,init)=>{
    assert.equal(init?.method,'GET');
    assert.equal(init?.redirect,'manual');
    assert.equal(init?.credentials,'omit');
    const path=new URL(String(input)).pathname;
    const headers={'cache-control':'private, no-store','content-type':'text/html'};
    let response:Response;
    if(path.startsWith('/admin')||path.includes('/reports/'))response=new Response(null,{status:307,headers:{...headers,location:'/login'}});
    else if(path.endsWith('/callback'))response=new Response(null,{status:307,headers:{...headers,location:base+'/auth/reset-password?error=invalid_link','referrer-policy':'no-referrer'}});
    else{
      const html=path==='/login'?'<input type="email"><input type="password">':
        path==='/auth/forgot-password'?'<input type="email">':'<a href="/auth/forgot-password">Solicitar novo link</a>';
      response=new Response(html,{headers});
    }
    return override(path,response);
  };
}

test('smoke only permits local builds and deployment roots without credentials',()=>{
  assert.equal(releaseOrigin(base),base);
  assert.equal(releaseOrigin('https://mediahub.engajeperformance.com.br/'),'https://mediahub.engajeperformance.com.br');
  assert.equal(releaseOrigin('https://engaje-preview.vercel.app'),'https://engaje-preview.vercel.app');
  for(const input of ['http://example.com','https://example.com','http://192.168.1.1','https://user:secret@engaje.vercel.app','https://engaje.vercel.app/path','https://engaje.vercel.app?token=x','https://engaje.vercel.app:444']){
    assert.throws(()=>releaseOrigin(input));
  }
});

test('smoke verifies login, recovery and private routes with anonymous GETs',async()=>{
  assert.equal((await verifyReleaseHttp(base,base,responses())).length,14);
});

test('smoke catches exposed admin pages and cross-origin login redirects',async()=>{
  for(const replacement of [new Response('admin',{headers:{'cache-control':'no-store'}}),new Response(null,{status:307,headers:{'cache-control':'no-store',location:'https://other.vercel.app/login'}})]){
    await assert.rejects(verifyReleaseHttp(base,base,responses((path,response)=>path==='/admin'?replacement:response)),/HTTP smoke failed for \/admin/);
  }
});

test('smoke catches missing cache protection and broken login pages',async()=>{
  for(const headers of [{'content-type':'text/html'},{'content-type':'text/html','cache-control':'no-store'}]){
    await assert.rejects(verifyReleaseHttp(base,base,responses((path,response)=>path==='/login'?new Response('broken',{headers}):response)),/HTTP smoke failed for \/login/);
  }
});

test('smoke catches anonymous password forms and recovery redirects to the wrong origin',async()=>{
  await assert.rejects(verifyReleaseHttp(base,base,responses((path,response)=>path==='/auth/reset-password'?new Response('<input type="password">',{headers:{'cache-control':'no-store','content-type':'text/html'}}):response)),/anonymous visitor/);
  await assert.rejects(verifyReleaseHttp(base,'https://mediahub.engajeperformance.com.br',responses()),/configured origin/);
});

test('smoke requires the configured canonical callback and a referrer policy',async()=>{
  const callback='https://mediahub.engajeperformance.com.br';
  const canonical=responses((path,response)=>{
    if(path.endsWith('/callback'))response.headers.set('location',callback+'/auth/reset-password?error=invalid_link');
    return response;
  });
  assert.equal((await verifyReleaseHttp(base,callback,canonical)).length,14);
  await assert.rejects(verifyReleaseHttp(base,base,responses((path,response)=>{if(path.endsWith('/callback'))response.headers.delete('referrer-policy');return response;})),/referrer/);
});


test('smoke refuses a private audience report exposed to an anonymous visitor',async()=>{
 await assert.rejects(verifyReleaseHttp(base,base,responses((path,response)=>path.includes('/reports/')?new Response('Synthetic report',{headers:{'cache-control':'no-store'}}):response)),/anonymous private access/);
});
