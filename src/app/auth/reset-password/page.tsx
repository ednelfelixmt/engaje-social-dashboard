import Link from 'next/link';
import {serverClient} from '@/lib/supabase/server';
import {AuthCard} from '@/components/auth/auth-card';
import {PasswordRecoveryForm} from '@/components/auth/password-recovery-form';
import {updateRecoveredPassword} from '../recovery/actions';
export const dynamic='force-dynamic';
export default async function ResetPassword({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const invalid=(await searchParams).error==='invalid_link';
  let authenticated=false;
  try{const db=await serverClient();const {data:{user},error}=await db.auth.getUser();authenticated=!!user&&!error;}catch{/* Fail closed when Auth is unavailable. */}
  return <AuthCard title="Defina sua nova senha">{!invalid&&authenticated?<PasswordRecoveryForm action={updateRecoveredPassword} mode="update"/>:<div role="status" className="zf-note"><p>Não foi possível validar o link. Ele pode ter expirado ou ter sido aberto em outro navegador. Solicite um novo link para continuar.</p><Link href="/auth/forgot-password" className="zf-link">Solicitar novo link</Link></div>}<Link href="/login" className="zf-link">Voltar ao login</Link></AuthCard>;
}
