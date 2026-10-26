import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import type {Row} from '../src/types/database.types';

type Call={table:string;filters:[string,string,unknown][]};
const scope={id:'11111111-1111-4111-8111-111111111111',name:'Synthetic organization',slug:'synthetic',timezone:'America/Cuiaba',currency:'BRL'};
let calls:Call[]=[],events:string[]=[],denied=false,superAdmin=false,enabled=['paid','overview'];
let rows:Row<'metrics_ads_breakdowns'>[]=[];
let readError=false;
const fact=(patch:Partial<Row<'metrics_ads_breakdowns'>>={})=>({id:'synthetic-fact',organization_id:scope.id,platform:'meta_ads',account_id:'act_123',campaign_id:'synthetic',metric_date:'2026-10-20',dimension_type:'gender',dimension_value:'male',dimension_label:'Synthetic label',currency:'BRL',spend:100,impressions:1000,clicks:20,leads:5,attribution_window:'7d_click',...patch} as Row<'metrics_ads_breakdowns'>);
const db={from(table:string){const call:Call={table,filters:[]};calls.push(call);events.push('read:'+table);
 const result=()=>({data:table==='organizations'?[{name:scope.name,slug:scope.slug}]:rows,error:readError&&table==='metrics_ads_breakdowns'?new Error('Synthetic upstream private detail'):null});
 const builder={select(){return builder;},eq(key:string,value:unknown){call.filters.push(['eq',key,value]);return builder;},gte(key:string,value:unknown){call.filters.push(['gte',key,value]);return builder;},lte(key:string,value:unknown){call.filters.push(['lte',key,value]);return builder;},order(){return builder;},range(){return Promise.resolve(result());},then(resolve:(value:ReturnType<typeof result>)=>unknown){return Promise.resolve(result()).then(resolve);}};return builder;
}};
const session={tenant:async()=>{events.push('auth');if(denied)throw new Error('Synthetic access denied');return {db,org:scope,superAdmin};},dashboardConfig:async()=>{events.push('config');return {enabled_pages:enabled};}};
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(id,native)=>id==='server-only'?{}:id==='@/lib/auth/session'?session:native(id));
const {Filters}=loadTypescript<{Filters:React.ComponentType<Record<string,unknown>>}>(new URL('../src/components/dashboard/filters.tsx',import.meta.url),(id,native)=>id==='next/navigation'?{useRouter:()=>({push(){throw new Error('No navigation during SSR');}}),usePathname:()=>'/synthetic/reports/meta-audience',useSearchParams:()=>new URLSearchParams()}:native(id));
const {default:Page}=loadTypescript<{default:(props:{params:Promise<{organizationSlug:string;report:string}>;searchParams:Promise<Record<string,string>>})=>Promise<React.ReactElement>}>(new URL('../src/app/(tenant)/[organizationSlug]/reports/[report]/page.tsx',import.meta.url),(id,native)=>{
 if(id==='@/lib/auth/session')return session;if(id==='@/lib/metrics/query')return query;
 if(id==='@/components/dashboard/filters')return {Filters};
 if(id==='next/navigation')return {notFound(){throw new Error('Synthetic 404');}};
 if(id==='next/link')return ({children,href,...props}:{children?:React.ReactNode;href:string})=>React.createElement('a',{...props,href},children);
 return native(id);
});
const props=(report='meta-audience')=>({params:Promise.resolve({organizationSlug:'synthetic',report}),searchParams:Promise.resolve({from:'2026-10-20',to:'2026-10-21',currency:'BRL',compare:'previous_year'})});
function reset(){calls=[];events=[];denied=false;superAdmin=false;readError=false;enabled=['paid','overview'];rows=[fact()];}

test('real report page authorizes before reading scoped facts and offers read-only export to a viewer',async()=>{
 reset();const html=renderToStaticMarkup(await Page(props()));assert.deepEqual(events.slice(0,2),['auth','config']);assert.deepEqual(calls.map(call=>call.table),['metrics_ads_breakdowns']);
 const filters=calls[0].filters;for(const predicate of [['eq','organization_id',scope.id],['eq','platform','meta_ads'],['eq','currency','BRL'],['gte','metric_date','2026-10-20'],['lte','metric_date','2026-10-21']])assert.ok(filters.some(row=>JSON.stringify(row)===JSON.stringify(predicate)));
 assert.ok(html.includes('Exportar relatório CSV'));assert.ok(html.includes('Janela de atribuição: 7d_click'));assert.ok(!html.includes('Comparação aplicada'));assert.ok(!html.includes('aria-label="Comparação"'));assert.ok(!html.includes('Gerenciar fonte de dados'));
});

test('denied tenant never reaches config, queries or export data',async()=>{
 reset();denied=true;await assert.rejects(Page(props()),/access denied/);assert.deepEqual(events,['auth']);assert.equal(calls.length,0);
});

test('disabled reports return before any fact query or export',async()=>{
 reset();enabled=[];const html=renderToStaticMarkup(await Page(props()));assert.equal(calls.length,0);assert.ok(html.includes('indisponível nas configurações'));assert.ok(!html.includes('Exportar relatório'));
});

test('cross-tenant or incompatible-window payloads show a safe error and no export',async()=>{
 for(const facts of [[fact({organization_id:'22222222-2222-4222-8222-222222222222',dimension_label:'PRIVATE_OTHER'})],[fact(),fact({id:'synthetic-other',metric_date:'2026-10-21',attribution_window:'1d_click'})]]){
  reset();rows=facts;const html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('role="alert"'));assert.ok(html.includes('Nenhum total ou arquivo foi produzido'));assert.ok(!html.includes('Exportar relatório'));assert.ok(!html.includes('PRIVATE_OTHER'));
 }
});

test('empty report preserves unavailable state and disables export',async()=>{
 reset();rows=[];const html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('disabled=""'));assert.ok(html.includes('0 registros no recorte'));assert.ok(html.includes('Sem dados de sexo'));
});

test('GA4 never substitutes advertising data and management link is agency-only',async()=>{
 reset();let html=renderToStaticMarkup(await Page(props('google-analytics')));assert.equal(calls.length,0);assert.ok(html.includes('Fonte de dados GA4 ainda não conectada'));assert.ok(!html.includes('Gerenciar fonte de dados'));assert.ok(!html.includes('Exportar relatório'));
 reset();superAdmin=true;html=renderToStaticMarkup(await Page(props('google-analytics')));assert.ok(html.includes('Gerenciar fonte de dados'));assert.deepEqual(calls.map(call=>call.table),['organizations']);
});


test('Google audience report uses only Google facts and does not assert that available data is absent',async()=>{
 reset();rows=[fact({platform:'google_ads'})];const html=renderToStaticMarkup(await Page(props('google-audience')));
 assert.ok(calls[0].filters.some(([op,key,value])=>op==='eq'&&key==='platform'&&value==='google_ads'));
 assert.ok(html.includes('Google Ads'));assert.ok(html.includes('Exportar relatório CSV'));assert.ok(!html.includes('Não há registros do Google Ads nesta base'));
});

test('failed database reads for both private reports render a redacted error without CSV or partial facts',async()=>{
 for(const report of ['meta-audience','google-audience']){
  reset();readError=true;rows=[fact({dimension_label:'SYNTHETIC_PRIVATE_ROW'})];
  const html=renderToStaticMarkup(await Page(props(report)));
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes('Não foi possível carregar ou consolidar'));
  assert.ok(html.includes('Nenhum total ou arquivo foi produzido'));
  assert.ok(!html.includes('Synthetic upstream private detail'));
  assert.ok(!html.includes('SYNTHETIC_PRIVATE_ROW'));
  assert.ok(!html.includes('Exportar relatório CSV'));
  assert.deepEqual(events.slice(0,2),['auth','config']);
  assert.deepEqual(calls.map(call=>call.table),['metrics_ads_breakdowns']);
 }
});
