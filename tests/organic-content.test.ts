import test from 'node:test';
import assert from 'node:assert/strict';
import {buildOrganicContentReport,organicContentLimit,type OrganicContentRecord,type OrganicContentScope} from '../src/lib/reports/organic-content';
import {organicContentCsv,organicContentFilename} from '../src/lib/export/organic-content';

const scope:OrganicContentScope={organizationId:'10000000-0000-4000-8000-000000000001',organizationName:'Synthetic organization',organizationSlug:'synthetic',timezone:'America/Cuiaba',from:'2026-10-20',to:'2026-10-21',platform:'all',generatedAt:'2026-10-27T13:00:00.000Z'};
const post=(patch:Partial<OrganicContentRecord>={}):OrganicContentRecord=>({id:'post-1',organization_id:scope.organizationId,platform:'instagram_organic',account_id:'synthetic-account',external_id:'external-1',kind:'image',name:null,caption:'Synthetic caption',published_at:'2026-10-20T00:00:00Z',synced_at:'2026-10-27T12:00:00Z',lifetime_metrics:{likes:0,comments:4,shares:null,saved:5},...patch});
test('organic report preserves measured zero, provider-specific counters and the collection timestamp outside publication range',()=>{
 const report=buildOrganicContentReport([post(),post({id:'post-2',external_id:'external-2',platform:'facebook_organic',lifetime_metrics:{likes:2,comments:0,shares:7,saved:99}})],scope);
 assert.equal(report.rows.length,2);
 const ig=report.rows.find(row=>row.platform==='instagram_organic')!;
 const fb=report.rows.find(row=>row.platform==='facebook_organic')!;
 assert.equal(ig.likes,0);assert.equal(ig.shares,null);assert.equal(ig.saves,5);
 assert.equal(fb.likes,2);assert.equal(fb.saves,null);
 assert.equal(ig.collectedAt,'2026-10-27T12:00:00.000Z');
 assert.ok(!('totals' in report));assert.ok(!('engagementRate' in report));
});
test('organic counters reject strings, negatives, decimals, booleans and unsafe integers without erasing valid sibling metrics',()=>{
 for(const bad of ['0',-1,0.2,true,Number.MAX_SAFE_INTEGER+1,Infinity,NaN,null]){
  const row=buildOrganicContentReport([post({lifetime_metrics:{likes:bad,comments:0,saved:4}} as never)],scope).rows[0];
  assert.equal(row.likes,null);assert.equal(row.comments,0);assert.equal(row.saves,4);
 }
 for(const metrics of [null,[],true,'synthetic']){
  assert.equal(buildOrganicContentReport([post({lifetime_metrics:metrics})],scope).rows[0].likes,null);
 }
});
test('organic report fails closed on context, tenant, platform and duplicate identities even without usable counters',()=>{
 for(const bad of [{organizationId:''},{platform:'meta_ads'},{from:'2026-02-30'},{generatedAt:'2026-10-27'}]){
  assert.throws(()=>buildOrganicContentReport([],{...scope,...bad} as OrganicContentScope));
 }
 const foreign=post({organization_id:'10000000-0000-4000-8000-000000000002',lifetime_metrics:{}});
 for(const rows of [[foreign],[post(),foreign],[post({platform:'meta_ads'})],[post(),post()],[post(),post({id:'post-2'})]]){
  assert.throws(()=>buildOrganicContentReport(rows,scope));
 }
 assert.throws(()=>buildOrganicContentReport([post()],{...scope,platform:'facebook_organic'}));
});
test('publication filtering uses exact UTC bounds and rejects invalid/local/unbounded publication dates',()=>{
 const offset=buildOrganicContentReport([post({published_at:'2026-10-19T20:00:00-04:00'})],scope);
 assert.equal(offset.rows[0].publishedAt,'2026-10-20T00:00:00.000Z');
 for(const published_at of [null,'2026-10-20','2026-10-20T12:00:00','2026-02-30T00:00:00Z','2026-10-19T23:59:59Z','2026-10-22T00:00:00Z']){
  assert.throws(()=>buildOrganicContentReport([post({published_at})],scope));
 }
});
test('unknown or impossible snapshot timestamps withhold all counters without fabricating a collection date',()=>{
 for(const synced_at of ['','invalid','2026-10-20T00:00:00','2026-10-19T23:00:00Z','2026-10-27T14:00:00Z']){
  const row=buildOrganicContentReport([post({synced_at})],scope).rows[0];
  assert.equal(row.snapshotValid,false);assert.equal(row.collectedAt,null);assert.equal(row.likes,null);assert.equal(row.comments,null);
 }
});
test('query sentinel validates every row before a stable bounded projection and never silently accepts a foreign 501st row',()=>{
 const records=Array.from({length:organicContentLimit+1},(_,i)=>post({id:'post-'+String(i).padStart(4,'0'),external_id:'external-'+i}));
 const report=buildOrganicContentReport(records.slice().reverse(),scope);
 assert.equal(report.truncated,true);assert.equal(report.rows.length,500);assert.equal(report.received,501);assert.equal(report.rows[0].id,'post-0000');
 assert.throws(()=>buildOrganicContentReport([...records,post({id:'extra',external_id:'extra'})],scope));
 const foreign=records.map((record,i)=>i===500?{...record,organization_id:'foreign'}:record);
 assert.throws(()=>buildOrganicContentReport(foreign,scope));
 assert.equal(buildOrganicContentReport([],scope).truncated,false);
});
test('captions are capped without broken surrogate characters, input remains unchanged and CSV preserves null versus zero and provenance',()=>{
 const input=post({caption:'=SUM(1;2)\n"synthetic"',lifetime_metrics:{likes:0,comments:null,saved:3}});
 const copy=structuredClone(input);
 const report=buildOrganicContentReport([input],scope);
 assert.deepEqual(input,copy);
 const csv=organicContentCsv(report);
 for(const text of ['inicio_publicacao_utc','coletado_em_utc','acumulado_no_conteudo_ate_ultima_coleta','curtidas_ou_reacoes','Synthetic organization',"'=SUM(1;2)"]){
  assert.ok(csv.includes(text),text);
 }
 assert.ok(csv.includes(';"0";"";"";"3"'));
 const long=buildOrganicContentReport([post({caption:'a'.repeat(1999)+'😀'+'b'})],scope).rows[0];
 assert.equal(long.captionTruncated,true);assert.equal(long.caption,'a'.repeat(1999));
 const file=organicContentFilename({...report,scope:{...scope,organizationSlug:'../../evil/name',from:'../../2026-10-20',to:'../../2026-10-21'}});
 assert.ok(!file.includes('/'));assert.ok(!file.includes('..'));
});

test('DATA-ORG-TZ-001: invalid UTC offsets cannot validate organic publication or collection evidence',()=>{
 for(const published_at of ['2026-10-20T12:00:00+14:01','2026-10-20T12:00:00-15:00','2026-10-20T12:00:00+23:59']){
  assert.throws(()=>buildOrganicContentReport([post({published_at})],scope),undefined,published_at);
 }
 for(const synced_at of ['2026-10-21T12:00:00+14:01','2026-10-21T12:00:00-15:00']){
  const row=buildOrganicContentReport([post({synced_at})],scope).rows[0];
  assert.equal(row.snapshotValid,false,synced_at);
  assert.equal(row.collectedAt,null);
  assert.equal(row.likes,null);
 }
 const boundary=buildOrganicContentReport([post({published_at:'2026-10-20T14:00:00+14:00'})],scope).rows[0];
 assert.equal(boundary.publishedAt,'2026-10-20T00:00:00.000Z');
 assert.equal(boundary.likes,0);
});


test('ORG-GRAIN-001: content reports reject padded or whitespace-only source identities without silently trimming',()=>{
 for(const patch of [
  {id:' post-1'}, {id:'post-1\t'}, {id:' \t '},
  {account_id:' synthetic-account'}, {account_id:'synthetic-account '},
  {external_id:' external-1'}, {external_id:'external-1\n'}
 ]){
  assert.throws(()=>buildOrganicContentReport([post(patch)],scope),/Organic source identity is missing/);
 }
 assert.throws(()=>buildOrganicContentReport([post(),post({id:'post-2',external_id:'external-2 '})],scope));
 const accepted=buildOrganicContentReport([post({id:'post:alpha/1',account_id:'provider:account-1',external_id:'provider:external-1'})],scope);
 assert.equal(accepted.rows[0].externalId,'provider:external-1');
 assert.equal(accepted.rows[0].account,'provider:account-1');
});


test('SOURCE-GRAIN-CONTROLS-001: organic content identity rejects internal controls without changing captions',()=>{
 const invalid=['syn\u0000thetic','syn\nthetic','syn\tthetic','syn\u007fthetic','syn\u0085thetic'];
 for(const field of ['id','account_id','external_id'] as const)for(const value of invalid){
  assert.throws(()=>buildOrganicContentReport([post({[field]:value})],scope),/Organic source identity is missing/,field);
 }
 const accepted=buildOrganicContentReport([post({
  id:'source alpha:01',account_id:'account alpha',external_id:'post alpha',
  caption:'Multiline\ncaption',lifetime_metrics:{likes:0},
 })],scope);
 assert.equal(accepted.rows[0].likes,0);
 assert.equal(accepted.rows[0].caption,'Multiline\ncaption');
});


test('ORG-TIMEZONE-SCOPE-001: invalid tenant timezone cannot label organic content or its empty export',()=>{
 for (const timezone of ['Mars/Olympus','America/Cuiaba ','']) {
  const invalidScope={...scope,timezone};
  assert.throws(()=>buildOrganicContentReport([],invalidScope),RangeError,'empty '+JSON.stringify(timezone));
  assert.throws(()=>buildOrganicContentReport([post()],invalidScope),RangeError,'populated '+JSON.stringify(timezone));
 }
 for (const timezone of ['UTC','America/Cuiaba']) {
  const valid=buildOrganicContentReport([post({lifetime_metrics:{likes:0}})],{...scope,timezone});
  assert.equal(valid.rows[0].likes,0);
  assert.equal(valid.scope.timezone,timezone);
 }
});

test('ORG-SOURCE-INVISIBLE-CONTROLS-001: content grain rejects invisible and bidi provider identities',()=>{
 const hidden=['id\u200Btoken','id\u200Etoken','id\u200Ftoken','id\u202Etoken','id\u2066token','id\u2069token','id\u2060token','id\u00ADtoken','id\u061Ctoken','id\uFEFFtoken'];
 for(const field of ['id','account_id','external_id'] as const)for(const value of hidden){
  assert.throws(()=>buildOrganicContentReport([post({[field]:value})],scope),/Organic source identity is missing/,field+' '+JSON.stringify(value));
 }
 const accepted=buildOrganicContentReport([post({id:'visível:São Paulo α-1',account_id:'conta:Ωmega',external_id:'post/α:1',lifetime_metrics:{likes:0}})],scope);
 assert.equal(accepted.rows[0].externalId,'post/α:1');
 assert.equal(accepted.rows[0].likes,0);
});


test('ORG-TIMEZONE-REQUIRED-001: missing or non-string timezone cannot label content reports',()=>{
 for(const timezone of [undefined,null,0,false,{},[]]){
  const invalid={...scope,timezone} as unknown as OrganicContentScope;
  assert.throws(()=>buildOrganicContentReport([],invalid),RangeError,'empty '+String(timezone));
  assert.throws(()=>buildOrganicContentReport([post()],invalid),RangeError,'populated '+String(timezone));
 }
 const omitted={...scope} as Partial<OrganicContentScope>;
 delete omitted.timezone;
 assert.throws(()=>buildOrganicContentReport([],omitted as OrganicContentScope),RangeError,'omitted timezone');
 for(const timezone of ['UTC','America/Cuiaba']){
  const valid=buildOrganicContentReport([post({lifetime_metrics:{likes:0}})],{...scope,timezone});
  assert.equal(valid.scope.timezone,timezone);
  assert.equal(valid.rows[0].likes,0);
 }
});
