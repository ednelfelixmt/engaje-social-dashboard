import 'server-only';
import {cache} from 'react';
import {redirect,notFound} from 'next/navigation';
import {serverClient} from '@/lib/supabase/server';
export const session=cache(async()=>{const db=serverClient();const {data,error}=await db.auth.getClaims();const userId=data?.claims?.sub;if(error||!userId)redirect('/login');const {data:superAdmin,error:roleError}=await db.rpc('is_super_admin');if(roleError)throw new Error('Não foi possível validar o acesso.');return {db,user:{id:userId},superAdmin:!!superAdmin};});
export async function requireAdmin(){const s=await session();if(!s.superAdmin)redirect('/');return s;}
export const tenant=cache(async(slug:string)=>{const s=await session();const {data:org}=await s.db.from('organizations').select('*').eq('slug',slug).single();if(!org)notFound();return {...s,org};});
export const dashboardConfig=cache(async(slug:string)=>{const {db,org}=await tenant(slug);const {data,error}=await db.from('dashboard_configs').select('*').eq('organization_id',org.id).single();if(error||!data)throw error??new Error('Configuração do dashboard não encontrada.');return data;});
