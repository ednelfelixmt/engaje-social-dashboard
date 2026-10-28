import {InvalidReportFilters} from '@/components/dashboard/invalid-report-filters';
import {Card} from '@/components/ui/card';
import {Filters} from '@/components/dashboard/filters';
import {PerformanceReportView} from '@/components/dashboard/performance-report-view';
import {tenant, dashboardConfig} from '@/lib/auth/session';
import {filters, dashboardData} from '@/lib/metrics/query';
import {buildPerformanceReport, type PerformanceReport} from '@/lib/reports/performance-report';

export const dynamic = 'force-dynamic';

export default async function Page({params, searchParams}: {params: Promise<{organizationSlug: string}>; searchParams: Promise<Record<string, string | undefined>>}) {
 const {organizationSlug} = await params;
 const {db, org, superAdmin} = await tenant(organizationSlug);
 const config = await dashboardConfig(organizationSlug);
 if (!config.enabled_pages.includes('paid')) return <Card>Este relatório está indisponível nas configurações deste cliente.</Card>;
 const search=await searchParams;
 let f:ReturnType<typeof filters>;
 try{f=filters(search,org.timezone,org.currency);}catch{return <InvalidReportFilters search={search}/>;}
 const {data: organizations} = superAdmin ? await db.from('organizations').select('name,slug').eq('status', 'active').order('name') : {data: [{name: org.name, slug: org.slug}]};
 let report: PerformanceReport | null = null;
 try {
  const {ads, adsComparison} = await dashboardData(db, org.id, f, {ads: true, adsComparison: f.compare !== 'none'});
  report = buildPerformanceReport(ads, adsComparison, {organizationId: org.id, organizationName: org.name, organizationSlug: org.slug, timezone: org.timezone, currency: f.currency, from: f.from, to: f.to, compare: f.compare, generatedAt: new Date().toISOString()});
 } catch { /* No partial report or upstream diagnostics may be rendered. */ }
 return <div className="mx-auto max-w-[1680px] space-y-5">
  <header><p className="eyebrow">Relatórios · {org.name}</p><h1 className="mt-2 text-3xl font-semibold">Relatório executivo de mídia paga</h1><p className="mt-2 text-sm text-zinc-400">Resultados por plataforma e campanha, com períodos e cobertura verificáveis.</p></header>
  <div data-print-hide><Filters value={f} organizations={organizations ?? []} slug={org.slug}/></div>
  {report ? <PerformanceReportView report={report}/> : <Card><p role="alert">Não foi possível carregar ou consolidar este relatório. Verifique a origem e o recorte com a agência. Nenhum total parcial ou documento foi produzido.</p></Card>}
 </div>;
}
