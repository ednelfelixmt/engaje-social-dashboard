import {Card} from '@/components/ui/card';
import {OrganicContentReportView} from '@/components/dashboard/organic-content-report';
import {tenant,dashboardConfig} from '@/lib/auth/session';
import {filters} from '@/lib/metrics/query';
import {readOrganicContent} from '@/lib/reports/organic-content-query';
import {buildOrganicContentReport,organicPlatforms,type OrganicContentReport,type OrganicContentScope} from '@/lib/reports/organic-content';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,string|undefined>>}){
 const {organizationSlug}=await params;
 const {db,org}=await tenant(organizationSlug);
 const config=await dashboardConfig(organizationSlug);
 if(config.organization_id!==org.id)return <Card><p role="alert">Não foi possível validar a configuração deste cliente.</p></Card>;
 if(!config.enabled_pages.includes('organic'))return <Card>Este relatório está indisponível nas configurações deste cliente.</Card>;
 const search=await searchParams;
 let scope:OrganicContentScope;
 try{
  if(search.platform&&search.platform!=='all'&&!organicPlatforms.includes(search.platform as typeof organicPlatforms[number]))throw new Error('Invalid platform');
  const f=filters(search,org.timezone,org.currency);
  if(search.from!==undefined&&search.from!==f.from||search.to!==undefined&&search.to!==f.to)throw new Error('Invalid explicit publication date');
  scope={organizationId:org.id,organizationName:org.name,organizationSlug:org.slug,timezone:org.timezone,from:f.from,to:f.to,
   platform:(search.platform||'all') as OrganicContentScope['platform'],generatedAt:new Date().toISOString()};
 }catch{return <Card><p role="alert">Selecione datas válidas e uma plataforma orgânica disponível.</p></Card>;}
 let report:OrganicContentReport|null=null;
 try{const records=await readOrganicContent(db,scope);report=buildOrganicContentReport(records,{...scope,generatedAt:new Date().toISOString()});}catch{/* Private source diagnostics never leave the server. */}
 return <main className="mx-auto max-w-[1680px] space-y-5">
  <header><p className="eyebrow">Conteúdos orgânicos</p><h1 className="mt-2 text-3xl font-semibold">Publicações e contadores recebidos</h1></header>
  <form method="get" aria-label="Filtros de publicação orgânica" className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 p-4">
   <label className="text-sm">Publicação inicial (UTC)<input className="input mt-1 block" type="date" name="from" defaultValue={scope.from} required/></label>
   <label className="text-sm">Publicação final (UTC)<input className="input mt-1 block" type="date" name="to" defaultValue={scope.to} required/></label>
   <label className="text-sm">Plataforma<select className="input mt-1 block" name="platform" defaultValue={scope.platform}><option value="all">Facebook e Instagram</option><option value="facebook_organic">Facebook</option><option value="instagram_organic">Instagram</option></select></label>
   <button type="submit" className="rounded-xl border border-primary/30 px-4 py-2 font-semibold text-primary">Aplicar filtros</button>
  </form>
  {report?<OrganicContentReportView report={report}/>:<Card><p role="alert">Não foi possível carregar os conteúdos deste recorte. Nenhum relatório ou CSV parcial foi produzido. Verifique a origem com a agência.</p></Card>}
 </main>;
}
