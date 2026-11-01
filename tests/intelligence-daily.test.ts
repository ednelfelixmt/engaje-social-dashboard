import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildIntelligenceTimeline as buildScopedIntelligenceTimeline, type IntelligenceDailyFact} from '../src/lib/metrics/intelligence-daily';
import {getWorkbenchDayMetric} from '../src/lib/metrics/business-workbench-summary';

const organizationId = '11111111-1111-4111-8111-111111111111';
const otherOrganizationId = '22222222-2222-4222-8222-222222222222';
const currency = 'BRL';
const buildIntelligenceTimeline = (rows: readonly IntelligenceDailyFact[]) =>
  buildScopedIntelligenceTimeline(rows, organizationId, currency);

const fact = (overrides: Partial<IntelligenceDailyFact> = {}): IntelligenceDailyFact => ({
  organization_id: organizationId, currency,
  platform: 'meta_ads', metric_date: '2026-10-25', spend: 100, impressions: 1000, clicks: 50, leads: 10, ...overrides,
});

test('daily timeline remains empty when no ad facts are returned', () => {
  assert.deepEqual(buildIntelligenceTimeline([]), []);
});

test('daily timeline groups each date once, sorts and sums fully observed measures', () => {
  assert.deepEqual(buildIntelligenceTimeline([
    fact({metric_date: '2026-10-26', spend: 0, impressions: 0, clicks: 0, leads: 0}),
    fact({metric_date: '2026-10-25', spend: 25, impressions: 200, clicks: 4, leads: 0.5}),
    fact({metric_date: '2026-10-25', spend: 50, impressions: 400, clicks: 6, leads: 0}),
  ]), [
    {date: '2026-10-25', spend: 75, impressions: 600, clicks: 10, leads: 0.5},
    {date: '2026-10-26', spend: 0, impressions: 0, clicks: 0, leads: 0},
  ]);
});

test('partial missing values invalidate only their daily metric and dependent ratio', () => {
  const [day] = buildIntelligenceTimeline([fact(), fact({spend: 50, leads: null, clicks: null})]);
  assert.deepEqual(day, {date: '2026-10-25', spend: 150, impressions: 2000, clicks: null, leads: null});
  assert.equal(getWorkbenchDayMetric(day, 'ctr'), null);
  assert.equal(getWorkbenchDayMetric(day, 'cpl'), null);
  assert.equal(getWorkbenchDayMetric(day, 'spend'), 150);
});

test('invalid and negative ad counts cannot cancel against valid observations', () => {
  const [day] = buildIntelligenceTimeline([fact(), fact({spend: -1, impressions: -100, clicks: NaN, leads: -2})]);
  assert.deepEqual(day, {date: '2026-10-25', spend: null, impressions: null, clicks: null, leads: null});
  assert.equal(getWorkbenchDayMetric(day, 'spend'), null);
});

test('nonfinite and overflowing spend are unavailable, not rendered as zero', () => {
  const [overflow] = buildIntelligenceTimeline([fact({spend: 1e308}), fact({spend: 1e308})]);
  assert.equal(overflow.spend, null);
  assert.equal(overflow.leads, 20);
  const [nonfinite] = buildIntelligenceTimeline([fact({spend: Infinity, leads: 0})]);
  assert.equal(nonfinite.spend, null);
  assert.equal(nonfinite.leads, 0);
  assert.equal(getWorkbenchDayMetric(nonfinite, 'cpl'), null);
});

test('missing or invalid measures on one date do not contaminate another date', () => {
  const result = buildIntelligenceTimeline([fact({leads: null}), fact({metric_date: '2026-10-26', leads: 0})]);
  assert.equal(result[0].leads, null);
  assert.equal(result[1].leads, 0);
});

test('the authenticated intelligence page uses strict daily aggregation for both periods', () => {
  const source = readFileSync('src/app/(tenant)/[organizationSlug]/intelligence/page.tsx', 'utf8');
  assert.match(source, /const timeline=buildIntelligenceTimeline\(data\.ads,org\.id,f\.currency,undefined,range\)/);
  assert.match(source, /const priorTimeline=priorRange\?buildIntelligenceTimeline\(data\.adsComparison,org\.id,f\.currency,undefined,priorRange\):\[\]/);
  assert.match(source, /timelinesByChannel=\{channelTimelines\}/);
  assert.match(source, /priorTimelinesByChannel=\{priorChannelTimelines\}/);
  assert.doesNotMatch(source, /function dayShape/);
  assert.match(source, /dashboardData\(db,org\.id,f,/);
});

test('SEC-INT-DAY-001: foreign tenant is rejected even on another date or when all measurements are zero', () => {
  const foreign = fact({organization_id: otherOrganizationId, metric_date: '2026-10-26',
    spend: 0, impressions: 0, clicks: 0, leads: 0});
  assert.throws(() => buildScopedIntelligenceTimeline([fact(), foreign], organizationId, currency), /authorized organization/);
  assert.throws(() => buildScopedIntelligenceTimeline([foreign], organizationId, currency), /authorized organization/);
});

test('SEC-INT-DAY-001: any incompatible or missing currency invalidates the entire timeline', () => {
  for (const invalidCurrency of ['USD', '', 'brl']) {
    const foreignCurrency = fact({currency: invalidCurrency, metric_date: '2026-10-26', spend: 0});
    assert.throws(() => buildScopedIntelligenceTimeline([fact(), foreignCurrency], organizationId, currency),
      /authorized organization and currency/);
  }
  assert.equal(buildScopedIntelligenceTimeline([fact({spend: 0})], organizationId, currency)[0].spend, 0);
});

test('SEC-INT-DAY-001: empty data never bypasses invalid authorization or currency', () => {
  for (const invalidOrg of ['', 'not-a-uuid', otherOrganizationId.slice(0, 12)]) {
    assert.throws(() => buildScopedIntelligenceTimeline([], invalidOrg, currency), /authorized organization/);
  }
  for (const invalidCurrency of ['', 'usd', 'UNKNOWN']) {
    assert.throws(() => buildScopedIntelligenceTimeline([], organizationId, invalidCurrency), /authorized organization/);
  }
  assert.deepEqual(buildScopedIntelligenceTimeline([], organizationId, currency), []);
});

test('intelligence daily guard rejects non-RFC organization UUIDs even on an empty set', () => {
 for (const invalid of ['11111111-1111-0111-8111-111111111111','11111111-1111-4111-7111-111111111111','11111111-1111-9111-8111-111111111111']) {
  assert.throws(() => buildScopedIntelligenceTimeline([], invalid, 'BRL'), /authorized organization and currency/);
  assert.throws(() => buildScopedIntelligenceTimeline([fact({spend: 0})], invalid, 'BRL'), /authorized organization and currency/);
 }
 assert.deepEqual(buildScopedIntelligenceTimeline([], '11111111-1111-7111-8111-111111111111', 'BRL'), []);
});

test('intelligence daily guard rejects impossible dates before grouping valid campaign facts', () => {
 for (const invalid of ['2026-02-29','2026-02-30','2026-04-31','2026-13-01','2026-2-01','2026-10-26T00:00:00Z']) {
  assert.throws(() => buildIntelligenceTimeline([fact(), fact({metric_date: invalid, spend: 0})]), /valid ISO calendar days/, invalid);
  assert.throws(() => buildIntelligenceTimeline([fact({metric_date: invalid})]), /valid ISO calendar days/, invalid);
 }
 assert.equal(buildIntelligenceTimeline([fact({metric_date: '2024-02-29'})])[0].date, '2024-02-29');
});

test('channel timeline uses only that provider for both normal and zero-valued days', () => {
  const rows = [
    fact({platform: 'meta_ads', metric_date: '2026-10-26', spend: 0, leads: 0}),
    fact({platform: 'google_ads', metric_date: '2026-10-25', spend: 900, leads: 90}),
    fact({platform: 'meta_ads', metric_date: '2026-10-25', spend: 100, leads: 10}),
  ];
  assert.deepEqual(buildIntelligenceTimeline(rows).map(day => [day.date, day.spend, day.leads]), [
    ['2026-10-25', 1000, 100], ['2026-10-26', 0, 0],
  ]);
  assert.deepEqual(buildScopedIntelligenceTimeline(rows, organizationId, currency, 'meta_ads')
    .map(day => [day.date, day.spend, day.leads]), [
    ['2026-10-25', 100, 10], ['2026-10-26', 0, 0],
  ]);
  assert.deepEqual(buildScopedIntelligenceTimeline(rows, organizationId, currency, 'google_ads')
    .map(day => [day.date, day.spend, day.leads]), [
    ['2026-10-25', 900, 90], ['2026-10-26', null, null],
  ]);
  assert.deepEqual(buildScopedIntelligenceTimeline(rows, organizationId, currency, 'tiktok_ads')
    .map(day => [day.date, day.spend, day.leads]), [
    ['2026-10-25', null, null], ['2026-10-26', null, null],
  ]);
});

test('channel filter rejects a foreign tenant, currency or impossible date even in a different provider', () => {
  const valid = fact({platform: 'meta_ads'});
  for (const offChannel of [
    fact({platform: 'google_ads', organization_id: otherOrganizationId}),
    fact({platform: 'google_ads', currency: 'USD'}),
    fact({platform: 'google_ads', metric_date: '2026-02-30'}),
  ]) {
    assert.throws(() => buildScopedIntelligenceTimeline([valid, offChannel], organizationId, currency, 'meta_ads'));
  }
});

test('channel projection rejects malformed provider identity instead of silently dropping that row', () => {
  for (const malformed of ['', ' meta_ads', 'google_ads ']) {
    assert.throws(() => buildScopedIntelligenceTimeline([fact({platform: malformed as IntelligenceDailyFact['platform']})],
      organizationId, currency, 'google_ads'), /source platforms/);
    assert.throws(() => buildScopedIntelligenceTimeline([], organizationId, currency, malformed), /selected platform/);
  }
});

test('paid intelligence rejects unsupported or invisible provider identities before portfolio aggregation', () => {
  const valid = fact({spend: 0, leads: 0});
  for (const platform of ['instagram_organic', 'microsoft_ads', 'meta_ads\\n', 'google_ads\\u0085', 'unknown']) {
    const malformed = fact({platform: platform.replace('\\n', '\n').replace('\\u0085', '\u0085') as IntelligenceDailyFact['platform'], spend: 500});
    assert.throws(() => buildIntelligenceTimeline([valid, malformed]), /valid source platforms/, platform);
    assert.throws(() => buildScopedIntelligenceTimeline([valid, malformed], organizationId, currency, 'meta_ads'),
      /valid source platforms/, platform);
  }
});

test('paid intelligence rejects an unsupported selected channel even when there are no facts', () => {
  for (const platform of ['all', 'instagram_organic', 'microsoft_ads', 'meta_ads\\n', 'google_ads\\u0085', 'unknown']) {
    const malformed = platform.replace('\\n', '\n').replace('\\u0085', '\u0085');
    assert.throws(() => buildScopedIntelligenceTimeline([], organizationId, currency, malformed),
      /valid selected platform/, platform);
  }
  assert.deepEqual(buildScopedIntelligenceTimeline([], organizationId, currency, 'meta_ads'), []);
  assert.deepEqual(buildScopedIntelligenceTimeline([], organizationId, currency), []);
});

test('supported paid providers preserve zero, channel totals and input immutability', () => {
  const records = Object.freeze([
    Object.freeze(fact({platform: 'meta_ads', spend: 0, leads: 0})),
    Object.freeze(fact({platform: 'google_ads', spend: 40, leads: 4})),
    Object.freeze(fact({platform: 'tiktok_ads', spend: 60, leads: 6})),
  ]);
  assert.deepEqual(buildIntelligenceTimeline(records).map(day => [day.spend, day.leads]), [[100, 10]]);
  assert.deepEqual(buildScopedIntelligenceTimeline(records, organizationId, currency, 'meta_ads').map(day => [day.spend, day.leads]), [[0, 0]]);
  assert.deepEqual(buildScopedIntelligenceTimeline(records, organizationId, currency, 'tiktok_ads').map(day => [day.spend, day.leads]), [[60, 6]]);
  assert.equal(records[1].spend, 40);
});

test('channel filter preserves calendar positions and breaks a missing mid-period observation', () => {
  const current = [
    fact({platform: 'meta_ads', metric_date: '2026-10-01', spend: 100, leads: 10}),
    fact({platform: 'google_ads', metric_date: '2026-10-02', spend: 200, leads: 20}),
    fact({platform: 'meta_ads', metric_date: '2026-10-03', spend: 300, leads: 30}),
  ];
  const previous = [
    fact({platform: 'meta_ads', metric_date: '2026-09-01', spend: 90, leads: 9}),
    fact({platform: 'meta_ads', metric_date: '2026-09-02', spend: 90, leads: 9}),
    fact({platform: 'meta_ads', metric_date: '2026-09-03', spend: 90, leads: 9}),
  ];
  const now = buildScopedIntelligenceTimeline(current, organizationId, currency, 'meta_ads');
  const before = buildScopedIntelligenceTimeline(previous, organizationId, currency, 'meta_ads');
  assert.deepEqual(now.map(day => [day.date, day.spend, day.leads]), [
    ['2026-10-01', 100, 10], ['2026-10-02', null, null], ['2026-10-03', 300, 30],
  ]);
  assert.deepEqual(before.map(day => [day.date, day.spend]), [
    ['2026-09-01', 90], ['2026-09-02', 90], ['2026-09-03', 90],
  ]);
  assert.equal(now.length, before.length);
  assert.equal(getWorkbenchDayMetric(now[1], 'cpl'), null);
  assert.equal(getWorkbenchDayMetric(now[2], 'cpl'), 10);
});

test('calendar interval preserves dates with no facts before, between and after observations', () => {
  const data = [
    fact({metric_date: '2026-10-02', spend: 0, leads: 0}),
    fact({metric_date: '2026-10-04', spend: 40, leads: 4}),
  ];
  const days = buildScopedIntelligenceTimeline(data, organizationId, currency, undefined,
    {from: '2026-10-01', to: '2026-10-05'});
  assert.deepEqual(days.map(day => [day.date, day.spend, day.leads]), [
    ['2026-10-01', null, null],
    ['2026-10-02', 0, 0],
    ['2026-10-03', null, null],
    ['2026-10-04', 40, 4],
    ['2026-10-05', null, null],
  ]);
  assert.equal(getWorkbenchDayMetric(days[2], 'cpl'), null);
  assert.deepEqual(buildScopedIntelligenceTimeline([], organizationId, currency, 'google_ads',
    {from: '2026-10-01', to: '2026-10-02'}).map(day => day.spend), [null, null]);
});

test('calendar interval rejects any out-of-range fact before selecting a channel', () => {
  const range = {from: '2026-10-01', to: '2026-10-03'};
  for (const outside of ['2026-09-30', '2026-10-04']) {
    assert.throws(() => buildScopedIntelligenceTimeline([
      fact({metric_date: '2026-10-02'}),
      fact({platform: 'google_ads', metric_date: outside, spend: 0}),
    ], organizationId, currency, 'meta_ads', range), /outside selected period/);
  }
  assert.throws(() => buildScopedIntelligenceTimeline([], organizationId, currency, undefined,
    {from: '2026-10-03', to: '2026-10-01'}), /ascending/);
  assert.throws(() => buildScopedIntelligenceTimeline([], organizationId, currency, undefined,
    {from: '2026-02-29', to: '2026-03-01'}), /calendar/);
  assert.throws(() => buildScopedIntelligenceTimeline([], organizationId, currency, undefined,
    {from: '2026-01-01', to: '2028-01-02'}), /two years/);
});

test('all and selected-channel series use identical calendar positions across both periods', () => {
  const current = [
    fact({platform: 'google_ads', metric_date: '2026-10-01', spend: 500, leads: 50}),
    fact({platform: 'meta_ads', metric_date: '2026-10-03', spend: 30, leads: 3}),
  ];
  const previous = [fact({metric_date: '2026-09-02', spend: 20, leads: 2})];
  const a = {from: '2026-10-01', to: '2026-10-03'};
  const b = {from: '2026-09-01', to: '2026-09-03'};
  const all = buildScopedIntelligenceTimeline(current, organizationId, currency, undefined, a);
  const meta = buildScopedIntelligenceTimeline(current, organizationId, currency, 'meta_ads', a);
  const prior = buildScopedIntelligenceTimeline(previous, organizationId, currency, 'meta_ads', b);
  assert.deepEqual(all.map(point => point.spend), [500, null, 30]);
  assert.deepEqual(meta.map(point => point.spend), [null, null, 30]);
  assert.deepEqual(prior.map(point => point.spend), [null, 20, null]);
  assert.deepEqual([all.length, meta.length, prior.length], [3, 3, 3]);
  assert.equal(getWorkbenchDayMetric(meta[0], 'leads'), null);
});

test('authenticated Intelligence page supplies exact ranges to all channel and comparison series', () => {
  const source = readFileSync('src/app/(tenant)/[organizationSlug]/intelligence/page.tsx', 'utf8');
  assert.match(source, /const range=\{from:f\.from,to:f\.to\}/);
  assert.match(source, /priorRange=f\.compare==='none'\?null:comparisonPeriod\(f\.from,f\.to,f\.compare\)/);
  assert.match(source, /buildIntelligenceTimeline\(data\.ads,org\.id,f\.currency,channel,range\)/);
  assert.match(source, /buildIntelligenceTimeline\(data\.adsComparison,org\.id,f\.currency,channel,priorRange\)/);
});
