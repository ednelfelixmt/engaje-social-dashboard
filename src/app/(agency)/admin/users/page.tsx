import Link from 'next/link';
import {ShieldCheck,UserPlus,Users,ExternalLink} from 'lucide-react';
import {requireAdmin} from '@/lib/auth/session';
import {ActionForm} from '@/components/action-form';
import {Card} from '@/components/ui/card';
import {inviteClientUser} from '../actions';
const roleLabels:Record<string,string>={super_admin:'Administrador da agência',client_admin:'Perfil antigo — regularizar',editor:'Perfil antigo — regularizar',viewer:'Visualizador'};
export default async function Page(){
 const {db}=await requireAdmin();
 const [{data:orgs},{data:members}]=await Promise.all([
   db.from('organizations').select('id,name,slug,status,is_agency').order('name'),
   db.from('organization_members').select('organization_id,user_id,role,is_active,created_at').order('created_at',{ascending:false})
 ]);
 const clients=(orgs??[]).filter(o=>!o.is_agency);
 const active=(members??[]).filter(m=>m.is_active).length;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const invitations=secret?await (async()=>{
  const {createClient}=await import('@supabase/supabase-js');
  const {supabaseUrl}=await import('@/lib/supabase/config');
  const admin=createClient(supabaseUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data}=await admin.from('agency_user_invitations').select('id,user_id,email,status,invited_at,expires_at,accepted_at').order('invited_at',{ascending:false}).limit(60);
  return data??[];
 })():[];
 const pending=invitations.filter(i=>i.status==='pending'&&new Date(i.expires_at).getTime()>Date.now()).length;
 return <div className="mx-auto max-w-[1450px] space-y-6">
  <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Administração · Segurança</p><h1 className="mt-2 text-3xl font-semibold">Usuários e gestão de acesso</h1><p className="muted mt-3 max-w-3xl text-sm leading-6">Convide pessoas por e-mail e configure separadamente seus clientes, perfis e permissões. Um usuário só consulta organizações às quais possui permissão ativa.</p></div><ShieldCheck className="text-primary" size={28}/></header>
  <section className="grid gap-3 sm:grid-cols-4">{[{name:'Vínculos ativos',value:active},{name:'Convites pendentes',value:pending},{name:'Vínculos suspensos',value:(members?.length??0)-active},{name:'Clientes cadastrados',value:clients.length}].map(t=><Card key={t.name}><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{t.name}</p><strong className="mt-3 block text-3xl text-white">{t.value}</strong></Card>)}</section>
  <Card><h2 className="text-lg font-semibold">Níveis de permissão</h2><p className="mt-2 text-sm text-zinc-400">Os níveis são definidos exclusivamente pela agência. Acesso ao cliente nunca concede operações de cadastro, edição, integração ou exclusão.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead><tr><th>Permissão</th><th>Administrador da agência</th><th>Visualizador do cliente</th></tr></thead><tbody>{[['Relatórios, gráficos e filtros','Permitido','Somente clientes vinculados'],['Cadastro de clientes e usuários','Permitido','Negado'],['Integrações e ativos','Gerenciar','Somente consultar resultados'],['Configurações, dados e arquivos','Gerenciar','Somente leitura'],['Compartilhamento e permissões','Gerenciar','Negado']].map(row=><tr key={row[0]}><td>{row[0]}</td><td className="text-emerald-300">{row[1]}</td><td>{row[2]}</td></tr>)}</tbody></table></div><p className="mt-4 text-xs text-amber-300">Perfis antigos de editor/administrador do cliente devem ser revisados. Novos vínculos são exclusivamente Visualizador.</p></Card>
  <Card><div className="mb-5 flex items-center gap-2"><UserPlus className="text-primary" size={19}/><h2 className="text-lg font-semibold">Convidar novo usuário</h2></div>
   <ActionForm action={inviteClientUser} label="Enviar convite"><label>E-mail do destinatário<input type="email" name="email" required placeholder="usuario@empresa.com.br" autoComplete="off"/></label><p className="text-xs leading-5 text-zinc-500">O convite é para cadastrar uma conta no MediaHub. Cliente, perfil e permissões são definidos exclusivamente em Configurar acessos, depois do cadastro.</p></ActionForm>
  </Card>
  <Card className="!p-0"><div className="border-b border-white/10 p-5"><h2 className="font-semibold">Convites enviados</h2><p className="mt-1 text-xs text-zinc-400">Acesso pendente não equivale a acesso ativado.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[690px] text-xs"><thead><tr><th>E-mail</th><th>Situação</th><th>Enviado em</th><th>Acesso</th></tr></thead><tbody>{invitations.map(inv=><tr key={inv.id}><td>{inv.email}</td><td>{inv.status==='pending'&&new Date(inv.expires_at).getTime()<Date.now()?'Expirado':inv.status==='accepted'?'Aceito':inv.status==='pending'?'Aguardando aceitação':inv.status==='revoked'?'Revogado':'Expirado'}</td><td>{new Date(inv.invited_at).toLocaleDateString('pt-BR')}</td><td>{inv.status==='accepted'?<Link className="font-semibold text-primary" href={'/admin/users/'+inv.user_id}>Configurar acessos →</Link>:<span className="text-zinc-500">Aguardando cadastro</span>}</td></tr>)}{!invitations.length?<tr><td colSpan={5} className="p-5 text-center text-zinc-500">Nenhum convite registrado.</td></tr>:null}</tbody></table></div></Card>
  <Card className="overflow-x-auto !p-0"><div className="flex items-center gap-2 border-b border-white/10 p-5"><Users size={19} className="text-primary"/><h2 className="text-lg font-semibold">Permissões atuais</h2></div>
   <div className="overflow-x-auto"><table className="w-full min-w-[850px]"><thead><tr><th>Usuário</th><th>Cliente</th><th>Perfil</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{members?.map(m=><tr key={m.organization_id+m.user_id}><td><code className="text-xs">{invitations.find(i=>i.user_id===m.user_id)?.email??m.user_id}</code></td><td>{orgs?.find(o=>o.id===m.organization_id)?.name??'Organização não encontrada'}</td><td>{roleLabels[m.role]??m.role}</td><td><span className={m.is_active?'text-emerald-300':'text-amber-300'}>{m.is_active?'Ativo':'Suspenso'}</span></td><td>{m.role==='super_admin'?<span className="text-xs text-zinc-500">Protegido</span>:<Link className="text-xs font-semibold text-primary" href={'/admin/users/'+m.user_id}>Configurar acessos →</Link>}</td></tr>)}{!members?.length?<tr><td colSpan={5} className="py-8 text-center text-zinc-500">Nenhum vínculo cadastrado.</td></tr>:null}</tbody></table></div>
  </Card>
  <Card><h2 className="font-semibold">Compartilhar dashboards com clientes</h2><p className="mt-2 text-sm text-zinc-400">Abra o cliente e selecione “Compartilhar dashboards” para copiar links de acesso restrito aos usuários cadastrados.</p><div className="mt-4 flex flex-wrap gap-2">{clients.map(o=><Link key={o.id} href={`/${o.slug}/sharing`} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-200 hover:border-primary/40"><ExternalLink size={14}/>{o.name}</Link>)}</div></Card>
 </div>;
}
