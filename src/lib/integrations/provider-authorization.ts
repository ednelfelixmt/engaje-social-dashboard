import {connectionProduct,type ConnectionProductId} from './connection-products';
export type ProviderToken={version:1;product:ConnectionProductId;method:'oauth'|'api';accessToken:string;refreshToken?:string;expiresAt?:number};
export type ProviderEnvironment=Record<string,string|undefined>;
export type ProviderFetch=(url:string,init:RequestInit)=>Promise<Response>;
const callback='https://mediahub.engajeperformance.com.br/api/integrations/oauth/callback';
export const integrationCallbackUrl=callback;
const oauth={
 google_ads:{authorize:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',scope:'https://www.googleapis.com/auth/adwords',json:false},
 rd_station_crm:{authorize:'https://accounts.rdstation.com/oauth/authorize',token:'https://api.rd.services/oauth2/token',scope:'',json:false},
 rd_station_marketing:{authorize:'https://api.rd.services/auth/dialog',token:'https://api.rd.services/auth/token',scope:'',json:true},
 hubspot:{authorize:'https://app.hubspot.com/oauth/authorize',token:'https://api.hubapi.com/oauth/2026-03/token',scope:'oauth crm.objects.deals.read crm.schemas.deals.read crm.objects.contacts.read',json:false},
};
function oauthConfig(product:ConnectionProductId,environment:ProviderEnvironment){
 if(product==='windsor')throw new Error('O Windsor.ai usa chave de API neste conector.');
 const definition=connectionProduct(product),clientId=environment[definition.credentialPrefix+'_CLIENT_ID']?.trim(),clientSecret=environment[definition.credentialPrefix+'_CLIENT_SECRET']?.trim();
 if(!clientId||!clientSecret)throw new Error('OAuth ainda não configurado para '+definition.name+'. Configure o aplicativo da agência e a URL de retorno indicada.');
 return {...oauth[product],clientId,clientSecret};
}
export function authorizationUrl(product:ConnectionProductId,state:string,environment:ProviderEnvironment){
 const c=oauthConfig(product,environment),url=new URL(c.authorize);url.searchParams.set('client_id',c.clientId);url.searchParams.set('redirect_uri',callback);url.searchParams.set('response_type','code');url.searchParams.set('state',state);
 if(c.scope)url.searchParams.set('scope',c.scope);
 if(product==='google_ads'){url.searchParams.set('access_type','offline');url.searchParams.set('prompt','consent');url.searchParams.set('include_granted_scopes','false');}
 return url.href;
}
async function jsonRequest(url:string,init:RequestInit,fetcher:ProviderFetch){
 let response:Response;try{response=await fetcher(url,{...init,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});}catch{throw new Error('Não foi possível consultar a plataforma. Tente novamente.');}
 if(!response.ok)throw new Error(response.status===401||response.status===403?'A plataforma recusou a autorização ou as permissões solicitadas.':'A plataforma não concluiu a validação. Tente novamente.');
 let result:unknown;try{result=await response.json();}catch{throw new Error('Resposta inválida da plataforma.');}
 if(!result||typeof result!=='object'||('error' in result)||('error_type' in result))throw new Error('A plataforma não confirmou a autorização.');
 return result;
}
function tokenResult(product:ConnectionProductId,result:unknown,now:number,previous?:ProviderToken):ProviderToken{
 const r=result as Record<string,unknown>;if(typeof r.access_token!=='string'||r.access_token.length<8||typeof r.expires_in!=='number'||!Number.isSafeInteger(r.expires_in)||r.expires_in<=0)throw new Error('A plataforma não retornou uma autorização renovável válida.');
 const rotated=typeof r.refresh_token==='string'&&r.refresh_token.length>=8?r.refresh_token:undefined;
 if(product==='rd_station_crm'&&!rotated)throw new Error('O CRM não retornou a credencial de renovação atualizada. Autorize o acesso novamente.');
 const refresh=rotated??previous?.refreshToken;if(!refresh)throw new Error('A plataforma não retornou a autorização para renovação. Autorize o acesso novamente.');
 const expiresAt=now+r.expires_in*1000;if(!Number.isSafeInteger(expiresAt))throw new Error('Prazo de autorização inválido.');
 return {version:1,product,method:'oauth',accessToken:r.access_token,refreshToken:refresh,expiresAt};
}
export async function exchangeAuthorization(product:ConnectionProductId,code:string,environment:ProviderEnvironment,fetcher:ProviderFetch,now=Date.now()){
 if(!code||code.length>4096)throw new Error('Código de autorização inválido.');const c=oauthConfig(product,environment);
 const fields={client_id:c.clientId,client_secret:c.clientSecret,code,redirect_uri:callback,grant_type:'authorization_code'};
 const endpoint=c.json?c.token+'?token_by=code':c.token;
 const result=await jsonRequest(endpoint,{method:'POST',headers:{'Content-Type':c.json?'application/json':'application/x-www-form-urlencoded'},body:c.json?JSON.stringify(fields):new URLSearchParams(fields).toString()},fetcher);
 return tokenResult(product,result,now);
}
export async function refreshAuthorization(previous:ProviderToken,environment:ProviderEnvironment,fetcher:ProviderFetch,now=Date.now()){
 if(previous.method!=='oauth'||!previous.refreshToken)throw new Error('Esta autorização precisa ser renovada no provedor.');const c=oauthConfig(previous.product,environment);
 const fields={client_id:c.clientId,client_secret:c.clientSecret,refresh_token:previous.refreshToken,grant_type:'refresh_token'};
 const result=await jsonRequest(c.json?c.token+'?token_by=refresh_token':c.token,{method:'POST',headers:{'Content-Type':c.json?'application/json':'application/x-www-form-urlencoded'},body:c.json?JSON.stringify(fields):new URLSearchParams(fields).toString()},fetcher);
 return tokenResult(previous.product,result,now,previous);
}
export function apiAuthorization(product:ConnectionProductId,value:unknown):ProviderToken{
 const p=connectionProduct(product);if(!p.methods.includes('api'))throw new Error('Esta plataforma exige OAuth.');
 if(typeof value!=='string'||value.trim().length<8||value.trim().length>8192||/[\r\n\u0000]/.test(value))throw new Error('Informe uma credencial de API válida.');return{version:1,product,method:'api',accessToken:value.trim()};
}
/** Fixed read-only probes validate API access, not account ownership or ingestion. */
export async function verifyProviderAccess(token:ProviderToken,fetcher:ProviderFetch,environment:ProviderEnvironment={}){
 let url:string;const headers:Record<string,string>={Accept:'application/json'};
 switch(token.product){
 case 'google_ads':{const version=environment.GOOGLE_ADS_API_VERSION||'v24';if(!/^v[0-9]{1,2}$/.test(version))throw new Error('Versão Google Ads inválida.');url='https://googleads.googleapis.com/'+version+'/customers:listAccessibleCustomers';break;}
 case 'rd_station_crm':url='https://api.rd.services/crm/v2/pipelines?page[number]=1&page[size]=1';break;
 case 'rd_station_marketing':url='https://api.rd.services/platform/embeddables?page=1&page_size=1';break;
 case 'hubspot':url='https://api.hubapi.com/crm/v3/pipelines/deals';break;
 case 'windsor':{const endpoint=new URL('https://connectors.windsor.ai/google_ads');endpoint.searchParams.set('api_key',token.accessToken);endpoint.searchParams.set('fields','account_id');endpoint.searchParams.set('date_preset','last_7d');url=endpoint.href;break;}
 }
 if(token.product!=='windsor')headers.Authorization='Bearer '+token.accessToken;
 const result=await jsonRequest(url,{method:'GET',headers},fetcher);
 if(token.product==='google_ads'&&!Array.isArray((result as Record<string,unknown>).resourceNames))throw new Error('O Google não confirmou a lista de contas.');
 return true;
}
