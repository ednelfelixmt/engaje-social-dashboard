import {Suspense} from 'react';
import {tenant,dashboardConfig} from '@/lib/auth/session';
import {filters,dashboardData,previous} from '@/lib/metrics/query';
import {buildAnalyticsWorkspace,AnalyticsCapacityError,type AnalyticsWorkspaceModel} from '@/lib/reports/analytics-workspace';
import {Filters} from '@/components/dashboard/filters';
import {InvalidReportFilters} from '@/components/dashboard/invalid-report-filters';
import {AnalyticsWorkspace} from '@/components/dashboard/analytics-workspace';
import {DisplayModeController} from '@/components/dashboard/display-mode-controller';
import {Card} from '@/components/ui/card';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 const {organizationSlug}=await params,{org,db,superAdmin}=await tenant(organizationSlug),config=await dashboardConfig(organizationSlug);
 if(config.organization_id!==org.id)return <Card><p role="alert">Configuração do cliente indisponível.</p></Card>;
 if(!config.enabled_pages.includes('overview'))return <Card>Este painel está indisponível nas configurações deste cliente.</Card>;
 const search=await searchParams;let f:ReturnType<typeof filters>;try{f=filters(search,org.timezone,org.currency);}catch{return <InvalidReportFilters search={search}/>;}
 let model:AnalyticsWorkspaceModel|null=null;let tooLarge=false;
 try{const [data,prior]=await Promise.all([dashboardData(db,org.id,f,{ads:true,adsComparison:f.compare!=='none',breakdowns:true,crm:true,crmComparison:f.compare!=='none'}),f.compare==='none'?Promise.resolve({breakdowns:[]}):dashboardData(db,org.id,previous(f),{breakdowns:true})]);
 model=buildAnalyticsWorkspace({ads:data.ads,priorAds:data.adsComparison,breakdowns:data.breakdowns,priorBreakdowns:prior.breakdowns,crm:data.crm,priorCrm:data.crmComparison,scope:{organizationId:org.id,organizationName:org.name,organizationSlug:org.slug,timezone:org.timezone,currency:f.currency,from:f.from,to:f.to,compare:f.compare,generatedAt:new Date().toISOString()},steps:config.funnel_steps});
 }catch(error){tooLarge=error instanceof AnalyticsCapacityError;/* Never expose upstream details or partial analytics. */}
 return <div className="analytics-shell dashboard-content mx-auto max-w-[1780px] space-y-5"><Suspense fallback={null}><DisplayModeController/></Suspense><header className="tv-hide analytics-page-heading"><div><p className="eyebrow">Engaje · inteligência de marketing</p><h1>Análise 360</h1><p>{org.name} · desempenho, funis, público e resultados comerciais</p></div></header><div className="tv-hide analytics-datebar"><Filters value={f} organizations={[{name:org.name,slug:org.slug}]} slug={org.slug}/></div>{model?<AnalyticsWorkspace key={org.id} model={model} canManage={superAdmin}/>:<Card><p role="alert">{tooLarge?'O recorte é extenso para abrir todos os dados. Reduza o período e aplique os filtros novamente. Nenhum total foi truncado.':'Não foi possível validar as fontes deste recorte. Nenhum painel parcial ou arquivo foi produzido. Consulte a agência.'}</p></Card>}</div>;
}
