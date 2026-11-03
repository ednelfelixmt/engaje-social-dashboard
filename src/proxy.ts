import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {supabaseUrl,supabaseKey} from '@/lib/supabase/config';
export async function proxy(request:NextRequest){ let response=NextResponse.next({request}); const db=createServerClient(supabaseUrl,supabaseKey,{cookies:{getAll:()=>request.cookies.getAll(),setAll:(items)=>{items.forEach(({name,value})=>request.cookies.set(name,value)); response=NextResponse.next({request}); items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}}); const {data}=await db.auth.getClaims(); const path=request.nextUrl.pathname; const signedIn=Boolean(data?.claims?.sub);
 // Os arquivos do painel só abrem com sessão: sem login, vai para a tela de entrada.
 if(path.startsWith('/painel/')&&!signedIn)return NextResponse.redirect(new URL('/login',request.url));
 // A visão geral da agência é o painel da carteira; a tela anterior fica em ?classico=1.
 if(path==='/admin'&&!request.nextUrl.searchParams.has('classico')&&signedIn)return NextResponse.redirect(new URL('/admin/painel',request.url));
 response.headers.set('Cache-Control','private, no-store'); return response; }
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)']};
