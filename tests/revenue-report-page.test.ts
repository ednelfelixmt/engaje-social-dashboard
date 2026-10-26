import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import type {Row} from '../src/types/database.types';

type Call={table:string;filters:[string,string,unknown][]};
const scope={id:'11111111-1111-4111-8111-111111111111',name:'Synthetic organization',slug:'synthetic',timezone:'America/Cuiaba',currency:'BRL'};
let calls:Call[]=[],events:string[]=[],denied=false,superAdmin=false,enabled=['external'];
let rows:Row<'metrics_crm'>[]=[];
let readError=false, corrupt=false;
const fact=(patch:Partial<Row<'metrics_crm'>>={})=>({id:'synthetic-fact',organization_id:scope.id,source:'crm',channel:'unattributed',account_id:'',campaign_id:'',revenue:100,purchases:2,checkouts:3,is_complete:true,synced_at:'2026-10-22T12:00:00.000Z',metric_date:'2026-10-20',currency:'BRL',spend:100,impressions:1000,clicks:20,leads:5,attribution_window:'7d_click',...patch} as Row<'metrics_crm'>);
const db={from(table:string){const call:Call={table,filters:[]};calls.push(call);events.push('read:'+table);
 const result=()=>({data:table==='organizations'?[{name:scope.name,slug:scope.slug}]:corrupt?rows:rows.filter(row=>call.filters.every(([op,_key,value])=>op==='gte'?row.metric_date>=String(value):op==='lte'?row.metric_date<=String(value):true)),error:readError&&table==='metrics_crm'?new Error('Synthetic upstream private detail'):null});
 const builder={select(){return builder;},eq(key:string,value:unknown){call.filters.push(['eq',key,value]);return builder;},gte(key:string,value:unknown){call.filters.push(['gte',key,value]);return builder;},lte(key:string,value:unknown){call.filters.push(['lte',key,value]);return builder;},order(){return builder;},range(){return Promise.resolve(result());},then(resolve:(value:ReturnType<typeof result>)=>unknown){return Promise.resolve(result()).then(resolve);}};return builder;
}};
const session={tenant:async()=>{events.push('auth');if(denied)throw new Error('Synthetic access denied');return {db,org:scope,superAdmin};},dashboardConfig:async()=>{events.push('config');return {enabled_pages:enabled,preferred_revenue_source:'crm'};}};
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(id,native)=>id==='server-only'?{}:id==='@/lib/auth/session'?session:native(id));
const {Filters}=loadTypescript<{Filters:React.ComponentType<Record<string,unknown>>}>(new URL('../src/components/dashboard/filters.tsx',import.meta.url),(id,native)=>id==='next/navigation'?{useRouter:()=>({push(){throw new Error('No navigation during SSR');}}),usePathname:()=>'/synthetic/reports/revenue',useSearchParams:()=>new URLSearchParams()}:native(id));
const {default:Page}=loadTypescript<{default:(props:{params:Promise<{organizationSlug:string;report:string}>;searchParams:Promise<Record<string,string>>})=>Promise<React.ReactElement>}>(new URL('../src/app/(tenant)/[organizationSlug]/reports/revenue/page.tsx',import.meta.url),(id,native)=>{
 if(id==='@/lib/auth/session')return session;if(id==='@/lib/metrics/query')return query;
 if(id==='@/components/dashboard/filters')return {Filters};
 if(id==='next/navigation')return {notFound(){throw new Error('Synthetic 404');}};
 if(id==='next/link')return ({children,href,...props}:{children?:React.ReactNode;href:string})=>React.createElement('a',{...props,href},children);
 return native(id);
});
const props=(report='meta-audience')=>({params:Promise.resolve({organizationSlug:'synthetic',report}),searchParams:Promise.resolve({from:'2026-10-20',to:'2026-10-21',currency:'BRL',compare:'previous_year'})});
function reset(){calls=[];events=[];denied=false;superAdmin=false;readError=false;corrupt=false;enabled=['external'];rows=[fact()];}



test('revenue route authorizes before querying tenant/currency/date facts and renders comparison',async()=>{
 reset();rows.push(fact({id:'second',metric_date:'2026-10-21'}),fact({id:'prior1',metric_date:'2025-10-20'}),fact({id:'prior2',metric_date:'2025-10-21'}));
 const html=renderToStaticMarkup(await Page(props()));assert.deepEqual(events.slice(0,2),['auth','config']);assert.deepEqual(calls.map(c=>c.table),['metrics_crm','metrics_crm']);
 for(const call of calls)for(const expected of [['eq','organization_id',scope.id],['eq','currency','BRL']])assert.ok(call.filters.some(f=>JSON.stringify(f)===JSON.stringify(expected)));
 assert.ok(calls[0].filters.some(f=>f[0]==='gte'&&f[2]==='2026-10-20'));assert.ok(calls[1].filters.some(f=>f[0]==='gte'&&f[2]==='2025-10-20'));
 assert.ok(html.includes('Fonte selecionada: CRM'));assert.ok(html.includes('Comparativo: 2025-10-20 a 2025-10-21'));assert.ok(!html.includes('Importar planilha'));assert.ok(!html.includes('settings/'));
});

test('source links preserve current filters and switch explicitly without adding CRM and spreadsheet',async()=>{
 reset();rows=[fact({source:'spreadsheet',id:'sheet'})];
 let html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('Sem registros da fonte selecionada'));assert.ok(html.includes('source=spreadsheet'));assert.ok(html.includes('from=2026-10-20'));assert.ok(html.includes('compare=previous_year'));
 html=renderToStaticMarkup(await Page({...props(),searchParams:Promise.resolve({from:'2026-10-20',to:'2026-10-20',compare:'none',source:'spreadsheet'})}));assert.ok(html.includes('Fonte selecionada: Planilha'));assert.ok(!html.includes('Sem registros da fonte selecionada'));
});

test('denied tenant, disabled external setting and invalid source cannot query or render financial facts',async()=>{
 reset();denied=true;await assert.rejects(Page(props()),/access denied/);assert.deepEqual(events,['auth']);assert.equal(calls.length,0);
 reset();enabled=[];let html=renderToStaticMarkup(await Page(props()));assert.equal(calls.length,0);assert.ok(html.includes('indisponível nas configurações'));
 reset();html=renderToStaticMarkup(await Page({...props(),searchParams:Promise.resolve({source:'all'})}));assert.equal(calls.length,0);assert.ok(html.includes('Selecione uma fonte válida'));
});

test('source read failures and cross-tenant payloads redact data and never expose partial totals',async()=>{
 for(const sourceError of [true,false]){
  reset();readError=sourceError;corrupt=!sourceError;rows=[fact({id:'PRIVATE_OTHER',organization_id:'synthetic-other'})];
  const html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('role="alert"'));assert.ok(html.includes('Nenhum total parcial'));assert.ok(!html.includes('PRIVATE_OTHER'));assert.ok(!html.includes('Synthetic upstream'));assert.ok(!html.includes('Indicadores da fonte selecionada'));
 }
});

test('comparison none avoids the second query; empty report and own-only selector remain explicit',async()=>{
 reset();rows=[];const html=renderToStaticMarkup(await Page({...props(),searchParams:Promise.resolve({from:'2026-10-20',to:'2026-10-21',compare:'none'})}));assert.equal(calls.length,1);assert.ok(html.includes('Sem registros da fonte selecionada'));assert.ok(!html.includes('Comparativo:'));assert.ok(!calls.some(c=>c.table==='organizations'));
 reset();superAdmin=true;await Page(props());assert.deepEqual(calls.map(c=>c.table),['organizations','metrics_crm','metrics_crm']);
});
