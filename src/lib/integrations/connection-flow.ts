import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {connectionProduct,supportsConnectionMethod,type ConnectionProductId,type ConnectionMethod} from './connection-products';
import {authorizationUrl,exchangeAuthorization,verifyProviderAccess,apiAuthorization,type ProviderEnvironment,type ProviderFetch,type ProviderToken} from './provider-authorization';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const lifetime=600000;
export type ConnectionState={purpose:'connection-hub-v1';id:string;organizationId:string;actorId:string;product:ConnectionProductId;nonce:string;issuedAt:number;expiresAt:number};
export type PendingConnection={id:string;organizationId:string;actorId:string;product:ConnectionProductId;nonce:string;slug:string;status:string};
export type ConnectionStore={create(input:{id:string;organizationId:string;actorId:string;product:ConnectionProductId;method:ConnectionMethod;nonce:string}):Promise<void>;find(id:string,organizationId:string):Promise<PendingConnection|null>;actorAllowed(actorId:string,organizationId:string):Promise<boolean>;consume(pending:PendingConnection):Promise<boolean>;storeToken(id:string,token:ProviderToken):Promise<void>;verified(pending:PendingConnection,method:ConnectionMethod):Promise<void>;failed(id:string,organizationId:string):Promise<void>};
function validState(v:ConnectionState,now:number){return v&&v.purpose==='connection-hub-v1'&&uuid.test(v.id)&&uuid.test(v.organizationId)&&uuid.test(v.actorId)&&uuid.test(v.nonce)&&connectionProduct(v.product)&&Number.isSafeInteger(v.issuedAt)&&Number.isSafeInteger(v.expiresAt)&&v.expiresAt-v.issuedAt===lifetime&&v.issuedAt<=now+30000&&v.expiresAt>now;}
export function signConnectionState(value:ConnectionState,secret:string){if(secret.length<32||!validState(value,value.issuedAt))throw new Error('Não foi possível preparar a autorização.');const body=Buffer.from(JSON.stringify(value)).toString('base64url');return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');}
export function readConnectionState(value:unknown,secret:string,now=Date.now()):ConnectionState{
 if(typeof value!=='string'||value.length>2048||secret.length<32)throw new Error('Autorização inválida ou expirada.');const parts=value.split('.');if(parts.length!==2||!/^[A-Za-z0-9_-]+$/.test(parts[0])||!/^[A-Za-z0-9_-]{43}$/.test(parts[1]))throw new Error('Autorização inválida ou expirada.');
 const expected=createHmac('sha256',secret).update(parts[0]).digest();const signature=Buffer.from(parts[1],'base64url');if(signature.length!==expected.length||!timingSafeEqual(expected,signature))throw new Error('Autorização inválida ou expirada.');
 let parsed:ConnectionState;try{parsed=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));if(!validState(parsed,now))throw Error();}catch{throw new Error('Autorização inválida ou expirada.');}return parsed;
}
export async function beginConnection(input:{organizationId:string;actorId:string;product:unknown;method:unknown;apiToken?:unknown},ports:{store:ConnectionStore;environment:ProviderEnvironment;secret:string;fetcher:ProviderFetch;now?:number}){
 if(!uuid.test(input.organizationId)||!uuid.test(input.actorId))throw new Error('Cliente ou usuário inválido.');const product=connectionProduct(input.product);if(!supportsConnectionMethod(product,input.method))throw new Error('Método indisponível para esta plataforma.');
 if(!await ports.store.actorAllowed(input.actorId,input.organizationId))throw new Error('Acesso administrativo necessário.');
 const id=randomUUID(),nonce=randomUUID(),now=ports.now??Date.now();const state:ConnectionState={purpose:'connection-hub-v1',id,nonce,organizationId:input.organizationId,actorId:input.actorId,product:product.id,issuedAt:now,expiresAt:now+lifetime};
 // Check provider configuration or supplied API access before writing any draft.
 let url:string|undefined,token:ProviderToken|undefined;
 if(input.method==='oauth')url=authorizationUrl(product.id,signConnectionState(state,ports.secret),ports.environment);
 else{token=apiAuthorization(product.id,input.apiToken);await verifyProviderAccess(token,ports.fetcher,ports.environment);}
 if(!await ports.store.actorAllowed(input.actorId,input.organizationId))throw new Error('Acesso revogado durante a autorização.');
 await ports.store.create({id,organizationId:input.organizationId,actorId:input.actorId,product:product.id,method:input.method,nonce});
 if(token){try{await ports.store.storeToken(id,token);await ports.store.verified({id,nonce,organizationId:input.organizationId,actorId:input.actorId,product:product.id,slug:'',status:'pending'},'api');}catch{await ports.store.failed(id,input.organizationId);throw new Error('Não foi possível salvar a autorização.');}}
 return url?{id,url}:{id,authorized:true,message:'Acesso à API validado. A seleção da conta e a coleta permanecem pendentes.'};
}
export async function completeConnection(input:{state:unknown;code:string|null;denied:boolean},ports:{store:ConnectionStore;environment:ProviderEnvironment;secret:string;fetcher:ProviderFetch;now?:number}){
 const state=readConnectionState(input.state,ports.secret,ports.now);
 const pending=await ports.store.find(state.id,state.organizationId);
 if(!pending||pending.organizationId!==state.organizationId||pending.product!==state.product||pending.actorId!==state.actorId||pending.nonce!==state.nonce||pending.status!=='authorizing')throw new Error('Autorização já utilizada ou indisponível.');
 if(!await ports.store.actorAllowed(state.actorId,state.organizationId))throw new Error('Acesso revogado durante a autorização.');
 if(!await ports.store.consume(pending))throw new Error('Autorização já utilizada ou indisponível.');
 try{if(input.denied||!input.code)throw new Error('Autorização não concluída.');const token=await exchangeAuthorization(state.product,input.code,ports.environment,ports.fetcher,ports.now);await verifyProviderAccess(token,ports.fetcher,ports.environment);if(!await ports.store.actorAllowed(state.actorId,state.organizationId))throw new Error('Acesso revogado durante a autorização.');await ports.store.storeToken(state.id,token);await ports.store.verified(pending,'oauth');return {organizationSlug:pending.slug,id:pending.id};}
 catch{await ports.store.failed(pending.id,pending.organizationId);throw new Error('A plataforma não confirmou a autorização. Confira o aplicativo e as permissões e tente novamente.');}
}
