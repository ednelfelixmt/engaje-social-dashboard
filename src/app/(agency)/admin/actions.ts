'use server';import {z} from 'zod';import {revalidatePath} from 'next/cache';import {requireAdmin} from '@/lib/auth/session';
import {canActivateMembership,canEditExistingMembership,canAssignClientMembership,membershipRevocationFeedback} from '@/lib/auth/membership-guards';
import {validateOrganizationUpdateRequest} from '@/lib/auth/organization-update-guards';import type {ActionState} from '@/components/action-form';import {businessNiches,salesModels,suggestFunnelModel,funnelPresetFor} from '@/lib/metrics/funnel-config';import {isValidTimezone} from '@/lib/organization-options';
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
  revalidatePath('/admin/organizations');
  return {ok:true,message:funnelError?'Cliente criado, mas o funil inicial não pôde ser definido. Ajuste em Configurar dashboard.':`Cliente criado com o funil "${preset.label}".`};
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
  const {data:updated,error}=await db.from('organizations').update(parsed.data).eq('id',id.data).eq('is_agency',false).select('id,slug').maybeSingle();
  if(error||!updated)return {ok:false,message:'Não foi possível salvar.'};
  let funnelMessage='';
  if(f.get('apply_funnel')==='on'){
    if(!parsed.data.niche||!parsed.data.sales_model){revalidatePath('/admin');return {ok:false,message:'Dados salvos, mas para aplicar o funil informe o nicho e o modelo de vendas.'};}
    const funnelModel=suggestFunnelModel(parsed.data.niche,parsed.data.sales_model);
    const preset=funnelPresetFor(funnelModel);
    const {error:funnelError}=await db.from('dashboard_configs').update({funnel_model:funnelModel,funnel_steps:preset.steps}).eq('organization_id',id.data);
    if(funnelError){revalidatePath('/admin');return {ok:false,message:'Dados salvos, mas o funil não pôde ser aplicado.'};}
    funnelMessage=` Funil aplicado: ${preset.label}.`;
  }
  revalidatePath('/admin');
  revalidatePath('/'+updated.slug,'layout');
  return {ok:true,message:'Cliente atualizado.'+funnelMessage+(funnelMessage?'':' O funil só muda se você marcar "Aplicar o funil sugerido".')};
}
export async function saveMember(_:ActionState,f:FormData):Promise<ActionState>{const {db}=await requireAdmin();const input=z.object({organization_id:z.string().uuid(),user_id:z.string().uuid(),role:z.literal('viewer'),is_active:z.boolean()}).safeParse({organization_id:f.get('organization_id'),user_id:f.get('user_id'),role:f.get('role'),is_active:f.get('is_active')==='on'});if(!input.success)return {ok:false,message:'Informe cliente, UUID do usuário e nível de visualizador.'};const {data:targetOrg,error:targetError}=await db.from('organizations').select('id,is_agency').eq('id',input.data.organization_id).maybeSingle();const orgGuard=canAssignClientMembership({lookupFailed:Boolean(targetError),organizationExists:Boolean(targetOrg),isAgency:Boolean(targetOrg?.is_agency)});if(!orgGuard.allowed)return {ok:false,message:orgGuard.reason==='lookup_failed'?'Não foi possível validar a organização. Nenhuma permissão foi alterada.':orgGuard.reason==='agency_protected'?'Os acessos administrativos da agência não podem ser gerenciados neste formulário.':'Cliente não encontrado. Nenhuma permissão foi alterada.'};const {data:existing,error:existingError}=await db.from('organization_members').select('role').eq('organization_id',input.data.organization_id).eq('user_id',input.data.user_id).maybeSingle();const membershipGuard=canEditExistingMembership({readFailed:Boolean(existingError),existingRole:existing?.role??null});if(!membershipGuard.allowed)return {ok:false,message:membershipGuard.reason==='lookup_failed'?'Não foi possível verificar o vínculo atual. Nenhuma permissão foi alterada.':'O acesso de super administrador não pode ser alterado neste formulário.'};const secretForCheck=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const preliminary=canActivateMembership({isActive:input.data.is_active,serviceConfigured:!!secretForCheck,invitationLookupFailed:false,invitationStatus:null});
 if(!preliminary.allowed)return {ok:false,message:'O serviço de validação de acessos está indisponível. Nenhuma permissão foi alterada.'};
 if(input.data.is_active&&secretForCheck){
  const {createClient}=await import('@supabase/supabase-js');
  const {supabaseUrl}=await import('@/lib/supabase/config');
  const adminCheck=createClient(supabaseUrl,secretForCheck,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:agencyInvite,error:invitationError}=await adminCheck.from('agency_user_invitations').select('status').eq('user_id',input.data.user_id).maybeSingle();
  const status=agencyInvite?.status??null; // Preserve unknown statuses: only explicit 'accepted' permits activation.
  const decision=canActivateMembership({isActive:true,serviceConfigured:true,invitationLookupFailed:!!invitationError,invitationStatus:status});
  if(!decision.allowed)return {ok:false,message:decision.reason==='invitation_unaccepted'?'O usuário ainda não concluiu seu cadastro. Não é possível ativar o acesso.':'Não foi possível validar o cadastro do usuário. Nenhuma permissão foi alterada.'};
 }
 const {error}=await db.from('organization_members').upsert(input.data);
 if(error)return {ok:false,message:'Usuário não encontrado no Auth ou vínculo inválido. Nenhum acesso foi atualizado.'};
 // A revogação acontece após o vínculo: não declarar conclusão integral se falhar.
 // Até haver transação atômica (issue #54), informar explicitamente efeito parcial.
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret){
  revalidatePath('/admin/users');
  return membershipRevocationFeedback({membershipUpdated:true,serviceConfigured:false,revocationFailed:false});
 }
 const {createClient}=await import('@supabase/supabase-js');
 const {supabaseUrl}=await import('@/lib/supabase/config');
 const admin=createClient(supabaseUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error:revocationError}=await admin.from('client_user_invitations').update({status:'revoked'})
  .eq('organization_id',input.data.organization_id).eq('user_id',input.data.user_id).eq('status','pending');
 revalidatePath('/admin/users');
 return membershipRevocationFeedback({membershipUpdated:true,serviceConfigured:true,revocationFailed:Boolean(revocationError)});
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
