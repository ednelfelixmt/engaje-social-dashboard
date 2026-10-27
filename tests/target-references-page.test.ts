import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import type {Row} from '../src/types/database.types';

type Call={table:string;filters:[string,string,unknown][]};
const scope={id:'11111111-1111-4111-8111-111111111111',name:'Synthetic organization',slug:'synthetic',timezone:'America/Cuiaba',currency:'BRL'};
let calls:Call[]=[],events:string[]=[],denied=false,superAdmin=false,enabled=['paid','overview'];
let rows:Row<'metrics_ads'>[]=[];
let readError=false, corrupt=false,configOrg=scope.id;
const fact=(patch:Partial<Row<'metrics_ads'>>={})=>({id:'synthetic-fact',organization_id:scope.id,platform:'meta_ads',account_id:'act_123',campaign_id:'synthetic',campaign_name:'Synthetic campaign',ad_id:'synthetic-ad',metric_date:'2026-10-20',currency:'BRL',spend:100,impressions:1000,clicks:20,leads:5,attribution_window:'7d_click',...patch} as Row<'metrics_ads'>);
const db={from(table:string){const call:Call={table,filters:[]};calls.push(call);events.push('read:'+table);
 const result=()=>({data:table==='organizations'?[{name:scope.name,slug:scope.slug}]:corrupt?rows:rows.filter(row=>call.filters.every(([op,_key,value])=>op==='gte'?row.metric_date>=String(value):op==='lte'?row.metric_date<=String(value):true)),error:readError&&table==='metrics_ads'?new Error('Synthetic upstream private detail'):null});
 const builder={select(){return builder;},eq(key:string,value:unknown){call.filters.push(['eq',key,value]);return builder;},gte(key:string,value:unknown){call.filters.push(['gte',key,value]);return builder;},lte(key:string,value:unknown){call.filters.push(['lte',key,value]);return builder;},order(){return builder;},range(){return Promise.resolve(result());},then(resolve:(value:ReturnType<typeof result>)=>unknown){return Promise.resolve(result()).then(resolve);}};return builder;
}};
const session={tenant:async()=>{events.push('auth');if(denied)throw new Error('Synthetic access denied');return {db,org:scope,superAdmin};},dashboardConfig:async()=>{events.push('config');return {organization_id:configOrg,enabled_pages:enabled,target_spend:200,target_leads:10,target_cpl:20,target_ctr:2};}};
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(id,native)=>id==='server-only'?{}:id==='@/lib/auth/session'?session:native(id));
const {Filters}=loadTypescript<{Filters:React.ComponentType<Record<string,unknown>>}>(new URL('../src/components/dashboard/filters.tsx',import.meta.url),(id,native)=>id==='next/navigation'?{useRouter:()=>({push(){throw new Error('No navigation during SSR');}}),usePathname:()=>'/synthetic/reports/targets',useSearchParams:()=>new URLSearchParams()}:native(id));
const {default:Page}=loadTypescript<{default:(props:{params:Promise<{organizationSlug:string;report:string}>;searchParams:Promise<Record<string,string>>})=>Promise<React.ReactElement>}>(new URL('../src/app/(tenant)/[organizationSlug]/reports/targets/page.tsx',import.meta.url),(id,native)=>{
 if(id==='@/lib/auth/session')return session;if(id==='@/lib/metrics/query')return query;
 if(id==='@/components/dashboard/filters')return {Filters};
 if(id==='next/navigation')return {notFound(){throw new Error('Synthetic 404');}};
 if(id==='next/link')return ({children,href,...props}:{children?:React.ReactNode;href:string})=>React.createElement('a',{...props,href},children);
 return native(id);
});
const props=(report='meta-audience')=>({params:Promise.resolve({organizationSlug:'synthetic',report}),searchParams:Promise.resolve({from:'2026-10-20',to:'2026-10-21',currency:'BRL',compare:'previous_year'})});
function reset(){calls=[];events=[];denied=false;superAdmin=false;readError=false;corrupt=false;configOrg=scope.id;enabled=['paid','overview'];rows=[fact()];}



test('reference page authenticates and checks config before querying only its tenant currency and current dates',async()=>{
 reset();rows.push(fact({id:'second-day',metric_date:'2026-10-21'}));const html=renderToStaticMarkup(await Page(props()));
 assert.deepEqual(events.slice(0,2),['auth','config']);assert.deepEqual(calls.map(c=>c.table),['metrics_ads']);
 for(const expected of [['eq','organization_id',scope.id],['eq','currency','BRL'],['gte','metric_date','2026-10-20'],['lte','metric_date','2026-10-21']])assert.ok(calls[0].filters.some(f=>JSON.stringify(f)===JSON.stringify(expected)));
 assert.ok(html.includes('Referências de desempenho'));assert.ok(html.includes('não possuem vigência definida'));assert.ok(html.includes('Exportar referências CSV'));assert.ok(!html.includes('aria-label="Comparação"'));assert.ok(!html.includes('Comparação aplicada'));assert.ok(!html.includes('Configurar referências'));assert.ok(!html.includes('settings/'));
});

test('denied viewer, disabled paid setting and cross-organization config never reach metric queries',async()=>{
 reset();denied=true;await assert.rejects(Page(props()),/access denied/);assert.deepEqual(events,['auth']);assert.equal(calls.length,0);
 reset();enabled=[];let html=renderToStaticMarkup(await Page(props()));assert.equal(calls.length,0);assert.ok(html.includes('indisponível nas configurações'));
 reset();configOrg='synthetic-other';html=renderToStaticMarkup(await Page(props()));assert.equal(calls.length,0);assert.ok(html.includes('role="alert"'));assert.ok(!html.includes('Valores e referências'));
});

test('source errors and cross-tenant facts cannot expose partial comparisons or upstream diagnostics',async()=>{
 for(const sourceError of [true,false]){
  reset();readError=sourceError;corrupt=!sourceError;rows=[fact({organization_id:'synthetic-other',campaign_name:'PRIVATE_OTHER'})];
  const html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('role="alert"'));assert.ok(html.includes('Nenhuma comparação parcial'));assert.ok(!html.includes('PRIVATE_OTHER'));assert.ok(!html.includes('Synthetic upstream'));assert.ok(!html.includes('Valores e referências'));assert.ok(!html.includes('Exportar referências CSV'));
 }
});

test('currency filters preserve separate actual/reference units and do not create a second-period query',async()=>{
 reset();rows=[fact({currency:'USD'}),fact({id:'second',metric_date:'2026-10-21',currency:'USD'})];
 const html=renderToStaticMarkup(await Page({...props(),searchParams:Promise.resolve({from:'2026-10-20',to:'2026-10-21',currency:'USD',compare:'previous_period'})}));
 assert.equal(calls.length,1);assert.ok(calls[0].filters.some(f=>f[0]==='eq'&&f[1]==='currency'&&f[2]==='USD'));assert.ok(html.includes('Moeda filtrada: USD'));assert.ok(html.includes('Moeda cadastral das referências: BRL'));assert.ok(html.includes('Moeda não comparável'));
});

test('only agency administrators receive the edit link and organization catalog; empty facts stay unknown',async()=>{
 reset();rows=[];let html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('Dados insuficientes'));assert.ok(html.includes('0 registros de anúncios'));assert.ok(!html.includes('Configurar referências'));assert.deepEqual(calls.map(c=>c.table),['metrics_ads']);
 reset();superAdmin=true;html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('Configurar referências'));assert.ok(html.includes('/synthetic/settings/dashboard'));assert.deepEqual(calls.map(c=>c.table),['organizations','metrics_ads']);
});
