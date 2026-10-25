'use server';
import {serverClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
import type {ActionState} from '@/components/action-form';
import {passwordRecoveryOrigin,recoveryEmailSchema,recoveryRequestedMessage,validateRecoveryPassword} from '@/lib/auth/password-recovery';

export async function requestPasswordRecovery(_:ActionState,form:FormData):Promise<ActionState>{
  const email=recoveryEmailSchema.safeParse(form.get('email'));
  if(!email.success)return {ok:false,message:'Informe um e-mail válido.'};
  try{
    const db=await serverClient();
    await db.auth.resetPasswordForEmail(email.data,{redirectTo:passwordRecoveryOrigin(process.env.APP_ORIGIN)+'/auth/recovery/callback'});
  }catch{/* Do not disclose whether an account exists or expose provider errors. */}
  return {ok:true,message:recoveryRequestedMessage};
}

export async function updateRecoveredPassword(_:ActionState,form:FormData):Promise<ActionState>{
  const validation=validateRecoveryPassword(form.get('password'),form.get('confirm'));
  if(!validation.ok)return validation;
  try{
    const db=await serverClient();
    const {data:{user},error:identityError}=await db.auth.getUser();
    if(identityError||!user)return {ok:false,message:'Sessão inválida ou expirada. Solicite um novo link de recuperação.'};
    const {error}=await db.auth.updateUser({password:String(form.get('password'))});
    if(error)return {ok:false,message:'Não foi possível alterar a senha. Verifique os requisitos de segurança ou solicite um novo link.'};
    // Password has already changed: a sign-out failure must not report that it failed.
    let sessionEnded=false;
    try{sessionEnded=!(await db.auth.signOut({scope:'global'})).error;}catch{/* Acknowledge the completed password change explicitly below. */}
    revalidatePath('/','layout');
    return {ok:true,message:sessionEnded?'Senha atualizada. Entre novamente com sua nova senha.':'Senha atualizada. Não foi possível encerrar as sessões automaticamente. Saia da conta e entre novamente.'};
  }catch{return {ok:false,message:'Não foi possível confirmar a alteração. Confira o acesso antes de tentar novamente.'};}
}
