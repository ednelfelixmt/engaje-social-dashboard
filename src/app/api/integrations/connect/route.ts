import {NextResponse} from 'next/server';
import {serverClient} from '@/lib/supabase/server';
import {beginConnection} from '@/lib/integrations/connection-flow';
import {connectionService} from '@/lib/integrations/connection-service';
export const runtime='nodejs';
export async function POST(request:Request){
 const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({message:'Origem inválida.'},403);
 const db=await serverClient();const auth=await db.auth.getUser();if(auth.error||!auth.data.user)return reply({message:'Sessão necessária.'},401);
 const role=await db.rpc('is_super_admin');if(role.error||role.data!==true)return reply({message:'Acesso administrativo necessário.'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({message:'Formato inválido.'},400);
 try{const raw=await request.text();if(raw.length>12000)return reply({message:'Solicitação muito grande.'},413);const body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))return reply({message:'Solicitação inválida.'},400);
 const service=connectionService(process.env);const result=await beginConnection({organizationId:body.organizationId,actorId:auth.data.user.id,product:body.product,method:body.method,apiToken:body.apiToken},{...service,environment:process.env,fetcher:fetch});return reply(result);
 }catch(error){const safe=error instanceof Error&&(/^(Plataforma inválida|Método indisponível|Cliente ou usuário inválido|Acesso administrativo necessário|OAuth ainda não configurado|Informe uma credencial|Esta plataforma exige|A plataforma recusou|A plataforma não confirmou|Não foi possível)/.test(error.message))?error.message:'Não foi possível concluir a autorização. Confira a configuração da plataforma.';return reply({message:safe},400);}
}
