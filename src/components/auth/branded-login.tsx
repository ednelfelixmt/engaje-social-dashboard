import {Crown,ShieldCheck} from 'lucide-react';
import {LoginForm} from './login-form';
import {serverClient} from '@/lib/supabase/server';
import {notFound} from 'next/navigation';
import type {CSSProperties} from 'react';
export async function BrandedLogin({slug}:{slug:string}){
 const db=serverClient();const {data,error}=await db.rpc('login_branding',{p_slug:slug});
 if(error)throw error;if(!data)notFound();
 const b=data as {name:string;logo:string|null;background:string|null;primary:string;color:string};
 const sign=async(path:string|null)=>path?(await db.storage.from('branding').createSignedUrl(path,3600)).data?.signedUrl:null;
 const [logo,background]=await Promise.all([sign(b.logo),sign(b.background)]);
 return <main className='min-h-screen grid place-items-center p-6' style={{'--primary':b.primary,backgroundColor:b.color,backgroundImage:background?`linear-gradient(#0005,#0005),url("${background}")`:'radial-gradient(ellipse at top left,#373014 0%,#0F0F13 48%)',backgroundSize:'cover',backgroundPosition:'center'} as CSSProperties}><div className='absolute top-8 left-8 flex items-center gap-3'>{logo?<img src={logo} alt={b.name} className='h-10 max-w-48 object-contain'/>:<Crown className='text-primary'/>}<strong>{b.name}</strong></div><div className='w-full max-w-[440px] rounded-3xl border border-white/10 bg-[#17171E]/95 p-9 shadow-2xl'><div className='mb-8'><p className='eyebrow mb-3'>SEU MARKETING, COM CLAREZA</p><h1 className='text-3xl font-semibold tracking-tight'>Bem-vindo de volta.</h1><p className='muted text-sm mt-3'>Acesse resultados, conecte informações e transforme dados em decisões.</p></div><LoginForm/><div className='mt-8 pt-5 border-t border-white/10 flex items-center gap-2 text-xs text-zinc-500'><ShieldCheck size={15}/> Acesso exclusivo · Engaje + ZF Comunicação</div></div></main>;
}
