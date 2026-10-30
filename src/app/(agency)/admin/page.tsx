import {requireAdmin} from '@/lib/auth/session';
import {all, filters, previous} from '@/lib/metrics/query';
import {summarizeAgencyAds, summarizeClientAds} from '@/lib/metrics/agency-overview';
import {AgencyOverview} from '@/components/agency/agency-overview';
import {buildAgencyIntelligence,type AgencyIntelligenceModel} from '@/lib/reports/agency-intelligence';
import type {Row} from '@/types/database.types';

type Integration = Pick<Row<'integrations'>,'organization_id'|'status'|'is_enabled'|'last_synced_at'>;

function latestSync(rows:Integration[]){
  return rows.map((item)=>item.last_synced_at).filter(Boolean).sort().at(-1)??null;
}

export default async function Admin({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const {db}=await requireAdmin();
  const search=await searchParams;
  let range: ReturnType<typeof filters>;
  try { range=filters({from:search.from,to:search.to,compare:search.compare??'previous_period'},'America/Cuiaba','BRL'); }
  catch { return <section className="agency-invalid-period"><h1>Período inválido</h1><p role="alert">Informe datas válidas, em ordem, com intervalo de até dois anos. Nenhuma consulta de métricas foi executada.</p><a href="/admin">Voltar aos últimos 30 dias</a></section>; }
  const priorRange=previous(range);
  const [{data:orgs,error},{data:integrations,error:integrationError},{data:brandings,error:brandingError},metrics,priorMetrics]=await Promise.all([
    db.from('organizations').select('*').eq('is_agency',false).order('name'),
    db.from('integrations').select('organization_id,status,is_enabled,last_synced_at').eq('is_enabled',true),
    db.from('branding').select('organization_id,logo_path'),
    all<Row<'metrics_ads'>>((start,end)=>db.from('metrics_ads').select('*').gte('metric_date',range.from).lte('metric_date',range.to).order('id').range(start,end)),
    range.compare==='none'?Promise.resolve([]):all<Row<'metrics_ads'>>((start,end)=>db.from('metrics_ads').select('*').gte('metric_date',priorRange.from).lte('metric_date',priorRange.to).order('id').range(start,end)),
  ]);
  if(error)throw error;if(integrationError)throw integrationError;if(brandingError)throw brandingError;
  const organizations=orgs??[];
  const brandingByOrg=new Map((brandings??[]).map((item)=>[item.organization_id,item]));
  const logoEntries=await Promise.all(organizations.map(async(org)=>{
    const path=brandingByOrg.get(org.id)?.logo_path;
    const url=path?(await db.storage.from('branding').createSignedUrl(path,3600)).data?.signedUrl:null;
    return [org.id,url??null] as const;
  }));
  const logos=new Map(logoEntries);
  const rowsByOrg=new Map<string,Row<'metrics_ads'>[]>();
  for(const row of metrics)rowsByOrg.set(row.organization_id,[...(rowsByOrg.get(row.organization_id)??[]),row]);
  const clientRows=organizations.map((org)=>{
    const rows=rowsByOrg.get(org.id)??[];
    const connections=(integrations??[]).filter((item)=>item.organization_id===org.id);
    return {org,summary:summarizeClientAds(org.id,org.currency,rows),connections,lastSync:latestSync(connections),logo:logos.get(org.id)??null};
  });
  const active=clientRows.filter((item)=>item.org.status==='active');
  const clientsWithData=active.filter((item)=>(rowsByOrg.get(item.org.id)?.length??0)>0);
  const currencies=[...new Set(clientsWithData.map((item)=>item.org.currency))];
  const activeIds=new Set(active.map((item)=>item.org.id));
  const agencySummary=summarizeAgencyAds(metrics.filter((row)=>activeIds.has(row.organization_id)));
  const commonCurrency=currencies.length===1&&agencySummary.currency===currencies[0]?currencies[0]:null;
  let intelligence:AgencyIntelligenceModel|undefined;let intelligenceError=false;
  try {intelligence=buildAgencyIntelligence({clients:active.map(({org})=>({id:org.id,name:org.name,slug:org.slug,currency:org.currency,timezone:org.timezone})),current:metrics.filter(row=>activeIds.has(row.organization_id)),previous:priorMetrics.filter(row=>activeIds.has(row.organization_id)),from:range.from,to:range.to,compare:range.compare});}
  catch {intelligenceError=true;}
  return <AgencyOverview intelligence={intelligence} intelligenceError={intelligenceError} compare={range.compare} from={range.from} to={range.to} summary={agencySummary} currency={commonCurrency}
    clients={active.map(({org,summary,connections,lastSync,logo})=>({
      id:org.id,name:org.name,slug:org.slug,currency:org.currency,summary,
      hasData:(rowsByOrg.get(org.id)?.length??0)>0,
      connected:connections.some(connection=>connection.status==='connected'),
      lastSync,logoUrl:logo,
    }))}/>;
}
