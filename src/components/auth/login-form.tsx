'use client';
import Link from 'next/link';
import {useState} from 'react';import {useRouter,useSearchParams} from 'next/navigation';import {Eye,EyeOff,LoaderCircle} from 'lucide-react';import {browserClient} from '@/lib/supabase/browser';import {Button} from '@/components/ui/button';
export function LoginForm(){const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [reveal,setReveal]=useState(false);const router=useRouter();const search=useSearchParams();const requested=search.get('next');const destination=requested&&/^\/[a-z0-9-]+\/(overview|paid|funnel|paid-creatives)$/.test(requested)?requested:'/';
 return <form className='space-y-5' onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{const {error}=await browserClient().auth.signInWithPassword({email:String(f.get('email')),password:String(f.get('password'))});if(error)setError('E-mail ou senha inválidos. Verifique seus dados.');else{router.replace(destination);router.refresh();}}catch{setError('Não foi possível conectar. Tente novamente.');}finally{setBusy(false);}}}>
  <label>E-mail<input type='email' name='email' autoComplete='email' required placeholder='voce@empresa.com.br'/></label>
  <label>Senha<span className='zf-pass'><input type={reveal?'text':'password'} name='password' autoComplete='current-password' required minLength={6}/><button type='button' className='zf-eye' aria-label={reveal?'Ocultar senha':'Mostrar senha'} aria-pressed={reveal} onClick={()=>setReveal(value=>!value)}>{reveal?<EyeOff size={18} aria-hidden/>:<Eye size={18} aria-hidden/>}</button></span></label>
  <Link href='/auth/forgot-password' className='zf-forgot'>Esqueci minha senha</Link>
  {error&&<p role='alert' className='text-red-400 text-sm'>{error}</p>}
  <Button className='w-full' disabled={busy}>{busy?<><LoaderCircle size={18} className='animate-spin' aria-hidden/>Entrando…</>:'Entrar'}</Button>
 </form>;}
