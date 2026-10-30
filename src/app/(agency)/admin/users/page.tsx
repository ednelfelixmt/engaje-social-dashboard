import Link from 'next/link';
import {ShieldCheck, UserPlus, ChevronDown} from 'lucide-react';
import {requireAdmin} from '@/lib/auth/session';
import {administrationKey} from '@/lib/auth/administration-key';
import {ActionForm} from '@/components/action-form';
import {AdminCollection} from '@/components/admin/collection';
import {Card} from '@/components/ui/card';
import {inviteClientUser} from '../actions';

const roleLabels:Record<string,string>={super_admin:'Administrador da agência',client_admin:'Perfil antigo — regularizar',editor:'Perfil antigo — regularizar',viewer:'Visualizador'};
const date=(value:string|undefined)=>value?new Date(value).toLocaleDateString('pt-BR',{timeZone:'America/Cuiaba'}):'Não registrado';

export default async function Page({searchParams}:{searchParams?:Promise<Record<string,string|undefined>>}){
  const {db}=await requireAdmin();
  const search=await searchParams??{};
  const directoryPage=/^[1-9]\d{0,3}$/.test(search.page??'')?Number(search.page):1;
  const [orgResult,memberResult]=await Promise.all([
    db.from('organizations').select('id,name,slug,status,is_agency').order('name'),
    db.from('organization_members').select('organization_id,user_id,role,is_active,created_at').order('created_at',{ascending:false}),
  ]);
  if(orgResult.error||memberResult.error)throw orgResult.error??memberResult.error;
  const orgs=orgResult.data??[], members=memberResult.data??[];
  const activeOrganizations=new Set(orgs.filter(org=>org.status==='active').map(org=>org.id));
  const secret=administrationKey(process.env);
  const service=secret?await (async()=>{
    const {createClient}=await import('@supabase/supabase-js');
    const {supabaseUrl}=await import('@/lib/supabase/config');
    return createClient(supabaseUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  })():null;
  const [directory,invitationResult]=service?await Promise.all([
    service.auth.admin.listUsers({page:directoryPage,perPage:200}),
    service.from('agency_user_invitations').select('id,user_id,email,status,invited_at,expires_at,accepted_at').order('invited_at',{ascending:false}).limit(60),
  ]):[null,null];
  const users=directory?.data.users??[];
  const invitations=invitationResult?.data??[];
  const now=Date.now();
  const pending=invitations.filter(i=>i.status==='pending'&&new Date(i.expires_at).getTime()>now).length;
  const unresolved=members.filter(m=>!users.some(user=>user.id===m.user_id));
  return <div className="admin-management space-y-6">
    <header className="admin-page-heading"><div><p className="eyebrow">Administração · Segurança</p><h1>Usuários e acessos</h1><p className="muted">Contas, clientes autorizados e convites em um só lugar. Clientes têm acesso somente de leitura.</p></div><ShieldCheck size={27} className="text-primary"/></header>
    <div className="admin-summary-grid"><Card><span>Contas consultadas</span><strong>{!directory||directory.error?'—':users.length}</strong></Card><Card><span>Pessoas com vínculo ativo</span><strong>{new Set(members.filter(m=>m.is_active&&activeOrganizations.has(m.organization_id)).map(m=>m.user_id)).size}</strong></Card><Card><span>Convites pendentes</span><strong>{!invitationResult||invitationResult.error?'—':pending}</strong></Card></div>
    <Card><details className="admin-create"><summary><div><h2>Convidar novo usuário</h2><p>Cadastre a conta por e-mail; depois selecione os clientes que ela pode consultar.</p></div><span><UserPlus size={16}/> Novo convite</span></summary><div className="pt-5">{service?<ActionForm action={inviteClientUser} label="Enviar convite"><label>E-mail do destinatário<input type="email" name="email" required maxLength={254} placeholder="usuario@empresa.com.br" autoComplete="off"/></label><p className="muted text-xs">O envio depende da configuração de e-mail. O convite não concede acesso a nenhum cliente automaticamente.</p></ActionForm>:<p role="alert">O serviço administrativo precisa ser configurado no servidor para enviar convites.</p>}</div></details></Card>
    {!directory||directory.error?<div className="admin-notice" role="alert"><strong>Não foi possível consultar as contas</strong><p>{!service?'O servidor não possui credencial administrativa configurada.':'A consulta ao serviço de contas falhou. Verifique a credencial administrativa no ambiente do servidor.'} Os vínculos existentes foram preservados e aparecem abaixo.</p></div>:<>
      <AdminCollection label="usuários" statuses={[{value:'linked',label:'Com vínculo ativo'},{value:'unlinked',label:'Sem vínculo ativo'},{value:'pending',label:'E-mail pendente'}]} entries={users.map(user=>{
        const links=members.filter(m=>m.user_id===user.id);
        const active=links.filter(m=>m.is_active&&activeOrganizations.has(m.organization_id));
        const privileged=links.some(m=>m.role==='super_admin');
        return {id:user.id,name:user.email??'Conta sem e-mail',status:!user.email_confirmed_at?'pending':active.length?'linked':'unlinked',search:links.map(m=>orgs.find(o=>o.id===m.organization_id)?.name??'').join(' '),content:<article className="admin-user-row"><header><div className="admin-user-avatar">{(user.email??'?')[0].toUpperCase()}</div><div><strong>{user.email??'Conta sem e-mail'}</strong><small>Criado em {date(user.created_at)} · Último acesso {date(user.last_sign_in_at)}</small></div><span className={`admin-status ${user.email_confirmed_at?'is-good':''}`}>{user.email_confirmed_at?'Confirmado':'E-mail pendente'}</span><span className="admin-user-role">{privileged?'Administrador da agência':active.length?active.length+' vínculo(s) ativo(s)':'Sem cliente vinculado'}</span>{privileged?<span className="muted text-xs">Protegido</span>:<Link className="admin-row-action" href={'/admin/users/'+user.id}>Configurar acesso →</Link>}</header><div className="admin-user-clients">{links.map(m=>{const org=orgs.find(o=>o.id===m.organization_id);return <span key={m.organization_id} data-inactive={!m.is_active||org?.status==='paused'}>{org?.name??'Cliente não encontrado'} · {roleLabels[m.role]??m.role}{!m.is_active?' · Suspenso':org?.status==='paused'?' · Cliente pausado':''}</span>;})}{!links.length?<span>Nenhuma organização autorizada</span>:null}</div></article>};
      })}/>
      <div className="admin-pagination"><span>Consulta {directoryPage} · até 200 contas. Busca e filtros atuam sobre esta consulta.</span>{directoryPage>1?<Link href={'/admin/users?page='+(directoryPage-1)}>Consulta anterior</Link>:null}{directory.data.nextPage?<Link href={'/admin/users?page='+(directoryPage+1)}>Próximas contas →</Link>:null}</div>
    </>}
    {unresolved.length?<Card><h2 className="text-lg font-semibold">Vínculos sem identificação de conta disponível</h2><p className="muted mt-2 text-sm">A identificação depende da consulta administrativa. Nenhum vínculo foi removido ou alterado.</p><div className="mt-4 overflow-x-auto"><table><thead><tr><th>Conta</th><th>Cliente</th><th>Perfil</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{unresolved.map(m=><tr key={m.organization_id+m.user_id}><td>{invitations.find(i=>i.user_id===m.user_id)?.email??'Conta '+m.user_id.slice(0,8)}</td><td>{orgs.find(o=>o.id===m.organization_id)?.name??'Organização não encontrada'}</td><td>{roleLabels[m.role]??m.role}</td><td>{m.is_active?'Ativo':'Suspenso'}</td><td>{m.role==='super_admin'?'Protegido':<Link href={'/admin/users/'+m.user_id}>Configurar acessos →</Link>}</td></tr>)}</tbody></table></div></Card>:null}
    <Card><details><summary className="admin-detail-summary"><div><h2>Convites enviados</h2><p>Acompanhe entrega solicitada, aceitação e expiração.</p></div><ChevronDown size={18}/></summary>{!invitationResult||invitationResult.error?<p className="admin-notice" role="alert">Não foi possível consultar os convites. A ausência da consulta não significa que não há convites.</p>:<div className="mt-4 overflow-x-auto"><table><thead><tr><th>E-mail</th><th>Situação</th><th>Enviado em</th><th>Acesso</th></tr></thead><tbody>{invitations.map(inv=><tr key={inv.id}><td>{inv.email}</td><td>{inv.status==='pending'&&new Date(inv.expires_at).getTime()<now?'Expirado':inv.status==='accepted'?'Aceito':inv.status==='pending'?'Aguardando aceitação':inv.status==='revoked'?'Revogado':'Expirado'}</td><td>{date(inv.invited_at)}</td><td>{inv.status==='accepted'?<Link href={'/admin/users/'+inv.user_id}>Configurar acessos →</Link>:'Aguardando cadastro'}</td></tr>)}{!invitations.length?<tr><td colSpan={4}>Nenhum convite registrado.</td></tr>:null}</tbody></table></div>}</details></Card>
    <Card><details><summary className="admin-detail-summary"><div><h2>Níveis de permissão</h2><p>Somente administradores da agência podem alterar clientes, integrações e acessos.</p></div><ChevronDown size={18}/></summary><div className="mt-4 overflow-x-auto"><table><thead><tr><th>Permissão</th><th>Administrador da agência</th><th>Visualizador do cliente</th></tr></thead><tbody>{[['Relatórios, gráficos e filtros','Permitido','Somente clientes vinculados'],['Cadastro de clientes e usuários','Permitido','Negado'],['Integrações e ativos','Gerenciar','Somente consultar resultados'],['Configurações, dados e arquivos','Gerenciar','Somente leitura'],['Compartilhamento e permissões','Gerenciar','Negado']].map(row=><tr key={row[0]}>{row.map(cell=><td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div></details></Card>
  </div>;
}
