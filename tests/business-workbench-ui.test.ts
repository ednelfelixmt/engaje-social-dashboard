import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import * as summary from '../src/lib/metrics/business-workbench-summary';
import type {InsightCampaign} from '../src/components/dashboard/business-analytics-workbench';

const passthrough = ({children}: {children?: React.ReactNode}) => React.createElement(React.Fragment, null, children);
const {BusinessAnalyticsWorkbench} = loadTypescript<{
  BusinessAnalyticsWorkbench: React.ComponentType<Record<string, unknown>>;
}>(new URL('../src/components/dashboard/business-analytics-workbench.tsx', import.meta.url), (id, native) => {
  if (id === 'react') return React;
  if (id === 'recharts' || id === 'lucide-react') return new Proxy({}, {get: () => passthrough});
  if (id === '@/components/ui/card') return {Card: passthrough};
  if (id === '@/lib/utils') return {number: (value: number) => String(value), money: (value: number) => String(value)};
  if (id === '@/lib/export/csv') return {serializeCsv: () => ''};
  if (id === '@/lib/metrics/business-workbench-summary') return summary;
  return native(id);
});

function row(spend: number): InsightCampaign {
  return {id: 'synthetic-campaign', name: 'Synthetic', platform: 'meta_ads',
    spend, impressions: 1000, clicks: 50, leads: 10, revenue: null, purchases: null};
}
function render(spend: number, previousSpend = 100): string {
  return renderToStaticMarkup(React.createElement(BusinessAnalyticsWorkbench, {
    company: 'Synthetic tenant', period: 'Synthetic period',
    current: [row(spend)], previous: [row(previousSpend)],
    timeline: [], priorTimeline: [], currency: 'BRL',
  }));
}

test('Intelligence UI displays budget increase as neutral but CPL increase as adverse', () => {
  const html = render(120);
  assert.match(html, /class="text-zinc-400" title="Variação neutra">\+20% vs\. comparação/);
  assert.match(html, /class="text-rose-300" title="Variação desfavorável">\+20% vs\. comparação/);
  assert.match(html, /class="text-zinc-400" title="Variação neutra">\+0% vs\. comparação/);
});

test('Intelligence UI displays budget reduction as neutral but CPL reduction as favorable', () => {
  const html = render(80);
  assert.match(html, /class="text-zinc-400" title="Variação neutra">-20% vs\. comparação/);
  assert.match(html, /class="text-emerald-300" title="Variação favorável">-20% vs\. comparação/);
});

test('Intelligence UI does not fabricate a comparison when prior measurements are absent', () => {
  const html = renderToStaticMarkup(React.createElement(BusinessAnalyticsWorkbench, {
    company: 'Synthetic tenant', period: 'Synthetic period',
    current: [row(100)], previous: [], timeline: [], priorTimeline: [], currency: 'BRL',
  }));
  assert.match(html, /Comparação indisponível/);
  assert.doesNotMatch(html, /title="Variação favorável"|title="Variação desfavorável"/);
});

test('Intelligence trend chart uses selected current and historical series rather than all-channel data', () => {
  const source = readFileSync('src/components/dashboard/business-analytics-workbench.tsx', 'utf8');
  assert.match(source, /selectWorkbenchTimeline\(channel,timeline,timelinesByChannel\)/);
  assert.match(source, /selectWorkbenchTimeline\(channel,priorTimeline,priorTimelinesByChannel\)/);
  assert.match(source, /getWorkbenchDayMetric\(selectedTimeline\[i\],metric\)/);
  assert.match(source, /getWorkbenchDayMetric\(selectedPriorTimeline\[i\],metric\)/);
  assert.match(source, /\[selectedTimeline,selectedPriorTimeline,metric\]/);
});
