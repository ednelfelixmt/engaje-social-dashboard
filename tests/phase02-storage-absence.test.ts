import test from 'node:test';
import assert from 'node:assert/strict';
import {isMissingFixture} from '../scripts/upload-phase02-branding-fixtures';

const target='https://ityidnsfhgotucgvcifq.supabase.co/storage/v1/object/branding/synthetic.png';
function response(body:unknown,status:number,url=target){const r=new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:url});return r;}
const missing={statusCode:'404',code:'NoSuchKey',message:'Object not found'};
test('fixture uploader recognizes the observed modern error wrapped by the installed SDK',async()=>{
 for(const status of [400,404]){
  const reply=response(missing,status);
  assert.equal(await isMissingFixture({originalError:reply},target),true);
  assert.equal(reply.bodyUsed,false);
 }
 assert.equal(await isMissingFixture(missing,target),true);
 assert.equal(await isMissingFixture({...missing,statusCode:404},target),true);
});

test('fixture uploader never treats authorization, bucket or transient errors as object absence',async()=>{
 for(const body of [null,{},'404', {...missing,code:'NoSuchBucket'}, {...missing,code:'InvalidJWT'},
  {...missing,statusCode:'403'}, {...missing,message:'permission denied'}, {message:'contains 404 NoSuchKey'}]){
  assert.equal(await isMissingFixture(body,target),false);
  assert.equal(await isMissingFixture({originalError:response(body,400)},target),false);
 }
 for(const status of [401,403,429,500,503])
  assert.equal(await isMissingFixture({originalError:response(missing,status)},target),false);
 for(const error of [undefined,null,new Error('404'),{originalError:new Response('not JSON',{status:400})},
  {originalError:new Response(null,{status:404})},{originalError:{status:400,json:()=>missing}}])
  assert.equal(await isMissingFixture(error,target),false);
});

test('wrapped absence requires the expected object URL, JSON and bounded readable body',async()=>{
 for(const r of [response(missing,400,'https://other.example.test/'),response(missing,400,target+'-other'),response(missing,400,target.replace('/branding/','/other/')),response({...missing,padding:'x'.repeat(3000)},400)])assert.equal(await isMissingFixture({originalError:r},target),false);
 const html=response(missing,400);html.headers.set('content-type','text/html');assert.equal(await isMissingFixture({originalError:html},target),false);
 const consumed=response(missing,400);await consumed.text();assert.equal(await isMissingFixture({originalError:consumed},target),false);
});
