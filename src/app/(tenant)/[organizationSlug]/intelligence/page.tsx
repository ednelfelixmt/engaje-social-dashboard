import {InvalidReportFilters} from '@/components/dashboard/invalid-report-filters';
import {notFound} from 'next/navigation';
import {tenant,dashboardConfig} from '@/lib/auth/session';
import {filters,dashboardData} from '@/lib/metrics/query';
import {scopedCampaigns} from '@/lib/metrics/campaigns';
import {intelligenceCampaignShape} from '@/lib/metrics/intelligence-campaigns';
import {buildIntelligenceTimeline} from '@/lib/metrics/intelligence-daily';
import {comparisonPeriod} from '@/lib/metrics/calendar';
import {Filters} from '@/components/dashboard/filters';
import {BusinessAnalyticsWorkbench} from '@/components/dashboard/business-analytics-workbench';
import {Card} from '@/components/ui/card';
export default async function Page({params:pending,searchParams:pendingSearch}:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 const {organizationSlug}=await pending;
 const {db,org,superAdmin}=await tenant(organizationSlug);
 const config=await dashboardConfig(organizationSlug);
 if(!config.enabled_pages.includes('overview'))notFound();
 const search=await pendingSearch;
 let f:ReturnType<typeof filters>;
 try{f=filters(search,org.timezone,org.currency);}catch{return <InvalidReportFilters search={search}/>;}
 const [{data:orgs},data]=await Promise.all([
  superAdmin?db.from('organizations').select('name,slug').eq('status','active').order('name'):Promise.resolve({data:[{name:org.name,slug:org.slug}]}),
  dashboardData(db,org.id,f,{ads:true,adsComparison:f.compare!=='none',crm:true,crmComparison:f.compare!=='none',adCampaigns:true}),
 ]);
 const current=scopedCampaigns(data.ads,data.crm,config.preferred_revenue_source,data.adCampaigns,org.id,f.currency);
 const previous=scopedCampaigns(data.adsComparison,data.crmComparison,config.preferred_revenue_source,data.adCampaigns,org.id,f.currency);
 // Use the user's full calendar interval as the daily axis. A provider
 // returning no records must not collapse or shift an ordinal comparison.
 const range={from:f.from,to:f.to};
 const priorRange=f.compare==='none'?null:comparisonPeriod(f.from,f.to,f.compare);
 const timeline=buildIntelligenceTimeline(data.ads,org.id,f.currency,undefined,range);
 const priorTimeline=priorRange?buildIntelligenceTimeline(data.adsComparison,org.id,f.currency,undefined,priorRange):[];
 const channels=['meta_ads','google_ads','tiktok_ads'] as const;
 const channelTimelines=Object.fromEntries(channels.map(channel=>[
   channel,buildIntelligenceTimeline(data.ads,org.id,f.currency,channel,range),
 ]));
 const priorChannelTimelines=Object.fromEntries(channels.map(channel=>[
   channel,priorRange?buildIntelligenceTimeline(data.adsComparison,org.id,f.currency,channel,priorRange):[],
 ]));
 return <main className="mx-auto max-w-[1700px] space-y-4">
 <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.02] px-4 py-3"><div><p className="text-xs text-zinc-500">{org.name} / Relatório estratégico</p><h1 className="text-xl font-semibold text-white">Engaje Intelligence</h1></div><span className="text-xs text-zinc-500">BI · Performance · Decisão</span></header>
 <Filters value={f} organizations={orgs??[]} slug={org.slug}/>
 <BusinessAnalyticsWorkbench company={org.name} period={f.from+' a '+f.to} current={intelligenceCampaignShape(current,org.id,f.currency)} previous={intelligenceCampaignShape(previous,org.id,f.currency)} timeline={timeline} priorTimeline={priorTimeline} timelinesByChannel={channelTimelines} priorTimelinesByChannel={priorChannelTimelines} currency={f.currency}/>
 <Card className="!p-4"><h2 className="text-sm font-semibold">Recomendações e próximos passos</h2><p className="mt-2 text-xs leading-6 text-zinc-400">Use a matriz de investimento e CPL para priorizar a investigação das campanhas. As recomendações são hipóteses operacionais: confirme qualidade dos leads, vendas, receita e capacidade de atendimento antes de ampliar ou suspender orçamento.</p></Card>
 </main>;
}
