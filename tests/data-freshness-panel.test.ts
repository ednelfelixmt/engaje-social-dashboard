import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DataFreshnessPanel} from '../src/components/dashboard/data-freshness-panel';

const today = '2026-10-31';
const row = (metric_date: string, platform = 'meta_ads') => ({platform, metric_date, synced_at: null});
const source = (status: string) => ({provider: 'meta_ads', status, is_enabled: true, last_synced_at: null, last_error: null});
function render(dates: ReturnType<typeof row>[], sources: ReturnType<typeof source>[] = []) {
  return renderToStaticMarkup(React.createElement(DataFreshnessPanel, {
    latest: dates, sources, slug: 'synthetic-client', today,
  }));
}

test('a genuinely current valid date with healthy integrations needs no warning panel', () => {
  assert.equal(render([row(today), row('2026-10-30', 'google_ads')], [source('connected')]), '');
});

test('future-only paid source cannot be declared synchronized today', () => {
  const html = render([row('2026-11-01')]);
  assert.match(html, /Datas de anúncios inconsistentes/);
  assert.match(html, /Datas de origem inválidas ou futuras/);
  assert.match(html, /Sem registro/);
  assert.doesNotMatch(html, /Dados registrados para hoje/);
  assert.doesNotMatch(html, /01\/11\/2026/);
  assert.match(html, /role="alert"/);
});

test('mixed valid and future dates for the same provider preserve the latest valid date and surface inconsistency', () => {
  const dates = [row('2026-10-30'), row('2026-11-01'), row(today), row('2026-10-27', 'tiktok_ads')];
  const before = JSON.stringify(dates);
  const html = render(dates);
  assert.match(html, /31\/10\/2026/);
  assert.match(html, /Datas inconsistentes; último registro válido há 0 dia\(s\)/);
  assert.match(html, /Datas de anúncios inconsistentes/);
  assert.doesNotMatch(html, /Dados registrados para hoje/);
  assert.doesNotMatch(html, /01\/11\/2026/);
  assert.equal(JSON.stringify(dates), before);
});

test('impossible calendar days are not normalized into real observations', () => {
  const html = render([row('2026-02-30'), row('2026-10-27')]);
  assert.match(html, /27\/10\/2026/);
  assert.match(html, /Datas inconsistentes; último registro válido há 4 dia\(s\)/);
  assert.match(html, /Datas de anúncios inconsistentes/);
  assert.doesNotMatch(html, /02\/03\/2026/);
});

test('stale valid dates and expired connections retain their original warnings', () => {
  const stale = render([row('2026-10-27')]);
  assert.match(stale, /Últimos dados de 4 dia\(s\) atrás/);
  assert.doesNotMatch(stale, /Datas de anúncios inconsistentes/);
  const expired = render([row(today)], [source('expired')]);
  assert.match(expired, /Autorização expirada/);
  assert.match(expired, /Dados registrados para hoje/);
  assert.doesNotMatch(expired, /Datas de anúncios inconsistentes/);
});
