'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {browserClient} from '@/lib/supabase/browser';
import {completeInvitedRegistration} from './actions';
import {CheckCircle2,KeyRound,Mail,ShieldCheck} from 'lucide-react';

export default function InvitePage(){
 const router=useRouter();
 const [ready,setReady]=useState(false),[email,setEmail]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 useEffect(()=>{
  const db=browserClient();let mounted=true;
  async function read(){
   const {data}=await db.auth.getUser();
   if(mounted){setReady(Boolean(data.user));setEmail(data.user?.email||'');}
  }
  void read();
  const {data:{subscription}}=db.auth.onAuthStateChange(()=>{void read();});
  return ()=>{mounted=false;subscription.unsubscribe();};
 },[]);
 async function finish(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');
  const f=new FormData(e.currentTarget);
  const password=String(f.get('password')||''),confirm=String(f.get('confirm')||'');
  if(password!==confirm){setError('As senhas não coincidem.');return;}
  if(password.length<12){setError('Utilize pelo menos 12 caracteres.');return;}
  setBusy(true);
  try{
   // A autenticação do convite deve existir antes da criação da senha.
   const db=browserClient();
   const {data:{user}}=await db.auth.getUser();
   if(!user||!user.email||user.email.toLowerCase()!==email.toLowerCase()){
    setError('Identidade não validada. Abra novamente o link enviado ao seu e-mail.');return;
   }
   const {error:passwordError}=await db.auth.updateUser({password});
   if(passwordError){setError('Não foi possível salvar a senha. Solicite um novo convite se o link expirou.');return;}
   const activation=await completeInvitedRegistration();
   if(!activation.ok){setError(activation.message+' A senha foi definida, mas a permissão ainda não está ativa.');return;}
   setDone(true);
   router.replace(activation.destination||'/');router.refresh();
  }catch{setError('Não foi possível ativar o acesso. Contate o administrador da agência.');}
  finally{setBusy(false);}
 }
 return <main className="grid min-h-screen place-items-center bg-[#090d15] px-5 py-10">
  <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#151b26] p-7 shadow-2xl sm:p-9">
   <div className="flex size-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10"><ShieldCheck className="text-primary" size={24}/></div>
   <p className="eyebrow mt-5">Engaje Mídia Hub · Convite de acesso</p>
   <h1 className="mt-2 text-2xl font-semibold text-white">Ative sua conta</h1>
   <p className="mt-2 text-sm leading-6 text-zinc-400">O administrador já definiu seu cliente e suas permissões. Confirme o e-mail do convite e cadastre uma senha pessoal.</p>
   {done?<p className="mt-5 flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={18}/>Conta ativada. Abrindo o dashboard...</p>:
    ready?<form onSubmit={finish} className="mt-6 space-y-4">
     <label className="block text-xs text-zinc-400"><span className="mb-2 inline-flex items-center gap-2"><Mail size={14}/>E-mail do convidado</span><input type="email" value={email} readOnly aria-label="E-mail confirmado pelo convite" className="!text-zinc-400"/></label>
     <label className="block text-xs text-zinc-400"><span className="mb-2 inline-flex items-center gap-2"><KeyRound size={14}/>Criar senha</span><input name="password" type="password" minLength={12} required autoComplete="new-password" placeholder="Pelo menos 12 caracteres"/></label>
     <label className="block text-xs text-zinc-400">Confirmar senha<input name="confirm" type="password" minLength={12} required autoComplete="new-password"/></label>
     {error?<p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-300">{error}</p>:null}
     <button disabled={busy} className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-black disabled:opacity-60">{busy?'Ativando acesso…':'Aceitar convite e acessar'}</button>
     <p className="text-xs leading-5 text-zinc-500">A senha é definida somente por você. Seu perfil não pode ser alterado nesta etapa.</p>
    </form>:
    <div className="mt-6 space-y-3 rounded-xl border border-amber-400/15 bg-amber-400/[.04] p-4"><p className="text-sm text-amber-100">Não foi possível validar a sessão do convite. Use o link recebido por e-mail. Links expirados exigem um novo convite.</p><a href="/login" className="text-sm font-medium text-primary underline">Ir para o login</a></div>}
  </div>
 </main>;
}
