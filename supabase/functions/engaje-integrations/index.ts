import {createClient} from 'npm:@supabase/supabase-js@2.76.1';
const base=Deno.env.get('SUPABASE_URL')!;
const service=createClient(base,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const origin='https://mediahub.engajeperformance.com.br';
const callback=base+'/functions/v1/meta-auth/callback';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,GET,OPTIONS'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
const graphVersion=Deno.env.get('META_GRAPH_VERSION')||'v26.0';
const metaId=Deno.env.get('META_APP_ID'),metaSecret=Deno.env.get('META_APP_SECRET');
const advancedInsights=Deno.env.get('META_ADVANCED_INSIGHTS_ENABLED')==='true';
const windsorKey=Deno.env.get('WINDSOR_API_KEY');
type Integration={id:string;organization_id:string;provider:string;external_account_id:string;config:Record<string,unknown>;status:string;account_name:string};
async function check<T>(result:{data:T;error:unknown}):Promise<T>{if(result.error)throw new Error('Falha ao gravar no Supabase.');return result.data;}
async function hmac(text:string){if(!metaSecret)throw new Error('Configure META_APP_SECRET.');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(metaSecret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(text)))).map(n=>n.toString(16).padStart(2,'0')).join('');}
async function sha256(text:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(n=>n.toString(16).padStart(2,'0')).join('');}
function randomKey(){const bytes=crypto.getRandomValues(new Uint8Array(32));return Array.from(bytes).map(n=>n.toString(16).padStart(2,'0')).join('');}
async function graph(path:string,token:string|null,params:Record<string,string>={},stage='consulta'){const url=new URL('https://graph.facebook.com/'+graphVersion+'/'+path);const signedParams=token?{...params,appsecret_proof:await hmac(token)}:params;for(const [k,v]of Object.entries(signedParams))url.searchParams.set(k,v);const headers:Record<string,string>={'Accept':'application/json'};if(token)headers.Authorization='Bearer '+token;const r=await fetch(url,{headers,signal:AbortSignal.timeout(25000)});const body=await r.json().catch(()=>({}));if(!r.ok||body.error){const code=String(body.error?.code||r.status),subcode=body.error?.error_subcode?'/'+String(body.error.error_subcode):'';const detail=String(body.error?.message||'Resposta inválida da Meta.').replace(/[\r\n]+/g,' ').slice(0,180);console.error('[meta-auth]',{stage,status:r.status,code,subcode:body.error?.error_subcode||null,type:body.error?.type||null,message:detail});throw new Error('Meta recusou '+stage+' (código '+code+subcode+'): '+detail);}return body;}
async function pages(path:string,token:string,params:Record<string,string>={}){const result:Record<string,any>[]=[];let after:string|undefined;for(let page=0;page<50;page++){const r=await graph(path,token,{...params,limit:'100',...(after?{after}:{})});result.push(...(r.data||[]));if(!r.paging?.next)return result;after=r.paging.cursors?.after;if(!after)throw new Error('A paginação da Meta não pôde ser concluída.');}throw new Error('Volume excede a sincronização interativa; reduza o período.');}
async function recentPages(path:string,token:string,params:Record<string,string>,cutoff:Date,maxItems=100){const result:Record<string,any>[]=[];let after:string|undefined;for(let page=0;page<10;page++){const response=await graph(path,token,{...params,limit:'100',...(after?{after}:{})},'a leitura das publicações');const batch:Record<string,any>[]=response.data||[];let reachedCutoff=false;for(const item of batch){const published=new Date(item.timestamp||item.created_time||0);if(Number.isNaN(published.getTime())||published<cutoff){reachedCutoff=true;continue;}result.push(item);if(result.length>=maxItems)return result;}if(reachedCutoff||!response.paging?.next)return result;after=response.paging.cursors?.after;if(!after)return result;}return result;}
async function concurrentMap<T,R>(items:T[],limit:number,handler:(item:T,index:number)=>Promise<R>){const output=new Array<R>(items.length);let cursor=0;const workers=Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const index=cursor++;if(index>=items.length)return;output[index]=await handler(items[index],index);}});await Promise.all(workers);return output;}
function insightValues(payload:any){const values:Record<string,number>={};for(const metric of payload?.data||[]){const raw=metric.values?.at?.(-1)?.value??metric.value;if(typeof raw==='number'&&Number.isFinite(raw))values[String(metric.name)]=raw;else if(raw&&typeof raw==='object'){for(const [key,value]of Object.entries(raw))if(typeof value==='number'&&Number.isFinite(value))values[key]=value;}}return values;}
async function organicInsights(postId:string,token:string,instagram:boolean){const metric=instagram?'reach,saved,shares,total_interactions,views':'post_impressions,post_impressions_unique,post_clicks,post_video_views';try{return {values:insightValues(await graph(postId+'/insights',token,{metric},'a leitura dos insights orgânicos')),error:false};}catch(error){console.warn('[organic-insights]',{post_id:postId,platform:instagram?'instagram':'facebook',message:error instanceof Error?error.message:'Falha desconhecida'});return {values:{},error:true};}}
async function allowed(req:Request,org:string){const auth=req.headers.get('Authorization');if(!auth)throw new Error('Sessão necessária.');const client=createClient(base,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});const {data:{user}}=await client.auth.getUser();if(!user)throw new Error('Sessão expirada.');const {data:superAdmin}=await client.rpc('is_super_admin');if(!superAdmin){const {data:member}=await service.from('organization_members').select('role,is_active,organizations!inner(status)').eq('organization_id',org).eq('user_id',user.id).single();if(!member?.is_active||!['client_admin','editor'].includes(member.role)||(member.organizations as any)?.status!=='active')throw new Error('Sem permissão para gerenciar integrações.');}return user;}
async function setToken(id:string,token:string){await check(await service.rpc('store_integration_token',{p_id:id,p_token:token}));}
function actionValue(actions:any[]|undefined,...keys:string[]):number|null{if(!actions)return null;for(const key of keys){const item=actions.find(a=>a.action_type===key);if(item)return Number(item.value);}return 0;}
function numeric(value:unknown){const result=Number(value);return Number.isFinite(result)?result:0;}
function isoDate(date:Date){return date.toISOString().slice(0,10);}
async function syncWindsor(i:Integration){
 const source=String(i.config.source_platform||'');
 if(source!=='google_ads')throw new Error('A importação Windsor para esta fonte será ativada após definir o mapeamento de campos. Use Google Ads nesta etapa.');
 if(!windsorKey)throw new Error('Configure WINDSOR_API_KEY nos Secrets do Supabase.');
 const to=new Date(),from=new Date(to);from.setUTCDate(from.getUTCDate()-30);
 const endpoint=new URL('https://connectors.windsor.ai/google_ads');
 endpoint.searchParams.set('api_key',windsorKey);
 endpoint.searchParams.set('date_from',isoDate(from));
 endpoint.searchParams.set('date_to',isoDate(to));
 endpoint.searchParams.set('fields','date,account_id,account_name,campaign_id,campaign,spend,impressions,clicks,conversions,conversion_value,currency');
 const response=await fetch(endpoint,{signal:AbortSignal.timeout(30000)});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error('Windsor recusou a consulta (HTTP '+response.status+').');
 const received=Array.isArray(payload.data)?payload.data:Array.isArray(payload)?payload:[];
 const accountId=String(i.config.source_account_id||i.external_account_id).trim();
 const sourceRows=received.filter((row:any)=>!accountId||String(row.account_id||'').trim()===accountId);
 const facts=sourceRows.map((row:any)=>{
  const campaignId=String(row.campaign_id||row.campaign||'sem-campanha');
  return {organization_id:i.organization_id,integration_id:i.id,platform:'google_ads',metric_date:String(row.date||isoDate(to)).slice(0,10),currency:String(row.currency||i.config.currency||'BRL').toUpperCase().slice(0,3),account_id:String(row.account_id||accountId),campaign_id:campaignId,campaign_name:String(row.campaign||row.campaign_name||campaignId),adset_id:null,ad_id:campaignId+':aggregate',spend:numeric(row.spend),revenue:row.conversion_value==null?null:numeric(row.conversion_value),impressions:numeric(row.impressions),clicks:numeric(row.clicks),page_views:null,leads:null,message_leads:null,checkouts:null,purchases:numeric(row.conversions),attribution_window:'windsor_source',synced_at:new Date().toISOString()};
 });
 for(let n=0;n<facts.length;n+=200)await check(await service.from('metrics_ads').upsert(facts.slice(n,n+200),{onConflict:'organization_id,platform,account_id,campaign_id,ad_id,metric_date,currency'}));
 await check(await service.from('integrations').update({status:'connected',is_enabled:true,last_synced_at:new Date().toISOString(),last_error:null}).eq('id',i.id));
 return {message:`Sincronização Windsor concluída: ${facts.length} métricas do Google Ads gravadas no Supabase.`,rows:facts.length,creatives:0};
}
async function sync(i:Integration){if(i.provider==='windsor')return syncWindsor(i);const token=await check(await service.rpc('integration_token',{p_id:i.id}));if(!token)throw new Error('Conta sem autorização. Reconecte.');let rows=0,creativeCount=0;
 if(i.provider==='meta_ads'){
  const data=await pages(i.external_account_id+'/insights',token,{level:'ad',date_preset:'last_30d',time_increment:'1',action_attribution_windows:'["7d_click"]',fields:'account_id,account_currency,campaign_id,campaign_name,adset_id,ad_id,date_start,spend,impressions,clicks,actions,action_values'});
  const facts=data.map(d=>{
   const formLeads=actionValue(d.actions,'lead','onsite_conversion.lead_grouped','offsite_conversion.fb_pixel_lead');
   // A API pode devolver mais de um alias para a mesma conversa. actionValue usa o
   // primeiro alias encontrado, evitando duplicar a mesma ação no total.
   const messageLeads=actionValue(d.actions,'onsite_conversion.messaging_conversation_started_7d','messaging_conversation_started_7d','onsite_conversion.total_messaging_connection','onsite_conversion.messaging_first_reply');
   const totalLeads=d.actions?(formLeads??0)+(messageLeads??0):null;
   return {organization_id:i.organization_id,integration_id:i.id,platform:'meta_ads',metric_date:d.date_start,currency:d.account_currency,account_id:String(d.account_id),campaign_id:String(d.campaign_id),campaign_name:d.campaign_name,adset_id:d.adset_id,ad_id:String(d.ad_id),spend:Number(d.spend),revenue:actionValue(d.action_values,'omni_purchase','purchase','offsite_conversion.fb_pixel_purchase'),impressions:d.impressions==null?null:Number(d.impressions),clicks:d.clicks==null?null:Number(d.clicks),page_views:actionValue(d.actions,'landing_page_view'),leads:totalLeads,message_leads:messageLeads,checkouts:actionValue(d.actions,'initiate_checkout','offsite_conversion.fb_pixel_initiate_checkout'),purchases:actionValue(d.actions,'omni_purchase','purchase','offsite_conversion.fb_pixel_purchase'),attribution_window:'7d_click',synced_at:new Date().toISOString()};
  });
  for(let n=0;n<facts.length;n+=200){await check(await service.from('metrics_ads').upsert(facts.slice(n,n+200),{onConflict:'organization_id,platform,account_id,campaign_id,ad_id,metric_date,currency'}));rows+=facts.slice(n,n+200).length;}
  const ads=await pages(i.external_account_id+'/ads',token,{fields:'id,name,created_time,campaign_id,creative{id,thumbnail_url,image_url,body,video_id}'});
  for(const a of ads){if(!a.creative)continue;await check(await service.from('creatives').upsert({organization_id:i.organization_id,integration_id:i.id,platform:'meta_ads',account_id:i.external_account_id,external_id:a.id,ad_id:a.id,campaign_id:a.campaign_id,kind:a.creative.video_id?'video':'image',caption:a.creative.body||a.name,thumbnail_url:a.creative.thumbnail_url,media_url:a.creative.image_url,published_at:a.created_time,synced_at:new Date().toISOString()},{onConflict:'organization_id,platform,account_id,external_id'}));creativeCount++;}
 }else if(i.provider==='instagram_organic'||i.provider==='facebook_organic'){
  const ig=i.provider==='instagram_organic',cutoff=new Date();cutoff.setUTCDate(cutoff.getUTCDate()-30);const since=String(Math.floor(cutoff.getTime()/1000));
  const fields=ig?'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count':'id,message,full_picture,permalink_url,created_time,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)';
  const posts=await recentPages(i.external_account_id+(ig?'/media':'/published_posts'),token,{fields,since},cutoff,100);
  const insights=await concurrentMap(posts,5,p=>organicInsights(String(p.id),token,ig));const syncedAt=new Date().toISOString();
  const creativeRows=posts.map((p,index)=>{const advanced=insights[index].values;const basic=ig?{likes:p.like_count??null,comments:p.comments_count??null}:{likes:p.reactions?.summary?.total_count??null,comments:p.comments?.summary?.total_count??null,shares:p.shares?.count??null};return {organization_id:i.organization_id,integration_id:i.id,platform:i.provider,account_id:i.external_account_id,external_id:String(p.id),kind:p.media_type==='VIDEO'?'video':p.media_type==='CAROUSEL_ALBUM'?'carousel':'image',caption:p.caption||p.message||null,lifetime_metrics:{...basic,...advanced},thumbnail_url:p.thumbnail_url||p.full_picture||p.media_url||null,media_url:p.media_url||p.full_picture||null,permalink:p.permalink||p.permalink_url,published_at:p.timestamp||p.created_time,synced_at:syncedAt};});
  let savedCreatives:any[]=[];if(creativeRows.length){const saved=await service.from('creatives').upsert(creativeRows,{onConflict:'organization_id,platform,account_id,external_id'}).select('id,external_id');savedCreatives=await check(saved);creativeCount=savedCreatives.length;}
  const ids=new Map(savedCreatives.map(c=>[String(c.external_id),String(c.id)]));const metricRows=posts.flatMap((p,index)=>{const creativeId=ids.get(String(p.id));if(!creativeId)return [];const values=insights[index].values;const published=String(p.timestamp||p.created_time||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(published))return [];return [{organization_id:i.organization_id,integration_id:i.id,creative_id:creativeId,metric_date:published,platform:i.provider,impressions:ig?(values.views??null):(values.post_impressions??null),reach:ig?(values.reach??null):(values.post_impressions_unique??null),clicks:ig?null:(values.post_clicks??null),page_views:null,likes:ig?numeric(p.like_count):numeric(p.reactions?.summary?.total_count),comments:ig?numeric(p.comments_count):numeric(p.comments?.summary?.total_count),shares:ig?(values.shares??null):numeric(p.shares?.count),saves:ig?(values.saved??null):null,video_views:ig?(p.media_type==='VIDEO'?(values.views??null):null):(values.post_video_views??null),synced_at:syncedAt}];});
  if(metricRows.length){for(let n=0;n<metricRows.length;n+=200)await check(await service.from('metrics_organic').upsert(metricRows.slice(n,n+200),{onConflict:'organization_id,creative_id,metric_date'}));rows=metricRows.length;}
  const failed=insights.filter(item=>item.error).length;if(failed)console.warn('[organic-sync]',{integration_id:i.id,posts:posts.length,advanced_insight_failures:failed});
 }else throw new Error('Este provedor ainda precisa do adaptador e das credenciais de API.');
 await check(await service.from('integrations').update({status:'connected',is_enabled:true,last_synced_at:new Date().toISOString(),last_error:null}).eq('id',i.id));
 return {message:`Sincronização concluída: ${rows} métricas e ${creativeCount} criativos gravados no Supabase.`,rows,creatives:creativeCount};
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});const url=new URL(req.url);let activeId:string|undefined;
 try{
  if(req.method==='GET'&&url.pathname.endsWith('/callback')){
   const state=url.searchParams.get('state')||'';const [id,expiry,nonce,signature]=state.split('.');const signed=[id,expiry,nonce].join('.');if(!signature||signature!==await hmac(signed)||Number(expiry)<Date.now())throw new Error('Autorização expirada.');
   const {data:pending,error}=await service.from('integrations').update({status:'syncing'}).eq('id',id).eq('status','pending').select('*').single();if(error||!pending||pending.config.nonce!==nonce)throw new Error('Autorização já utilizada.');
   activeId=id;const actorId=pending.config.user_id;if(!actorId)throw new Error('Reconecte para renovar a autorização.');const {data:members}=await service.from('organization_members').select('organization_id,role,is_active,organizations!inner(status,is_agency)').eq('user_id',actorId).eq('is_active',true);const authorized=members?.some((m:any)=>m.organizations.status==='active'&&((m.organizations.is_agency&&m.role==='super_admin')||(m.organization_id===pending.organization_id&&['client_admin','editor'].includes(m.role))));if(!authorized)throw new Error('Permissão revogada durante a autorização.');const {data:org}=await service.from('organizations').select('slug,status').eq('id',pending.organization_id).single();if(!org||org.status!=='active')throw new Error('Cliente indisponível.');
   if(url.searchParams.get('error'))throw new Error('Autorização recusada.');const code=url.searchParams.get('code');if(!code)throw new Error('Código ausente.');
   const result=await graph('oauth/access_token',null,{client_id:metaId!,client_secret:metaSecret!,redirect_uri:callback,code},'a troca do código OAuth');let token=result.access_token;if(!token)throw new Error('Token não recebido.');
   const long=await graph('oauth/access_token',null,{grant_type:'fb_exchange_token',client_id:metaId!,client_secret:metaSecret!,fb_exchange_token:token},'a renovação do token');token=long.access_token||token;
   const ads=pending.provider==='meta_ads';const instagram=pending.provider==='instagram_organic';const accountFields=ads?'id,name,currency':instagram?'id,name,access_token,instagram_business_account{id,username}':'id,name,access_token';const accounts=await pages(ads?'me/adaccounts':'me/accounts',token,{fields:accountFields});
   let imported=0;for(const a of accounts){const ig=pending.provider==='instagram_organic';if(ig&&!a.instagram_business_account)continue;const accountId=ig?a.instagram_business_account.id:a.id;const name=ig?a.instagram_business_account.username:a.name;const saved=await check(await service.from('integrations').upsert({organization_id:pending.organization_id,provider:pending.provider,external_account_id:accountId,account_name:name,status:'connected',is_enabled:false,config:{currency:a.currency||null},last_error:null},{onConflict:'organization_id,provider,external_account_id'}).select('id').single());await setToken(saved.id,ads?token:a.access_token||token);imported++;}
   await check(await service.from('integrations').delete().eq('id',id));
   return Response.redirect(origin+'/'+org.slug+'/settings/integrations?connected='+imported,303);
  }
  if(req.method!=='POST')return json({message:'Método inválido.'},405);
  const body=await req.json();const org=String(body.organizationId||'');if(!/^[0-9a-f-]{36}$/.test(org))throw new Error('Cliente inválido.');const actor=await allowed(req,org);
  if(body.action==='diagnose'){
   const {data:integrations,error:integrationsError}=await service.from('integrations').select('id,provider,external_account_id,status,is_enabled,config').eq('organization_id',org);
   if(integrationsError)throw new Error('Não foi possível concluir o diagnóstico.');
   const list=integrations||[];
   const accounts=(providers:string[])=>list.filter((item:any)=>providers.includes(item.provider)&&!['pending:','foundation:','catalog:'].some(prefix=>String(item.external_account_id||'').startsWith(prefix)));
   const byProviders=(providers:string[])=>list.filter((item:any)=>providers.includes(item.provider));
   const metaAccounts=accounts(['meta_ads','facebook_organic','instagram_organic']);
   const windsorAccounts=accounts(['windsor']);
   const stractAccounts=accounts(['stract']);
   const stractSources=byProviders(['stract']);
   const stractEndpoint=stractSources.some((item:any)=>typeof item.config?.ingest_key_hash==='string');
   const crmSources=byProviders(['hubspot','rd_station','generic_crm']);
   const crmEndpoint=crmSources.some((item:any)=>item.provider==='generic_crm'&&typeof item.config?.ingest_key_hash==='string');
   const count=async(table:string,ids:string[])=>{if(!ids.length)return 0;const {count,error}=await service.from(table).select('id',{head:true,count:'exact'}).eq('organization_id',org).in('integration_id',ids);if(error)throw new Error('Não foi possível contar os dados importados.');return count||0;};
   const metaIds=metaAccounts.map((item:any)=>item.id),windsorIds=windsorAccounts.map((item:any)=>item.id),stractIds=stractSources.map((item:any)=>item.id),crmIds=crmSources.map((item:any)=>item.id);
   const [metaAds,metaOrganic,metaCreatives,windsorRows,stractAds,stractOrganic,stractCreatives,crmRows]=await Promise.all([count('metrics_ads',metaIds),count('metrics_organic',metaIds),count('creatives',metaIds),count('metrics_ads',windsorIds),count('metrics_ads',stractIds),count('metrics_organic',stractIds),count('creatives',stractIds),count('metrics_crm',crmIds)]);
   const item=(key:string,label:string,configured:boolean,accountCount:number,rowCount:number,next:string)=>({key,label,configured,account_count:accountCount,row_count:rowCount,status:rowCount>0?'receiving':accountCount>0&&configured?'ready':configured?'credentials_ready':'blocked',next});
   return json({checked_at:new Date().toISOString(),items:[
    item('meta','Meta Ads + orgânico',Boolean(metaId&&metaSecret),metaAccounts.length,metaAds+metaOrganic+metaCreatives,!metaId||!metaSecret?'Configurar META_APP_ID e META_APP_SECRET.':metaAccounts.length?'Sincronizar as contas Meta cadastradas.':'Conectar Meta e escolher as contas do cliente.'),
    item('windsor','Windsor / serviços Google',Boolean(windsorKey),windsorAccounts.length,windsorRows,!windsorKey?'Configurar WINDSOR_API_KEY.':windsorAccounts.length?'Sincronizar a conta Google Ads cadastrada.':'Cadastrar o ID da conta Google no extrator Windsor.'),
    item('stract','Stract',stractEndpoint,stractAccounts.length,stractAds+stractOrganic+stractCreatives,stractEndpoint?'Enviar a primeira carga normalizada pelo endpoint criado.':'Cadastrar a fonte Stract e gerar a chave de ingestão.'),
    item('crm','CRM e receita real',crmEndpoint,crmSources.length,crmRows,crmEndpoint?'Enviar a primeira carga conciliada de receita.':'Preparar CRM genérico e gerar a chave, ou homologar OAuth do CRM escolhido.'),
   ]});
  }
  if(body.action==='prepare_connector'){
   const provider=String(body.provider||'');
   const definitions:Record<string,{name:string;mode:string;requirements:string[]}>= {
    tiktok_ads:{name:'TikTok Ads',mode:'oauth',requirements:['TIKTOK_APP_ID','TIKTOK_APP_SECRET']},
    tiktok_organic:{name:'TikTok orgânico',mode:'oauth',requirements:['TIKTOK_APP_ID','TIKTOK_APP_SECRET']},
    hubspot:{name:'HubSpot',mode:'oauth',requirements:['HUBSPOT_CLIENT_ID','HUBSPOT_CLIENT_SECRET']},
    rd_station:{name:'RD Station',mode:'oauth',requirements:['RD_CLIENT_ID','RD_CLIENT_SECRET']},
    generic_crm:{name:'CRM genérico',mode:'api',requirements:[]},
   };
   const definition=definitions[provider];
   if(!definition)throw new Error('Este conector não pode ser preparado por esta ação.');
   const {data:existing}=await service.from('integrations').select('id').eq('organization_id',org).eq('provider',provider).like('external_account_id','foundation:%').limit(1).maybeSingle();
   if(existing)return json({message:'A base deste conector já está preparada para o cliente.'});
   await check(await service.from('integrations').upsert({
    organization_id:org,provider,external_account_id:'foundation:v1',
    account_name:definition.name+' — configuração pendente',status:'pending',is_enabled:false,
    config:{setup_stage:'credentials',connector_mode:definition.mode,required_secrets:definition.requirements,configured_by:actor.id},last_error:null,
   },{onConflict:'organization_id,provider,external_account_id'}));
   return json({message:'Base de '+definition.name+' preparada. Na próxima etapa serão configuradas credenciais, OAuth e mapeamento de dados.'});
  }
  if(body.action==='create_ingest_key'){
   const integrationId=String(body.integrationId||'');
   if(!/^[0-9a-f-]{36}$/.test(integrationId))throw new Error('Integração inválida.');
   const {data:i}=await service.from('integrations').select('id,provider,config').eq('id',integrationId).eq('organization_id',org).single();
   if(!i||!['stract','generic_crm'].includes(i.provider))throw new Error('Esta integração não aceita ingestão externa.');
   const key=randomKey();
   const config={...(i.config||{}),ingest_key_hash:await sha256(key),ingest_contract_version:1,ingest_key_rotated_at:new Date().toISOString(),configured_by:actor.id};
   await check(await service.from('integrations').update({config,is_enabled:true,status:'pending',last_error:null}).eq('id',integrationId).eq('organization_id',org));
   return json({endpoint:base+'/functions/v1/engaje-ingest?integration_id='+integrationId,key,message:'Chave de ingestão criada.'});
  }
  if(body.action==='configure_extractor'){
   const provider=String(body.provider||'');
   const source=String(body.sourcePlatform||'');
   const accountName=String(body.accountName||'').trim();
   const sourceAccountId=String(body.externalAccountId||'').trim();
   const allowedSources:Record<string,string[]>={windsor:['google_ads','google_business','youtube'],stract:['google_ads','google_business','youtube','meta_ads','facebook_organic','instagram_organic','tiktok_ads','tiktok_organic']};
   if(!allowedSources[provider]?.includes(source))throw new Error('Combinação de extrator e fonte inválida.');
   if(accountName.length<2||accountName.length>160||sourceAccountId.length<1||sourceAccountId.length>180)throw new Error('Informe nome e ID válidos para a conta.');
   if(provider==='windsor'&&!windsorKey)throw new Error('Configure WINDSOR_API_KEY nos Secrets do Supabase antes de cadastrar contas.');
   const status=provider==='windsor'?'connected':'pending';
   await check(await service.from('integrations').upsert({organization_id:org,provider,external_account_id:source+':'+sourceAccountId,account_name:accountName,status,is_enabled:true,config:{source_platform:source,source_account_id:sourceAccountId,configured_by:actor.id},last_error:null},{onConflict:'organization_id,provider,external_account_id'}));
   return json({message:provider==='windsor'?'Conta Windsor vinculada. Use “Sincronizar agora” na lista de contas.':'Fonte Stract registrada. Configure a carga no painel Stract; o status mudará após a primeira importação.'});
  }
  if(body.action==='connect'){
   if(!['meta_ads','facebook_organic','instagram_organic'].includes(body.provider))return json({message:body.provider==='tiktok_ads'||body.provider==='tiktok_organic'?'TikTok: o conector está preparado, mas requer aplicativo aprovado e as credenciais TIKTOK_APP_ID e TIKTOK_APP_SECRET.':'Use o formulário do extrator para cadastrar esta fonte.'});
   if(!metaId||!metaSecret)return json({message:'Configure META_APP_ID e META_APP_SECRET no Supabase.'});
   await check(await service.from('integrations').delete().eq('organization_id',org).eq('provider',body.provider).eq('status','pending').like('external_account_id','pending:%'));
   const nonce=crypto.randomUUID();const pending=await check(await service.from('integrations').insert({organization_id:org,provider:body.provider,external_account_id:'pending:'+nonce,account_name:'Autorização em andamento',status:'pending',config:{nonce,user_id:actor.id}}).select('id').single());
   const signed=[pending.id,Date.now()+600000,nonce].join('.');const state=signed+'.'+await hmac(signed);const scopes=body.provider==='meta_ads'?'ads_read':body.provider==='facebook_organic'?'pages_show_list,pages_read_engagement'+(advancedInsights?',read_insights':''):'pages_show_list,pages_read_engagement,instagram_basic'+(advancedInsights?',instagram_manage_insights':'');
   const login=new URL('https://www.facebook.com/'+graphVersion+'/dialog/oauth');login.search=new URLSearchParams({client_id:metaId,redirect_uri:callback,state,scope:scopes,response_type:'code'}).toString();return json({url:login.href});
  }
  if(body.action==='sync'){
   const {data:i}=await service.from('integrations').select('*').eq('id',body.integrationId).eq('organization_id',org).single();if(!i)throw new Error('Conta não encontrada.');activeId=i.id;
   const {data:locked}=await service.from('integrations').update({status:'syncing',last_sync_started_at:new Date().toISOString(),last_error:null}).eq('id',i.id).neq('status','syncing').select('id').maybeSingle();if(!locked)return json({message:'Esta conta já está sincronizando. Aguarde a conclusão.'});return json(await sync(i));
  }
  return json({message:'Ação inválida.'},400);
 }catch(e){const message=e instanceof Error?e.message:'Erro de sincronização';if(activeId)await service.from('integrations').update({status:'error',last_error:message.slice(0,300)}).eq('id',activeId);return json({message},400);}
});
