import {calendarDays} from '@/lib/metrics/calendar';
import type {PerformanceScope} from './performance-report';
export type ReportContext = Pick<PerformanceScope, 'from' | 'to' | 'currency' | 'compare'>;
export const reportCatalog = [
 {path:'performance',title:'Executivo de mídia paga',description:'Investimento, resultados e custos por plataforma e campanha.',requires:'paid',comparison:true,formats:'CSV · PDF'},
 {path:'funnel',title:'Funil de mídia paga',description:'Etapas configuradas pela agência, cobertura e custos por resultado recebido.',requires:'funnel',comparison:true,formats:'CSV · PDF'},
 {path:'meta-audience',title:'Público do Meta Ads',description:'Demografia, dispositivos e geografia dos dados de anúncios recebidos.',requires:'paid',comparison:false,formats:'CSV'},
 {path:'google-audience',title:'Público do Google Ads',description:'Recortes demográficos e geográficos de anúncios.',requires:'paid',comparison:false,formats:'CSV'},
 {path:'revenue',title:'Receita e dados externos',description:'Receita, cobertura e reconciliação das fontes externas disponíveis.',requires:'external',comparison:true,formats:'CSV · PDF'},
 {path:'targets',title:'Metas e referências',description:'Referências cadastradas e limites de interpretação das metas.',requires:'paid',comparison:false,formats:'CSV · PDF'},
 {path:'organic-content',title:'Publicações orgânicas',description:'Conteúdos publicados e contadores recebidos, com limites de cada fonte.',requires:'organic',comparison:false,formats:'CSV · PDF'},
 {path:'organic-accounts',title:'Contas orgânicas',description:'Medições recebidas por conta, sem presumir cobertura completa.',requires:'organic',comparison:false,formats:'CSV · PDF'},
 {path:'methodology',title:'Guia de métricas',description:'Definições, fórmulas, origens e interpretação dos indicadores.',requires:'overview',comparison:false,formats:'Consulta'},
] as const;
export type ReportPath = typeof reportCatalog[number]['path'];
/** Whitelist navigation context. Account/campaign identifiers never follow a report link. */
export function reportHref(slug:string, path:ReportPath, context:ReportContext):string {
 const item=reportCatalog.find(item=>item.path===path);
 if(!item||!slug.trim()||slug.trim()!==slug||slug==='.'||slug==='..'||!['none','previous_period','previous_year'].includes(context.compare)||! /^[A-Z]{3}$/.test(context.currency))throw new Error('Invalid report navigation');
 calendarDays(context.from,context.to);
 const query=new URLSearchParams({from:context.from,to:context.to,currency:context.currency,compare:item.comparison?context.compare:'none'});
 return '/'+encodeURIComponent(slug)+'/reports/'+path+'?'+query.toString();
}
