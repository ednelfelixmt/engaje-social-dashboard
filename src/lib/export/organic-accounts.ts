import {serializeCsv,type CsvCell} from './csv';
import type {OrganicAccountsReport} from '@/lib/reports/organic-accounts';
export function organicAccountsCsv(report:OrganicAccountsReport):string{
 const {scope}=report;
 const coverage=new Map(report.accounts.map(account=>[JSON.stringify([account.platform,account.account]),account]));
 const header:CsvCell[]=['versao','cliente','inicio_data_registrada','fim_data_registrada','fuso_cadastral','gerado_em_utc','filtro_plataforma','fonte','janela_medicao_confirmada','regra_agregacao','semantica_links','relatorio_limitado','limite','registros_recebidos','registros_exibidos','plataforma','conta','data_registrada','rotulo_periodo_armazenado','coletado_em_utc','timestamp_coleta_conhecido','visualizacoes_ou_impressoes_recebidas','alcance_recebido','interacoes_recebidas','seguidores_estoque_recebido','acoes_em_links_recebidas','datas_calendario_filtro','datas_com_registro_exibido_conta','datas_sem_registro_exibido_conta'];
 return serializeCsv([header,...report.rows.map((row):CsvCell[]=>{
  const account=coverage.get(JSON.stringify([row.platform,row.account]))!;
  return ['1',scope.organizationName,scope.from,scope.to,scope.timezone,scope.generatedAt,scope.platform,'metrics_organic_accounts','nao',
   'nao_somar_ou_inferir_atividade_diaria;seguidores_sao_estoque',row.platform==='instagram_organic'?'mapeamento_cliques_site_nao_confirmado':'campo_recebido_sem_comparacao',
   report.truncated?'sim':'nao',report.limit,report.received,report.rows.length,row.platform,row.account,row.recordDate,row.storedPeriod,row.collectedAt,
   row.collectionKnown?'sim':'nao',row.values.impressions,row.values.reach,row.values.interactions,row.values.followers,row.values.website_clicks,
   account.selectedDates,account.recordDates,account.datesWithoutRecord];
 })]);
}
export function organicAccountsFilename(report:OrganicAccountsReport):string{
 const slug=report.scope.organizationSlug.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80)||'cliente';
 return slug+'-dados-organicos-contas-'+report.scope.from.replace(/[^0-9-]/g,'')+'-'+report.scope.to.replace(/[^0-9-]/g,'')+'.csv';
}
