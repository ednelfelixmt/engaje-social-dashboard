import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {supabaseUrl,supabaseKey} from '@/lib/supabase/config';
export async function middleware(request:NextRequest){ let response=NextResponse.next({request}); const db=createServerClient(supabaseUrl,supabaseKey,{cookies:{getAll:()=>request.cookies.getAll(),setAll:(items)=>{items.forEach(({name,value})=>request.cookies.set(name,value)); response=NextResponse.next({request}); items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}}); await db.auth.getUser(); response.headers.set('Cache-Control','private, no-store'); return response; }
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)']};
