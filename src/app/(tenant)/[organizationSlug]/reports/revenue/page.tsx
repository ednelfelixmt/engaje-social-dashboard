import {InvalidReportFilters} from '@/components/dashboard/invalid-report-filters';
import Link from 'next/link';
import {Card} from '@/components/ui/card';
import {Filters} from '@/components/dashboard/filters';
import {RevenueReportView} from '@/components/dashboard/revenue-report-view';
import {tenant, dashboardConfig} from '@/lib/auth/session';
import {filters, dashboardData} from '@/lib/metrics/query';
import {buildRevenueReport, type RevenueReport} from '@/lib/reports/revenue-report';

export const dynamic = 'force-dynamic';
export default async function Page({params, searchParams}: {params: Promise<{organizationSlug: string}>; searchParams: Promise<Record<string, string | undefined>>}) {
 const {organizationSlug} = await params;
 const {db, org, superAdmin} = await tenant(organizationSlug);
 const config = await dashboardConfig(organizationSlug);
 if (!config.enabled_pages.includes('external')) return <Card>Este relatório está indisponível nas configurações deste cliente.</Card>;
 const search = await searchParams;
 const source = search.source ?? config.preferred_revenue_source;
 if (source !== 'crm' && source !== 'spreadsheet') return <Card><p role="alert">Selecione uma fonte válida: CRM ou planilha.</p></Card>;
 let f:ReturnType<typeof filters>;
 try{f=filters(search,org.timezone,org.currency);}catch{return <InvalidReportFilters search={search}/>;}
 const {data: organizations} = superAdmin ? await db.from('organizations').select('name,slug').eq('status', 'active').order('name') : {data: [{name: org.name, slug: org.slug}]};
 let report: RevenueReport | null = null;
 try {
  const {crm, crmComparison} = await dashboardData(db, org.id, f, {crm: true, crmComparison: f.compare !== 'none'});
  report = buildRevenueReport(crm, crmComparison, {organizationId: org.id, organizationName: org.name, organizationSlug: org.slug, timezone: org.timezone, currency: f.currency, source, from: f.from, to: f.to, compare: f.compare});
 } catch { /* Never present partial facts or upstream error details. */ }
 return <div className="mx-auto max-w-[1680px] space-y-5">
  <header><p className="eyebrow">Receita e dados externos · {org.name}</p><h1 className="mt-2 text-3xl font-semibold">Receita externa e conciliação diária</h1><p className="mt-2 text-sm text-zinc-400">Analise uma fonte por vez, com cobertura de datas e registros de origem.</p></header>
  <Filters value={f} organizations={organizations ?? []} slug={org.slug}/>
  <nav aria-label="Fonte de receita" className="flex flex-wrap gap-2">{(['crm', 'spreadsheet'] as const).map(key => <Link key={key} aria-current={source === key ? 'page' : undefined} className="rounded-xl border border-white/15 px-4 py-2 text-sm aria-[current=page]:border-primary aria-[current=page]:text-primary" href={'/' + org.slug + '/reports/revenue?' + new URLSearchParams({...f, source: key}).toString()}>{key === 'crm' ? 'CRM' : 'Planilha'}</Link>)}<Link className="px-4 py-2 text-sm text-zinc-400" href={'/' + org.slug + '/external?' + new URLSearchParams(f).toString()}>Registros e importação</Link></nav>
  {report ? <RevenueReportView report={report}/> : <Card><p role="alert">Não foi possível carregar ou consolidar a receita neste recorte. Verifique a origem e os registros com a agência. Nenhum total parcial foi produzido.</p></Card>}
 </div>;
}
