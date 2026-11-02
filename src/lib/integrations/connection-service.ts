import 'server-only';
import {createClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/types/database.types';
import {administrationKey} from '@/lib/auth/administration-key';
import {supabaseUrl} from '@/lib/supabase/config';
import {connectionProduct} from './connection-products';
import type {ConnectionStore} from './connection-flow';
// Privileged RPC stays out of the generated public-client function contract.
type PrivateStoreDatabase=Omit<Database,'public'>&{public:Omit<Database['public'],'Functions'>&{Functions:Database['public']['Functions']&{store_integration_token:{Args:{p_id:string;p_token:string};Returns:undefined}}}};
export function connectionService(environment:Record<string,string|undefined>){
 const key=administrationKey(environment);if(!key)throw new Error('Serviço administrativo indisponível.');
 const db=createClient<PrivateStoreDatabase>(supabaseUrl,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const store:ConnectionStore={
 async actorAllowed(actorId,organizationId){const [member,org]=await Promise.all([
  db.from('organization_members').select('organization_id,organizations!inner(is_agency,status)').eq('user_id',actorId).eq('role','super_admin').eq('is_active',true).eq('organizations.is_agency',true).eq('organizations.status','active'),
  db.from('organizations').select('id').eq('id',organizationId).eq('is_agency',false).eq('status','active').maybeSingle(),
 ]);return !member.error&&!org.error&&Boolean(member.data?.length)&&Boolean(org.data);},
 async create(input){const product=connectionProduct(input.product);const {error}=await db.from('integrations').insert({id:input.id,organization_id:input.organizationId,provider:product.provider,external_account_id:'pending:'+input.id,account_name:product.name+' — autorização',status:'pending',is_enabled:false,config:{connection_hub:true,product:input.product,method:input.method,authorization_status:input.method==='oauth'?'authorizing':'validating',oauth_nonce:input.nonce,configured_by:input.actorId,selection_pending:true,setup_stage:'authorization'}});if(error)throw new Error('Não foi possível preparar a conexão.');},
 async find(id,organizationId){const {data,error}=await db.from('integrations').select('id,organization_id,status,config,organizations!inner(slug,status)').eq('id',id).eq('organization_id',organizationId).eq('status','pending').maybeSingle();if(error||!data)return null;
  const c=data.config&&typeof data.config==='object'&&!Array.isArray(data.config)?data.config:{};
  if(c.connection_hub!==true||typeof c.product!=='string'||typeof c.oauth_nonce!=='string'||typeof c.configured_by!=='string'||typeof c.authorization_status!=='string')return null;
  const product=connectionProduct(c.product),org=data.organizations as unknown as {slug:string;status:string};if(!org||org.status!=='active'||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(org.slug))return null;
  return{id:data.id,organizationId:data.organization_id,actorId:c.configured_by,product:product.id,nonce:c.oauth_nonce,slug:org.slug,status:c.authorization_status};
 },
 async consume(pending){const {data,error}=await db.from('integrations').update({status:'syncing',is_enabled:false}).eq('id',pending.id).eq('organization_id',pending.organizationId).eq('status','pending').eq('config->>connection_hub','true').eq('config->>oauth_nonce',pending.nonce).eq('config->>authorization_status','authorizing').select('id').maybeSingle();return !error&&data?.id===pending.id;},
 async storeToken(id,token){const {error}=await db.rpc('store_integration_token',{p_id:id,p_token:JSON.stringify(token)});if(error)throw new Error('Não foi possível proteger a credencial.');},
 async verified(pending,method){const config:Json={connection_hub:true,product:pending.product,method,authorization_status:'verified',configured_by:pending.actorId,selection_pending:true,setup_stage:'account_selection',authorized_at:new Date().toISOString(),sync_status:'not_started'};const {data,error}=await db.from('integrations').update({status:'pending',is_enabled:false,config,last_error:null}).eq('id',pending.id).eq('organization_id',pending.organizationId).eq('config->>oauth_nonce',pending.nonce).eq('status',method==='oauth'?'syncing':'pending').eq('config->>connection_hub','true').select('id').single();if(error||!data)throw new Error('Não foi possível confirmar a autorização.');},
 async failed(id,organizationId){const {error}=await db.from('integrations').update({status:'error',is_enabled:false,last_error:'Autorização não concluída. Confira o aplicativo e as permissões da plataforma.'}).eq('id',id).eq('organization_id',organizationId);if(error)throw new Error('Não foi possível concluir o registro da autorização.');},
 };
 return{store,secret:key};
}
