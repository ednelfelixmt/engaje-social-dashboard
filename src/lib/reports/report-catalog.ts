import {calendarDays} from '@/lib/metrics/calendar';
import type {PerformanceScope} from './performance-report';
export type ReportContext = Pick<PerformanceScope, 'from' | 'to' | 'currency' | 'compare'>;
export const reportCatalog = [
 {path:'analytics',title:'Análise 360',description:'Desempenho, funis, público, comparativos e modo TV no mesmo workspace.',requires:'overview',comparison:true,formats:'CSV · Modo TV'},
 {path:'performance',title:'Executivo de mídia paga',description:'Investimento, resultados e custos por plataforma e campanha.',requires:'paid',comparison:true,formats:'CSV · PDF'},
 {path:'funnel',title:'Funil de mídia paga',description:'Etapas configuradas pela agência, cobertura e custos por resultado recebido.',requires:'funnel',comparison:true,formats:'CSV · PDF'},
 {path:'meta-audience',title:'Público do Meta Ads',description:'Demografia, dispositivos e geografia dos dados de anúncios recebidos.',requires:'paid',comparison:false,formats:'CSV'},
 {path:'google-audience',title:'Público do Google Ads',description:'Recortes demográficos e geográficos de anúncios.',requires:'paid',comparison:false,formats:'CSV'},
 {path:'revenue',title:'Receita e dados externos',description:'Receita, cobertura e reconciliação das fontes externas disponíveis.',requires:'external',comparison:true,formats:'CSV · PDF'},
 {path:'targets',title:'Metas e referências',description:'Referências cadastradas e limites de interpretação das metas.',requires:'paid',comparison:false,formats:'CSV · PDF'},
 {path:'organic-content',title:'Publicações orgânicas',description:'Conteúdos publicados e contadores recebidos, com limites de cada fonte.',requires:'organic',comparison:false,formats:'CSV · PDF'},
 {path:'organic-accounts',title:'Contas orgânicas',description:'Medições recebidas por conta, sem presumir cobertura completa.',requires:'organic',comparison:false,formats:'CSV · PDF'},
 {path:'creatives',route:'paid-creatives',title:'Biblioteca de criativos',description:'Anúncios e peças recebidos das plataformas, com os filtros do período.',requires:'creatives',comparison:false,formats:'Consulta'},
 {path:'methodology',title:'Guia de métricas',description:'Definições, fórmulas, origens e interpretação dos indicadores.',requires:'overview',comparison:false,formats:'Consulta'},
] as const;
export type ReportPath = typeof reportCatalog[number]['path'];
/** Whitelist navigation context. Account/campaign identifiers never follow a report link. */
/** Reject invisible and bidirectional controls in tenant navigation without changing the slug. */
const unsafeSlugControls = /[\u0000-\u001F\u007F-\u009F\u061C\u200B\u200E-\u200F\u2028-\u202E\u2060\u2066-\u2069\uFEFF]/u;
/** Lone UTF-16 surrogates cannot be percent-encoded as valid navigation paths. */
const malformedUtf16Slug = /[\uD800-\uDFFF]/u;
export function reportHref(slug:string, path:ReportPath, context:ReportContext):string {
 const item=reportCatalog.find(item=>item.path===path);
 if(!item||!slug.trim()||slug.trim()!==slug||slug==='.'||slug==='..'||unsafeSlugControls.test(slug)||malformedUtf16Slug.test(slug)||!['none','previous_period','previous_year'].includes(context.compare)||! /^[A-Z]{3}$/.test(context.currency))throw new Error('Invalid report navigation');
 calendarDays(context.from,context.to);
 const query=new URLSearchParams({from:context.from,to:context.to,currency:context.currency,compare:item.comparison?context.compare:'none'});
 const route='route' in item?item.route:'reports/'+path;
 return '/'+encodeURIComponent(slug)+'/'+route+'?'+query.toString();
}
