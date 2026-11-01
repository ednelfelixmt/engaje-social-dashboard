import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import {calendarDays} from '../src/lib/metrics/calendar';
import {buildOrganicAccountsReport,organicAccountMetrics,type OrganicAccountRecord} from '../src/lib/reports/organic-accounts';
import {organicTimestamp,validateOrganicScope,type OrganicScope} from '../src/lib/reports/organic-scope';
import {organicAccountsCsv,organicAccountsFilename} from '../src/lib/export/organic-accounts';

const scope:OrganicScope={organizationId:'10000000-0000-4000-8000-000000000001',organizationName:'Synthetic organization',organizationSlug:'synthetic',timezone:'America/Cuiaba',from:'2026-10-20',to:'2026-10-22',platform:'all',generatedAt:'2026-10-27T13:00:00Z'};
const record=(patch:Partial<OrganicAccountRecord>={}):OrganicAccountRecord=>({id:'row-1',organization_id:scope.organizationId,platform:'instagram_organic',account_id:'synthetic-account',metric_date:'2026-10-20',source_period:'day',synced_at:'2026-10-27T12:00:00Z',impressions:0,reach:null,interactions:3,followers:100,website_clicks:2,...patch});
test('stored day label never proves daily activity; zero and follower stocks remain individual observations',()=>{
 const report=buildOrganicAccountsReport([record(),record({id:'row-2',metric_date:'2026-10-22',followers:105})],scope);
 assert.equal(report.measurementWindow,'unverified');assert.equal(report.rows[0].values.followers,105);
 assert.equal(report.rows[1].values.followers,100);assert.equal(report.rows[0].values.impressions,0);
 assert.ok(!('totals' in report));assert.ok(!('growth' in report));assert.ok(!('engagementRate' in report));
 const coverage=report.accounts[0];assert.equal(coverage.recordDates,2);assert.equal(coverage.selectedDates,3);
 assert.equal(coverage.datesWithoutRecord,1);assert.deepEqual(coverage.missingDatePreview,['2026-10-21']);
 assert.equal(coverage.knownValues.followers,2);assert.equal(coverage.knownValues.reach,0);assert.equal(coverage.knownValues.impressions,2);
});
test('coverage counts only accepted fields and preserves date presence when collection cannot be verified',()=>{
 for(const bad of ['0',-1,0.5,true,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){
  const report=buildOrganicAccountsReport([record({reach:bad} as never)],scope);
  assert.equal(report.rows[0].values.reach,null);assert.equal(report.accounts[0].knownValues.reach,0);
  assert.equal(report.rows[0].values.impressions,0);assert.equal(report.accounts[0].knownValues.impressions,1);
 }
 for(const synced_at of ['invalid','2026-10-20T12:00:00','2026-10-28T00:00:00Z']){
  const report=buildOrganicAccountsReport([record({synced_at})],scope);
  assert.equal(report.rows[0].collectionKnown,false);assert.equal(report.rows[0].collectedAt,null);
  for(const metric of organicAccountMetrics){assert.equal(report.rows[0].values[metric],null);assert.equal(report.accounts[0].knownValues[metric],0);}
  assert.equal(report.accounts[0].recordDates,1);
 }
});
test('source calendar date is not reinterpreted as a UTC collection boundary',()=>{
 const report=buildOrganicAccountsReport([record({synced_at:'2026-10-19T23:00:00Z'})],scope);
 assert.equal(report.rows[0].collectionKnown,true);assert.equal(report.rows[0].recordDate,'2026-10-20');
 assert.equal(report.measurementWindow,'unverified');
});
test('account report rejects tenant, provider, period, date and identity mismatches before projection',()=>{
 for(const bad of [{organization_id:'foreign'},{platform:'meta_ads'},{source_period:'week'},{metric_date:'2026-02-30'},{metric_date:'2026-10-19'},{id:''},{account_id:''}]){
  assert.throws(()=>buildOrganicAccountsReport([record(),record({id:'bad',...bad} as never)],scope));
 }
 assert.throws(()=>buildOrganicAccountsReport([record()],{...scope,platform:'facebook_organic'}));
 assert.throws(()=>buildOrganicAccountsReport([record(),record()],scope));
 assert.throws(()=>buildOrganicAccountsReport([record(),record({id:'other'})],scope));
 for(const bad of [{organizationId:''},{platform:'meta_ads'},{from:'invalid'},{generatedAt:'invalid'}]){
  assert.throws(()=>buildOrganicAccountsReport([],{...scope,...bad} as OrganicScope));
 }
});
test('sentinel is validated, but never contributes an account or accepted-value coverage',()=>{
 const wide={...scope,from:'2025-01-01',to:'2026-10-27'};
 const dates=calendarDays(wide.from,wide.to).slice(0,501);
 const records=dates.map((date,i)=>record({id:'row-'+i,metric_date:date,account_id:i===0?'sentinel-account':'observed-account'}));
 const report=buildOrganicAccountsReport(records,wide);
 assert.equal(report.rows.length,500);assert.equal(report.truncated,true);assert.equal(report.received,501);
 assert.equal(report.accounts.length,1);assert.equal(report.accounts[0].account,'observed-account');
 assert.equal(report.accounts[0].records,500);assert.equal(report.accounts[0].knownValues.followers,500);
 assert.throws(()=>buildOrganicAccountsReport(records.map((row,i)=>i===0?{...row,organization_id:'foreign'}:row),wide));
 assert.throws(()=>buildOrganicAccountsReport([...records,record({id:'extra',metric_date:'2026-10-27'})],wide));
});
test('empty account report does not invent accounts, calendar measurements or zero-valued metrics',()=>{
 const report=buildOrganicAccountsReport([],scope);assert.deepEqual(report.accounts,[]);assert.deepEqual(report.rows,[]);
 assert.equal(report.truncated,false);assert.equal(report.measurementWindow,'unverified');
});
test('account CSV carries uncertainty and non-additivity, distinguishes zero/null and neutralizes external formula text',()=>{
 const input=record({account_id:'=SYNTHETIC()',followers:0});
 const before=structuredClone(input);
 const report=buildOrganicAccountsReport([input],{...scope,organizationName:'＠SYNTHETIC'});
 const csv=organicAccountsCsv(report);
 const parsed=Papa.parse<Record<string,string>>(csv,{header:true,delimiter:';'}).data;
 assert.equal(parsed.length,1);const row=parsed[0];
 assert.equal(row.janela_medicao_confirmada,'nao');assert.equal(row.rotulo_periodo_armazenado,'day');
 assert.ok(row.regra_agregacao.includes('nao_somar'));assert.ok(row.semantica_links.includes('nao_confirmado'));
 assert.equal(row.visualizacoes_ou_impressoes_recebidas,'0');assert.equal(row.alcance_recebido,'');assert.equal(row.seguidores_estoque_recebido,'0');
 assert.equal(row.conta,"'=SYNTHETIC()");assert.equal(row.cliente,"'＠SYNTHETIC");
 assert.equal(row.datas_com_registro_exibido_conta,'1');assert.equal(row.datas_calendario_filtro,'3');
 assert.ok(!csv.includes('"follows"'));assert.ok(!csv.includes('"unfollows"'));assert.deepEqual(input,before);
 const filename=organicAccountsFilename({...report,scope:{...scope,organizationSlug:'../../bad/name',from:'../../2026-10-20',to:'../../2026-10-22'}});
 assert.ok(!filename.includes('/'));assert.ok(!filename.includes('..'));
});

test('DATA-ORG-TZ-001: impossible source UTC offsets do not verify account measurements',()=>{
 for(const synced_at of ['2026-10-21T12:00:00+14:01','2026-10-21T12:00:00-15:00','2026-10-21T12:00:00+23:59','2026-10-21T12:00:00-14:30']){
  const report=buildOrganicAccountsReport([record({synced_at})],scope);
  assert.equal(report.rows[0].collectionKnown,false,synced_at);
  assert.equal(report.rows[0].collectedAt,null);
  assert.equal(report.rows[0].values.impressions,null);
  assert.equal(report.accounts[0].knownValues.impressions,0);
  assert.equal(report.accounts[0].recordDates,1);
 }
 const boundary=buildOrganicAccountsReport([record({synced_at:'2026-10-27T14:00:00+14:00'})],scope).rows[0];
 assert.equal(boundary.collectionKnown,true);
 assert.equal(boundary.collectedAt,'2026-10-27T00:00:00.000Z');
 assert.equal(boundary.values.impressions,0);
});

test('DATA-ORG-TZ-001: report generation timestamps reject impossible offsets and accept both UTC boundaries',()=>{
 for(const generatedAt of ['2026-10-27T12:00:00+14:01','2026-10-27T12:00:00-14:01','2026-10-27T12:00:00+15:00','2026-10-27T12:00:00-15:00']){
  assert.equal(organicTimestamp(generatedAt),null,generatedAt);
  assert.throws(()=>validateOrganicScope({...scope,generatedAt}));
 }
 assert.equal(organicTimestamp('2026-10-27T14:00:00+14:00'),Date.parse('2026-10-27T00:00:00Z'));
 assert.equal(organicTimestamp('2026-10-27T00:00:00-14:00'),Date.parse('2026-10-27T14:00:00Z'));
});

test('ORG-GRAIN-001: account reports reject padded record/account identities and preserve valid opaque keys',()=>{
 for(const patch of [
  {id:' row-1'}, {id:'row-1\n'}, {id:' \t '},
  {account_id:' synthetic-account'}, {account_id:'synthetic-account\t'},
  {account_id:'\u00a0synthetic-account'}
 ]){
  assert.throws(()=>buildOrganicAccountsReport([record(patch)],scope),/Organic account identity is missing/);
 }
 assert.throws(()=>buildOrganicAccountsReport([
  record(),record({id:'row-2',metric_date:'2026-10-21',account_id:'synthetic-account '})
 ],scope));
 const accepted=buildOrganicAccountsReport([record({id:'row:alpha/1',account_id:'provider:account-1'})],scope);
 assert.equal(accepted.rows[0].id,'row:alpha/1');
 assert.equal(accepted.accounts[0].account,'provider:account-1');
});


test('SOURCE-GRAIN-CONTROLS-001: organic account record and account IDs reject embedded controls',()=>{
 const invalid=['syn\u0000thetic','syn\nthetic','syn\tthetic','syn\u007fthetic','syn\u0085thetic'];
 for(const field of ['id','account_id'] as const)for(const value of invalid){
  assert.throws(()=>buildOrganicAccountsReport([record({[field]:value})],scope),/Organic account identity is missing/,field);
 }
 const accepted=buildOrganicAccountsReport([record({
  id:'source alpha:01',account_id:'account alpha',impressions:0,
 })],scope);
 assert.equal(accepted.rows[0].values.impressions,0);
 assert.equal(accepted.accounts[0].account,'account alpha');
});


test('ORG-TIMEZONE-SCOPE-001: invalid tenant timezone fails closed for account reports and empty periods',()=>{
 for (const timezone of ['Mars/Olympus','America/Cuiaba ','']) {
  const invalidScope={...scope,timezone};
  assert.throws(()=>validateOrganicScope(invalidScope),RangeError,JSON.stringify(timezone));
  assert.throws(()=>buildOrganicAccountsReport([],invalidScope),RangeError,'empty '+JSON.stringify(timezone));
  assert.throws(()=>buildOrganicAccountsReport([record()],invalidScope),RangeError,'populated '+JSON.stringify(timezone));
 }
 for (const timezone of ['UTC','America/Cuiaba']) {
  const valid=buildOrganicAccountsReport([record({impressions:0})],{...scope,timezone});
  assert.equal(valid.rows[0].values.impressions,0);
  assert.equal(valid.scope.timezone,timezone);
 }
});
