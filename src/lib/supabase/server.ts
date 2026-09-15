import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseUrl, supabaseKey } from './config';
import type { Database } from '@/types/database.types';
export function serverClient() { const jar=cookies(); return createServerClient<Database>(supabaseUrl,supabaseKey,{cookies:{getAll:()=>jar.getAll(),setAll:(list)=>{try{list.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Middleware handles refresh in Server Components. */}}}}); }
