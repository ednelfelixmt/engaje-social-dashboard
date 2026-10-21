import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ShieldCheck,ArrowLeft} from 'lucide-react';
import {createClient} from '@supabase/supabase-js';
import {requireAdmin} from '@/lib/auth/session';
import {supabaseUrl} from '@/lib/supabase/config';
import {Card} from '@/components/ui/card';
import {ActionForm} from '@/components/action-form';
import {saveMember} from '../../actions';

export default async function UserAccessSettings({params}: {params:Promise<{userId:string}>}){
 const {userId}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(userId))notFound();
 const {db}=await requireAdmin();
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret)return <Card>Serviço de gestão de acessos indisponível.</Card>;
 const admin=createClient(supabaseUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:authInfo,error:authError}=await admin.auth.admin.getUserById(userId);
 if(authError||!authInfo.user)notFound();
 const [{data:organizations},{data:members},{data:invitation}]=await Promise.all([
  db.from('organizations').select('id,name,status,is_agency').eq('is_agency',false).order('name'),
  db.from('organization_members').select('organization_id,role,is_active').eq('user_id',userId),
  admin.from('agency_user_invitations').select('status,email').eq('user_id',userId).maybeSingle()
 ]);
 const accepted=invitation?.status==='accepted'||(!invitation&&authInfo.user.email_confirmed_at!=null);
 const clients=organizations??[];
 const existing=members??[];
 return <main className="mx-auto max-w-[1120px] space-y-5">
 <Link href="/admin/users" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white"><ArrowLeft size={14}/>Voltar a usuários</Link>
 <header className="flex items-center gap-3 rounded-2xl border border-white/10 p-4"><ShieldCheck className="text-primary" size={26}/><div><p className="text-xs text-zinc-500">Administração / Usuários / Configurar acessos</p><h1 className="mt-1 text-xl font-semibold">Permissões de {authInfo.user.email}</h1><p className="mt-1 text-xs text-zinc-400">Somente o administrador define a quais clientes este usuário tem acesso.</p></div></header>
 {!accepted?<Card><p className="text-sm text-amber-200">O usuário ainda não aceitou o convite. A configuração de acesso será liberada após a confirmação da conta.</p></Card>:null}
 <Card><h2 className="font-semibold">Adicionar acesso a cliente</h2><p className="mt-2 text-xs text-zinc-400">Selecione o cliente, a função e a ativação. Um usuário pode ter permissões diferentes em cada cliente.</p>
 {accepted?<div className="mt-4"><ActionForm action={saveMember} label="Adicionar acesso">
 <input type="hidden" name="user_id" value={userId}/>
 <label>Cliente<select name="organization_id" required>{clients.filter(o=>o.status==='active'&&!existing.some(m=>m.organization_id===o.id)).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
 <label>Perfil<select name="role" defaultValue="viewer"><option value="viewer">Visualizador — somente leitura</option><option value="editor">Editor — operação</option><option value="client_admin">Administrador do cliente — gestão local</option></select></label>
 <label className="!flex-row items-center gap-2"><input name="is_active" type="checkbox" defaultChecked/>Acesso ativo</label>
 </ActionForm></div>:null}
 </Card>
 <Card><h2 className="font-semibold">Clientes e níveis de acesso</h2><div className="mt-4 space-y-3">{existing.map(m=><div key={m.organization_id} className="rounded-xl border border-white/10 p-4"><p className="mb-3 text-sm font-semibold">{clients.find(o=>o.id===m.organization_id)?.name??'Cliente não encontrado'}</p>{m.role==='super_admin'?<p className="text-xs text-zinc-500">Perfil protegido</p>:<ActionForm action={saveMember} label="Salvar configuração"><input type="hidden" name="user_id" value={userId}/><input type="hidden" name="organization_id" value={m.organization_id}/><label>Perfil<select name="role" defaultValue={m.role}><option value="viewer">Visualizador</option><option value="editor">Editor</option><option value="client_admin">Administrador do cliente</option></select></label><label className="!flex-row items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={m.is_active}/>Acesso ativo</label></ActionForm>}</div>)}{!existing.length?<p className="text-sm text-zinc-500">Nenhum cliente associado. O usuário não pode visualizar dashboards até que você configure o acesso.</p>:null}</div></Card>
 </main>;
}
