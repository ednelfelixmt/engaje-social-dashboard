import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import type {OrganicAccountRecord} from '../src/lib/reports/organic-accounts';
const org={id:'10000000-0000-4000-8000-000000000001',name:'Synthetic organization',slug:'synthetic',timezone:'America/Cuiaba',currency:'BRL'};
let events:string[]=[],calls:{method:string;args:unknown[]}[]=[],denied=false,enabled=true,configOrg=org.id,queryError=false;
let rows:OrganicAccountRecord[]=[];
const record=():OrganicAccountRecord=>({id:'row-1',organization_id:org.id,platform:'instagram_organic',account_id:'synthetic-account',metric_date:'2026-10-20',source_period:'day',synced_at:'2026-10-21T00:00:00Z',impressions:0,reach:3,interactions:null,followers:100,website_clicks:2});
const db={from(table:string){
 events.push('query:'+table);
 const builder={
  select(...args:unknown[]){calls.push({method:'select',args});return builder;},
  eq(...args:unknown[]){calls.push({method:'eq',args});return builder;},
  in(...args:unknown[]){calls.push({method:'in',args});return builder;},
  gte(...args:unknown[]){calls.push({method:'gte',args});return builder;},
  lte(...args:unknown[]){calls.push({method:'lte',args});return builder;},
  order(...args:unknown[]){calls.push({method:'order',args});return builder;},
  range(...args:unknown[]){calls.push({method:'range',args});return Promise.resolve({data:rows,error:queryError?new Error('PRIVATE_ACCOUNT_SOURCE'):null});},
 };return builder;
}};
const session={tenant:async()=>{events.push('auth');if(denied)throw new Error('Synthetic denied');return {db,org,superAdmin:false};},
 dashboardConfig:async()=>{events.push('config');return {organization_id:configOrg,enabled_pages:enabled?['organic']:['paid']};}};
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(id,native)=>id==='server-only'?{}:id==='@/lib/auth/session'?session:native(id));
const accountQuery=loadTypescript<typeof import('../src/lib/reports/organic-accounts-query')>(new URL('../src/lib/reports/organic-accounts-query.ts',import.meta.url),(id,native)=>id==='server-only'?{}:native(id));
const {default:Page}=loadTypescript<{default:(props:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,string>>})=>Promise<React.ReactElement>}>(new URL('../src/app/(tenant)/[organizationSlug]/reports/organic-accounts/page.tsx',import.meta.url),(id,native)=>{
 if(id==='@/lib/auth/session')return session;if(id==='@/lib/metrics/query')return query;
 if(id==='@/lib/reports/organic-accounts-query')return accountQuery;return native(id);
});
function reset(){events=[];calls=[];denied=false;enabled=true;configOrg=org.id;queryError=false;rows=[record()];}
const props=(extra:Record<string,string>={})=>({params:Promise.resolve({organizationSlug:org.slug}),searchParams:Promise.resolve({from:'2026-10-20',to:'2026-10-22',...extra})});
test('account route gates tenant/config then queries only allowed scoped stored-day records and bounded fields',async()=>{
 reset();const html=renderToStaticMarkup(await Page(props()));
 assert.deepEqual(events,['auth','config','query:metrics_organic_accounts']);
 for(const call of [{method:'eq',args:['organization_id',org.id]},{method:'eq',args:['source_period','day']},
  {method:'in',args:['platform',['facebook_organic','instagram_organic']]},{method:'gte',args:['metric_date','2026-10-20']},
  {method:'lte',args:['metric_date','2026-10-22']},{method:'range',args:[0,500]}]){
  assert.ok(calls.some(actual=>JSON.stringify(actual)===JSON.stringify(call)),JSON.stringify(call));
 }
 assert.equal(calls.filter(call=>call.method==='order').length,4);
 const selected=calls.find(call=>call.method==='select')!.args[0] as string;
 assert.ok(!selected.includes('*'));assert.ok(!selected.split(',').includes('follows'));assert.ok(!selected.split(',').includes('unfollows'));
 for(const text of ['Janela original de medição não confirmada','Data registrada','Seguidores recebidos (estoque)','Exportar contas CSV','não comprova atividade diária','fuso'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('name="currency"'));assert.ok(!html.includes('name="compare"'));
 assert.ok(html.includes('/synthetic/reports/organic-content?from=2026-10-20'));assert.ok(!html.includes('settings/'));
});
test('account route rejects denied users, foreign config, disabled organic and explicit invalid dates before records',async()=>{
 reset();denied=true;await assert.rejects(Page(props()),/denied/);assert.deepEqual(events,['auth']);
 for(const bad of ['config','disabled','provider','date','empty']){
  reset();if(bad==='config')configOrg='foreign';if(bad==='disabled')enabled=false;
  const html=renderToStaticMarkup(await Page(props(bad==='provider'?{platform:'meta_ads'}:bad==='date'?{from:'2026-02-30'}:bad==='empty'?{to:''}:{})));
  assert.ok(!events.includes('query:metrics_organic_accounts'));assert.ok(!html.includes('Exportar contas CSV'));assert.ok(!html.includes('Imprimir / salvar PDF'));
 }
});
test('account source and grain failures cannot render partial records or export source diagnostics',async()=>{
 for(const bad of ['upstream','tenant','period','date']){
  reset();if(bad==='upstream')queryError=true;
  else rows=[{...record(),account_id:'PRIVATE_ACCOUNT_ID',...(bad==='tenant'?{organization_id:'foreign'}:bad==='period'?{source_period:'week'}:{metric_date:'2026-10-23'})}];
  const html=renderToStaticMarkup(await Page(props()));
  assert.ok(html.includes('Nenhum relatório ou CSV parcial'));assert.ok(!html.includes('Exportar contas CSV'));assert.ok(!html.includes('Imprimir / salvar PDF'));
  assert.ok(!html.includes('PRIVATE_ACCOUNT_SOURCE'));assert.ok(!html.includes('PRIVATE_ACCOUNT_ID'));
 }
});
test('account filters preserve platform selection and missing dates stay absent instead of zero-filled rows',async()=>{
 reset();const html=renderToStaticMarkup(await Page(props({platform:'instagram_organic',currency:'USD',compare:'previous_year'})));
 assert.equal(events.filter(event=>event.startsWith('query:')).length,1);
 assert.ok(calls.some(call=>call.method==='in'&&JSON.stringify(call.args)===JSON.stringify(['platform',['instagram_organic']])));
 assert.ok(html.includes('2 datas sem registro exibido'));assert.ok(html.includes('2026-10-21, 2026-10-22'));
 reset();rows=[];const empty=renderToStaticMarkup(await Page(props()));
 assert.ok(empty.includes('Nenhum registro com rótulo diário'));assert.ok(!empty.includes('<table'));assert.match(empty,/<button type="button" disabled=""/);
});
