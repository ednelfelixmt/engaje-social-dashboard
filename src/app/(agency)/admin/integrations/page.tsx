import Link from 'next/link';
import {ArrowUpRight, CheckCircle2, KeyRound, Plug, RefreshCw, TriangleAlert} from 'lucide-react';
import {requireAdmin} from '@/lib/auth/session';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';

const providerLabels: Record<string, string> = {meta_ads:'Meta',facebook_organic:'Meta / Facebook',instagram_organic:'Meta / Instagram',google_ads:'Google Ads',google_business:'Google Business Profile',youtube:'YouTube',tiktok_ads:'TikTok Ads',tiktok_organic:'TikTok orgânico',windsor:'Windsor.ai',stract:'Stract'};

export default async function Page() {
  const {db} = await requireAdmin();
  const [{data: connections, error: connectionsError}, {data: organizations, error: organizationsError}] = await Promise.all([
    db.from('platform_connections').select('id,target_organization_id,provider,external_user_id,account_name,status,scopes,last_discovered_at,last_error,updated_at').order('updated_at', {ascending:false}),
    db.from('organizations').select('id,name,slug').eq('is_agency', false).order('name'),
  ]);
  if (connectionsError) throw connectionsError;
  if (organizationsError) throw organizationsError;
  const orgById = new Map((organizations ?? []).map((item) => [item.id, item]));
  const connected = (connections ?? []).filter((item) => item.status === 'connected').length;
  const attention = (connections ?? []).filter((item) => ['error','expired'].includes(item.status)).length;

  return <div className="space-y-6">
    <div><p className="eyebrow mb-2">Autenticações da agência</p><h1 className="text-3xl font-semibold">Conexões de plataformas</h1><p className="muted mt-2 max-w-3xl">Esta área mostra apenas conexões OAuth. Contas, páginas, pixels e demais ativos aparecem exclusivamente dentro do cliente ao qual foram atribuídos.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><Card className="flex items-center gap-4 p-4"><Plug className="text-primary" /><div><strong className="text-xl">{connections?.length ?? 0}</strong><p className="muted text-xs">autenticações</p></div></Card><Card className="flex items-center gap-4 p-4"><CheckCircle2 className="text-emerald-400" /><div><strong className="text-xl">{connected}</strong><p className="muted text-xs">conectadas</p></div></Card><Card className="flex items-center gap-4 p-4"><TriangleAlert className={attention?'text-red-300':'text-zinc-500'} /><div><strong className="text-xl">{attention}</strong><p className="muted text-xs">exigem atenção</p></div></Card></div>
    <div className="grid gap-4 xl:grid-cols-2">{connections?.map((connection) => {
      const organization=connection.target_organization_id?orgById.get(connection.target_organization_id):undefined;
      return <Card className="space-y-4" key={connection.id}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound size={19} /></span><div><h2 className="font-semibold">{connection.account_name}</h2><p className="muted mt-1 text-xs">{providerLabels[connection.provider]??connection.provider} · {connection.external_user_id}</p></div></div><span className={`connector-badge ${connection.status==='connected'?'text-emerald-300':'text-amber-300'}`}>{connection.status}</span></div><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="muted text-xs">Cliente de destino</p><strong className="mt-1 block">{organization?.name??'Agência'}</strong></div><div className="rounded-xl border border-white/10 bg-black/10 p-3"><p className="muted text-xs">Última descoberta</p><strong className="mt-1 block text-xs">{connection.last_discovered_at?new Date(connection.last_discovered_at).toLocaleString('pt-BR'):'Ainda não executada'}</strong></div></div>{connection.last_error?<p className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">{connection.last_error}</p>:null}{organization?<Button asChild variant="outline"><Link href={`/${organization.slug}/settings/integrations`}>Gerenciar ativos <ArrowUpRight size={16} /></Link></Button>:null}</Card>;
    })}</div>
    {!connections?.length?<Card className="border-dashed py-10 text-center"><RefreshCw className="mx-auto mb-3 text-zinc-500" /><p>Nenhuma plataforma autenticada.</p><p className="muted mt-2 text-sm">Abra um cliente e conecte a plataforma para descobrir os ativos disponíveis.</p></Card>:null}
  </div>;
}
