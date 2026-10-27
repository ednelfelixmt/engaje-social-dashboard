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
 const builder={select(){return builder;},eq(key:string,value:unknown){call.filters.push(['eq',key,value]);return builder;},gte(key:string,value:unknown){call.filters.push(['gte',key,value]);return builder;},lte(key:string,value:unknown){call.filters.push(['lte',key,value]);return builder;},in(key:string,value:unknown){call.filters.push(['in',key,value]);return builder;},order(){return builder;},range(){return Promise.resolve(result());},then(resolve:(value:ReturnType<typeof result>)=>unknown){return Promise.resolve(result()).then(resolve);}};return builder;
}};
const session={tenant:async()=>{events.push('auth');if(denied)throw new Error('Synthetic access denied');return {db,org:scope,superAdmin};},dashboardConfig:async()=>{events.push('config');return {organization_id:configOrg,enabled_pages:enabled};}};
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(id,native)=>id==='server-only'?{}:id==='@/lib/auth/session'?session:native(id));
const {Filters}=loadTypescript<{Filters:React.ComponentType<Record<string,unknown>>}>(new URL('../src/components/dashboard/filters.tsx',import.meta.url),(id,native)=>id==='next/navigation'?{useRouter:()=>({push(){throw new Error('No navigation during SSR');}}),usePathname:()=>'/synthetic/reports/campaign',useSearchParams:()=>new URLSearchParams()}:native(id));
const {default:Page}=loadTypescript<{default:(props:{params:Promise<{organizationSlug:string;report:string}>;searchParams:Promise<Record<string,string>>})=>Promise<React.ReactElement>}>(new URL('../src/app/(tenant)/[organizationSlug]/reports/campaign/page.tsx',import.meta.url),(id,native)=>{
 if(id==='@/lib/auth/session')return session;if(id==='@/lib/metrics/query')return query;
 if(id==='@/components/dashboard/filters')return {Filters};
 if(id==='next/navigation')return {notFound(){throw new Error('Synthetic 404');}};
 if(id==='next/link')return ({children,href,...props}:{children?:React.ReactNode;href:string})=>React.createElement('a',{...props,href},children);
 return native(id);
});
const props=(report='meta-audience')=>({params:Promise.resolve({organizationSlug:'synthetic',report}),searchParams:Promise.resolve({from:'2026-10-20',to:'2026-10-21',currency:'BRL',compare:'previous_year',platform:'meta_ads',account:'act_123',campaign:'synthetic'})});
function reset(){calls=[];events=[];denied=false;superAdmin=false;readError=false;corrupt=false;configOrg=scope.id;enabled=['paid','overview'];rows=[fact()];}



test('campaign page authenticates before current/prior queries and applies every campaign-scope predicate',async()=>{
 reset();rows.push(fact({id:'second',metric_date:'2026-10-21'}),fact({id:'prior',metric_date:'2025-10-20'}));const html=renderToStaticMarkup(await Page(props()));assert.deepEqual(events.slice(0,2),['auth','config']);assert.deepEqual(calls.map(c=>c.table),['metrics_ads','metrics_ads']);
 for(const call of calls)for(const expected of [['eq','organization_id',scope.id],['eq','currency','BRL'],['eq','platform','meta_ads'],['eq','campaign_id','synthetic'],['in','account_id',['123','act_123']]])assert.ok(call.filters.some(row=>JSON.stringify(row)===JSON.stringify(expected)),JSON.stringify(expected));
 assert.ok(html.includes('Detalhamento de campanha'));assert.ok(html.includes('Imprimir / salvar PDF'));assert.ok(html.includes('Calendário completo'));assert.ok(html.includes('Comparativo: 2025-10-20 a 2025-10-21'));assert.ok(!html.includes('settings/'));
});

test('denied tenant, disabled setting, foreign configuration and missing selector cannot read campaign facts',async()=>{
 reset();denied=true;await assert.rejects(Page(props()),/access denied/);assert.deepEqual(events,['auth']);assert.equal(calls.length,0);
 reset();enabled=[];assert.ok(renderToStaticMarkup(await Page(props())).includes('indisponível nas configurações'));assert.equal(calls.length,0);
 reset();configOrg='other';assert.ok(renderToStaticMarkup(await Page(props())).includes('role="alert"'));assert.equal(calls.length,0);
 reset();await assert.rejects(Page({...props(),searchParams:Promise.resolve({})}),/404/);assert.equal(calls.length,0);
});

test('query failures and off-selection rows return a redacted error without print controls or partial values',async()=>{
 for(const patch of [{read:true},{account_id:'other'},{campaign_id:'other'},{organization_id:'other'}]){
  reset();readError='read' in patch;corrupt=!readError;rows=[fact({...patch,campaign_name:'PRIVATE_OFF_SCOPE'})];const html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('role="alert"'));assert.ok(html.includes('Nenhum valor parcial'));assert.ok(!html.includes('PRIVATE_OFF_SCOPE'));assert.ok(!html.includes('Synthetic upstream'));assert.ok(!html.includes('Imprimir / salvar PDF'));
 }
});

test('empty and none-comparison campaign report stays unavailable without a prior query',async()=>{
 reset();rows=[];const html=renderToStaticMarkup(await Page({...props(),searchParams:Promise.resolve({from:'2026-10-20',to:'2026-10-21',compare:'none',platform:'google_ads',account:'act_123',campaign:'synthetic'})}));assert.equal(calls.length,1);assert.ok(calls[0].filters.some(f=>f[0]==='eq'&&f[1]==='account_id'&&f[2]==='act_123'));assert.ok(html.includes('Sem registros desta campanha'));assert.ok(html.includes('disabled=""'));assert.ok(!html.includes('Comparativo:'));
});

test('only agency administrators load the organization catalog on campaign drill-down',async()=>{
 reset();await Page(props());assert.ok(!calls.some(c=>c.table==='organizations'));
 reset();superAdmin=true;await Page(props());assert.deepEqual(calls.map(c=>c.table),['organizations','metrics_ads','metrics_ads']);
});
