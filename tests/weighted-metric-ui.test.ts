import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import * as weighted from '../src/lib/metrics/weighted-metrics';
import {paidSummary} from '../src/lib/metrics/paid-summary';
import {computeDelta} from '../src/lib/metrics/delta';
import type {CampaignPerformance} from '../src/types/domain';

const {WeightedMetricNote} = loadTypescript<{WeightedMetricNote: React.ComponentType<{summary?: weighted.WeightedMetricSummary}>}>(new URL('../src/components/dashboard/weighted-metric-note.tsx', import.meta.url), (id, native) => native(id));
const passthrough = ({children}: {children?: React.ReactNode}) => React.createElement('div', null, children);
function resolve(id: string, native: NodeRequire): unknown {
  if (id === '@/lib/metrics/weighted-metrics') return weighted;
  if (id === '@/lib/metrics/paid-summary') return {paidSummary};
  if (id === '@/lib/metrics/delta') return {computeDelta};
  if (id === '@/lib/metrics/catalog') return {paidMetricKeys: ['quality_score', 'spend', 'cpl'], dashboardMetricLabels: {quality_score: 'Índice de qualidade', spend: 'Investimento', cpl: 'CPL'}};
  if (id === '@/lib/utils') return {number: (value: number | null) => value == null ? '—' : String(value), money: String};
  if (id === '@/components/dashboard/weighted-metric-note') return {WeightedMetricNote};
  if (id.startsWith('@/components/')) return new Proxy({}, {get: () => passthrough});
  return native(id);
}
const {CampaignOverview} = loadTypescript<{CampaignOverview: React.ComponentType<Record<string, unknown>>}>(new URL('../src/components/dashboard/campaign-overview.tsx', import.meta.url), resolve);
const {CampaignWorkspace} = loadTypescript<{CampaignWorkspace: React.ComponentType<Record<string, unknown>>}>(new URL('../src/components/dashboard/campaign-workspace.tsx', import.meta.url), (id, native) => {
  if (id === '@/components/dashboard/sortable-card-grid') return {SortableCardGrid: ({items}: {items: {id: string; content: React.ReactNode}[]}) => React.createElement('div', null, items.map(item => React.createElement('div', {key: item.id}, item.content)))};
  return resolve(id, native);
});
const orgA = '11111111-1111-4111-8111-111111111111';
const orgB = '22222222-2222-4222-8222-222222222222';
const fact = (score: number | null, impressions: number | null = 100): CampaignPerformance => ({organizationId: orgA, spend: 10, currency: 'BRL', platform: 'google_ads', impressions, metricValues: {quality_score: score}} as CampaignPerformance);

test('visible note explains partial data, missing weights and approximation', () => {
  const summary = weighted.summarizeWeightedMetric([{value: 8, weight: 100}, {value: null, weight: 100}, {value: 2, weight: 0}]);
  const html = renderToStaticMarkup(React.createElement(WeightedMetricNote, {summary}));
  assert.match(html, /Cobertura parcial: 1 de 3 registros/);
  assert.match(html, /1 sem valor válido/); assert.match(html, /1 com impressões ausentes/);
  assert.match(html, /Estimativa ponderada por impressões/); assert.match(html, /pode diferir do consolidado/);
});

test('unavailable and overflow notes do not present an estimate', () => {
  const html = renderToStaticMarkup(React.createElement(WeightedMetricNote, {summary: weighted.summarizeWeightedMetric([{value: 1e308, weight: 1e308}])}));
  assert.match(html, /Métrica indisponível/); assert.match(html, /limite numérico/);
  assert.doesNotMatch(html, /Estimativa ponderada/);
});

test('actual overview suppresses period deltas with partial coverage', () => {
  const html = renderToStaticMarkup(React.createElement(CampaignOverview, {rows: [fact(8), fact(null)], previousRows: [fact(4)], comparing: true, currency: 'BRL', enabledMetrics: ['quality_score']}));
  assert.match(html, /Cobertura parcial/); assert.match(html, /Comparação indisponível/);
  assert.doesNotMatch(html, /% vs. período anterior/);
});

test('actual overview keeps a complete comparison and its methodology visible', () => {
  const html = renderToStaticMarkup(React.createElement(CampaignOverview, {rows: [fact(8)], previousRows: [fact(4)], comparing: true, currency: 'BRL', enabledMetrics: ['quality_score']}));
  assert.match(html, /Cobertura completa/); assert.match(html, /100% vs. período anterior/);
  assert.doesNotMatch(html, /Comparação indisponível/);
});

test('actual workspace and platform cards show coverage beside the weighted KPI', () => {
  const html = renderToStaticMarkup(React.createElement(CampaignWorkspace, {organizationId: orgA,rows: [fact(8), fact(null)], previousRows: [fact(4)], comparing: true, showPlatforms: true, currency: 'BRL', enabledMetrics: ['quality_score'], timeline: [], funnelSteps: [], rankings: {}, storageKey: 'synthetic'}));
  assert.ok((html.match(/Cobertura parcial/g) ?? []).length >= 2);
  assert.match(html, /Comparação indisponível/); assert.doesNotMatch(html, /100% vs. comparação/);
});


test('complete current period cannot compare against a partial prior period', () => {
  const html = renderToStaticMarkup(React.createElement(CampaignOverview, {rows: [fact(8)], previousRows: [fact(4), fact(null)], comparing: true, currency: 'BRL', enabledMetrics: ['quality_score']}));
  assert.match(html, /Cobertura completa/); assert.match(html, /Comparação indisponível/);
  assert.doesNotMatch(html, /% vs. período anterior/);
});

test('disabled comparison does not expose prior weighted values in workspace', () => {
  const html = renderToStaticMarkup(React.createElement(CampaignWorkspace, {organizationId: orgA,rows: [fact(8)], previousRows: [fact(4)], comparing: false, currency: 'BRL', enabledMetrics: ['quality_score'], timeline: [], funnelSteps: [], rankings: {}, storageKey: 'synthetic'}));
  assert.match(html, /Cobertura completa/); assert.doesNotMatch(html, /% vs. comparação/);
  assert.doesNotMatch(html, /Comparação indisponível/);
});

test('workspace renders an empty weighted KPI as unavailable with zero observations', () => {
  const html = renderToStaticMarkup(React.createElement(CampaignWorkspace, {organizationId: orgA,rows: [], previousRows: [], comparing: false, currency: 'BRL', enabledMetrics: ['quality_score'], timeline: [], funnelSteps: [], rankings: {}, storageKey: 'synthetic'}));
  assert.match(html, /Métrica indisponível: 0 de 0 registros/);
  assert.doesNotMatch(html, /Cobertura completa/); assert.doesNotMatch(html, /Estimativa ponderada/);
});


const paidFact = (spend: number, leads: number): CampaignPerformance => ({
  ...fact(8), organizationId: orgA, accountId: 'synthetic-account',
  campaignId: 'synthetic-campaign', campaignName: 'Synthetic', spend, leads,
  metricValues: {spend, leads, quality_score: 8},
});
const paidWorkspace = (spend: number, priorSpend: number) => renderToStaticMarkup(React.createElement(CampaignWorkspace, {organizationId: orgA,
  rows: [paidFact(spend, 10)], previousRows: [paidFact(priorSpend, 10)], comparing: true,
  currency: 'BRL', enabledMetrics: ['spend', 'cpl'], timeline: [], funnelSteps: [], rankings: {}, storageKey: 'synthetic',
}));

test('workspace displays budget deltas neutrally while higher CPL remains adverse', () => {
  const html = paidWorkspace(120, 100);
  assert.match(html, /Variação neutra/);
  assert.match(html, /text-zinc-400">\+20% vs\. comparação/);
  assert.match(html, /text-red-400">\+20% vs\. comparação/);
  assert.match(html, /Atenção/);
});

test('workspace flags reduced CPL as favorable and never renders infinite delta', () => {
  const lower = paidWorkspace(80, 100);
  assert.match(lower, /text-emerald-400">-20% vs\. comparação/);
  assert.match(lower, /Variação neutra/);
  const extreme = paidWorkspace(1e308, 1e-308);
  assert.doesNotMatch(extreme, /Infinity|NaN/);
  assert.match(extreme, /No período selecionado/);
  assert.match(extreme, /Sem base/);
});

test('actual workspace denies a foreign organization before rendering campaign data', () => {
  assert.throws(() => renderToStaticMarkup(React.createElement(CampaignWorkspace, {
    organizationId: orgA,
    rows: [{...paidFact(0, 0), organizationId: orgB}], previousRows: [],
    comparing: false, currency: 'BRL', enabledMetrics: ['spend'],
    timeline: [], funnelSteps: [], rankings: {}, storageKey: 'synthetic',
  })), /Workspace campaigns require authorized organization and currency/);
});
