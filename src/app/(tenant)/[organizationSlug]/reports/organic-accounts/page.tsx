import {Card} from '@/components/ui/card';
import {OrganicAccountsReportView} from '@/components/dashboard/organic-accounts-report';
import {OrganicReportNavigation} from '@/components/dashboard/organic-report-navigation';
import {tenant,dashboardConfig} from '@/lib/auth/session';
import {filters} from '@/lib/metrics/query';
import {readOrganicAccounts} from '@/lib/reports/organic-accounts-query';
import {buildOrganicAccountsReport,type OrganicAccountsReport} from '@/lib/reports/organic-accounts';
import {organicPlatforms,type OrganicScope} from '@/lib/reports/organic-scope';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 const {organizationSlug}=await params;
 const {db,org}=await tenant(organizationSlug);
 const config=await dashboardConfig(organizationSlug);
 if(config.organization_id!==org.id)return <Card><p role="alert">Não foi possível validar a configuração deste cliente.</p></Card>;
 if(!config.enabled_pages.includes('organic'))return <Card>Este relatório está indisponível nas configurações deste cliente.</Card>;
 const search=await searchParams;
 let scope:OrganicScope;
 try{
  if(search.platform&&search.platform!=='all'&&!organicPlatforms.includes(search.platform as typeof organicPlatforms[number]))throw new Error('Invalid platform');
  const f=filters(search,org.timezone,org.currency);
  if(search.from!==undefined&&search.from!==f.from||search.to!==undefined&&search.to!==f.to)throw new Error('Invalid explicit record date');
  scope={organizationId:org.id,organizationName:org.name,organizationSlug:org.slug,timezone:org.timezone,from:f.from,to:f.to,
   platform:(search.platform||'all') as OrganicScope['platform'],generatedAt:new Date().toISOString()};
 }catch{return <Card><p role="alert">Selecione datas válidas e uma plataforma orgânica disponível.</p></Card>;}
 let report:OrganicAccountsReport|null=null;
 try{const records=await readOrganicAccounts(db,scope);report=buildOrganicAccountsReport(records,{...scope,generatedAt:new Date().toISOString()});}catch{/* No private source diagnostics or partial values. */}
 return <main className="mx-auto max-w-[1680px] space-y-5">
  <header><p className="eyebrow">Contas orgânicas</p><h1 className="mt-2 text-3xl font-semibold">Dados recebidos por conta</h1></header>
  <OrganicReportNavigation scope={scope} active="accounts"/>
  <form method="get" aria-label="Filtros de dados orgânicos por conta" className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 p-4">
   <label className="text-sm">Data registrada inicial<input className="input mt-1 block" type="date" name="from" defaultValue={scope.from} required/></label>
   <label className="text-sm">Data registrada final<input className="input mt-1 block" type="date" name="to" defaultValue={scope.to} required/></label>
   <label className="text-sm">Plataforma<select className="input mt-1 block" name="platform" defaultValue={scope.platform}><option value="all">Facebook e Instagram</option><option value="facebook_organic">Facebook</option><option value="instagram_organic">Instagram</option></select></label>
   <button type="submit" className="rounded-xl border border-primary/30 px-4 py-2 font-semibold text-primary">Aplicar filtros</button>
  </form>
  {report?<OrganicAccountsReportView report={report}/>:<Card><p role="alert">Não foi possível carregar os registros deste recorte. Nenhum relatório ou CSV parcial foi produzido. Verifique a origem com a agência.</p></Card>}
 </main>;
}
