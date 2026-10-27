import {serializeCsv,type CsvCell} from './csv';
import {campaignDelta,type CampaignDay,type CampaignPeriod,type CampaignReport} from '@/lib/reports/campaign-report';
import {performanceMetrics} from '@/lib/reports/performance-report';
import type {PaidMetricKey} from '@/lib/metrics/paid-metrics';

const columns:Record<PaidMetricKey,string>={spend:'investimento',impressions:'impressoes',clicks:'cliques',leads:'leads_atribuidos',ctr:'ctr_pct',cpc:'cpc',cpm:'cpm',cpl:'cpl_atribuido'};
type Kind='total_observado_recebido'|'periodo_componentes_completos'|'dia';

/** Only serialize an already authorized report. Summary levels and days overlap. */
export function campaignReportCsv(report:CampaignReport):string {
 const {scope,selection}=report;
 const rows:CsvCell[][]=[[
  'versao','gerado_em_utc','cliente','fonte','plataforma','conta','campanha_id','campanha',
  'moeda','fuso_cadastral','modo_comparacao','periodo','tipo_linha','inicio','fim','dia',
  'registros_periodo','anuncios_distintos_periodo','registros_dia','anuncios_distintos_dia','dias_esperados',
  ...performanceMetrics.map(key=>'dias_'+columns[key]+'_com_componentes_periodo'),
  'janelas_atribuicao_periodo',...performanceMetrics.map(key=>columns[key]),
  ...performanceMetrics.map(key=>'variacao_'+(key==='ctr'?'ctr':columns[key])+'_pct'),
 ]];
 function push(label:'atual'|'comparativo',period:CampaignPeriod,kind:Kind,day?:CampaignDay){
  const values=day?day.totals:kind==='periodo_componentes_completos'?period.completeTotals:period.totals;
  rows.push([
   '1',scope.generatedAt,scope.organizationName,'metrics_ads',selection.platform,selection.account,
   selection.campaign,report.name,scope.currency,scope.timezone,scope.compare,label,kind,period.from,period.to,
   day?.date??null,period.sourceIds.length,period.adCount,day?day.records:null,day?day.ads:null,period.days.length,
   ...performanceMetrics.map(key=>period.knownDays[key]),
   period.attribution.length?JSON.stringify(period.attribution):null,
   ...performanceMetrics.map(key=>values[key]),
   ...performanceMetrics.map(key=>label==='atual'&&kind==='periodo_componentes_completos'?campaignDelta(report,key):null),
  ]);
 }
 function addPeriod(label:'atual'|'comparativo',period:CampaignPeriod){
  push(label,period,'total_observado_recebido');
  push(label,period,'periodo_componentes_completos');
  for(const day of period.days)push(label,period,'dia',day);
 }
 addPeriod('atual',report.current);
 if(report.previous)addPeriod('comparativo',report.previous);
 return serializeCsv(rows);
}

export function campaignReportFilename(report:Pick<CampaignReport,'scope'|'selection'>):string {
 const safe=(value:string,max:number,fallback:string)=>value.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,max)||fallback;
 const {scope,selection}=report;
 return safe(scope.organizationSlug,40,'cliente')+'-campanha-'+safe(selection.platform,16,'plataforma')+'-'+safe(selection.account,32,'conta')+'-'+safe(selection.campaign,48,'campanha')+'-'+scope.from+'-'+scope.to+'-'+scope.compare+'.csv';
}
