import type {Row} from '@/types/database.types';
import {calendarDays} from '@/lib/metrics/calendar';
import {paidTotals} from '@/lib/metrics/paid-metrics';
import {buildPerformanceReport, comparableAttribution, type PerformanceScope, type PerformancePeriod} from './performance-report';

export const targetFields = ['target_spend','target_leads','target_cpl','target_ctr','target_frequency','target_roas','target_roi','target_cpa','target_revenue','target_purchases'] as const;
export type TargetField = typeof targetFields[number];
export type TargetConfig = Pick<Row<'dashboard_configs'>, 'organization_id' | TargetField>;
export type TargetScope = Omit<PerformanceScope, 'compare'> & {referenceCurrency: string};
type SupportedMetric = 'spend' | 'leads' | 'cpl' | 'ctr';
export type TargetStatus = 'not_configured' | 'invalid_target' | 'unsupported' | 'currency_mismatch' | 'insufficient_data' | 'below' | 'equal' | 'above';
export type TargetReference = {field: TargetField; label: string; unit: 'money' | 'count' | 'percent' | 'ratio'; actual: number | null; target: number | null; difference: number | null; status: TargetStatus; reason: string; knownDays: number};
export type TargetReferenceReport = {scope: TargetScope; rows: TargetReference[]; sourceRecords: number; receivedDays: number; expectedDays: number; configured: number; attribution: PerformancePeriod['attribution']};
const definitions: {field: TargetField; label: string; unit: TargetReference['unit']; metric: SupportedMetric | null; dependency?: string}[] = [
 {field:'target_spend',label:'Investimento',unit:'money',metric:'spend'},
 {field:'target_leads',label:'Leads atribuídos',unit:'count',metric:'leads'},
 {field:'target_cpl',label:'CPL atribuído',unit:'money',metric:'cpl'},
 {field:'target_ctr',label:'CTR',unit:'percent',metric:'ctr'},
 {field:'target_frequency',label:'Frequência',unit:'ratio',metric:null,dependency:'Requer audiência deduplicada no período; alcance diário não pode ser somado para inferi-la.'},
 {field:'target_roas',label:'ROAS',unit:'ratio',metric:null,dependency:'Requer receita conciliada e investimento com escopo e atribuição compatíveis.'},
 {field:'target_roi',label:'ROI',unit:'percent',metric:null,dependency:'Requer custos financeiros completos; investimento em anúncios sozinho não permite calcular ROI.'},
 {field:'target_cpa',label:'CPA',unit:'money',metric:null,dependency:'Requer compras verificadas e investimento no mesmo escopo de atribuição.'},
 {field:'target_revenue',label:'Receita',unit:'money',metric:null,dependency:'Consulte a análise de receita externa; este recorte usa exclusivamente fatos de anúncios.'},
 {field:'target_purchases',label:'Compras',unit:'count',metric:null,dependency:'Requer fonte de compras conciliada; leads não equivalem a vendas.'},
];
const components: Record<SupportedMetric, ('spend' | 'leads' | 'clicks' | 'impressions')[]> = {spend:['spend'],leads:['leads'],cpl:['spend','leads'],ctr:['clicks','impressions']};

/** Factual comparison with undated references, never monthly achievement or a forecast. */
export function buildTargetReferences(facts: readonly Row<'metrics_ads'>[], config: TargetConfig, scope: TargetScope): TargetReferenceReport {
 if (config.organization_id !== scope.organizationId || !/^[A-Z]{3}$/.test(scope.referenceCurrency)) throw new Error('Target configuration scope mismatch');
 const report = buildPerformanceReport(facts, [], {...scope, compare:'none'});
 const dates = calendarDays(scope.from, scope.to), byDay = new Map<string, Row<'metrics_ads'>[]>();
 for (const row of facts) {const day = byDay.get(row.metric_date) ?? []; day.push(row); byDay.set(row.metric_date, day);}
 const daily = dates.map(date => paidTotals(byDay.get(date) ?? []));
 const knownAttribution = comparableAttribution(report.current, report.current);
 const rows = definitions.map((definition): TargetReference => {
  const raw = config[definition.field];
  const validTarget = typeof raw === 'number' && Number.isFinite(raw) && (definition.field === 'target_roi' || raw >= 0);
  const target = validTarget ? raw : null;
  const metric = definition.metric;
  const knownDays = metric ? daily.filter(day => components[metric].every(key => day[key] !== null)).length : 0;
  const requiresAttribution = metric === 'leads' || metric === 'cpl';
  const actual = metric && knownDays === dates.length && (!requiresAttribution || knownAttribution) ? report.current.totals[metric] : null;
  let status: TargetStatus, reason: string;
  if (raw === null || raw === undefined) {status='not_configured'; reason='Referência não cadastrada pela agência.';}
  else if (!validTarget) {status='invalid_target'; reason='Referência inválida; a agência precisa revisar o cadastro.';}
  else if (!metric) {status='unsupported'; reason=definition.dependency!;}
  else if (scope.currency !== scope.referenceCurrency) {status='currency_mismatch'; reason='Moeda filtrada diferente da moeda cadastral; o recorte não é comparável à referência da organização.';}
  else if (actual === null) {
   status='insufficient_data';
   reason=knownDays < dates.length ? 'Faltam datas ou componentes válidos; ausência não representa zero.' : requiresAttribution && !knownAttribution ? 'Janela de atribuição desconhecida ou ambígua para uma conta.' : 'Soma ou razão indisponível: denominador zero ou resultado não representável.';
  } else {status=actual < target! ? 'below' : actual > target! ? 'above' : 'equal'; reason='Comparação numérica no recorte selecionado, sem classificação de cumprimento mensal.';}
  const comparable = status === 'below' || status === 'equal' || status === 'above';
  const delta = comparable ? actual! - target! : null;
  return {field:definition.field,label:definition.label,unit:definition.unit,actual,target,difference:delta !== null && Number.isFinite(delta) ? delta : null,status,reason,knownDays};
 });
 return {scope:{...scope},rows,sourceRecords:facts.length,receivedDays:byDay.size,expectedDays:dates.length,configured:targetFields.filter(key => config[key] !== null && config[key] !== undefined).length,attribution:report.current.attribution};
}
