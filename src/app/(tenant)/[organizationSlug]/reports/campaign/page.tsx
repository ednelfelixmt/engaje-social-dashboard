import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Card} from '@/components/ui/card';
import {Filters} from '@/components/dashboard/filters';
import {CampaignReportView} from '@/components/dashboard/campaign-report';
import {tenant,dashboardConfig} from '@/lib/auth/session';
import {filters,dashboardData} from '@/lib/metrics/query';
import {campaignSelection} from '@/lib/metrics/campaign-selection';
import {buildCampaignReport,type CampaignReport} from '@/lib/reports/campaign-report';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 const {organizationSlug}=await params;
 const {db,org,superAdmin}=await tenant(organizationSlug);
 const config=await dashboardConfig(organizationSlug);
 if(config.organization_id!==org.id)return <Card><p role="alert">Não foi possível validar a configuração deste cliente.</p></Card>;
 if(!config.enabled_pages.includes('paid'))return <Card>Este relatório está indisponível nas configurações deste cliente.</Card>;
 const search=await searchParams,selection=campaignSelection(search);
 if(!selection)notFound();
 const f=filters(search,org.timezone,org.currency);
 const {data:organizations}=superAdmin?await db.from('organizations').select('name,slug').eq('status','active').order('name'):{data:[{name:org.name,slug:org.slug}]};
 let report:CampaignReport|null=null;
 try{
  const {ads,adsComparison}=await dashboardData(db,org.id,f,{platform:selection.platform,campaign:{account:selection.account,campaign:selection.campaign},ads:true,adsComparison:f.compare!=='none'});
  report=buildCampaignReport(ads,adsComparison,{organizationId:org.id,organizationName:org.name,organizationSlug:org.slug,timezone:org.timezone,currency:f.currency,from:f.from,to:f.to,compare:f.compare,generatedAt:new Date().toISOString()},selection);
 }catch{/* No partial data or internal diagnostics are rendered. */}
 return <div className="mx-auto max-w-[1680px] space-y-5"><header><p className="eyebrow">Campanhas · {org.name}</p><h1 className="mt-2 text-3xl font-semibold">Detalhamento de campanha</h1></header><div data-print-hide><Filters value={f} organizations={organizations??[]} slug={org.slug}/><Link className="mt-3 inline-flex text-sm text-primary" href={'/'+org.slug+'/reports/performance?'+new URLSearchParams(f).toString()}>Voltar ao relatório executivo</Link></div>{report?<CampaignReportView report={report}/>:<Card><p role="alert">Não foi possível carregar ou consolidar esta campanha no recorte. Verifique conta, campanha, moeda e origem com a agência. Nenhum valor parcial ou documento foi produzido.</p></Card>}</div>;
}
