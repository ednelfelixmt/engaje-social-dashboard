import Link from 'next/link';
import {Activity,AlertTriangle,CheckCircle2,Clock3,PlugZap} from 'lucide-react';
import {Card} from '@/components/ui/card';
type Source={provider:string;status:string;is_enabled:boolean;last_synced_at:string|null;last_error:string|null};
type Latest={platform:string;metric_date:string;synced_at:string|null};
const providerLabel:Record<string,string>={meta_ads:'Meta Ads',google_ads:'Google Ads',tiktok_ads:'TikTok Ads',facebook_organic:'Facebook orgânico',instagram_organic:'Instagram orgânico',windsor:'Windsor',tiktok_organic:'TikTok orgânico'};
function daysBetween(today:string,date:string){return Math.max(0,Math.floor((Date.parse(today+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000));}
function shortDate(date:string|null){if(!date)return 'Sem registro';const value=date.slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):date;}
export function DataFreshnessPanel({sources,latest,slug,today}:{sources:Source[];latest:Latest[];slug:string;today:string}){
 const current=new Map<string,Latest>();
 for(const row of latest){if(!current.has(row.platform)||current.get(row.platform)!.metric_date<row.metric_date)current.set(row.platform,row);}
 const paidSources=sources.filter(s=>['meta_ads','google_ads','tiktok_ads','windsor'].includes(s.provider));
 const expired=paidSources.filter(s=>s.status==='expired'||s.status==='error');
 const connected=paidSources.filter(s=>s.status==='connected'&&s.is_enabled);
 const disabled=paidSources.filter(s=>!s.is_enabled&&s.status!=='expired'&&s.status!=='error');
 const lastPaid=[...current.values()].filter(x=>['meta_ads','google_ads','tiktok_ads'].includes(x.platform)).sort((a,b)=>b.metric_date.localeCompare(a.metric_date))[0];
 const delay=lastPaid?daysBetween(today,lastPaid.metric_date):null;
 const stale=delay===null||delay>2;
 if(!stale&&!expired.length&&!disabled.length)return null;
 return <section data-tv-panel aria-label="Saúde dos dados das integrações">
 <Card className="border-amber-400/25 bg-amber-400/[.045]">
 <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><AlertTriangle size={19} className="text-amber-300"/><h2 className="text-lg font-semibold text-white">Atenção à atualização dos dados</h2></div><p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-300">Este painel utiliza registros reais do Supabase. Dados históricos e conexões cadastradas não significam que as plataformas estejam sincronizando agora.</p></div><Link href={`/${slug}/settings/integrations`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-400/20"><PlugZap size={16}/>Verificar e reconectar</Link></div>
 <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
 <div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-xs uppercase tracking-wider text-zinc-400">Última data de anúncios</p><strong className="mt-2 block text-xl text-white">{shortDate(lastPaid?.metric_date??null)}</strong><p className="mt-2 text-xs text-zinc-400">{delay===null?'Não há métricas de anúncios':delay===0?'Dados registrados para hoje':`Últimos dados de ${delay} dia(s) atrás`}</p></div>
 <div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-xs uppercase tracking-wider text-zinc-400">Integrações pagas ativas</p><strong className="mt-2 block text-xl text-white">{connected.length}</strong><p className="mt-2 text-xs text-zinc-400">Conectadas e habilitadas; não garante atividade de anúncios</p></div>
 <div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-xs uppercase tracking-wider text-zinc-400">Credenciais com problema</p><strong className="mt-2 block text-xl text-amber-200">{expired.length}</strong><p className="mt-2 text-xs text-zinc-400">Expiradas ou com erro reportado</p></div>
 <div className="rounded-xl border border-white/10 bg-black/15 p-4"><p className="text-xs uppercase tracking-wider text-zinc-400">Conexões desabilitadas</p><strong className="mt-2 block text-xl text-white">{disabled.length}</strong><p className="mt-2 text-xs text-zinc-400">Não elegíveis para sincronização automática</p></div>
 </div>
 <div className="mt-4 flex flex-wrap gap-2">{paidSources.map((s,index)=>{const good=s.status==='connected'&&s.is_enabled;return <span key={s.provider+index} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${good?'border-emerald-400/20 text-emerald-200':'border-amber-400/20 text-amber-100'}`}>{good?<CheckCircle2 size={13}/>:s.status==='expired'?<Clock3 size={13}/>:<Activity size={13}/>} {providerLabel[s.provider]??s.provider}: {s.status==='expired'?'Autorização expirada':s.status==='error'?'Erro':!s.is_enabled?'Desabilitada':'Conectada'}</span>;})}</div>
 {stale?<p className="mt-4 text-xs leading-5 text-amber-100">Dados de mídia paga estão ausentes ou desatualizados. Verifique se houve veiculação no período e valide credenciais e sincronização antes de apresentar análises como atuais.</p>:null}
 </Card></section>;
}
