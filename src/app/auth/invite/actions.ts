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
 if(!secret)return {ok:false,message:'Ativação indisponível. Contate o administrador.'};
 const admin=createClient(supabaseUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:invitation,error:invError}=await admin.from('agency_user_invitations').select('id,email,expires_at,status')
  .eq('user_id',user.id).eq('status','pending').maybeSingle();
 if(invError||!invitation)return {ok:false,message:'Nenhum convite válido foi encontrado.'};
 if(invitation.email.toLowerCase()!==user.email.toLowerCase())return {ok:false,message:'E-mail não corresponde ao convite.'};
 if(new Date(invitation.expires_at).getTime()<Date.now()){
  await admin.from('agency_user_invitations').update({status:'expired'}).eq('id',invitation.id).eq('status','pending');
  return {ok:false,message:'Convite expirado. Solicite outro ao administrador.'};
 }
 const {data, error:markError}=await admin.from('agency_user_invitations')
  .update({status:'accepted',accepted_at:new Date().toISOString()})
  .eq('id',invitation.id).eq('status','pending').select('id').maybeSingle();
 if(markError||!data)return {ok:false,message:'Não foi possível concluir a ativação.'};
 // Aceitar um convite apenas cria a conta: nenhum cliente, perfil ou acesso é concedido aqui.
 revalidatePath('/admin/users');
 return {ok:true,message:'Cadastro concluído. O administrador definirá seus acessos.',destination:'/'};
}
