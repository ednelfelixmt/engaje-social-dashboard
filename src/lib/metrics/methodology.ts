import {dashboardMetricGroups,type DashboardMetricKey,type DashboardMetricScope} from './catalog';
import type {PaidMetricKey} from './paid-metrics';
export const methodologyVersion='2026-10-27.1';
export const methodologyStatuses=['documented','conditional','source_required','unavailable'] as const;
export type MethodologyStatus=typeof methodologyStatuses[number];
export const methodologyStatusLabels:Record<MethodologyStatus,string>={documented:'Contrato documentado',conditional:'Exige compatibilidade da base',source_required:'Exige contrato da fonte',unavailable:'Sem base compatível no produto'};
export const methodologyScopeLabels:Record<DashboardMetricScope,string>={paid:'Mídia paga',organic:'Orgânico',sales:'CRM e vendas'};
export type MetricMethodology={scope:DashboardMetricScope;status:MethodologyStatus;unit:string;grain:string;formula:string|null;aggregation:string;requirements:string[];limitations:string[]};
export type MetricGuideEntry={key:DashboardMetricKey;label:string;description:string;group:string;groupLabel:string;platforms:readonly string[];contexts:MetricMethodology[]};
const paidCore:Record<PaidMetricKey,{unit:string;formula:string}>={
 spend:{unit:'Moeda selecionada',formula:'Soma dos investimentos recebidos'},impressions:{unit:'Exibições informadas',formula:'Soma das impressões recebidas'},clicks:{unit:'Cliques informados',formula:'Soma dos cliques recebidos'},leads:{unit:'Eventos atribuídos',formula:'Soma dos leads recebidos'},
 ctr:{unit:'Percentual (%)',formula:'Total de cliques ÷ total de impressões × 100'},cpc:{unit:'Moeda por clique',formula:'Investimento total ÷ total de cliques'},cpm:{unit:'Moeda por mil impressões',formula:'Investimento total ÷ total de impressões × 1.000'},cpl:{unit:'Moeda por lead atribuído',formula:'Investimento total ÷ total de leads atribuídos'},
};
const nonadditive=new Set<DashboardMetricKey>(['reach','frequency','unique_clicks','unique_ctr']);
const snapshot=new Set<DashboardMetricKey>(['likes','comments','shares','saves']);
/** Context is part of the contract: a paid key does not define an organic or CRM grain. */
function context(key:DashboardMetricKey,scope:DashboardMetricScope):MetricMethodology{
 const base:MetricMethodology={scope,status:'source_required',unit:'Depende do contrato da fonte',grain:'Origem, janela e unidade precisam ser verificadas',formula:null,aggregation:'Não agregar antes de confirmar grão, unidade e semântica.',requirements:['Fonte autorizada com definição, janela e unidade verificáveis.'],limitations:['Uma opção de configuração não confirma integração ativa, recebimento ou homologação.']};
 if(key==='roi'||key==='profit')return {...base,status:'unavailable',unit:key==='roi'?'Percentual (%)':'Moeda da base financeira',grain:'Resultado financeiro com custos completos',aggregation:'Não inferir lucro ou ROI subtraindo apenas mídia da receita.',requirements:['Receita conciliada e custos financeiros completos, no mesmo escopo.'],limitations:['A base atual de investimento em anúncios não representa todos os custos do negócio.']};
 if(scope==='paid'&&Object.hasOwn(paidCore,key)){
  const definition=paidCore[key as PaidMetricKey];
  return {...base,...definition,status:'documented',grain:'Fatos de anúncio/dia/conta, no mesmo cliente e moeda',aggregation:'Somar componentes recebidos válidos; razões usam os totais, nunca a média de taxas.',requirements:['Cliente, moeda, período e grão validados; sem duplicação de fatos.','Componentes numéricos finitos e não negativos; divisor estritamente positivo para razões.'],limitations:['Ausência, valor inválido ou limite numérico deixam o resultado indisponível; zero recebido continua zero.','O recorte recebido pode ser parcial e não comprova completude de contas ou dias.',...(key==='leads'||key==='cpl'?['Leads são eventos atribuídos, sem deduplicação de pessoas. Não somar automaticamente cadastros e mensagens.','Comparações de leads/CPL exigem janela de atribuição conhecida e compatível; telas podem impor controles adicionais.']:[])]};
 }
 if(nonadditive.has(key))return {...base,unit:key==='frequency'?'Razão de exibições por alcance':key==='unique_ctr'?'Percentual (%)':'Pessoas ou contas reportadas',grain:'Escopo e período deduplicados pela origem',aggregation:'Não somar pessoas ou contas entre dias, campanhas, contas ou plataformas.',requirements:['Deduplicação comprovada na origem e componentes com o mesmo período e escopo.'],limitations:['Alcance diário não permite inferir alcance do período, frequência ou cliques únicos consolidados.']};
 if(key==='revenue')return {...base,status:'conditional',unit:'Moeda da fonte selecionada',grain:'Receita com fonte, moeda e período definidos',formula:scope==='sales'?'Soma da fonte selecionada: CRM ou planilha':null,aggregation:'Manter as origens separadas e aplicar a política de conciliação do relatório.',requirements:['Fonte e moeda identificadas; conferir cobertura e atribuição.'],limitations:['Não somar CRM e planilha para contar a mesma venda.','Estornos e ajustes não são apagados quando admitidos pelo contrato da fonte.']};
 if(key==='roas'&&scope==='paid')return {...base,status:'conditional',unit:'Razão (x)',grain:'Receita e mídia com escopo compatível',formula:'Receita compatível ÷ investimento',aggregation:'Usar componentes compatíveis no mesmo cliente, moeda e período.',requirements:['Investimento maior que zero e receita com origem/atribuição compatíveis.'],limitations:['ROAS não é ROI nem lucro. Receitas de origens duplicadas não podem ser somadas.']};
 if(scope==='organic'){
  const limitations=['Janela original de medição das contas não confirmada; o rótulo diário armazenado não comprova atividade diária.','Plataformas listadas no catálogo não confirmam um conector operacional.'];
  if(snapshot.has(key))return {...base,status:'documented',unit:'Contador acumulado por conteúdo',grain:'Conteúdo Facebook/Instagram até a coleta armazenada',aggregation:'Não usar o acumulado como atividade gerada no período filtrado.',requirements:['Publicação e coleta válidas; campo recebido da integração.'],limitations:[...limitations,'Curtidas do Instagram e reações do Facebook têm semânticas diferentes; salvos não são inferidos para Facebook.']};
  if(key==='followers')return {...base,status:'conditional',unit:'Estoque recebido de seguidores',grain:'Conta na coleta registrada',aggregation:'Não somar estoques entre datas nem inferir crescimento.',requirements:['Coleta válida e origem identificada.'],limitations};
  if(key==='website_clicks')return {...base,unit:'Ações em links recebidas',grain:'Campo recebido por conta, com janela não confirmada',aggregation:'Não somar ou equiparar ações em links a visitas/sessões.',requirements:['Validar o significado do campo e da janela em cada provedor.'],limitations:[...limitations,'O mapeamento específico de cliques no site do Instagram continua pendente.']};
  if(key==='engagement_rate'||key==='follower_growth')return {...base,grain:'Janela orgânica ainda não confirmada',aggregation:'Não derivar taxa ou crescimento destes registros sem contrato compatível.',requirements:['Janela conhecida; alcance deduplicado para taxas ou coletas comparáveis para crescimento.'],limitations};
  return {...base,limitations:[...base.limitations,...limitations]};
 }
 return base;
}
export function metricMethodologyCatalog():MetricGuideEntry[]{return dashboardMetricGroups.flatMap(group=>group.metrics.map(metric=>({key:metric.key,label:metric.label,description:metric.description,group:group.id,groupLabel:group.title,platforms:[...metric.platforms],contexts:(metric.scopes as readonly DashboardMetricScope[]).map(scope=>context(metric.key,scope))})));}
export type MethodologyFilters={q:string;group:string;scope:'all'|DashboardMetricScope;status:'all'|MethodologyStatus};
const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
function option(value:unknown,choices:readonly string[],fallback:string):string{if(value===undefined)return fallback;if(typeof value!=='string'||!choices.includes(value))throw new Error('Invalid methodology filter');return value;}
export function selectMetricMethodology(search:Record<string,unknown>){
 const q=search.q===undefined?'':search.q;if(typeof q!=='string'||q.length>120)throw new Error('Invalid methodology search');
 const filters:MethodologyFilters={q:q.trim(),group:option(search.group,['all',...dashboardMetricGroups.map(group=>group.id)],'all'),scope:option(search.scope,['all','paid','organic','sales'],'all') as MethodologyFilters['scope'],status:option(search.status,['all',...methodologyStatuses],'all') as MethodologyFilters['status']};
 const catalog=metricMethodologyCatalog(),needle=normalized(filters.q);
 const rows=catalog.filter(entry=>filters.group==='all'||entry.group===filters.group).map(entry=>({...entry,contexts:entry.contexts.filter(item=>(filters.scope==='all'||item.scope===filters.scope)&&(filters.status==='all'||item.status===filters.status))})).filter(entry=>entry.contexts.length&&(!needle||normalized([entry.key,entry.label,entry.description,entry.groupLabel,...entry.platforms,...entry.contexts.flatMap(item=>[methodologyScopeLabels[item.scope],item.formula??'',item.grain,item.aggregation,...item.requirements,...item.limitations])].join(' ')).includes(needle)));
 return {version:methodologyVersion,filters,rows,total:catalog.length};
}
