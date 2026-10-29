import {serializeCsv,type CsvCell} from './csv';
import {performanceReportFilename} from './performance-report';
import type {FunnelReport} from '@/lib/reports/funnel-report';
export function funnelReportCsv(report:FunnelReport):string {
 const {scope}=report;
 const rows:CsvCell[][]=[['versao','gerado_em_utc','cliente','fonte','plataforma','moeda','fuso_cadastral','comparacao','etapa','metrica','periodo','inicio','fim','registros_recebidos','campanhas_observadas','campanhas_com_valor','valor','tipo_custo','custo','referencia_sem_vigencia','janelas_atribuicao','observacao']];
 for(const stage of report.stages)for(const [name,period,value] of [['atual',report.current,stage.current],['comparativo',report.previous,stage.previous]] as const){
  if(!period||!value)continue;
  rows.push(['1',scope.generatedAt,scope.organizationName,'metrics_ads',scope.platform??'todas',scope.currency,scope.timezone,scope.compare,stage.label,stage.metric,name,period.from,period.to,period.sourceIds.length,value.observed,value.known,value.value,stage.costLabel,value.cost,stage.target,JSON.stringify(period.attribution),value.detail]);
 }
 return serializeCsv(rows);
}
export function funnelReportFilename(report:FunnelReport):string {
 return performanceReportFilename(report.scope).replace('-relatorio-executivo-','-funil-'+(report.scope.platform??'todas')+'-');
}
