import {tenant,dashboardConfig} from '@/lib/auth/session';
import {filters} from '@/lib/metrics/query';
import {Card} from '@/components/ui/card';
import {Filters} from '@/components/dashboard/filters';
import {InvalidReportFilters} from '@/components/dashboard/invalid-report-filters';
import {ReportCenter} from '@/components/dashboard/report-center';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
 const {organizationSlug}=await params;
 const {org}=await tenant(organizationSlug),config=await dashboardConfig(organizationSlug);
 if(config.organization_id!==org.id)return <Card><p role="alert">Não foi possível carregar os relatórios deste cliente.</p></Card>;
 const search=await searchParams;let f:ReturnType<typeof filters>;
 try{f=filters(search,org.timezone,org.currency);}catch{return <InvalidReportFilters search={search}/>;}
 return <div className="mx-auto max-w-[1680px] space-y-5"><header><p className="eyebrow">Relatórios · {org.name}</p><h1 className="mt-2 text-3xl font-semibold">Central de relatórios</h1><p className="mt-2 text-sm text-zinc-400">Escolha a análise e mantenha o período de trabalho. Os documentos usam os dados disponíveis da sua organização.</p></header>
  <Filters value={f} organizations={[{name:org.name,slug:org.slug}]} slug={org.slug}/><ReportCenter slug={org.slug} enabled={config.enabled_pages} context={f}/>
 </div>;
}
