import {serializeCsv,type CsvCell} from './csv';
import type {OrganicContentReport} from '@/lib/reports/organic-content';
export function organicContentCsv(report:OrganicContentReport):string{
 const {scope}=report;
 const header:CsvCell[]=['versao','cliente','inicio_publicacao_utc','fim_publicacao_utc','fuso_cadastral','gerado_em_utc','filtro_plataforma','fonte','janela_contadores','relatorio_limitado','limite','registros_recebidos','conteudos_exibidos','plataforma','conta','conteudo_id','tipo','legenda','legenda_truncada','publicado_em_utc','coletado_em_utc','coleta_valida','curtidas_ou_reacoes','comentarios','compartilhamentos','salvos'];
 return serializeCsv([header,...report.rows.map((row):CsvCell[]=>[
  '1',scope.organizationName,scope.from,scope.to,scope.timezone,scope.generatedAt,scope.platform,'creatives.lifetime_metrics',
  'acumulado_no_conteudo_ate_ultima_coleta',report.truncated?'sim':'nao',report.limit,report.received,report.rows.length,
  row.platform,row.account,row.externalId,row.kind,row.caption,row.captionTruncated?'sim':'nao',row.publishedAt,row.collectedAt,
  row.snapshotValid?'sim':'nao',row.likes,row.comments,row.shares,row.saves,
 ])]);
}
export function organicContentFilename(report:OrganicContentReport):string{
 const slug=report.scope.organizationSlug.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80)||'cliente';
 return slug+'-conteudos-organicos-'+report.scope.from.replace(/[^0-9-]/g,'')+'-'+report.scope.to.replace(/[^0-9-]/g,'')+'.csv';
}
