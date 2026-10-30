import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {fact} from './helpers/analytics-fixture';
import type {AgencyOverviewProps} from '../src/components/agency/agency-overview';
const id='11111111-1111-4111-8111-111111111111',paused='22222222-2222-4222-8222-222222222222';
type Call={table:string;filters:[string,string,unknown][]};
let calls:Call[]=[],events:string[]=[],denied=false,captured:AgencyOverviewProps|undefined;
let sources:Record<string,Record<string,unknown>[]>={};
const db={from(table:string){const call:Call={table,filters:[]};calls.push(call);events.push(table);const result=()=>({data:(sources[table]??[]).filter(row=>call.filters.every(([op,key,value])=>op==='gte'?String(row[key])>=String(value):op==='lte'?String(row[key])<=String(value):row[key]===value)),error:null});const builder={select(){return builder;},eq(key:string,value:unknown){call.filters.push(['eq',key,value]);return builder;},gte(key:string,value:unknown){call.filters.push(['gte',key,value]);return builder;},lte(key:string,value:unknown){call.filters.push(['lte',key,value]);return builder;},order(){return builder;},range(){return Promise.resolve(result());},then(resolve:(value:unknown)=>unknown){return Promise.resolve(result()).then(resolve);}};return builder;}};
const session={requireAdmin:async()=>{events.push('auth');if(denied)throw new Error('Denied');return{db};}};
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(name,native)=>name==='server-only'?{}:name==='@/lib/auth/session'?session:native(name));
const {AgencyOverview}=loadTypescript<typeof import('../src/components/agency/agency-overview')>(new URL('../src/components/agency/agency-overview.tsx',import.meta.url),(name,native)=>name==='@/components/dashboard/display-mode-controller'?{DisplayModeController:()=>React.createElement('button',null,'Modo TV')}:native(name));
const {default:Page}=loadTypescript<{default:(props:{searchParams:Promise<Record<string,string>>})=>Promise<React.ReactElement>}>(new URL('../src/app/(agency)/admin/page.tsx',import.meta.url),(name,native)=>name==='@/lib/auth/session'?session:name==='@/lib/metrics/query'?query:name==='@/components/agency/agency-overview'?{AgencyOverview:(props:AgencyOverviewProps)=>{captured=props;return React.createElement(AgencyOverview,props);}}:native(name));
const props=(search:Record<string,string>={})=>({searchParams:Promise.resolve({from:'2026-10-01',to:'2026-10-20',...search})});
function reset(){calls=[];events=[];denied=false;captured=undefined;sources={organizations:[{id,name:'Aurora sintética',slug:'aurora-sintetica',is_agency:false,status:'active',currency:'BRL',timezone:'America/Cuiaba'}],integrations:[],branding:[],metrics_ads:[]};}

test('agency authenticates before current/comparative queries and empty sources cannot fabricate analytical volume',async()=>{
 reset();const html=renderToStaticMarkup(await Page(props()));assert.equal(events[0],'auth');assert.equal(calls.length,5);const ads=calls.filter(call=>call.table==='metrics_ads');assert.deepEqual(ads[0].filters,[['gte','metric_date','2026-10-01'],['lte','metric_date','2026-10-20']]);assert.deepEqual(ads[1].filters,[['gte','metric_date','2026-09-11'],['lte','metric_date','2026-09-30']]);
 assert.ok(calls.find(call=>call.table==='organizations')?.filters.some(f=>f[1]==='is_agency'&&f[2]===false));assert.ok(calls.find(call=>call.table==='integrations')?.filters.some(f=>f[1]==='is_enabled'&&f[2]===true));assert.ok(html.includes('Aurora sintética'));assert.ok(html.includes('Sem registros de mídia'));assert.ok(html.includes('Sem medições diárias válidas'));assert.ok(!html.includes('R$'));assert.ok(html.includes('data-agency-workbench'));assert.ok(html.includes('Modo TV'));
});
test('agency denial and malformed, reversed, repeated or excessive dates never execute data reads',async()=>{
 reset();denied=true;await assert.rejects(Page(props()),/Denied/);assert.deepEqual(events,['auth']);assert.equal(calls.length,0);
 for(const from of ['2026-02-30','2027-01-01','2020-01-01',['2026-10-01','2026-10-02'] as unknown as string]){reset();const html=renderToStaticMarkup(await Page(props({from})));assert.ok(html.includes('Período inválido'));assert.equal(calls.length,0);assert.deepEqual(events,['auth']);}
});
test('paused tenants stay outside both analytical periods and invalid active sources produce no partial workbench',async()=>{
 reset();sources.organizations.push({...sources.organizations[0],id:paused,name:'PAUSED_PRIVATE_FIXTURE',slug:'paused-fixture',status:'paused'});sources.metrics_ads=[fact({organization_id:id,metric_date:'2026-10-01',spend:100}),fact({id:'paused',organization_id:paused,metric_date:'2026-10-01',spend:999})];const html=renderToStaticMarkup(await Page(props({compare:'none'})));assert.equal(calls.length,4);assert.ok(!html.includes('PAUSED_PRIVATE_FIXTURE'));assert.equal(captured?.intelligence?.datasets.length,1);assert.equal(captured?.intelligence?.datasets[0].current[0].spend,100);
 reset();sources.metrics_ads=[fact({organization_id:id,metric_date:'2026-10-01',currency:'USD'})];const invalid=renderToStaticMarkup(await Page(props()));assert.ok(invalid.includes('Nenhum painel analítico parcial'));assert.ok(!invalid.includes('data-agency-workbench'));
});
