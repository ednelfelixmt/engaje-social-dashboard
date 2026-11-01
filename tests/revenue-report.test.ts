import test from 'node:test';
import assert from 'node:assert/strict';
import type {Row} from '../src/types/database.types';
import {buildRevenueReport, revenueDelta, type RevenueScope} from '../src/lib/reports/revenue-report';
const scope: RevenueScope = {organizationId:'11111111-1111-4111-8111-111111111111',organizationName:'Synthetic A',organizationSlug:'synthetic-a',timezone:'America/Cuiaba',currency:'BRL',source:'crm',from:'2026-10-20',to:'2026-10-21',compare:'previous_period'};
const fact = (patch: Partial<Row<'metrics_crm'>> = {}) => ({id:'synthetic-current',organization_id:scope.organizationId,source:'crm',metric_date:scope.from,currency:'BRL',channel:'unattributed',account_id:'',campaign_id:'',revenue:100,purchases:2,leads:5,checkouts:3,is_complete:true,synced_at:'2026-10-22T12:00:00.000Z',...patch} as Row<'metrics_crm'>);
const current=()=>[fact(),fact({id:'second-day',metric_date:scope.to,revenue:-20})];
const previous=()=>[fact({id:'prior1',metric_date:'2026-10-18',revenue:20}),fact({id:'prior2',metric_date:'2026-10-19',revenue:20})];


test('revenue scope rejects non-UUID organizations before any source or period aggregation',()=>{
 for(const organizationId of ['', 'synthetic-a', '11111111-1111-4111-8111-11111111111g', '11111111111141118111111111111111']){
  assert.throws(()=>buildRevenueReport([],[],{...scope,organizationId}),/Invalid revenue report scope/);
  assert.throws(()=>buildRevenueReport([fact()],[],{...scope,organizationId}),/Invalid revenue report scope/);
 }
 assert.equal(buildRevenueReport([],[],{...scope,organizationId:scope.organizationId.toUpperCase(),compare:'none'}).current.records,0);
});

test('revenue scope rejects invalid UUID version or variant even with an empty input',()=>{
 for (const organizationId of ['00000000-0000-0000-0000-000000000000','11111111-1111-0111-8111-111111111111','11111111-1111-4111-7111-111111111111']) {
  assert.throws(()=>buildRevenueReport([],[],{...scope,organizationId,compare:'none'}),/Invalid revenue report scope/);
  assert.throws(()=>buildRevenueReport([fact({organization_id:organizationId})],[],{...scope,organizationId,compare:'none'}),/Invalid revenue report scope/);
 }
});

test('invalid CRM synchronization offsets and calendar dates never become verified provenance',()=>{
 const invalid=['2026-10-22T12:00:00+23:59','2026-10-22T12:00:00-15:00','2026-10-22T12:00:00+14:01','2026-10-22T12:00:00-14:01','2026-02-30T12:00:00Z','2026-10-22T24:00:00Z','2026-10-22T12:00:60Z'];
 for (const synced_at of invalid) {
  const report=buildRevenueReport([fact({revenue:0,synced_at})],[],{...scope,to:scope.from,compare:'none'});
  assert.equal(report.current.days[0].syncedAt,null,synced_at);
  assert.equal(report.current.days[0].values.revenue,0,'Observed zero must not be hidden by malformed collection provenance');
 }
});

test('valid CRM UTC boundaries and microsecond timestamps preserve deterministic latest synchronization',()=>{
 const timestamps=['2026-10-22T12:00:00+14:00','2026-10-22T12:00:00-14:00','2026-10-22T12:00:00.123456Z'];
 for (const synced_at of timestamps) {
  const report=buildRevenueReport([fact({synced_at})],[],{...scope,to:scope.from,compare:'none'});
  assert.equal(report.current.days[0].syncedAt,new Date(Date.parse(synced_at)).toISOString());
 }
 const facts=[fact({synced_at:'2026-10-22T12:00:00Z'}),fact({id:'second',channel:'direct',synced_at:'2026-10-22T12:00:00+14:01'})];
 const report=buildRevenueReport(facts,[],{...scope,to:scope.from,compare:'none'});
 assert.equal(report.current.days[0].syncedAt,null,'Any invalid source suppresses unverified provenance');
 assert.equal(report.current.days[0].values.revenue,200,'Provenance rejection does not silently change valid monetary facts');
});

test('revenue report uses one explicit source, signed net revenue and actual calendar comparison',()=>{
 const report=buildRevenueReport([...current(),fact({id:'sheet',source:'spreadsheet',revenue:999})],previous(),scope);
 assert.equal(report.current.totals.revenue,80);assert.equal(report.current.totals.purchases,4);assert.equal(report.current.otherSourceRecords,1);assert.equal(report.current.records,2);assert.equal(report.current.knownDays.revenue,2);assert.equal(report.previous?.from,'2026-10-18');assert.equal(revenueDelta(report,'revenue'),100);
 const sheet=buildRevenueReport([fact({source:'spreadsheet'})],[],{...scope,source:'spreadsheet',to:scope.from,compare:'none'});assert.equal(sheet.current.totals.revenue,100);
});

test('missing dates or incomplete received rows withhold totals instead of adding only known observations',()=>{
 const absent=buildRevenueReport([fact()],[],scope);assert.equal(absent.current.totals.revenue,null);assert.equal(absent.current.days[1].values.revenue,null);assert.equal(absent.current.days[1].sourceIds.length,0);assert.equal(absent.current.knownDays.revenue,1);
 const partial=buildRevenueReport([fact({is_complete:false}),...current().slice(1)],[],scope);assert.equal(partial.current.totals.revenue,null);assert.equal(partial.current.days[0].values.purchases,null);assert.equal(partial.current.reconciledDays,1);
 const mixed=buildRevenueReport([...current(),fact({id:'incomplete-subgrain',channel:'direct',is_complete:false})],[],scope);assert.equal(mixed.current.days[0].reconciled,false);assert.equal(mixed.current.days[0].values.revenue,null);
});

test('known zero survives, metrics fail independently and negative event counts never offset positive counts',()=>{
 const zero=buildRevenueReport(current().map(row=>({...row,revenue:0,purchases:0})),previous().map(row=>({...row,revenue:0})),scope);
 assert.equal(zero.current.totals.revenue,0);assert.equal(zero.current.totals.purchases,0);assert.equal(revenueDelta(zero,'revenue'),null);
 for(const invalid of [null,-1,NaN,Infinity]){
  const rows=current();rows[0].purchases=invalid;const report=buildRevenueReport(rows,previous(),scope);assert.equal(report.current.totals.purchases,null);assert.equal(report.current.totals.revenue,80);assert.equal(revenueDelta(report,'purchases'),null);
 }
 const missing=current();missing[0].revenue=null;assert.equal(buildRevenueReport(missing,[],scope).current.totals.revenue,null);
});

test('overflow remains unavailable at daily and whole-period levels',()=>{
 const across=buildRevenueReport(current().map(row=>({...row,revenue:1e308})),[],scope);assert.equal(across.current.totals.revenue,null);assert.equal(across.current.knownDays.revenue,2);
 const daily=buildRevenueReport([fact({revenue:1e308}),fact({id:'direct',channel:'direct',revenue:1e308}),...current().slice(1)],[],scope);assert.equal(daily.current.days[0].values.revenue,null);assert.equal(daily.current.totals.revenue,null);
});

test('every payload row is scope checked before source filtering, including prior-period facts',()=>{
 for(const patch of [{organization_id:'synthetic-b'},{currency:'USD'},{metric_date:'2026-10-19'},{source:'invalid'}] as Partial<Row<'metrics_crm'>>[]) assert.throws(()=>buildRevenueReport([fact({...patch,source:patch.source??'spreadsheet'})],[],scope),/scope mismatch/);
 assert.throws(()=>buildRevenueReport([], [fact()],scope),/scope mismatch/);
});

test('natural-grain duplicates and Meta aliases are rejected while non-Meta literal accounts remain separate',()=>{
 assert.throws(()=>buildRevenueReport([fact(),fact({id:'duplicate'})],[],scope),/Duplicate/);
 assert.throws(()=>buildRevenueReport([fact(),fact({metric_date:scope.to})],[],scope),/Duplicate/);
 const meta=fact({channel:'meta_ads',account_id:'act_123',campaign_id:'synthetic-campaign'});
 assert.throws(()=>buildRevenueReport([meta,{...meta,id:'alias',account_id:'123'}],[],scope),/Duplicate/);
 assert.throws(()=>buildRevenueReport([{...meta,account_id:'act_'}],[],scope),/Invalid.*grain/);
 const literal=buildRevenueReport([{...meta,channel:'google_ads'},{...meta,id:'literal',channel:'google_ads',account_id:'123'}],[],{...scope,to:scope.from});assert.equal(literal.current.totals.revenue,200);
});

test('switching sources never silently falls back and empty periods preserve every missing day',()=>{
 const report=buildRevenueReport([fact({source:'spreadsheet'})],[],scope);assert.equal(report.current.records,0);assert.equal(report.current.otherSourceRecords,1);assert.equal(report.current.totals.revenue,null);assert.equal(report.current.days.length,2);assert.equal(report.current.reconciledDays,0);
});

test('provenance, source IDs and latest synchronization are deterministic and invalid timestamps remain unknown',()=>{
 const rows=[fact(),fact({id:'direct',channel:'direct',synced_at:'2026-10-23T00:00:00Z'})];
 const a=buildRevenueReport(rows,[],scope),b=buildRevenueReport([...rows].reverse(),[],scope);assert.deepEqual(a,b);assert.deepEqual(a.current.days[0].sourceIds,['direct','synthetic-current']);assert.equal(a.current.days[0].syncedAt,'2026-10-23T00:00:00.000Z');
 rows[0].synced_at='invalid';assert.equal(buildRevenueReport(rows,[],scope).current.days[0].syncedAt,null);
});

test('comparison none and calendar leap-year behavior remain explicit; malformed scopes fail closed',()=>{
 assert.equal(buildRevenueReport([],[],{...scope,compare:'none'}).previous,null);
 assert.throws(()=>buildRevenueReport([],previous(),{...scope,compare:'none'}),/Unexpected/);
 const leap=buildRevenueReport([],[],{...scope,from:'2024-02-29',to:'2024-02-29',compare:'previous_year'});assert.equal(leap.previous?.from,'2023-02-28');
 for(const patch of [{from:'2026-02-30'},{currency:'brl'},{source:'all'},{timezone:'Invalid/zone'}])assert.throws(()=>buildRevenueReport([],[],{...scope,...patch} as RevenueScope));
});

test('revenue grain rejects padded and blank opaque record IDs without silently normalizing them', () => {
 for (const id of ['', ' ', '\trow', 'row\n', '\u00a0row', 'row\u00a0']) {
  assert.throws(() => buildRevenueReport([fact({id})], [], {...scope, compare:'none'}), /Invalid revenue report grain/, JSON.stringify(id));
 }
 // Even unselected financial sources are validated before filtering or totaling.
 assert.throws(() => buildRevenueReport([fact({source:'spreadsheet', id:'sheet '})], [], {...scope, compare:'none'}), /Invalid revenue report grain/);
 assert.throws(() => buildRevenueReport([], [fact({id:' prior ', metric_date:'2026-10-18'})], scope), /Invalid revenue report grain/);
});

test('revenue grain rejects padded provider accounts and campaigns while preserving valid opaque IDs and recorded zeros', () => {
 const accepted = buildRevenueReport([fact({
  id:'synthetic-opaque', channel:'google_ads', account_id:'account region 01',
  campaign_id:'campaign segment 02', revenue:0, purchases:0, leads:0, checkouts:0,
 })], [], {...scope, to:scope.from, compare:'none'});
 assert.equal(accepted.current.totals.revenue, 0);
 assert.equal(accepted.current.totals.purchases, 0);
 assert.equal(accepted.current.records, 1);
 for (const account_id of [' account', 'account ', '\taccount', 'act_ ', '\u00a0account']) {
  assert.throws(() => buildRevenueReport([fact({channel:'meta_ads', account_id, campaign_id:'campaign'})], [], {...scope, compare:'none'}), /Invalid revenue report grain/, JSON.stringify(account_id));
 }
 for (const campaign_id of [' campaign', 'campaign ', '\tcampaign', 'campaign\n', '  ']) {
  assert.throws(() => buildRevenueReport([fact({channel:'google_ads', account_id:'account', campaign_id})], [], {...scope, compare:'none'}), /Invalid revenue report grain/, JSON.stringify(campaign_id));
 }
 // Empty optional IDs stay valid for unattributed revenue; they are not padding.
 assert.equal(buildRevenueReport([fact({revenue:0})], [], {...scope,to:scope.from,compare:'none'}).current.totals.revenue, 0);
});


test('REVENUE-META-GRAIN-001: malformed Meta aliases fail closed across current, prior and unselected source', () => {
 const invalid=['act_ 123', 'act_\u00a0123', 'act_\t123', 'act_act_123', 'act_act_', 'act_act_act_123'];
 for (const account_id of invalid) {
  const row=fact({channel:'meta_ads', account_id, campaign_id:'synthetic-campaign'});
  assert.throws(()=>buildRevenueReport([row],[],{...scope, compare:'none'}),/Invalid revenue report grain/,account_id);
  assert.throws(()=>buildRevenueReport([fact({...row,source:'spreadsheet'})],[],{...scope, compare:'none'}),/Invalid revenue report grain/,'unselected '+account_id);
  assert.throws(()=>buildRevenueReport([], [fact({...row,metric_date:'2026-10-18'})],scope),/Invalid revenue report grain/,'prior '+account_id);
 }
});

test('REVENUE-META-GRAIN-001: valid Meta alias and opaque Google account IDs preserve zero and dedup behavior', () => {
 const zero=fact({channel:'meta_ads',account_id:'act_123',campaign_id:'opaque account:01',revenue:0,purchases:0,leads:0,checkouts:0});
 const result=buildRevenueReport([zero],[],{...scope,to:scope.from,compare:'none'});
 assert.equal(result.current.records,1);
 assert.equal(result.current.totals.revenue,0);
 assert.equal(result.current.totals.purchases,0);
 assert.throws(()=>buildRevenueReport([zero,{...zero,id:'alias',account_id:'123'}],[],{...scope,to:scope.from,compare:'none'}),/Duplicate revenue report grain/);
 const google=[fact({channel:'google_ads',account_id:'act_act_123',campaign_id:'a',revenue:0}),fact({id:'google-space',channel:'google_ads',account_id:'act_ 123',campaign_id:'a',revenue:0})];
 const googleReport=buildRevenueReport(google,[],{...scope,to:scope.from,compare:'none'});
 assert.equal(googleReport.current.records,2);
 assert.equal(googleReport.current.totals.revenue,0);
 const unattributedMeta=buildRevenueReport([fact({channel:'meta_ads',account_id:'',campaign_id:'',revenue:0})],[],{...scope,to:scope.from,compare:'none'});
 assert.equal(unattributedMeta.current.totals.revenue,0);
});


test('SOURCE-GRAIN-CONTROLS-001: CRM and spreadsheet source keys reject internal controls before source selection', () => {
 const fields = ['id', 'account_id', 'campaign_id'] as const;
 const invalid = ['syn\u0000thetic', 'syn\nthetic', 'syn\tthetic', 'syn\u007fthetic', 'syn\u0085thetic'];
 for (const field of fields) for (const value of invalid) {
  const patch = {[field]:value} as Partial<Row<'metrics_crm'>>;
  const base = {channel:'google_ads' as const,account_id:'account alpha',campaign_id:'campaign alpha',...patch};
  assert.throws(() => buildRevenueReport([fact(base)], [], {...scope,compare:'none'}), /Invalid revenue report grain/,field + ' current');
  assert.throws(() => buildRevenueReport([], [fact({...base,metric_date:'2026-10-18'})], scope), /Invalid revenue report grain/,field + ' previous');
  assert.throws(() => buildRevenueReport([fact({...base,source:'spreadsheet'})], [], {...scope,compare:'none'}), /Invalid revenue report grain/,field + ' unselected');
 }
 const allowed = buildRevenueReport([fact({
  id:'row alpha:01',channel:'google_ads',account_id:'account alpha',campaign_id:'campaign alpha',
  revenue:0,purchases:0,leads:0,checkouts:0,
 })],[],{...scope,to:scope.from,compare:'none'});
 assert.equal(allowed.current.totals.revenue,0);
 assert.equal(allowed.current.totals.purchases,0);
});

test('REPORT-TIMEZONE-REQUIRED-001: revenue report refuses implicit or non-textual timezones', () => {
 const malformed: unknown[] = [undefined, null, 0, false, {}, [], ['UTC']];
 for (const timezone of malformed) {
  const invalid = {...scope, timezone: timezone as string};
  assert.throws(() => buildRevenueReport([], [], invalid), /Revenue report timezone must be explicit/, String(timezone));
  assert.throws(() => buildRevenueReport([fact({revenue:0})], [], invalid),
   /Revenue report timezone must be explicit/, 'populated ' + String(timezone));
 }
 const omitted = {...scope};
 delete (omitted as Partial<RevenueScope>).timezone;
 assert.throws(() => buildRevenueReport([], [], omitted), /Revenue report timezone must be explicit/);
 for (const timezone of ['', 'UTC ', 'Mars/Olympus']) {
  assert.throws(() => buildRevenueReport([], [], {...scope, timezone}), RangeError);
 }
 for (const timezone of ['UTC', 'America/Cuiaba']) {
  const row = fact({revenue:0, purchases:0});
  const valid = buildRevenueReport([row], [], {...scope, to:scope.from, compare:'none', timezone});
  assert.equal(valid.scope.timezone, timezone);
  assert.equal(valid.current.totals.revenue, 0);
  assert.equal(valid.current.totals.purchases, 0);
  assert.equal(row.revenue, 0);
  assert.equal(valid.previous, null);
 }
});


test('REVENUE-OPAQUE-IDENTITY-001: invisible and bidirectional controls never enter financial source grains', () => {
 const hidden = ['row\u200Btoken','row\u200Etoken','row\u200Ftoken','row\u202Etoken',
  'row\u2066token','row\u2069token','row\u2060token','row\u00ADtoken',
  'row\u061Ctoken','row\uFEFFtoken','row\u2028token','row\u2029token'];
 for (const field of ['id','account_id','campaign_id'] as const) for (const value of hidden) {
  const patch = {channel:'google_ads' as const,account_id:'account alpha',campaign_id:'campaign alpha',[field]:value};
  const row = fact(patch);
  const before = structuredClone(row);
  assert.throws(() => buildRevenueReport([row], [], {...scope,compare:'none'}), /Invalid revenue report grain/, field + ' current ' + JSON.stringify(value));
  assert.throws(() => buildRevenueReport([], [fact({...patch,metric_date:'2026-10-18'})], scope), /Invalid revenue report grain/, field + ' previous');
  assert.throws(() => buildRevenueReport([fact({...patch,source:'spreadsheet'})], [], {...scope,compare:'none'}), /Invalid revenue report grain/, field + ' unselected');
  assert.deepEqual(row,before,'Invalid identity never mutates an original fact');
 }
});

test('REVENUE-OPAQUE-IDENTITY-001: malformed UTF-16 fails closed while visible Unicode and observed zero survive', () => {
 const malformed = [String.fromCharCode(0xD800),String.fromCharCode(0xDC00),'😀'+String.fromCharCode(0xD800)];
 for (const field of ['id','account_id','campaign_id'] as const) for (const fragment of malformed) {
  const patch = {channel:'google_ads' as const,account_id:'account alpha',campaign_id:'campaign alpha',[field]:'opaque'+fragment+'id'};
  assert.throws(() => buildRevenueReport([fact(patch)], [], {...scope,compare:'none'}), /Invalid revenue report grain/, field + ' current');
  assert.throws(() => buildRevenueReport([], [fact({...patch,metric_date:'2026-10-18'})], scope), /Invalid revenue report grain/, field + ' previous');
  assert.throws(() => buildRevenueReport([fact({...patch,source:'spreadsheet'})], [], {...scope,compare:'none'}), /Invalid revenue report grain/, field + ' unselected');
 }
 const accepted = fact({id:'origem:São Paulo 😀',channel:'meta_ads',account_id:'act_conta:Ω 😀',
  campaign_id:'campanha:α 😀',revenue:0,purchases:0,leads:0,checkouts:0});
 const original = structuredClone(accepted);
 const report = buildRevenueReport([accepted], [], {...scope,to:scope.from,compare:'none'});
 assert.equal(report.current.records,1);
 assert.deepEqual(report.current.days[0].sourceIds,['origem:São Paulo 😀']);
 assert.equal(report.current.totals.revenue,0);
 assert.equal(report.current.totals.purchases,0);
 assert.deepEqual(accepted,original);
 assert.equal(buildRevenueReport([fact({revenue:0})],[],{...scope,to:scope.from,compare:'none'}).current.totals.revenue,0,
  'Empty optional provider identifiers remain valid');
});
