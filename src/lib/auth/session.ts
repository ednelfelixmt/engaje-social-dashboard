import 'server-only';
import {cache} from 'react';
import {redirect,notFound} from 'next/navigation';
import {serverClient} from '@/lib/supabase/server';
export const session=cache(async()=>{const db=serverClient();const {data:{user},error}=await db.auth.getUser();if(error||!user)redirect('/login');const {data:superAdmin,error:roleError}=await db.rpc('is_super_admin');if(roleError)throw new Error('Não foi possível validar o acesso.');return {db,user,superAdmin:!!superAdmin};});
export async function requireAdmin(){const s=await session();if(!s.superAdmin)redirect('/');return s;}
export const tenant=cache(async(slug:string)=>{const s=await session();const {data:org}=await s.db.from('organizations').select('*').eq('slug',slug).single();if(!org)notFound();return {...s,org};});
