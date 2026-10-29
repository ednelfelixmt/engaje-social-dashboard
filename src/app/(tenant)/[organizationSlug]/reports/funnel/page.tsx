import Link from 'next/link';
import {tenant,dashboardConfig} from '@/lib/auth/session';
import {filters,dashboardData} from '@/lib/metrics/query';
import {buildFunnelReport,funnelPlatform,funnelReportHref,type FunnelReport} from '@/lib/reports/funnel-report';
import {Card} from '@/components/ui/card';
import {Filters} from '@/components/dashboard/filters';
import {InvalidReportFilters} from '@/components/dashboard/invalid-report-filters';
import {FunnelReportView} from '@/components/dashboard/funnel-report-view';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
 const {organizationSlug}=await params;
 const {db,org}=await tenant(organizationSlug),config=await dashboardConfig(organizationSlug);
 if(config.organization_id!==org.id)return <Card><p role="alert">Não foi possível carregar o funil deste cliente.</p></Card>;
 if(!config.enabled_pages.includes('funnel'))return <Card>Este relatório está indisponível nas configurações deste cliente.</Card>;
 const search=await searchParams;let f:ReturnType<typeof filters>;let platform:ReturnType<typeof funnelPlatform>;
 try{f=filters(search,org.timezone,org.currency);}catch{return <InvalidReportFilters search={search}/>;}
 try{platform=funnelPlatform(search.platform);}catch{return <Card><div role="alert"><h1 className="text-xl font-semibold">Plataforma inválida</h1><p className="mt-2 text-sm text-zinc-400">Escolha Meta Ads, Google Ads, TikTok Ads ou todas as plataformas.</p></div><Link className="mt-4 inline-block text-primary" href={funnelReportHref(org.slug,f,null)}>Ver todas as plataformas</Link></Card>;}
 let report:FunnelReport|null=null;
 try {
  const {ads,adsComparison}=await dashboardData(db,org.id,f,{ads:true,adsComparison:f.compare!=='none',platform});
  report=buildFunnelReport(ads,adsComparison,{organizationId:org.id,organizationName:org.name,organizationSlug:org.slug,timezone:org.timezone,currency:f.currency,from:f.from,to:f.to,compare:f.compare,generatedAt:new Date().toISOString(),platform},config.funnel_steps);
 }catch{/* Do not produce partial exports or expose upstream diagnostics. */}
 return <div className="mx-auto max-w-[1680px] space-y-5"><header><p className="eyebrow">Relatórios · {org.name}</p><h1 className="mt-2 text-3xl font-semibold">Relatório de funil de mídia paga</h1><p className="mt-2 text-sm text-zinc-400">Resultados e custos das etapas definidas pela agência, com cobertura e comparação de períodos.</p><Link data-print-hide className="mt-3 inline-block text-sm text-primary" href={'/'+encodeURIComponent(org.slug)+'/reports?'+new URLSearchParams(f).toString()}>Voltar à central de relatórios</Link></header>
  <div data-print-hide><Filters value={f} organizations={[{name:org.name,slug:org.slug}]} slug={org.slug}/></div>
  {report?<FunnelReportView report={report}/>:<Card><p role="alert">Não foi possível carregar ou consolidar este relatório. Verifique a origem e o recorte com a agência. Nenhum total parcial ou documento foi produzido.</p></Card>}
 </div>;
}
