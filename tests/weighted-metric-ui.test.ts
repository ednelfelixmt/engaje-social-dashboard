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
  if (id === '@/lib/metrics/catalog') return {paidMetricKeys: ['quality_score'], dashboardMetricLabels: {quality_score: 'Índice de qualidade'}};
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
const fact = (score: number | null, impressions: number | null = 100): CampaignPerformance => ({spend: 10, currency: 'BRL', platform: 'google_ads', impressions, metricValues: {quality_score: score}} as CampaignPerformance);

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
  const html = renderToStaticMarkup(React.createElement(CampaignWorkspace, {rows: [fact(8), fact(null)], previousRows: [fact(4)], comparing: true, showPlatforms: true, currency: 'BRL', enabledMetrics: ['quality_score'], timeline: [], funnelSteps: [], rankings: {}, storageKey: 'synthetic'}));
  assert.ok((html.match(/Cobertura parcial/g) ?? []).length >= 2);
  assert.match(html, /Comparação indisponível/); assert.doesNotMatch(html, /100% vs. comparação/);
});


test('complete current period cannot compare against a partial prior period', () => {
  const html = renderToStaticMarkup(React.createElement(CampaignOverview, {rows: [fact(8)], previousRows: [fact(4), fact(null)], comparing: true, currency: 'BRL', enabledMetrics: ['quality_score']}));
  assert.match(html, /Cobertura completa/); assert.match(html, /Comparação indisponível/);
  assert.doesNotMatch(html, /% vs. período anterior/);
});

test('disabled comparison does not expose prior weighted values in workspace', () => {
  const html = renderToStaticMarkup(React.createElement(CampaignWorkspace, {rows: [fact(8)], previousRows: [fact(4)], comparing: false, currency: 'BRL', enabledMetrics: ['quality_score'], timeline: [], funnelSteps: [], rankings: {}, storageKey: 'synthetic'}));
  assert.match(html, /Cobertura completa/); assert.doesNotMatch(html, /% vs. comparação/);
  assert.doesNotMatch(html, /Comparação indisponível/);
});

test('workspace renders an empty weighted KPI as unavailable with zero observations', () => {
  const html = renderToStaticMarkup(React.createElement(CampaignWorkspace, {rows: [], previousRows: [], comparing: false, currency: 'BRL', enabledMetrics: ['quality_score'], timeline: [], funnelSteps: [], rankings: {}, storageKey: 'synthetic'}));
  assert.match(html, /Métrica indisponível: 0 de 0 registros/);
  assert.doesNotMatch(html, /Cobertura completa/); assert.doesNotMatch(html, /Estimativa ponderada/);
});
