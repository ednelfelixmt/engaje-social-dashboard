import {Card} from '@/components/ui/card';
import {MetricMethodology} from '@/components/dashboard/metric-methodology';
import {tenant,dashboardConfig} from '@/lib/auth/session';
import {dashboardMetricGroups} from '@/lib/metrics/catalog';
import {selectMetricMethodology,methodologyScopeLabels,methodologyStatusLabels,methodologyStatuses} from '@/lib/metrics/methodology';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,unknown>>}){
 const {organizationSlug}=await params;
 const {org}=await tenant(organizationSlug);
 const config=await dashboardConfig(organizationSlug);
 if(config.organization_id!==org.id)return <Card><p role="alert">Não foi possível validar a configuração deste cliente.</p></Card>;
 if(!config.enabled_pages.includes('overview'))return <Card>Este guia está indisponível nas configurações deste cliente.</Card>;
 let selection:ReturnType<typeof selectMetricMethodology>;
 try{selection=selectMetricMethodology(await searchParams);}catch{return <Card><p role="alert">Informe uma busca de até 120 caracteres e opções válidas do guia.</p><a href="?" className="mt-3 inline-flex text-primary">Restaurar filtros do guia</a></Card>;}
 return <main className="mx-auto max-w-[1500px] space-y-5">
  <header><p className="eyebrow">Guia de métricas · {org.name}</p><h1 className="mt-2 text-3xl font-semibold">Fórmulas, fontes e limitações</h1>
   <p className="mt-3 text-sm text-zinc-400">Versão do contrato: {selection.version}. Este guia documenta o catálogo; não consulta medições nem confirma que uma integração esteja conectada, recebendo dados ou homologada.</p>
   <p className="mt-2 text-sm text-amber-200">Fórmulas de mídia paga não são aplicadas automaticamente ao orgânico ou CRM. Ausência permanece indisponível; alcance e seguidores não são somados para inferir pessoas ou crescimento.</p>
  </header>
  <form method="get" aria-label="Filtros do guia de métricas" className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 p-4">
   <label className="text-sm">Buscar definição<input type="search" name="q" maxLength={120} defaultValue={selection.filters.q} className="input mt-1 block"/></label>
   <label className="text-sm">Categoria<select name="group" defaultValue={selection.filters.group} className="input mt-1 block"><option value="all">Todas as categorias</option>{dashboardMetricGroups.map(group=><option key={group.id} value={group.id}>{group.title}</option>)}</select></label>
   <label className="text-sm">Contexto<select name="scope" defaultValue={selection.filters.scope} className="input mt-1 block"><option value="all">Todos os contextos</option>{Object.entries(methodologyScopeLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <label className="text-sm">Contrato<select name="status" defaultValue={selection.filters.status} className="input mt-1 block"><option value="all">Todos os estados</option>{methodologyStatuses.map(status=><option key={status} value={status}>{methodologyStatusLabels[status]}</option>)}</select></label>
   <button type="submit" className="rounded-xl border border-primary/30 px-4 py-2 font-semibold text-primary">Aplicar busca</button><a href="?" className="px-2 py-2 text-sm text-zinc-400">Limpar filtros</a>
  </form>
  <MetricMethodology selection={selection}/>
 </main>;
}
