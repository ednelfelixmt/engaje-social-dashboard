import Link from 'next/link';
import {Card} from '@/components/ui/card';
import {Filters} from '@/components/dashboard/filters';
import {TargetReferences} from '@/components/dashboard/target-references';
import {tenant,dashboardConfig} from '@/lib/auth/session';
import {filters,dashboardData} from '@/lib/metrics/query';
import {buildTargetReferences,type TargetReferenceReport} from '@/lib/reports/target-references';
export const dynamic = 'force-dynamic';
export default async function Page({params,searchParams}: {params: Promise<{organizationSlug:string}>;searchParams: Promise<Record<string,string|undefined>>}) {
 const {organizationSlug} = await params;
 const {db,org,superAdmin} = await tenant(organizationSlug);
 const config = await dashboardConfig(organizationSlug);
 if (config.organization_id !== org.id) return <Card><p role="alert">Não foi possível validar a configuração deste cliente.</p></Card>;
 if (!config.enabled_pages.includes('paid')) return <Card>Este relatório está indisponível nas configurações deste cliente.</Card>;
 const f = {...filters(await searchParams,org.timezone,org.currency),compare:'none' as const};
 const {data:organizations} = superAdmin ? await db.from('organizations').select('name,slug').eq('status','active').order('name') : {data:[{name:org.name,slug:org.slug}]};
 let report: TargetReferenceReport | null = null;
 try {
  const {ads} = await dashboardData(db,org.id,f,{ads:true});
  report = buildTargetReferences(ads,config,{organizationId:org.id,organizationName:org.name,organizationSlug:org.slug,timezone:org.timezone,currency:f.currency,referenceCurrency:org.currency,from:f.from,to:f.to,generatedAt:new Date().toISOString()});
 } catch { /* Auth failures stay outside this boundary; source details never escape. */ }
 return <div className="mx-auto max-w-[1680px] space-y-5"><header><p className="eyebrow">Metas e referências · {org.name}</p><h1 className="mt-2 text-3xl font-semibold">Referências de desempenho</h1><p className="mt-2 text-sm text-zinc-400">Consulte os valores cadastrados pela agência e os dados disponíveis no período.</p></header>
  <Filters value={f} organizations={organizations ?? []} slug={org.slug} allowComparison={false}/>
  {superAdmin ? <Link className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-sm" href={'/'+org.slug+'/settings/dashboard'}>Configurar referências</Link> : null}
  {report ? <TargetReferences report={report}/> : <Card><p role="alert">Não foi possível carregar as referências e os dados deste recorte. Verifique o cadastro e a origem com a agência. Nenhuma comparação parcial foi produzida.</p></Card>}
 </div>;
}
