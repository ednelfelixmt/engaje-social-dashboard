import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {scope,fact,steps} from './helpers/funnel-report-fixture';
import type {Row} from '../src/types/database.types';
type Call={table:string;filters:[string,string,unknown][]};
let calls:Call[]=[],events:string[]=[],denied=false,enabled=['funnel','paid'],configOrganization=scope.organizationId,readError=false,corrupt=false;
let rows:Row<'metrics_ads'>[]=[];
const db={from(table:string){const call:Call={table,filters:[]};calls.push(call);events.push('read:'+table);
 const result=()=>({data:corrupt?rows:rows.filter(row=>call.filters.every(([op,key,value])=>op==='gte'?row.metric_date>=String(value):op==='lte'?row.metric_date<=String(value):row[key as keyof typeof row]===value)),error:readError?new Error('PRIVATE_UPSTREAM'):null});
 const builder={select(){return builder;},eq(key:string,value:unknown){call.filters.push(['eq',key,value]);return builder;},gte(key:string,value:unknown){call.filters.push(['gte',key,value]);return builder;},lte(key:string,value:unknown){call.filters.push(['lte',key,value]);return builder;},order(){return builder;},range(){return Promise.resolve(result());}};return builder;
}};
const session={tenant:async()=>{events.push('auth');if(denied)throw new Error('Denied');return {db,org:{id:scope.organizationId,name:scope.organizationName,slug:scope.organizationSlug,timezone:scope.timezone,currency:scope.currency},superAdmin:false};},dashboardConfig:async()=>{events.push('config');return {organization_id:configOrganization,enabled_pages:enabled,funnel_steps:steps};}};
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(id,native)=>id==='server-only'?{}:id==='@/lib/auth/session'?session:native(id));
const {Filters}=loadTypescript<typeof import('../src/components/dashboard/filters')>(new URL('../src/components/dashboard/filters.tsx',import.meta.url),(id,native)=>id==='next/navigation'?{useRouter:()=>({push(){throw new Error('No SSR navigation');}}),usePathname:()=>'/synthetic-fixture/reports/funnel',useSearchParams:()=>new URLSearchParams()}:native(id));
const link=({children,href,...props}:{children?:React.ReactNode;href:string})=>React.createElement('a',{...props,href},children);
function resolve(id:string,native:(id:string)=>unknown):unknown {if(id==='@/lib/auth/session')return session;if(id==='@/lib/metrics/query')return query;if(id==='@/components/dashboard/filters')return {Filters};if(id==='next/link')return link;return native(id);}
type Page=(props:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,string>>})=>Promise<React.ReactElement>;
const {default:FunnelPage}=loadTypescript<{default:Page}>(new URL('../src/app/(tenant)/[organizationSlug]/reports/funnel/page.tsx',import.meta.url),resolve);
const {default:CenterPage}=loadTypescript<{default:Page}>(new URL('../src/app/(tenant)/[organizationSlug]/reports/page.tsx',import.meta.url),resolve);
const props=(search:Record<string,string>={})=>({params:Promise.resolve({organizationSlug:scope.organizationSlug}),searchParams:Promise.resolve({from:scope.from,to:scope.to,currency:scope.currency,compare:scope.compare,...search})});
function reset(){calls=[];events=[];denied=false;enabled=['funnel','paid'];configOrganization=scope.organizationId;readError=false;corrupt=false;rows=[fact(),fact({id:'prior',metric_date:'2026-10-18'})];}
test('funnel authenticates and checks organization config before reading only scoped paid facts for both periods',async()=>{
 reset();const html=renderToStaticMarkup(await FunnelPage(props({platform:'meta_ads'})));assert.deepEqual(events.slice(0,2),['auth','config']);assert.deepEqual(calls.map(c=>c.table),['metrics_ads','metrics_ads']);
 for(const c of calls)for(const expected of [['eq','organization_id',scope.organizationId],['eq','currency','BRL'],['eq','platform','meta_ads']])assert.ok(c.filters.some(f=>JSON.stringify(f)===JSON.stringify(expected)));
 assert.ok(calls[0].filters.some(f=>f[0]==='gte'&&f[2]==='2026-10-20'));assert.ok(calls[1].filters.some(f=>f[0]==='gte'&&f[2]==='2026-10-18'));assert.ok(html.includes('Relatório de funil'));assert.ok(html.includes('Exportar CSV'));assert.ok(html.includes('Imprimir / salvar PDF'));assert.ok(!html.includes('/settings/'));
});
test('access, configuration, invalid date and unknown platform failures never read facts',async()=>{
 for(const Page of [FunnelPage,CenterPage]){reset();denied=true;await assert.rejects(Page(props()),/Denied/);assert.deepEqual(events,['auth']);assert.equal(calls.length,0);reset();configOrganization='foreign';const html=renderToStaticMarkup(await Page(props()));assert.equal(calls.length,0);assert.ok(html.includes('role="alert"'));assert.ok(!html.includes('Exportar CSV'));}
 reset();enabled=['paid'];assert.ok(renderToStaticMarkup(await FunnelPage(props())).includes('indisponível nas configurações'));assert.equal(calls.length,0);
 for(const search of [{from:'2026-02-30'},{from:'2027-01-01'},{platform:'other'}]){reset();const html=renderToStaticMarkup(await FunnelPage(props(search)));assert.equal(calls.length,0);assert.ok(!html.includes('Exportar CSV'));if(search.platform){assert.ok(html.includes('Plataforma inválida'));assert.ok(html.includes('Ver todas as plataformas'));assert.ok(!html.includes('platform=other'));}}
});
test('corrupt tenant, currency, dates, selected platform or raw source failures yield no partial documents',async()=>{
 for(const patch of [{organization_id:'foreign'},{currency:'USD'},{metric_date:'2026-11-20'},{platform:'google_ads'},{campaign_id:' '},{account_id:'act_act_123'},null]){
  reset();corrupt=true;readError=patch===null;rows=[fact({...patch,campaign_name:'PRIVATE_CAMPAIGN'})];const html=renderToStaticMarkup(await FunnelPage(props({compare:'none',platform:'meta_ads'})));assert.ok(html.includes('Nenhum total parcial'));assert.ok(html.includes('role="alert"'));assert.ok(!html.includes('PRIVATE_'));assert.ok(!html.includes('Exportar CSV'));assert.ok(!html.includes('Imprimir / salvar PDF'));
 }
});
test('comparison none makes one paid read; empty data remains unavailable with disabled exports',async()=>{
 reset();rows=[];const html=renderToStaticMarkup(await FunnelPage(props({compare:'none'})));assert.equal(calls.length,1);assert.ok(html.includes('Sem registros'));assert.ok(html.includes('disabled=""'));assert.ok(!html.includes('Comparativo:'));
});
test('center authenticates and presents permitted reports without facts or administrative reads',async()=>{
 reset();const html=renderToStaticMarkup(await CenterPage(props()));assert.deepEqual(events,['auth','config']);assert.equal(calls.length,0);assert.ok(html.includes('Central de relatórios'));assert.ok(html.includes('/reports/funnel?'));assert.ok(!html.includes('/reports/organic-content?'));assert.ok(!html.includes('/admin'));
 reset();const invalid=renderToStaticMarkup(await CenterPage(props({to:'invalid'})));assert.equal(calls.length,0);assert.ok(!invalid.includes('/reports/funnel?'));
});
