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
let readError=false, corrupt=false;
const fact=(patch:Partial<Row<'metrics_ads'>>={})=>({id:'synthetic-fact',organization_id:scope.id,platform:'meta_ads',account_id:'act_123',campaign_id:'synthetic',campaign_name:'Synthetic campaign',ad_id:'synthetic-ad',metric_date:'2026-10-20',currency:'BRL',spend:100,impressions:1000,clicks:20,leads:5,attribution_window:'7d_click',...patch} as Row<'metrics_ads'>);
const db={from(table:string){const call:Call={table,filters:[]};calls.push(call);events.push('read:'+table);
 const result=()=>({data:table==='organizations'?[{name:scope.name,slug:scope.slug}]:corrupt?rows:rows.filter(row=>call.filters.every(([op,_key,value])=>op==='gte'?row.metric_date>=String(value):op==='lte'?row.metric_date<=String(value):true)),error:readError&&table==='metrics_ads'?new Error('Synthetic upstream private detail'):null});
 const builder={select(){return builder;},eq(key:string,value:unknown){call.filters.push(['eq',key,value]);return builder;},gte(key:string,value:unknown){call.filters.push(['gte',key,value]);return builder;},lte(key:string,value:unknown){call.filters.push(['lte',key,value]);return builder;},order(){return builder;},range(){return Promise.resolve(result());},then(resolve:(value:ReturnType<typeof result>)=>unknown){return Promise.resolve(result()).then(resolve);}};return builder;
}};
const session={tenant:async()=>{events.push('auth');if(denied)throw new Error('Synthetic access denied');return {db,org:scope,superAdmin};},dashboardConfig:async()=>{events.push('config');return {enabled_pages:enabled};}};
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(id,native)=>id==='server-only'?{}:id==='@/lib/auth/session'?session:native(id));
const {Filters}=loadTypescript<{Filters:React.ComponentType<Record<string,unknown>>}>(new URL('../src/components/dashboard/filters.tsx',import.meta.url),(id,native)=>id==='next/navigation'?{useRouter:()=>({push(){throw new Error('No navigation during SSR');}}),usePathname:()=>'/synthetic/reports/performance',useSearchParams:()=>new URLSearchParams()}:native(id));
const {default:Page}=loadTypescript<{default:(props:{params:Promise<{organizationSlug:string;report:string}>;searchParams:Promise<Record<string,string>>})=>Promise<React.ReactElement>}>(new URL('../src/app/(tenant)/[organizationSlug]/reports/performance/page.tsx',import.meta.url),(id,native)=>{
 if(id==='@/lib/auth/session')return session;if(id==='@/lib/metrics/query')return query;
 if(id==='@/components/dashboard/filters')return {Filters};
 if(id==='next/navigation')return {notFound(){throw new Error('Synthetic 404');}};
 if(id==='next/link')return ({children,href,...props}:{children?:React.ReactNode;href:string})=>React.createElement('a',{...props,href},children);
 return native(id);
});
const props=(report='meta-audience')=>({params:Promise.resolve({organizationSlug:'synthetic',report}),searchParams:Promise.resolve({from:'2026-10-20',to:'2026-10-21',currency:'BRL',compare:'previous_year'})});
function reset(){calls=[];events=[];denied=false;superAdmin=false;readError=false;corrupt=false;enabled=['paid','overview'];rows=[fact()];}


test('executive route authenticates, checks config and queries only tenant/currency ads for both real periods',async()=>{
 reset();rows.push(fact({id:'synthetic-prior',metric_date:'2025-10-20'}));
 const html=renderToStaticMarkup(await Page(props()));
 assert.deepEqual(events.slice(0,2),['auth','config']);assert.deepEqual(calls.map(call=>call.table),['metrics_ads','metrics_ads']);
 for(const call of calls)for(const expected of [['eq','organization_id',scope.id],['eq','currency','BRL']]) assert.ok(call.filters.some(row=>JSON.stringify(row)===JSON.stringify(expected)));
 assert.ok(calls[0].filters.some(row=>row[0]==='gte'&&row[2]==='2026-10-20'));
 assert.ok(calls[1].filters.some(row=>row[0]==='gte'&&row[2]==='2025-10-20'));
 assert.ok(html.includes('Relatório executivo'));assert.ok(html.includes('Imprimir / salvar PDF'));assert.ok(html.includes('Exportar CSV'));assert.ok(html.includes('Comparativo: 2025-10-20 a 2025-10-21'));
 assert.ok(!html.includes('Gerenciar'));assert.ok(!html.includes('settings/'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
});

test('denied tenant and disabled paid page never read facts or expose print controls',async()=>{
 reset();denied=true;await assert.rejects(Page(props()),/access denied/);assert.deepEqual(events,['auth']);assert.equal(calls.length,0);
 reset();enabled=[];const html=renderToStaticMarkup(await Page(props()));assert.equal(calls.length,0);assert.ok(html.includes('indisponível nas configurações'));assert.ok(!html.includes('Imprimir / salvar PDF'));assert.ok(!html.includes('Exportar CSV'));
});

test('source failures and cross-tenant facts fail closed without upstream details or partial print',async()=>{
 for(const sourceError of [true,false]){
  reset();readError=sourceError;corrupt=!sourceError;rows=[fact({organization_id:'synthetic-other',campaign_name:'PRIVATE_OTHER'})];
  const html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('role="alert"'));assert.ok(html.includes('Nenhum total parcial'));assert.ok(!html.includes('PRIVATE_OTHER'));assert.ok(!html.includes('Synthetic upstream'));assert.ok(!html.includes('Imprimir / salvar PDF'));assert.ok(!html.includes('Exportar CSV'));
 }
});

test('comparison none reads only the current range and empty facts preserve unavailable totals',async()=>{
 reset();rows=[];const input={...props(),searchParams:Promise.resolve({from:'2026-10-20',to:'2026-10-21',currency:'BRL',compare:'none'})};
 const html=renderToStaticMarkup(await Page(input));assert.equal(calls.length,1);assert.ok(html.includes('Sem registros de mídia paga'));assert.ok(html.includes('disabled=""'));assert.ok(!html.includes('Comparativo:'));
});

test('only agency administrators load the organization switcher catalog',async()=>{
 reset();superAdmin=true;await Page(props());assert.deepEqual(calls.map(call=>call.table),['organizations','metrics_ads','metrics_ads']);
});
