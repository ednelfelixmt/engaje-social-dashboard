import Link from 'next/link';
import {serverClient} from '@/lib/supabase/server';
import {PasswordRecoveryForm} from '@/components/auth/password-recovery-form';
import {updateRecoveredPassword} from '../recovery/actions';
export const dynamic='force-dynamic';
export default async function ResetPassword({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const invalid=(await searchParams).error==='invalid_link';
  let authenticated=false;
  try{const db=await serverClient();const {data:{user},error}=await db.auth.getUser();authenticated=!!user&&!error;}catch{/* Fail closed when Auth is unavailable. */}
  return <main className="grid min-h-screen place-items-center p-6"><section className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-[#17171E] p-8"><header><p className="eyebrow">Engaje Mídia Hub</p><h1 className="mt-3 text-2xl font-semibold">Defina sua nova senha</h1></header>{!invalid&&authenticated?<PasswordRecoveryForm action={updateRecoveredPassword} mode="update"/>:<div role="status" className="space-y-4"><p className="text-sm leading-6 text-amber-200">Não foi possível validar o link. Ele pode ter expirado ou ter sido aberto em outro navegador. Solicite um novo link para continuar.</p><Link href="/auth/forgot-password" className="text-primary underline">Solicitar novo link</Link></div>}<Link href="/login" className="inline-block text-sm text-zinc-400 underline">Voltar ao login</Link></section></main>;
}
