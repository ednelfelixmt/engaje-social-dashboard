'use server';import {z} from 'zod';import {revalidatePath} from 'next/cache';import {requireAdmin} from '@/lib/auth/session';import type {ActionState} from '@/components/action-form';import {businessNiches,salesModels,suggestFunnelModel,funnelPresetFor} from '@/lib/metrics/funnel-config';import {isValidTimezone} from '@/lib/organization-options';
const nicheIds=businessNiches.map((item)=>item.id) as [typeof businessNiches[number]['id'],...typeof businessNiches[number]['id'][]];
const salesModelIds=salesModels.map((item)=>item.id) as [typeof salesModels[number]['id'],...typeof salesModels[number]['id'][]];
export async function createOrganization(_:ActionState,f:FormData):Promise<ActionState>{
  const {db}=await requireAdmin();
  const input=z.object({name:z.string().trim().min(2).max(160),slug:z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),niche:z.enum(nicheIds),sales_model:z.enum(salesModelIds)}).safeParse({name:f.get('name'),slug:f.get('slug'),niche:f.get('niche'),sales_model:f.get('sales_model')});
  if(!input.success)return {ok:false,message:'Informe nome, endereço válido (letras minúsculas e hífens), nicho e modelo de vendas.'};
  if(['admin','login','api','auth','_next'].includes(input.data.slug))return {ok:false,message:'Este endereço é reservado.'};
  const {data:created,error}=await db.from('organizations').insert(input.data).select('id').single();
  if(error||!created)return {ok:false,message:'Não foi possível criar. Verifique se o endereço já existe.'};
  // O funil inicial acompanha o nicho e o modelo de vendas; pode ser ajustado em Configurar dashboard.
  const funnelModel=suggestFunnelModel(input.data.niche,input.data.sales_model);
  const preset=funnelPresetFor(funnelModel);
  const {error:funnelError}=await db.from('dashboard_configs').update({funnel_model:funnelModel,funnel_steps:preset.steps}).eq('organization_id',created.id);
  revalidatePath('/admin');
  return {ok:true,message:funnelError?'Cliente criado, mas o funil inicial não pôde ser definido. Ajuste em Configurar dashboard.':`Cliente criado com o funil "${preset.label}".`};
}
export async function updateOrganization(_:ActionState,f:FormData):Promise<ActionState>{
  const {db}=await requireAdmin();
  const id=z.string().uuid().parse(f.get('id'));
  const parsed=z.object({name:z.string().trim().min(2).max(160),status:z.enum(['active','paused']),niche:z.enum(nicheIds).nullable(),sales_model:z.enum(salesModelIds).nullable(),timezone:z.string().refine(isValidTimezone),currency:z.string().regex(/^[A-Z]{3}$/)}).safeParse({name:f.get('name'),status:f.get('status'),niche:f.get('niche')||null,sales_model:f.get('sales_model')||null,timezone:f.get('timezone'),currency:f.get('currency')});
  if(!parsed.success)return {ok:false,message:'Confira nome, status, fuso horário e moeda.'};
  const {data:updated,error}=await db.from('organizations').update(parsed.data).eq('id',id).eq('is_agency',false).select('id,slug').maybeSingle();
  if(error||!updated)return {ok:false,message:'Não foi possível salvar.'};
  let funnelMessage='';
  if(f.get('apply_funnel')==='on'){
    if(!parsed.data.niche||!parsed.data.sales_model){revalidatePath('/admin');return {ok:false,message:'Dados salvos, mas para aplicar o funil informe o nicho e o modelo de vendas.'};}
    const funnelModel=suggestFunnelModel(parsed.data.niche,parsed.data.sales_model);
    const preset=funnelPresetFor(funnelModel);
    const {error:funnelError}=await db.from('dashboard_configs').update({funnel_model:funnelModel,funnel_steps:preset.steps}).eq('organization_id',id);
    if(funnelError){revalidatePath('/admin');return {ok:false,message:'Dados salvos, mas o funil não pôde ser aplicado.'};}
    funnelMessage=` Funil aplicado: ${preset.label}.`;
  }
  revalidatePath('/admin');
  revalidatePath('/'+updated.slug,'layout');
  return {ok:true,message:'Cliente atualizado.'+funnelMessage+(funnelMessage?'':' O funil só muda se você marcar "Aplicar o funil sugerido".')};
}
export async function saveMember(_:ActionState,f:FormData):Promise<ActionState>{const {db}=await requireAdmin();const input=z.object({organization_id:z.string().uuid(),user_id:z.string().uuid(),role:z.enum(['client_admin','editor','viewer']),is_active:z.boolean()}).safeParse({organization_id:f.get('organization_id'),user_id:f.get('user_id'),role:f.get('role'),is_active:f.get('is_active')==='on'});if(!input.success)return {ok:false,message:'Preencha organização, UUID do usuário e role.'};const {data:existing}=await db.from('organization_members').select('role').eq('organization_id',input.data.organization_id).eq('user_id',input.data.user_id).maybeSingle();if(existing?.role==='super_admin')return {ok:false,message:'O acesso de super administrador não pode ser alterado neste formulário.'};const {error}=await db.from('organization_members').upsert(input.data);revalidatePath('/admin/users');return {ok:!error,message:error?'Usuário não encontrado no Auth ou vínculo inválido.':'Acesso atualizado.'};}

export async function inviteClientUser(_:ActionState,f:FormData):Promise<ActionState>{
 const {db}=await requireAdmin();
 const parsed=z.object({organization_id:z.string().uuid(),email:z.string().trim().email().max(254),role:z.enum(['viewer','editor','client_admin'])}).safeParse({organization_id:f.get('organization_id'),email:f.get('email'),role:f.get('role')});
 if(!parsed.success)return {ok:false,message:'Informe cliente, e-mail válido e perfil.'};
 const {data:org}=await db.from('organizations').select('id,slug,status,is_agency').eq('id',parsed.data.organization_id).maybeSingle();
 if(!org||org.status!=='active'||org.is_agency)return {ok:false,message:'Cliente inexistente ou inativo.'};
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret)return {ok:false,message:'Convites por e-mail dependem do segredo SUPABASE_SERVICE_ROLE_KEY configurado exclusivamente no servidor da Vercel. Enquanto isso, vincule usuários existentes pelo UUID.'};
 const {createClient}=await import('@supabase/supabase-js');
 const {supabaseUrl}=await import('@/lib/supabase/config');
 const admin=createClient(supabaseUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 // Nunca use a chave administrativa no navegador.
 const origin=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,'')||'https://mediahub.engajeperformance.com.br';
 const {data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(parsed.data.email,{redirectTo:origin+'/auth/callback'});
 if(inviteError||!invited.user)return {ok:false,message:'Não foi possível convidar este e-mail. Se o usuário já existir, vincule sua conta atual pelo UUID.'};
 const {error:memberError}=await admin.from('organization_members').upsert({organization_id:org.id,user_id:invited.user.id,role:parsed.data.role,is_active:true});
 if(memberError)return {ok:false,message:'Convite enviado, mas o vínculo falhou. Verifique as permissões do banco e regularize o acesso antes do primeiro login.'};
 revalidatePath('/admin/users');
 return {ok:true,message:'Convite enviado. O acesso ficará limitado ao cliente selecionado.'};
}
