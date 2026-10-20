import Link from 'next/link';
import {ShieldCheck,UserPlus,Users,LockKeyhole,ExternalLink} from 'lucide-react';
import {requireAdmin} from '@/lib/auth/session';
import {ActionForm} from '@/components/action-form';
import {Card} from '@/components/ui/card';
import {inviteClientUser,saveMember} from '../actions';
const roleLabels:Record<string,string>={super_admin:'Superadministrador',client_admin:'Administrador do cliente',editor:'Editor',viewer:'Visualizador'};
export default async function Page(){
 const {db}=await requireAdmin();
 const [{data:orgs},{data:members}]=await Promise.all([
   db.from('organizations').select('id,name,slug,status,is_agency').order('name'),
   db.from('organization_members').select('organization_id,user_id,role,is_active,created_at').order('created_at',{ascending:false})
 ]);
 const clients=(orgs??[]).filter(o=>!o.is_agency);
 const active=(members??[]).filter(m=>m.is_active).length;
 return <div className="mx-auto max-w-[1450px] space-y-6">
  <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Administração · Segurança</p><h1 className="mt-2 text-3xl font-semibold">Usuários e gestão de acesso</h1><p className="muted mt-3 max-w-3xl text-sm leading-6">Convide pessoas, atribua funções por cliente e suspenda acessos. Um usuário só consulta organizações às quais possui permissão ativa.</p></div><ShieldCheck className="text-primary" size={28}/></header>
  <section className="grid gap-3 sm:grid-cols-3">{[{name:'Vínculos ativos',value:active},{name:'Vínculos suspensos',value:(members?.length??0)-active},{name:'Clientes cadastrados',value:clients.length}].map(t=><Card key={t.name}><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{t.name}</p><strong className="mt-3 block text-3xl text-white">{t.value}</strong></Card>)}</section>
  <section className="grid gap-5 xl:grid-cols-2">
  <Card><div className="mb-5 flex items-center gap-2"><UserPlus className="text-primary" size={19}/><h2 className="text-lg font-semibold">Convidar por e-mail</h2></div>
   <ActionForm action={inviteClientUser} label="Enviar convite"><label>Cliente<select name="organization_id" required>{clients.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></label><label>E-mail do destinatário<input type="email" name="email" required placeholder="cliente@empresa.com.br" autoComplete="off"/></label><label>Perfil<select name="role" defaultValue="viewer"><option value="viewer">Visualizador — leitura</option><option value="editor">Editor — operação</option><option value="client_admin">Administrador do cliente</option></select></label><p className="text-xs leading-5 text-zinc-500">O convite usa o Supabase Auth. Requer SUPABASE_SERVICE_ROLE_KEY configurada somente na Vercel e remetente de e-mail homologado.</p></ActionForm>
  </Card>
  <Card><div className="mb-5 flex items-center gap-2"><LockKeyhole className="text-primary" size={19}/><h2 className="text-lg font-semibold">Vincular usuário existente</h2></div>
   <ActionForm action={saveMember} label="Salvar permissão"><label>Cliente<select name="organization_id" required>{clients.map(o=><option value={o.id} key={o.id}>{o.name}</option>)}</select></label><label>UUID do Supabase Auth<input name="user_id" type="text" required placeholder="UUID do usuário já cadastrado"/></label><label>Perfil<select name="role" defaultValue="viewer"><option value="viewer">Visualizador</option><option value="editor">Editor</option><option value="client_admin">Administrador do cliente</option></select></label><label className="!flex-row items-center gap-2"><input type="checkbox" name="is_active" defaultChecked/>Permissão ativa</label></ActionForm>
   <p className="mt-3 text-xs text-zinc-500">Vinculações existentes também podem ser alteradas na tabela abaixo. O perfil superadministrador não pode ser alterado por esta interface.</p>
  </Card></section>
  <Card className="overflow-x-auto !p-0"><div className="flex items-center gap-2 border-b border-white/10 p-5"><Users size={19} className="text-primary"/><h2 className="text-lg font-semibold">Permissões atuais</h2></div>
   <div className="overflow-x-auto"><table className="w-full min-w-[850px]"><thead><tr><th>Usuário (UUID)</th><th>Cliente</th><th>Perfil</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{members?.map(m=><tr key={m.organization_id+m.user_id}><td><code className="text-xs">{m.user_id}</code></td><td>{orgs?.find(o=>o.id===m.organization_id)?.name??'Organização não encontrada'}</td><td>{roleLabels[m.role]??m.role}</td><td><span className={m.is_active?'text-emerald-300':'text-amber-300'}>{m.is_active?'Ativo':'Suspenso'}</span></td><td>{m.role==='super_admin'?<span className="text-xs text-zinc-500">Protegido</span>:<details className="min-w-48"><summary className="cursor-pointer text-xs font-semibold text-primary">Alterar acesso</summary><div className="pt-3"><ActionForm action={saveMember} label="Atualizar"><input type="hidden" name="organization_id" value={m.organization_id}/><input type="hidden" name="user_id" value={m.user_id}/><label className="text-xs">Perfil<select name="role" defaultValue={m.role}><option value="viewer">Visualizador</option><option value="editor">Editor</option><option value="client_admin">Administrador do cliente</option></select></label><label className="!flex-row items-center gap-2 text-xs"><input type="checkbox" name="is_active" defaultChecked={m.is_active}/>Acesso ativo</label></ActionForm></div></details>}</td></tr>)}{!members?.length?<tr><td colSpan={5} className="py-8 text-center text-zinc-500">Nenhum vínculo cadastrado.</td></tr>:null}</tbody></table></div>
  </Card>
  <Card><h2 className="font-semibold">Compartilhar dashboards com clientes</h2><p className="mt-2 text-sm text-zinc-400">Abra o cliente e selecione “Compartilhar dashboards” para copiar links de acesso restrito aos usuários cadastrados.</p><div className="mt-4 flex flex-wrap gap-2">{clients.map(o=><Link key={o.id} href={`/${o.slug}/sharing`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200 hover:border-primary/40"><ExternalLink size={14}/>{o.name}</Link>)}</div></Card>
 </div>;
}
