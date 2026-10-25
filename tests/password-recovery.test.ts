import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {loadTypescript} from './helpers/load-typescript';
import * as recovery from '../src/lib/auth/password-recovery';

type State={ok:boolean;message:string};type Action=(previous:State,form:FormData)=>Promise<State>;
const previousOrigin=process.env.APP_ORIGIN;delete process.env.APP_ORIGIN;
after(()=>{if(previousOrigin===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=previousOrigin;});
const initial={ok:false,message:''},password='Synthetic-password-123!';
function form(values:Record<string,string>){const data=new FormData();for(const [key,value] of Object.entries(values))data.set(key,value);return data;}
function actions(options:{user?:boolean;identityError?:boolean;requestError?:boolean;requestThrow?:boolean;updateError?:boolean;signOutError?:boolean;signOutThrow?:boolean}={}){
 const calls:{method:string;args:unknown[]}[]=[],paths:string[]=[];
 const db={auth:{
  resetPasswordForEmail:async(...args:unknown[])=>{calls.push({method:'request',args});if(options.requestThrow)throw new Error('synthetic provider failure');return {error:options.requestError?{code:'synthetic'}:null};},
  getUser:async()=>{calls.push({method:'identity',args:[]});return {data:{user:options.user===false?null:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}},error:options.identityError?{code:'synthetic'}:null};},
  getSession:()=>{throw new Error('Unverified session is forbidden');},
  updateUser:async(...args:unknown[])=>{calls.push({method:'update',args});return {error:options.updateError?{code:'synthetic'}:null};},
  signOut:async(...args:unknown[])=>{calls.push({method:'signout',args});if(options.signOutThrow)throw new Error('synthetic signout failure');return {error:options.signOutError?{code:'synthetic'}:null};},
 },from:()=>{throw new Error('Business records must not change');},rpc:()=>{throw new Error('Membership must not change');}};
 const loaded=loadTypescript<{requestPasswordRecovery:Action;updateRecoveredPassword:Action}>(new URL('../src/app/auth/recovery/actions.ts',import.meta.url),(id,native)=>{
  if(id==='@/lib/supabase/server')return {serverClient:async()=>db};if(id==='@/lib/auth/password-recovery')return recovery;if(id==='next/cache')return {revalidatePath:(path:string)=>paths.push(path)};return native(id);
 });return {...loaded,calls,paths};
}

test('new password rejects short, blank, mismatched and oversized UTF-8 inputs',()=>{
 for(const [value,confirm] of [['short','short'],['            ','            '],[password,'different'],['é'.repeat(37),'é'.repeat(37)]])assert.equal(recovery.validateRecoveryPassword(value,confirm).ok,false);
 assert.deepEqual(recovery.validateRecoveryPassword(password,password),{ok:true});assert.equal(recovery.validateRecoveryPassword('a'.repeat(72),'a'.repeat(72)).ok,true);assert.equal(recovery.validateRecoveryPassword(null,password).ok,false);assert.equal(recovery.validateRecoveryPassword('😀'.repeat(6),'😀'.repeat(6)).ok,false);assert.equal(recovery.validateRecoveryPassword('😀'.repeat(12),'😀'.repeat(12)).ok,true);
});
test('application origin accepts trusted HTTPS and local development only',()=>{
 assert.equal(recovery.passwordRecoveryOrigin(),'https://mediahub.engajeperformance.com.br');assert.equal(recovery.passwordRecoveryOrigin('http://localhost:3000/'),'http://localhost:3000');
 for(const value of ['http://untrusted.example','javascript:alert(1)','https://user:pass@example.test','https://example.test/path','https://example.test/?next=bad','https://example.test/#hash'])assert.throws(()=>recovery.passwordRecoveryOrigin(value));
});
test('recovery requests normalize email and use configured fixed callback',async()=>{
 const app=actions();const result=await app.requestPasswordRecovery(initial,form({email:' SYNTHETIC@EXAMPLE.TEST ',next:'https://untrusted.example',redirectTo:'https://untrusted.example',origin:'https://untrusted.example'}));assert.equal(result.ok,true);assert.deepEqual(app.calls,[{method:'request',args:['synthetic@example.test',{redirectTo:'https://mediahub.engajeperformance.com.br/auth/recovery/callback'}]}]);
});
test('valid addresses receive indistinguishable feedback on provider rejection or transport failure',async()=>{
 const normal=await actions().requestPasswordRecovery(initial,form({email:'synthetic@example.test'}));for(const options of [{requestError:true},{requestThrow:true}])assert.deepEqual(await actions(options).requestPasswordRecovery(initial,form({email:'synthetic@example.test'})),normal);
 assert.doesNotMatch(normal.message,/enviado com sucesso|conta existe/i);
});
test('invalid email and invalid passwords never reach Auth',async()=>{
 const app=actions();assert.equal((await app.requestPasswordRecovery(initial,form({email:'bad'}))).ok,false);assert.equal((await app.updateRecoveredPassword(initial,form({password:'short',confirm:'different'}))).ok,false);assert.equal(app.calls.length,0);
});
test('password update validates user with Auth before changing only that identity',async()=>{
 const app=actions();const result=await app.updateRecoveredPassword(initial,form({password,confirm:password,user_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}));assert.equal(result.ok,true);assert.deepEqual(app.calls,[{method:'identity',args:[]},{method:'update',args:[{password}]},{method:'signout',args:[{scope:'global'}]}]);assert.doesNotMatch(JSON.stringify(result),new RegExp(password));assert.ok(app.paths.includes('/'));
});
test('absent, revoked or unverifiable identity cannot update password',async()=>{
 for(const options of [{user:false},{identityError:true}]){const app=actions(options);assert.equal((await app.updateRecoveredPassword(initial,form({password,confirm:password}))).ok,false);assert.deepEqual(app.calls.map(call=>call.method),['identity']);}
});
test('provider password rejection cannot become a successful reset',async()=>{
 const app=actions({updateError:true});assert.equal((await app.updateRecoveredPassword(initial,form({password,confirm:password}))).ok,false);assert.deepEqual(app.calls.map(call=>call.method),['identity','update']);
});
test('signout failure preserves truthful acknowledgement that password already changed',async()=>{
 for(const options of [{signOutError:true},{signOutThrow:true}]){const app=actions(options);const result=await app.updateRecoveredPassword(initial,form({password,confirm:password}));assert.equal(result.ok,true);assert.match(result.message,/Senha atualizada/);assert.match(result.message,/Não foi possível encerrar/);}
});

function callback(options:{error?:boolean;throws?:boolean;missingSession?:boolean;clearCookie?:boolean}={}){
 let created=0;const codes:string[]=[],cookies:unknown[]=[];
 const {GET}=loadTypescript<{GET:(request:NextRequest)=>Promise<Response>}>(new URL('../src/app/auth/recovery/callback/route.ts',import.meta.url),(id,native)=>{
  if(id==='@/lib/supabase/config')return {supabaseUrl:'https://synthetic.supabase.co',supabaseKey:'synthetic-public-key'};
  if(id==='@/lib/auth/password-recovery')return recovery;
  if(id==='@supabase/ssr')return {createServerClient:(_url:string,_key:string,config:{cookies:{getAll:()=>unknown;setAll:(items:unknown[])=>void}})=>{created++;cookies.push(config.cookies.getAll());return {auth:{exchangeCodeForSession:async(code:string)=>{codes.push(code);config.cookies.setAll([{name:'sb-synthetic-auth-token',value:options.clearCookie?'':'synthetic-session',options:{path:'/',secure:true,sameSite:'lax',maxAge:options.clearCookie?0:3600}}]);if(options.throws)throw new Error('synthetic exchange failure');return {data:{session:options.missingSession?null:{access_token:'synthetic'},user:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}},error:options.error?{code:'synthetic'}:null};}}};}};
  return native(id);
 });return {GET,codes,cookies,created:()=>created};
}

test('PKCE callback preserves cookies, disables caching and ignores external next/Host',async()=>{
 const app=callback();const response=await app.GET(new NextRequest('https://untrusted.example/auth/recovery/callback?code=synthetic-code&next=https://attacker.example',{headers:{cookie:'sb-synthetic-verifier=synthetic-challenge'}}));assert.equal(response.headers.get('location'),'https://mediahub.engajeperformance.com.br/auth/reset-password');assert.match(response.headers.get('set-cookie')??'',/sb-synthetic-auth-token=synthetic-session/);assert.match(response.headers.get('set-cookie')??'',/Secure/);assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');assert.deepEqual(app.codes,['synthetic-code']);assert.equal(app.cookies.length,1);assert.match(JSON.stringify(app.cookies),/synthetic-challenge/);
});
test('missing, malformed or upstream-rejected callback does not create an Auth client',async()=>{
 for(const query of ['', '?error=denied&code=synthetic','?code='+ 'x'.repeat(4097)]){const app=callback();const response=await app.GET(new NextRequest('https://mediahub.engajeperformance.com.br/auth/recovery/callback'+query));assert.match(response.headers.get('location')??'',/error=invalid_link/);assert.equal(app.created(),0);}
});
test('exchange rejection, failure or missing session cannot open the reset form path as success',async()=>{
 for(const options of [{error:true},{throws:true},{missingSession:true}]){const response=await callback(options).GET(new NextRequest('https://mediahub.engajeperformance.com.br/auth/recovery/callback?code=synthetic'));assert.match(response.headers.get('location')??'',/error=invalid_link/);assert.doesNotMatch(response.headers.get('location')??'',/code=synthetic/);assert.equal(response.headers.get('Cache-Control'),'private, no-store');}
});
test('error redirect keeps cookie cleanup from SDK instead of losing it in another response',async()=>{
 const response=await callback({error:true,clearCookie:true}).GET(new NextRequest('https://mediahub.engajeperformance.com.br/auth/recovery/callback?code=synthetic'));assert.match(response.headers.get('set-cookie')??'',/Max-Age=0/);assert.match(response.headers.get('location')??'',/invalid_link/);
});
