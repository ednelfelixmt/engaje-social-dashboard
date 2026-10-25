import Link from 'next/link';
import {notFound} from 'next/navigation';
import {z} from 'zod';
import {requireAdmin} from '@/lib/auth/session';
import {adminAuditDescription,adminAuditLabels,parseAdminAudit} from '@/lib/auth/admin-audit';
import {isValidTimezone} from '@/lib/organization-options';
import {Card} from '@/components/ui/card';

export default async function ClientActivity({params}:{params:Promise<{organizationId:string}>}){
  const {db}=await requireAdmin();
  const id=z.string().uuid().safeParse((await params).organizationId);
  if(!id.success)notFound();
  const {data:org,error:orgError}=await db.from('organizations').select('id,name,timezone').eq('id',id.data).eq('is_agency',false).maybeSingle();
  if(orgError)throw orgError;
  if(!org)notFound();
  const {data,error}=await db.rpc('client_admin_audit',{p_organization_id:org.id,p_limit:100});
  const events=error?null:parseAdminAudit(data);
  const timezone=isValidTimezone(org.timezone)?org.timezone:'UTC';
  const date=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'medium',timeZone:timezone});
  return <main className="space-y-5">
    <Link href="/admin/organizations" className="text-sm text-zinc-400 underline">Voltar a clientes</Link>
    <header><h1 className="text-2xl font-semibold">Histórico de alterações</h1><p className="mt-2 text-sm text-zinc-300">{org.name}</p><p className="muted mt-1 text-sm">Cadastros de clientes, aplicação de funis e alterações de acesso pela agência. Até 100 registros mais recentes; horários em {timezone}.</p></header>
    <Card>{events===null?<div role="status"><p>Não foi possível carregar o histórico de alterações.</p><a className="mt-2 inline-block text-primary underline" href={'/admin/organizations/'+org.id+'/activity'}>Tentar novamente</a></div>:events.length===0?<p className="muted">Nenhuma alteração administrativa registrada.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><caption className="sr-only">Histórico administrativo de {org.name}</caption><thead><tr><th scope="col">Data e hora</th><th scope="col">Alteração</th><th scope="col">Administrador</th><th scope="col">Usuário afetado</th></tr></thead><tbody>{events.map(event=><tr key={event.id}><td><time dateTime={event.occurred_at}>{date.format(new Date(event.occurred_at))}</time></td><td><strong>{adminAuditLabels[event.event]}</strong><p className="muted mt-1 text-xs">{adminAuditDescription(event)}</p></td><td><Link className="text-primary underline" title={event.actor_id} href={'/admin/users/'+event.actor_id}>{event.actor_id.slice(0,8)}</Link></td><td>{event.subject_user_id?<Link className="text-primary underline" title={event.subject_user_id} href={'/admin/users/'+event.subject_user_id}>{event.subject_user_id.slice(0,8)}</Link>:'—'}</td></tr>)}</tbody></table></div>}</Card>
  </main>;
}
