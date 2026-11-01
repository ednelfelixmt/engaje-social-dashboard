import {LoginForm} from './login-form';
import {LoginStage} from './login-stage';
import {ZfMark} from './zf-crown';
import {serverClient} from '@/lib/supabase/server';
import {notFound} from 'next/navigation';
import type {CSSProperties} from 'react';
export async function BrandedLogin({slug}:{slug:string}){
 const db=await serverClient();const {data,error}=await db.rpc('login_branding',{p_slug:slug});
 if(error)throw error;if(!data)notFound();
 const b=data as {name:string;logo:string|null;background:string|null;primary:string;color:string};
 const sign=async(path:string|null)=>path?(await db.storage.from('branding').createSignedUrl(path,3600)).data?.signedUrl:null;
 const [logo,background]=await Promise.all([sign(b.logo),sign(b.background)]);
 const style=background?{backgroundImage:`linear-gradient(#000a,#000a),url("${background}")`} as CSSProperties:undefined;
 return <main className='zf-login' style={style}>{background?null:<LoginStage/>}<section className='zf-card'>{logo?<div className='zf-mark'><img src={logo} alt={b.name} className='zf-logo-img'/></div>:<ZfMark/>}<h1>Bem-vindo</h1><LoginForm/></section></main>;
}
