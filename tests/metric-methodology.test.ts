import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {dashboardMetricGroups,dashboardMetricKeys} from '../src/lib/metrics/catalog';
import {metricMethodologyCatalog,selectMetricMethodology,methodologyVersion} from '../src/lib/metrics/methodology';
import {paidTotals,type PaidMetricKey} from '../src/lib/metrics/paid-metrics';
import {MetricMethodology} from '../src/components/dashboard/metric-methodology';
import {MetricSelector} from '../src/components/metric-selector';

test('methodology preserves persisted metric keys, groups, scopes, platforms and availability configuration',()=>{
 const contract=JSON.stringify(dashboardMetricGroups.map(group=>({id:group.id,metrics:group.metrics.map(metric=>({key:metric.key,scopes:metric.scopes,platforms:metric.platforms,availability:metric.availability}))})));
 assert.equal(createHash('sha256').update(contract).digest('hex'),'87679248d0e71414224ed019a6041e3da9fa35445d1bdd0f9dd0ab66ff2411be');
 const guide=metricMethodologyCatalog();assert.equal(guide.length,79);assert.equal(new Set(guide.map(row=>row.key)).size,guide.length);assert.deepEqual(guide.map(row=>row.key),dashboardMetricKeys);assert.equal(methodologyVersion,'2026-10-27.1');
 for(const row of guide){const source=dashboardMetricGroups.flatMap(group=>[...group.metrics]).find(metric=>metric.key===row.key)!;assert.equal(row.label,source.label);assert.deepEqual(row.contexts.map(item=>item.scope),source.scopes);for(const item of row.contexts){assert.ok(item.grain);assert.ok(item.unit);assert.ok(item.requirements.length);assert.ok(item.limitations.length);}}
});
test('paid core formula documentation is scoped to paid and agrees with weighted calculation behavior',()=>{
 const guide=metricMethodologyCatalog(),keys:PaidMetricKey[]=['spend','impressions','clicks','leads','ctr','cpc','cpm','cpl'];
 for(const key of keys){const item=guide.find(row=>row.key===key)!.contexts.find(item=>item.scope==='paid')!;assert.equal(item.status,'documented');assert.ok(item.formula);assert.match(item.aggregation,/nunca a média/);}
 const totals=paidTotals([{spend:10,impressions:100,clicks:10,leads:1},{spend:90,impressions:900,clicks:0,leads:9}]);
 assert.deepEqual(totals,{spend:100,impressions:1000,clicks:10,leads:10,ctr:1,cpc:10,cpm:100,cpl:10});
 const zero=paidTotals([{spend:0,impressions:0,clicks:0,leads:0}]);assert.equal(zero.spend,0);for(const key of ['ctr','cpc','cpm','cpl'] as const)assert.equal(zero[key],null);
 assert.equal(paidTotals([]).spend,null);assert.equal(paidTotals([{spend:1,impressions:null,clicks:1,leads:null}]).ctr,null);
 for(const key of ['impressions','clicks','leads'] as const)for(const item of guide.find(row=>row.key===key)!.contexts.filter(item=>item.scope!=='paid')){assert.equal(item.status,'source_required');assert.equal(item.formula,null);}
});
test('financial, nonadditive and organic contracts withhold unsupported interpretations rather than inventing formulas',()=>{
 const guide=metricMethodologyCatalog();
 for(const key of ['profit','roi'])for(const item of guide.find(row=>row.key===key)!.contexts){assert.equal(item.status,'unavailable');assert.equal(item.formula,null);assert.match(item.aggregation,/Não inferir lucro ou ROI/);}
 for(const key of ['reach','frequency','unique_clicks','unique_ctr'])for(const item of guide.find(row=>row.key===key)!.contexts){assert.equal(item.formula,null);assert.match(item.aggregation,/Não somar/);assert.match(item.requirements.join(' '),/Deduplicação/);}
 for(const key of ['likes','comments','shares','saves']){const item=guide.find(row=>row.key===key)!.contexts[0];assert.equal(item.scope,'organic');assert.ok(item.grain.includes('Facebook/Instagram'));assert.match(item.aggregation,/acumulado/);assert.equal(item.formula,null);}
 const followers=guide.find(row=>row.key==='followers')!.contexts[0];assert.match(followers.unit,/Estoque/);assert.match(followers.aggregation,/nem inferir crescimento/);
 const links=guide.find(row=>row.key==='website_clicks')!.contexts[0];assert.match(links.limitations.join(' '),/Instagram continua pendente/);
 for(const key of ['engagement_rate','follower_growth'])assert.equal(guide.find(row=>row.key===key)!.contexts[0].formula,null);
});
test('methodology search and filters are bounded, literal, accent-insensitive and never mutate the catalog',()=>{
 const before=JSON.stringify(dashboardMetricGroups);const selected=selectMetricMethodology({q:'  CUSTO POR MIL IMPRESSOES  ',scope:'paid',group:'delivery',status:'documented'});assert.ok(selected.rows.some(row=>row.key==='cpm'));assert.equal(selected.filters.q,'CUSTO POR MIL IMPRESSOES');
 assert.equal(selectMetricMethodology({q:'[.*'}).rows.length,0);assert.equal(selectMetricMethodology({scope:'organic',status:'unavailable'}).rows.length,0);
 const organic=selectMetricMethodology({scope:'organic',status:'documented'});assert.deepEqual(organic.rows.map(row=>row.key),['likes','comments','shares','saves']);assert.ok(organic.rows.every(row=>row.contexts.every(item=>item.scope==='organic')));assert.equal(JSON.stringify(dashboardMetricGroups),before);
 for(const q of [null,[],{},42,'x'.repeat(121)])assert.throws(()=>selectMetricMethodology({q}));
 for(const patch of [{group:''},{group:'unknown'},{group:['results']},{scope:'private'},{scope:null},{status:'success'},{status:['documented']}])assert.throws(()=>selectMetricMethodology(patch));
});
test('guide presentation is definition-only and the selector cannot claim configured metrics are already received',()=>{
 const html=renderToStaticMarkup(React.createElement(MetricMethodology,{selection:selectMetricMethodology({q:'ROI',status:'unavailable'})}));
 for(const text of ['definições do catálogo','não dados recebidos','Sem base compatível','Não inferir lucro ou ROI','custos financeiros completos'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('R$'));assert.ok(!html.includes('type="checkbox"'));
 const selector=renderToStaticMarkup(React.createElement(MetricSelector,{initial:['spend','cpc','PRIVATE_UNKNOWN_KEY']}));
 for(const text of ['2 métricas selecionadas','Opção configurável','Requer contrato da fonte','não confirmam recebimento'])assert.ok(selector.includes(text),text);
 assert.ok(!selector.includes('Dados atuais'));assert.ok(!selector.includes('já são recebidos'));assert.ok(!selector.includes('PRIVATE_UNKNOWN_KEY'));for(const key of ['spend','cpc']){const input=selector.match(/<input[^>]*>/g)?.find(tag=>tag.includes('name="enabled_metrics"')&&tag.includes('value="'+key+'"'));assert.ok(input);assert.ok(input.includes(' checked=""'));}
});
