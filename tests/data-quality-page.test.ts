import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
const org={id:'10000000-0000-4000-8000-000000000001',name:'Synthetic <script>client</script>',slug:'synthetic',timezone:'America/Cuiaba'};
const metric={id:'metric-1',organization_id:org.id,platform:'meta_ads',account_id:'account-1',campaign_id:'campaign-1',metric_date:'2026-10-20',synced_at:'2026-10-21T12:00:00Z'};
let events:string[]=[],calls:{table:string;method:string;args:unknown[]}[]=[],denied=false;
let sources:Record<string,unknown[]|null>={},failure:string|null=null;
const db={from(table:string){events.push('query:'+table);const builder={
 select(...args:unknown[]){calls.push({table,method:'select',args});return builder;},
 eq(...args:unknown[]){calls.push({table,method:'eq',args});return builder;},
 order(...args:unknown[]){calls.push({table,method:'order',args});return builder;},
 range(from:number,to:number){calls.push({table,method:'range',args:[from,to]});return Promise.resolve({data:sources[table]?.slice(from,to+1)??null,error:failure===table?new Error('PRIVATE_SOURCE_DIAGNOSTIC'):null});},
 limit(...args:unknown[]){calls.push({table,method:'limit',args});return Promise.resolve({data:sources[table],error:failure===table?new Error('PRIVATE_JOB_DIAGNOSTIC'):null});},
 };return builder;}};
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(id,native)=>id==='server-only'||id==='@/lib/auth/session'?{}:native(id));
const qualityQuery=loadTypescript<typeof import('../src/lib/metrics/data-quality-query')>(new URL('../src/lib/metrics/data-quality-query.ts',import.meta.url),(id,native)=>id==='server-only'?{}:id==='./query'?query:native(id));
const {default:Page}=loadTypescript<{default:(p:{params:Promise<{organizationSlug:string}>})=>Promise<React.ReactElement>}>(new URL('../src/app/(tenant)/[organizationSlug]/settings/data-quality/page.tsx',import.meta.url),(id,native)=>{
 if(id==='@/lib/auth/session')return {agencyTenant:async()=>{events.push('auth');if(denied)throw new Error('DENIED');return {db,org};}};
 if(id==='@/lib/metrics/data-quality-query')return qualityQuery;return native(id);
});
function reset(){events=[];calls=[];denied=false;failure=null;sources={integrations:[],metrics_ads:[metric],metrics_ads_breakdowns:[],sync_jobs:[]};}
const props=()=>({params:Promise.resolve({organizationSlug:org.slug})});
test('quality route authenticates agency before minimal scoped queries and stable twelve-job creation ordering',async()=>{
 reset();const html=renderToStaticMarkup(await Page(props()));assert.equal(events[0],'auth');assert.equal(events.filter(e=>e.startsWith('query:')).length,4);
 for(const table of Object.keys(sources)){assert.ok(calls.some(c=>c.table===table&&c.method==='eq'&&JSON.stringify(c.args)===JSON.stringify(['organization_id',org.id])),table);const fields=calls.find(c=>c.table===table&&c.method==='select')!.args[0] as string;assert.ok(fields.includes('organization_id'));for(const field of ['*','last_error','error_summary','token','credentials'])assert.ok(!fields.includes(field),field);}
 const orders=calls.filter(c=>c.table==='sync_jobs'&&c.method==='order');assert.deepEqual(orders.map(c=>c.args),[['created_at',{ascending:false}],['id',{ascending:false}]]);assert.deepEqual(calls.find(c=>c.table==='sync_jobs'&&c.method==='limit')!.args,[12]);
 assert.ok(html.includes('administradores da agência'));assert.ok(html.includes('Synthetic &lt;script&gt;client&lt;/script&gt;'));assert.ok(html.includes('Conexões habilitadas registradas'));assert.ok(html.includes('Conexões em erro / expiradas'));assert.ok(!html.includes('Contas publicitárias válidas'));assert.ok(!html.includes('Credenciais com falha'));assert.ok(!html.includes('type="submit"'));
});
test('denied agency access stops all reads and missing/error/foreign sources never render partial diagnostics',async()=>{
 reset();denied=true;await assert.rejects(Page(props()),/DENIED/);assert.deepEqual(events,['auth']);
 for(const table of ['integrations','metrics_ads','metrics_ads_breakdowns','sync_jobs'])for(const kind of ['error','missing','foreign']){reset();if(kind==='error')failure=table;else if(kind==='missing')sources[table]=null;else sources[table]=[{id:'foreign',organization_id:'10000000-0000-4000-8000-000000000002'}];const html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('Nenhum indicador parcial'),table+kind);assert.ok(!html.includes('Registros de campanhas'));assert.ok(!html.includes('Últimos registros de sincronização'));assert.ok(!html.includes('PRIVATE_'));assert.ok(!html.includes('foreign'));}
});
test('paginated metric reads keep the tenant filter and reject a foreign row after the first page',async()=>{
 reset();sources.metrics_ads=Array.from({length:1001},(_,i)=>({...metric,id:'metric-'+i}));let html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('Qualidade e cobertura'));assert.deepEqual(calls.filter(c=>c.table==='metrics_ads'&&c.method==='range').map(c=>c.args),[[0,999],[1000,1999]]);assert.equal(calls.filter(c=>c.table==='metrics_ads'&&c.method==='eq').length,2);
 reset();sources.metrics_ads=[...Array.from({length:1000},(_,i)=>({...metric,id:'metric-'+i})),{...metric,id:'foreign',organization_id:'10000000-0000-4000-8000-000000000002'}];html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('Nenhum indicador parcial'));assert.ok(!html.includes('Registros de campanhas'));
});
test('future-only data stays visibly invalid and job default counters are unavailable rather than processed zero',async()=>{
 reset();sources.metrics_ads=[{...metric,metric_date:'2099-01-01',synced_at:'2099-01-02T00:00:00Z'}];sources.sync_jobs=[{id:'job-1',organization_id:org.id,status:'queued',created_at:'2026-10-20T12:00:00Z',started_at:null,completed_at:null,rows_processed:0}];const html=renderToStaticMarkup(await Page(props()));for(const text of ['Sem data histórica válida','Existem registros','Datas futuras: 1','Coletas desconhecidas ou futuras: 1','Na fila','Contador final registrado','Indisponível'])assert.ok(html.includes(text),text);assert.ok(!html.includes('0 registros'));assert.ok(!html.includes('Invalid Date'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Última data recente'));
});


test('DATAQUAL-MIXED-DATE-001: admin UI labels mixed dates as inconsistent rather than healthy or missing',async()=>{
 reset();sources.metrics_ads=[metric,{...metric,id:'future',metric_date:'2099-01-01'}];
 const html=renderToStaticMarkup(await Page(props()));
 assert.ok(html.includes('Datas inconsistentes'));
 assert.ok(html.includes('Datas futuras: 1'));
 assert.ok(html.includes('20/10/2026'));
 assert.ok(!html.includes('Última data recente'));
 assert.ok(!html.includes('Última data antiga'));
 assert.ok(!html.includes('Sem data histórica válida'));
 assert.ok(!html.includes('Nenhum indicador parcial'));
});
