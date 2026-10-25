'use server';
import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {requireAdmin} from '@/lib/auth/session';
import {validateOrganizationUpdateRequest} from '@/lib/auth/organization-update-guards';
import {adminMutationFailure} from '@/lib/auth/admin-mutation-feedback';
import type {ActionState} from '@/components/action-form';
import {businessNiches,salesModels,suggestFunnelModel,funnelPresetFor} from '@/lib/metrics/funnel-config';
import {isValidTimezone} from '@/lib/organization-options';

const nicheIds=businessNiches.map(item=>item.id) as [typeof businessNiches[number]['id'],...typeof businessNiches[number]['id'][]];
const salesModelIds=salesModels.map(item=>item.id) as [typeof salesModels[number]['id'],...typeof salesModels[number]['id'][]];
const organizationResult=z.object({id:z.string().uuid(),slug:z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)});
const membershipResult=z.object({organization_id:z.string().uuid(),user_id:z.string().uuid(),is_active:z.boolean(),revoked_invitations:z.number().int().nonnegative()});

export async function createOrganization(_:ActionState,f:FormData):Promise<ActionState>{
  const {db}=await requireAdmin();
  const input=z.object({name:z.string().trim().min(2).max(160),slug:z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),niche:z.enum(nicheIds),sales_model:z.enum(salesModelIds)}).safeParse({name:f.get('name'),slug:f.get('slug'),niche:f.get('niche'),sales_model:f.get('sales_model')});
  if(!input.success)return {ok:false,message:'Informe nome, endereço válido (letras minúsculas e hífens), nicho e modelo de vendas.'};
  if(['admin','login','api','auth','_next'].includes(input.data.slug))return {ok:false,message:'Este endereço é reservado.'};
  const funnelModel=suggestFunnelModel(input.data.niche,input.data.sales_model);
  const preset=funnelPresetFor(funnelModel);
  const {data,error}=await db.rpc('create_client_organization',{
    p_name:input.data.name,p_slug:input.data.slug,p_niche:input.data.niche,p_sales_model:input.data.sales_model,
    p_funnel_model:funnelModel,p_funnel_steps:preset.steps,
  });
  const result=organizationResult.safeParse(data);
  if(error||!result.success)return adminMutationFailure(error,'Não foi possível confirmar a criação do cliente.');
  revalidatePath('/admin');
  revalidatePath('/admin/organizations');
  return {ok:true,message:'Cliente criado com o funil "'+preset.label+'".'};
}

export async function updateOrganization(_:ActionState,f:FormData):Promise<ActionState>{
  const {db}=await requireAdmin();
  const id=z.string().uuid().safeParse(f.get('id'));
  if(!id.success)return {ok:false,message:'Identificador do cliente inválido. Nenhuma alteração foi salva.'};
  const parsed=z.object({name:z.string().trim().min(2).max(160),status:z.enum(['active','paused']),niche:z.enum(nicheIds).nullable(),sales_model:z.enum(salesModelIds).nullable(),timezone:z.string().refine(isValidTimezone),currency:z.string().regex(/^[A-Z]{3}$/)}).safeParse({name:f.get('name'),status:f.get('status'),niche:f.get('niche')||null,sales_model:f.get('sales_model')||null,timezone:f.get('timezone'),currency:f.get('currency')});
  if(!parsed.success)return {ok:false,message:'Confira nome, status, fuso horário e moeda.'};
  const applyFunnel=f.get('apply_funnel')==='on';
  const guard=validateOrganizationUpdateRequest({applyFunnel,niche:parsed.data.niche,salesModel:parsed.data.sales_model});
  if(!guard.ok)return {ok:false,message:guard.message};
  const funnelModel=suggestFunnelModel(parsed.data.niche,parsed.data.sales_model);
  const preset=applyFunnel?funnelPresetFor(funnelModel):null;
  const {data,error}=await db.rpc('update_client_organization',{
    p_id:id.data,p_name:parsed.data.name,p_status:parsed.data.status,p_niche:parsed.data.niche??'',p_sales_model:parsed.data.sales_model??'',
    p_timezone:parsed.data.timezone,p_currency:parsed.data.currency,p_apply_funnel:applyFunnel,p_funnel_model:funnelModel,p_funnel_steps:preset?.steps??[],
  });
  const result=organizationResult.safeParse(data);
  if(error||!result.success||result.data.id!==id.data)return adminMutationFailure(error,'Não foi possível confirmar as alterações do cliente.');
  revalidatePath('/admin');
  revalidatePath('/admin/organizations');
  revalidatePath('/'+result.data.slug,'layout');
  revalidatePath('/admin/organizations/'+id.data+'/activity');
  return {ok:true,message:'Cliente atualizado.'+(preset?' Funil aplicado: '+preset.label+'.':' O funil só muda se você marcar "Aplicar o funil sugerido".')};
}

export async function saveMember(_:ActionState,f:FormData):Promise<ActionState>{
  const {db}=await requireAdmin();
  const input=z.object({organization_id:z.string().uuid(),user_id:z.string().uuid(),role:z.literal('viewer'),is_active:z.boolean()}).safeParse({organization_id:f.get('organization_id'),user_id:f.get('user_id'),role:f.get('role'),is_active:f.get('is_active')==='on'});
  if(!input.success)return {ok:false,message:'Informe cliente, UUID do usuário e nível de visualizador.'};
  const {data,error}=await db.rpc('save_client_membership',{p_organization_id:input.data.organization_id,p_user_id:input.data.user_id,p_is_active:input.data.is_active});
  const result=membershipResult.safeParse(data);
  if(error||!result.success||result.data.organization_id!==input.data.organization_id||result.data.user_id!==input.data.user_id||result.data.is_active!==input.data.is_active)return adminMutationFailure(error,'Não foi possível confirmar a alteração de acesso.');
  revalidatePath('/admin/users');
  revalidatePath('/admin/users/'+input.data.user_id);
  revalidatePath('/admin/organizations/'+input.data.organization_id+'/activity');
  revalidatePath('/admin/organizations');
  return {ok:true,message:'Acesso atualizado e convites pendentes revogados.'};
}

export async function inviteClientUser(_:ActionState,f:FormData):Promise<ActionState>{
 await requireAdmin();
 const parsed=z.object({email:z.string().trim().toLowerCase().email().max(254)}).safeParse({email:f.get('email')});
 if(!parsed.success)return {ok:false,message:'Informe um endereço de e-mail válido.'};
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret)return {ok:false,message:'Serviço de convites não configurado no servidor.'};
 const {createClient}=await import('@supabase/supabase-js');
 const {supabaseUrl}=await import('@/lib/supabase/config');
 const admin=createClient(supabaseUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(parsed.data.email,{redirectTo:'https://mediahub.engajeperformance.com.br/auth/invite'});
 if(inviteError||!invited.user)return {ok:false,message:'Não foi possível enviar o convite. Verifique o envio de e-mails ou se o usuário já está cadastrado.'};
 const {error:recordError}=await admin.from('agency_user_invitations').upsert({
  user_id:invited.user.id,email:parsed.data.email,status:'pending',
  invited_at:new Date().toISOString(),expires_at:new Date(Date.now()+7*86400000).toISOString(),accepted_at:null
 },{onConflict:'user_id'});
 if(recordError)return {ok:false,message:'E-mail solicitado, mas o registro do convite falhou. Nenhuma permissão foi concedida.'};
 revalidatePath('/admin/users');
 return {ok:true,message:'Convite enviado. Após o cadastro, defina os clientes e níveis de acesso em Configurar acessos.'};
}
