'use server';
import {serverClient} from '@/lib/supabase/server';
import {supabaseUrl} from '@/lib/supabase/config';
import {createClient} from '@supabase/supabase-js';
import {revalidatePath} from 'next/cache';

export async function completeInvitedRegistration(){
 const db=await serverClient();
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user?.email)return {ok:false,message:'Convite inválido ou sessão expirada.'};
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret)return {ok:false,message:'A ativação do convite está indisponível. Contate o administrador.'};
 const admin=createClient(supabaseUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:invitations,error:inviteError}=await admin.from('client_user_invitations')
  .select('id,organization_id,role,email,expires_at')
  .eq('user_id',user.id).eq('status','pending');
 if(inviteError||!invitations?.length)return {ok:false,message:'Nenhum convite pendente foi encontrado. Solicite novo convite.'};
 let activated=0;let firstSlug:string|null=null;
 for(const invitation of invitations){
  if(invitation.email.toLowerCase()!==user.email.toLowerCase())continue;
  if(new Date(invitation.expires_at).getTime()<Date.now()){
   await admin.from('client_user_invitations').update({status:'expired'}).eq('id',invitation.id).eq('status','pending');
   continue;
  }
  const {data:org}=await admin.from('organizations').select('slug,status,is_agency').eq('id',invitation.organization_id).single();
  if(!org||org.status!=='active'||org.is_agency)continue;
  const {data:member}=await admin.from('organization_members').select('is_active,role').eq('organization_id',invitation.organization_id).eq('user_id',user.id).maybeSingle();
  if(!member||member.is_active||member.role!==invitation.role)continue;
  const {error:activationError}=await admin.from('organization_members').update({is_active:true})
   .eq('organization_id',invitation.organization_id).eq('user_id',user.id).eq('role',invitation.role).eq('is_active',false);
  if(activationError)continue;
  const {error:markError}=await admin.from('client_user_invitations').update({status:'accepted',accepted_at:new Date().toISOString()}).eq('id',invitation.id).eq('status','pending');
  if(markError){
   await admin.from('organization_members').update({is_active:false}).eq('organization_id',invitation.organization_id).eq('user_id',user.id);
   continue;
  }
  firstSlug??=org.slug;activated++;
 }
 if(!activated)return {ok:false,message:'Convite expirado, revogado ou incompatível com sua conta. Solicite outro convite.'};
 revalidatePath('/');
 revalidatePath('/admin/users');
 return {ok:true,message:'Acesso ativado com sucesso.',destination:firstSlug?'/'+firstSlug+'/overview':'/'};
}
