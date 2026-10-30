import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {scope,fact,breakdown,commercial} from './helpers/analytics-fixture';
type Source=Record<string,unknown>;
type Call={table:string;filters:[string,string,unknown][]};
let calls:Call[]=[],events:string[]=[],denied=false,enabled=['overview'],configOrg=scope.organizationId,readError=false,corrupt=false;
let sources:Record<string,Source[]>={};
const db={from(table:string){const call:Call={table,filters:[]};calls.push(call);events.push('read:'+table);const result=()=>({data:corrupt?sources[table]??[]:(sources[table]??[]).filter(row=>call.filters.every(([op,key,value])=>op==='gte'?String(row[key])>=String(value):op==='lte'?String(row[key])<=String(value):row[key]===value)),error:readError?new Error('PRIVATE_UPSTREAM'):null});const builder={select(){return builder;},eq(key:string,value:unknown){call.filters.push(['eq',key,value]);return builder;},gte(key:string,value:unknown){call.filters.push(['gte',key,value]);return builder;},lte(key:string,value:unknown){call.filters.push(['lte',key,value]);return builder;},order(){return builder;},range(){return Promise.resolve(result());}};return builder;}};
const session={tenant:async()=>{events.push('auth');if(denied)throw new Error('Denied');return{db,org:{id:scope.organizationId,name:scope.organizationName,slug:scope.organizationSlug,timezone:scope.timezone,currency:scope.currency},superAdmin:false};},dashboardConfig:async()=>{events.push('config');return{organization_id:configOrg,enabled_pages:enabled,funnel_steps:null};}};
const navigation={useRouter:()=>({push(){},replace(){},refresh(){}}),usePathname:()=>'/synthetic-fixture/reports/analytics',useSearchParams:()=>new URLSearchParams()};
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(id,native)=>id==='server-only'?{}:id==='@/lib/auth/session'?session:native(id));
const {Filters}=loadTypescript<typeof import('../src/components/dashboard/filters')>(new URL('../src/components/dashboard/filters.tsx',import.meta.url),(id,native)=>id==='next/navigation'?navigation:native(id));
const {DisplayModeController}=loadTypescript<typeof import('../src/components/dashboard/display-mode-controller')>(new URL('../src/components/dashboard/display-mode-controller.tsx',import.meta.url),(id,native)=>id==='next/navigation'?navigation:native(id));
const {default:Page}=loadTypescript<{default:(props:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,string>>})=>Promise<React.ReactElement>}>(new URL('../src/app/(tenant)/[organizationSlug]/reports/analytics/page.tsx',import.meta.url),(id,native)=>{if(id==='@/lib/auth/session')return session;if(id==='@/lib/metrics/query')return query;if(id==='@/components/dashboard/filters')return{Filters};if(id==='@/components/dashboard/display-mode-controller')return{DisplayModeController};return native(id);});
const props=(search:Record<string,string>={})=>({params:Promise.resolve({organizationSlug:scope.organizationSlug}),searchParams:Promise.resolve({from:scope.from,to:scope.to,currency:'BRL',compare:'previous_period',...search})});
function reset(){calls=[];events=[];denied=false;enabled=['overview'];configOrg=scope.organizationId;readError=false;corrupt=false;sources={metrics_ads:[fact(),fact({id:'prior',metric_date:'2026-10-18'})],metrics_ads_breakdowns:[breakdown(),breakdown({id:'prior-breakdown',metric_date:'2026-10-18'})],metrics_crm:[commercial()]};}
test('BI authenticates and checks config before six organization/currency/date-scoped reads',async()=>{
 reset();const html=renderToStaticMarkup(await Page(props()));assert.deepEqual(events.slice(0,2),['auth','config']);assert.equal(calls.length,6);for(const table of ['metrics_ads','metrics_ads_breakdowns','metrics_crm'])assert.equal(calls.filter(c=>c.table===table).length,2);
 for(const c of calls){assert.ok(c.filters.some(f=>f[0]==='eq'&&f[1]==='organization_id'&&f[2]===scope.organizationId));assert.ok(c.filters.some(f=>f[0]==='eq'&&f[1]==='currency'&&f[2]==='BRL'));assert.ok(c.filters.some(f=>f[0]==='gte'&&['2026-10-20','2026-10-18'].includes(String(f[2]))));}
 assert.ok(html.includes('Análise 360'));assert.ok(html.includes('Modo TV'));assert.ok(html.includes('Desempenho de marketing'));assert.ok(!html.includes('settings/integrations'));
});
test('tenant denial, disabled module, foreign config and invalid personalized dates never query facts',async()=>{
 reset();denied=true;await assert.rejects(Page(props()),/Denied/);assert.deepEqual(events,['auth']);assert.equal(calls.length,0);
 reset();enabled=[];assert.ok(renderToStaticMarkup(await Page(props())).includes('indisponível'));assert.equal(calls.length,0);
 reset();configOrg='foreign';assert.ok(renderToStaticMarkup(await Page(props())).includes('role="alert"'));assert.equal(calls.length,0);
 for(const search of [{from:'2026-02-30'},{from:'2027-01-01'},{from:'2020-01-01'}]){reset();const html=renderToStaticMarkup(await Page(props(search)));assert.equal(calls.length,0);assert.ok(!html.includes('Campanhas e eficiência'));}
});
test('foreign paid, breakdown, CRM and upstream failures cannot yield partial charts, totals or files',async()=>{
 for(const table of ['metrics_ads','metrics_ads_breakdowns','metrics_crm']){reset();corrupt=true;sources[table]=sources[table].filter(row=>row.metric_date==='2026-10-20').map(row=>({...row,organization_id:'foreign',campaign_name:'PRIVATE_CAMPAIGN',dimension_label:'PRIVATE_DEMOGRAPHY'}));const html=renderToStaticMarkup(await Page(props({compare:'none'})));assert.ok(html.includes('Nenhum painel parcial'));assert.ok(!html.includes('PRIVATE_'));assert.ok(!html.includes('Campanhas e eficiência'));assert.ok(!html.includes('CSV'));}
 reset();readError=true;const html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('Nenhum painel parcial'));assert.ok(!html.includes('PRIVATE_UPSTREAM'));
});
test('none comparison makes only three current reads and preserves an empty genuine source state',async()=>{
 reset();sources={};const html=renderToStaticMarkup(await Page(props({compare:'none'})));assert.equal(calls.length,3);assert.ok(html.includes('Sem medições diárias'));assert.ok(html.includes('País ainda não foi recebido')===false);assert.ok(!html.includes('Comparativo: 2026'));assert.ok(html.includes('Comparação indisponível'));
});
