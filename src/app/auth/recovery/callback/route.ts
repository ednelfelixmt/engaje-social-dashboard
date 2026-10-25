import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {supabaseUrl,supabaseKey} from '@/lib/supabase/config';
import {passwordRecoveryOrigin} from '@/lib/auth/password-recovery';
import type {Database} from '@/types/database.types';

export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
  const origin=passwordRecoveryOrigin(process.env.APP_ORIGIN);
  const response=NextResponse.redirect(new URL('/auth/reset-password',origin));
  response.headers.set('Cache-Control','private, no-store');
  response.headers.set('Pragma','no-cache');response.headers.set('Expires','0');response.headers.set('Referrer-Policy','no-referrer');
  const invalid=()=>{response.headers.set('Location',new URL('/auth/reset-password?error=invalid_link',origin).href);return response;};
  const url=new URL(request.url),code=url.searchParams.get('code');
  if(url.searchParams.has('error')||!code||code.length>4096)return invalid();
  try{
    const db=createServerClient<Database>(supabaseUrl,supabaseKey,{cookies:{getAll:()=>request.cookies.getAll(),setAll:items=>{for(const {name,value,options} of items)response.cookies.set(name,value,options);}}});
    const {data,error}=await db.auth.exchangeCodeForSession(code);
    if(error||!data.session||!data.user)return invalid();
    return response;
  }catch{return invalid();}
}
