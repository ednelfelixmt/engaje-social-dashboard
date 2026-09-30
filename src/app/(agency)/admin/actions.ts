'use server';import {z} from 'zod';import {revalidatePath} from 'next/cache';import {requireAdmin} from '@/lib/auth/session';import type {ActionState} from '@/components/action-form';import {businessNiches,salesModels,suggestFunnelModel,funnelPresetFor} from '@/lib/metrics/funnel-config';
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
  const parsed=z.object({name:z.string().trim().min(2),status:z.enum(['active','paused']),niche:z.enum(nicheIds).nullable(),sales_model:z.enum(salesModelIds).nullable()}).safeParse({name:f.get('name'),status:f.get('status'),niche:f.get('niche')||null,sales_model:f.get('sales_model')||null});
  if(!parsed.success)return {ok:false,message:'Dados inválidos.'};
  const {error}=await db.from('organizations').update(parsed.data).eq('id',id).eq('is_agency',false);
  revalidatePath('/admin');
  return {ok:!error,message:error?'Não foi possível salvar.':'Cliente atualizado. O funil só muda em Configurar dashboard.'};
}
export async function saveMember(_:ActionState,f:FormData):Promise<ActionState>{const {db}=await requireAdmin();const input=z.object({organization_id:z.string().uuid(),user_id:z.string().uuid(),role:z.enum(['client_admin','editor','viewer']),is_active:z.boolean()}).safeParse({organization_id:f.get('organization_id'),user_id:f.get('user_id'),role:f.get('role'),is_active:f.get('is_active')==='on'});if(!input.success)return {ok:false,message:'Preencha organização, UUID do usuário e role.'};const {data:existing}=await db.from('organization_members').select('role').eq('organization_id',input.data.organization_id).eq('user_id',input.data.user_id).maybeSingle();if(existing?.role==='super_admin')return {ok:false,message:'O acesso de super administrador não pode ser alterado neste formulário.'};const {error}=await db.from('organization_members').upsert(input.data);revalidatePath('/admin/users');return {ok:!error,message:error?'Usuário não encontrado no Auth ou vínculo inválido.':'Acesso atualizado.'};}
