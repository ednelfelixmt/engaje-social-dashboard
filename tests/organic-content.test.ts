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
