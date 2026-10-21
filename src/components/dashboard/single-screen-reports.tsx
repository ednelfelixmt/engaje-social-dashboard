import Link from 'next/link';
import {ArrowUpRight,BarChart3,MousePointer2,Target,Wallet} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {money,number} from '@/lib/utils';
import type {CampaignPerformance} from '@/types/domain';
type Channel='meta_ads'|'google_ads'|'tiktok_ads';
const channelNames:Record<Channel,string>={meta_ads:'Meta Ads',google_ads:'Google Ads',tiktok_ads:'TikTok Ads'};
function metrics(rows:CampaignPerformance[]){
 const spend=rows.reduce((a,r)=>a+r.spend,0);
 const clicks=rows.some(r=>r.clicks!=null)?rows.reduce((a,r)=>a+(r.clicks??0),0):null;
 const impressions=rows.some(r=>r.impressions!=null)?rows.reduce((a,r)=>a+(r.impressions??0),0):null;
 const leads=rows.some(r=>r.leads!=null)?rows.reduce((a,r)=>a+(r.leads??0),0):null;
 const revenue=rows.length&&rows.every(r=>r.revenue!=null)?rows.reduce((a,r)=>a+(r.revenue??0),0):null;
 return {spend,clicks,impressions,leads,revenue,cpl:leads&&leads>0?spend/leads:null,ctr:impressions&&clicks!=null?clicks/impressions*100:null};
}
function Kpi({label,value,description}:{label:string;value:string;description?:string}){return <Card className="min-w-0 !p-4"><p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p><strong className="mt-2 block break-words text-2xl font-semibold text-white">{value}</strong>{description?<p className="mt-1 text-xs text-zinc-500">{description}</p>:null}</Card>;}
export function SingleScreenOverview({rows,currency,slug}:{rows:CampaignPerformance[];currency:string;slug:string}){
 const totals=metrics(rows);
 const paid=(['meta_ads','google_ads','tiktok_ads'] as Channel[]).map(platform=>({platform,data:rows.filter(r=>r.platform===platform)}));
 return <section className="space-y-4">
 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
 <Kpi label="Investimento consolidado" value={rows.length?money(totals.spend,currency):'—'} description="Soma das fontes de mídia paga"/>
 <Kpi label="Cliques" value={number(totals.clicks)} description="Eventos reportados por plataforma"/>
 <Kpi label="Leads atribuídos" value={number(totals.leads)} description="Sem deduplicação de pessoas entre canais"/>
 <Kpi label="Custo por lead" value={money(totals.cpl,currency)} description="Investimento / leads atribuídos"/>
 </div>
 <div className="grid gap-4 lg:grid-cols-3">{paid.map(({platform,data})=>{const m=metrics(data);return <Card key={platform} className="!p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">{channelNames[platform]}</h2><ArrowUpRight size={18} className="text-primary"/></div><p className="mt-1 text-xs text-zinc-500">{data.length?'Dados de campanha disponíveis':'Sem dados no período'}</p>
 <div className="mt-5 grid grid-cols-2 gap-4"><div><p className="text-xs text-zinc-500">Investimento</p><strong className="mt-1 block text-xl text-white">{data.length?money(m.spend,currency):'—'}</strong></div><div><p className="text-xs text-zinc-500">Leads</p><strong className="mt-1 block text-xl text-white">{number(m.leads)}</strong></div><div><p className="text-xs text-zinc-500">CTR</p><strong className="mt-1 block text-lg text-white">{m.ctr==null?'—':number(m.ctr,2)+'%'}</strong></div><div><p className="text-xs text-zinc-500">CPL</p><strong className="mt-1 block text-lg text-white">{money(m.cpl,currency)}</strong></div></div>
 <Link href={`/${slug}/${platform}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Abrir campanhas <ArrowUpRight size={15}/></Link></Card>;})}</div>
 <Card className="!p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Visão de negócio</h2><p className="mt-1 text-xs text-zinc-400">Interpretação consolidada dos indicadores disponíveis.</p></div><div className="flex items-center gap-2 text-xs text-zinc-400"><Target size={15}/>Decisões por canal</div></div><p className="mt-4 text-sm leading-6 text-zinc-300">O investimento e os eventos são somados entre plataformas. Conversões atribuídas podem se sobrepor; receitas e vendas consolidadas exigem conciliação com CRM. Utilize as páginas por plataforma para avaliar públicos, campanhas e dispositivos antes de realocar verbas.</p></Card>
 </section>;
}
export function SingleScreenCampaigns({rows,currency,platform,slug}:{rows:CampaignPerformance[];currency:string;platform:Channel;slug:string}){
 const m=metrics(rows),list=[...rows].sort((a,b)=>b.spend-a.spend).slice(0,12);
 return <section className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
 <Kpi label="Investimento" value={rows.length?money(m.spend,currency):'—'}/>
 <Kpi label="Impressões" value={number(m.impressions)}/>
 <Kpi label="Cliques" value={number(m.clicks)}/>
 <Kpi label="Leads" value={number(m.leads)}/>
 </div>
 <Card className="!p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Performance por campanha</p><h2 className="mt-2 text-lg font-semibold text-white">{channelNames[platform]} · Campanhas</h2></div><Link href={`/${slug}/reports/${platform==='meta_ads'?'meta-audience':'google-audience'}`} className="inline-flex rounded-xl border border-primary/30 px-4 py-2 text-sm font-semibold text-primary">Públicos, geografia e dispositivos <ArrowUpRight size={15}/></Link></div>
 <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[790px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500"><tr><th className="py-3">Campanha</th><th>Investimento</th><th>Impressões</th><th>Cliques</th><th>Leads</th><th>CPL</th></tr></thead><tbody>{list.map(r=><tr key={r.accountId+':'+r.campaignId} className="border-b border-white/[.06]"><td className="max-w-[340px] truncate py-3 pr-5 font-medium text-zinc-200" title={r.campaignName}>{r.campaignName}</td><td>{money(r.spend,currency)}</td><td>{number(r.impressions)}</td><td>{number(r.clicks)}</td><td>{number(r.leads)}</td><td>{money(r.cpl,currency)}</td></tr>)}</tbody></table>{!list.length?<p className="py-8 text-center text-sm text-zinc-400">Sem métricas registradas para esta plataforma no intervalo selecionado.</p>:null}</div>
 </Card></section>;
}
