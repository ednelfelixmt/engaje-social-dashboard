import {notFound} from 'next/navigation';
import {tenant,dashboardConfig} from '@/lib/auth/session';
import {filters,dashboardData} from '@/lib/metrics/query';
import {campaigns} from '@/lib/metrics/campaigns';
import {intelligenceCampaignShape} from '@/lib/metrics/intelligence-campaigns';
import {buildIntelligenceTimeline} from '@/lib/metrics/intelligence-daily';
import {Filters} from '@/components/dashboard/filters';
import {BusinessAnalyticsWorkbench} from '@/components/dashboard/business-analytics-workbench';
import {Card} from '@/components/ui/card';
export default async function Page({params:pending,searchParams:pendingSearch}:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 const {organizationSlug}=await pending;
 const {db,org,superAdmin}=await tenant(organizationSlug);
 const config=await dashboardConfig(organizationSlug);
 if(!config.enabled_pages.includes('overview'))notFound();
 const search=await pendingSearch,f=filters(search,org.timezone,org.currency);
 const [{data:orgs},data]=await Promise.all([
  superAdmin?db.from('organizations').select('name,slug').eq('status','active').order('name'):Promise.resolve({data:[{name:org.name,slug:org.slug}]}),
  dashboardData(db,org.id,f,{ads:true,adsComparison:f.compare!=='none',crm:true,crmComparison:f.compare!=='none',adCampaigns:true}),
 ]);
 const current=campaigns(data.ads,data.crm,config.preferred_revenue_source,data.adCampaigns);
 const previous=campaigns(data.adsComparison,data.crmComparison,config.preferred_revenue_source,data.adCampaigns);
 return <main className="mx-auto max-w-[1700px] space-y-4">
 <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.02] px-4 py-3"><div><p className="text-xs text-zinc-500">{org.name} / Relatório estratégico</p><h1 className="text-xl font-semibold text-white">Engaje Intelligence</h1></div><span className="text-xs text-zinc-500">BI · Performance · Decisão</span></header>
 <Filters value={f} organizations={orgs??[]} slug={org.slug}/>
 <BusinessAnalyticsWorkbench company={org.name} period={f.from+' a '+f.to} current={intelligenceCampaignShape(current,org.id)} previous={intelligenceCampaignShape(previous,org.id)} timeline={buildIntelligenceTimeline(data.ads)} priorTimeline={buildIntelligenceTimeline(data.adsComparison)} currency={f.currency}/>
 <Card className="!p-4"><h2 className="text-sm font-semibold">Recomendações e próximos passos</h2><p className="mt-2 text-xs leading-6 text-zinc-400">Use a matriz de investimento e CPL para priorizar a investigação das campanhas. As recomendações são hipóteses operacionais: confirme qualidade dos leads, vendas, receita e capacidade de atendimento antes de ampliar ou suspender orçamento.</p></Card>
 </main>;
}
