import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AlertTriangle,CheckCircle2,Clock3,Database,ExternalLink,ShieldCheck} from 'lucide-react';
import {tenant,editorAccess} from '@/lib/auth/session';
import {Card} from '@/components/ui/card';
import {all} from '@/lib/metrics/query';
import type {Row} from '@/types/database.types';

const platforms=['meta_ads','google_ads','tiktok_ads'] as const;
const names:Record<string,string>={meta_ads:'Meta Ads',google_ads:'Google Ads',tiktok_ads:'TikTok Ads',facebook_organic:'Facebook orgânico',instagram_organic:'Instagram orgânico'};
type PlatformName=typeof platforms[number];
type Health={platform:PlatformName;campaigns:number;rows:number;days:number;first:string|null;latest:string|null;lastReceived:string|null;age:number|null;integrations:number;connected:number;expired:number;breakdowns:Record<string,number>;status:'recent'|'delayed'|'missing'};
function labelDate(v:string|null){return v?v.slice(0,10).split('-').reverse().join('/'):'—';}
function dateDiff(today:string,source:string){return Math.max(0,Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(source+'T12:00:00Z'))/86400000));}
export default async function Page({params:pending}:{params:Promise<{organizationSlug:string}>}){
 const {organizationSlug}=await pending,{db,org,superAdmin,user}=await tenant(organizationSlug);
 if(!superAdmin){
  const check=await editorAccess(organizationSlug);
  if(!check.canEdit)notFound();
 }
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:org.timezone}).format(new Date());
 // Administrative diagnostics only. All queries remain scoped to the authenticated tenant.
 const [integrations,rawMetrics,dimensions,recentJobs]=await Promise.all([
   all<Pick<Row<'integrations'>,'provider'|'status'|'is_enabled'|'last_synced_at'|'last_error'>>((a,b)=>db.from('integrations').select('provider,status,is_enabled,last_synced_at,last_error').eq('organization_id',org.id).order('id').range(a,b)),
   all<Pick<Row<'metrics_ads'>,'metric_date'|'platform'|'campaign_id'|'synced_at'>>((a,b)=>db.from('metrics_ads').select('metric_date,platform,campaign_id,synced_at').eq('organization_id',org.id).order('id').range(a,b)),
   all<Pick<Row<'metrics_ads_breakdowns'>,'platform'|'dimension_type'>>((a,b)=>db.from('metrics_ads_breakdowns').select('platform,dimension_type').eq('organization_id',org.id).order('id').range(a,b)),
   db.from('sync_jobs').select('id,status,started_at,completed_at,rows_processed').eq('organization_id',org.id).order('started_at',{ascending:false}).limit(12),
 ]);
 if(recentJobs.error)throw recentJobs.error;
 const items:Health[]=platforms.map(platform=>{
  const records=rawMetrics.filter(r=>r.platform===platform);
  const dates=[...new Set(records.map(r=>r.metric_date))].sort();
  const loaded=records.map(r=>r.synced_at).filter((r):r is string=>!!r).sort();
  const active=integrations.filter(r=>r.provider===platform);
  const age=dates.length?dateDiff(today,dates[dates.length-1]):null;
  const breakdowns:Record<string,number>={};
  for(const row of dimensions.filter(r=>r.platform===platform))breakdowns[row.dimension_type]=(breakdowns[row.dimension_type]??0)+1;
  return {platform,campaigns:new Set(records.map(r=>r.campaign_id)).size,rows:records.length,days:dates.length,first:dates[0]??null,latest:dates.at(-1)??null,lastReceived:loaded.at(-1)??null,age,integrations:active.length,connected:active.filter(r=>r.status==='connected'&&r.is_enabled).length,expired:active.filter(r=>r.status==='expired'||r.status==='error').length,breakdowns,status:age===null?'missing':age<=2?'recent':'delayed'};
 });
 const latestJobs=recentJobs.data??[];
 return <main className="mx-auto max-w-[1600px] space-y-5">
 <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-zinc-500">Configurações / Integrações</p><h1 className="mt-2 text-2xl font-semibold text-white">Qualidade e cobertura dos dados</h1><p className="mt-2 text-sm text-zinc-400">Diagnóstico técnico de {org.name}, restrito aos administradores e editores autorizados.</p></div><Link href={`/${org.slug}/settings/integrations`} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200"><ExternalLink size={14}/>Gerenciar conexões</Link></header>
 <div className="grid gap-3 sm:grid-cols-3">
  <Card className="!p-4"><p className="text-xs text-zinc-400">Registros de campanhas</p><p className="mt-2 text-2xl font-semibold">{rawMetrics.length.toLocaleString('pt-BR')}</p><p className="mt-2 text-xs text-zinc-500">Linhas armazenadas — não indica campanhas únicas</p></Card>
  <Card className="!p-4"><p className="text-xs text-zinc-400">Detalhamentos demográficos</p><p className="mt-2 text-2xl font-semibold">{dimensions.length.toLocaleString('pt-BR')}</p><p className="mt-2 text-xs text-zinc-500">Inclui diferentes dimensões e períodos</p></Card>
  <Card className="!p-4"><p className="text-xs text-zinc-400">Contas publicitárias válidas</p><p className="mt-2 text-2xl font-semibold">{items.reduce((n,r)=>n+r.connected,0)}</p><p className="mt-2 text-xs text-zinc-500">Conectadas e habilitadas; não garante coleta</p></Card>
 </div>
 <section className="grid gap-4 xl:grid-cols-3">{items.map(item=><Card key={item.platform} className="!p-4"><div className="flex items-center justify-between gap-2"><h2 className="font-semibold">{names[item.platform]}</h2><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${item.status==='recent'?'border-emerald-400/30 text-emerald-300':item.status==='delayed'?'border-amber-400/30 text-amber-200':'border-white/15 text-zinc-400'}`}>{item.status==='recent'?'Dados recentes':item.status==='delayed'?'Histórico desatualizado':'Sem histórico'}</span></div>
 <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-zinc-500">Campanhas</p><strong>{item.campaigns}</strong></div><div><p className="text-xs text-zinc-500">Dias com dados</p><strong>{item.days}</strong></div><div><p className="text-xs text-zinc-500">Primeira data</p><strong>{labelDate(item.first)}</strong></div><div><p className="text-xs text-zinc-500">Última data</p><strong>{labelDate(item.latest)}</strong></div></div>
 <div className="mt-4 rounded-lg border border-white/10 bg-black/15 p-3 text-xs leading-5 text-zinc-400"><div className="flex items-center justify-between"><span>Conexões registradas</span><strong className="text-white">{item.integrations}</strong></div><div className="mt-2 flex items-center justify-between"><span>Credenciais com falha</span><strong className={item.expired?'text-amber-200':'text-zinc-200'}>{item.expired}</strong></div><div className="mt-2 flex items-center justify-between"><span>Última ingestão registrada</span><strong className="text-zinc-200">{labelDate(item.lastReceived)}</strong></div></div>
 {item.age!==null?<p className="mt-3 text-xs text-zinc-500">O último dia de métricas está a {item.age} dia(s) da data local.</p>:<p className="mt-3 text-xs text-zinc-500">Nenhuma métrica armazenada para este canal.</p>}
 </Card>)}</section>
 <div className="grid gap-4 lg:grid-cols-2">
 <Card className="!p-4"><div className="flex items-center gap-2"><Database size={18} className="text-primary"/><h2 className="font-semibold">Cobertura de dimensões</h2></div><p className="mt-2 text-xs leading-5 text-zinc-400">Contagem de registros por dimensão. Idade e gênero separados não permitem cruzamento real de perfis.</p>
 <div className="mt-3 space-y-3">{items.map(item=><div key={item.platform} className="rounded-lg border border-white/10 p-3"><p className="text-xs font-semibold">{names[item.platform]}</p><div className="mt-2 flex flex-wrap gap-2">{['age','gender','age_gender','device','state','city','country'].map(d=><span key={d} className={`rounded-md border px-2 py-1 text-[10px] ${item.breakdowns[d]?'border-emerald-400/20 text-emerald-200':'border-white/10 text-zinc-500'}`}>{d}: {item.breakdowns[d]??0}</span>)}</div></div>)}</div></Card>
 <Card className="!p-4"><div className="flex items-center gap-2"><Clock3 size={18} className="text-primary"/><h2 className="font-semibold">Últimos trabalhos de sincronização</h2></div><p className="mt-2 text-xs text-zinc-500">Histórico disponível em sync_jobs. Agendamentos externos podem não registrar cada disparo aqui.</p><div className="mt-4 space-y-2">{latestJobs.length?latestJobs.map(job=><div key={job.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 p-3"><div><p className="text-xs text-zinc-200">{job.status}</p><p className="text-[11px] text-zinc-500">{job.started_at?new Date(job.started_at).toLocaleString('pt-BR',{timeZone:org.timezone}):'Sem início'}</p></div><strong className="text-sm">{job.rows_processed??0} registros</strong></div>):<p className="text-sm text-zinc-500">Nenhum trabalho registrado.</p>}</div></Card>
 </div>
 <Card className="!p-4"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-primary"/><h2 className="font-semibold">Interpretação e próximos passos</h2></div><p className="mt-3 text-sm leading-6 text-zinc-400">Dias sem registros não comprovam falha: podem representar ausência de anúncios. Compare com histórico de veiculação e logs de API antes de abrir um incidente. Credenciais expiradas devem ser renovadas com autorização do titular. Uma sincronização só é considerada homologada após conferir métricas com a fonte oficial.</p><Link className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-black" href={`/${org.slug}/settings/integrations`}>Revisar integrações e revalidar</Link></Card>
 </main>;
}
