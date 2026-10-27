import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {InvalidReportFilters} from '../src/components/dashboard/invalid-report-filters';
import {campaignSelection} from '../src/lib/metrics/campaign-selection';
import {platformDashboardByRoute,platformDashboards} from '../src/lib/metrics/platforms';
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(id,native)=>id==='server-only'||id==='@/lib/auth/session'?{}:native(id));
test('explicit invalid dates never fall back to the current default period',()=>{
 const bad:unknown[]=['','invalid','2026-02-30','2026-02-29','2026-13-01','2026-1-1','20/10/2026','2026-10-20T00:00:00Z',' 2026-10-20',null,42,{},['2026-10-20'],['2026-10-20','2026-10-21']];
 for(const value of bad)for(const key of ['from','to'])assert.throws(()=>query.filters({from:'2026-10-20',to:'2026-10-21',[key]:value} as Record<string,string|undefined>,'America/Cuiaba','BRL'),/datas válidas/,key+': '+JSON.stringify(value));
});
test('absent endpoints keep tenant-local defaults and partially absent dates keep existing semantics',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'Date')!;const NativeDate=Date;const fixed=NativeDate.parse('2026-03-01T01:00:00Z');
 class ClockDate extends NativeDate{constructor(value?:string|number){super(value??fixed);}static now(){return fixed;}}
 Object.defineProperty(globalThis,'Date',{configurable:true,value:ClockDate});
 try{
  const defaults=query.filters({},'America/Cuiaba','BRL');assert.deepEqual(defaults,{from:'2026-01-30',to:'2026-02-28',currency:'BRL',compare:'previous_period'});
  assert.equal(query.filters({},'UTC','BRL').to,'2026-03-01');assert.equal(query.filters({from:undefined,to:undefined},'America/Cuiaba','BRL').from,defaults.from);
  assert.deepEqual(query.filters({from:'2026-02-01'},'America/Cuiaba','BRL'),{...defaults,from:'2026-02-01'});
  assert.deepEqual(query.filters({to:'2026-02-10'},'America/Cuiaba','BRL'),{...defaults,to:'2026-02-10'});
 }finally{Object.defineProperty(globalThis,'Date',original);}
});
test('valid explicit periods preserve leap days, selected comparison and currency without mutation',()=>{
 const search={from:'2024-02-29',to:'2024-03-01',compare:'previous_year',currency:'USD'};const before={...search};
 const result=query.filters(search,'America/Cuiaba','BRL');assert.deepEqual(result,search);assert.deepEqual(query.previous(result),{...result,from:'2023-02-28',to:'2023-03-01'});assert.deepEqual(search,before);
 assert.equal(query.filters({...search,compare:'none'},'America/Cuiaba','BRL').compare,'none');
 assert.throws(()=>query.filters({from:'2026-10-21',to:'2026-10-20'},'UTC','BRL'),/anteceder/);
 assert.throws(()=>query.filters({from:'2023-03-01',to:'2025-03-02'},'UTC','BRL'),/dois anos/);
});
test('date recovery is explicit and relative, preserving only known non-date scope without private or malformed inputs',()=>{
 const search={from:'PRIVATE_BAD_DATE',to:'',platform:'meta_ads',account:'act_123',campaign:'Campaign <script>synthetic</script>',source:'crm',currency:'BRL',compare:'previous_year',token:'PRIVATE_TOKEN',extra:'PRIVATE_OTHER'};
 const html=renderToStaticMarkup(React.createElement(InvalidReportFilters,{search}));assert.ok(html.includes('role="alert"'));assert.ok(html.includes('Restaurar período padrão'));assert.ok(html.includes('Nenhum relatório de outro período'));
 const href=html.match(/href="([^"]+)"/)![1].replaceAll('&amp;','&');assert.ok(href.startsWith('?'));const recovered=new URL(href,'https://example.invalid/synthetic/reports/campaign');assert.equal(recovered.pathname,'/synthetic/reports/campaign');
 for(const key of ['platform','account','campaign','source','currency','compare'] as const)assert.equal(recovered.searchParams.get(key),search[key]);
 for(const key of ['from','to','token','extra'])assert.equal(recovered.searchParams.has(key),false);
 for(const value of ['PRIVATE_BAD_DATE','PRIVATE_TOKEN','PRIVATE_OTHER','<script>'])assert.ok(!html.includes(value));
 const dropped=renderToStaticMarkup(React.createElement(InvalidReportFilters,{search:{platform:['meta_ads'],account:'x'.repeat(513),currency:null}}));assert.ok(dropped.includes('href="?"'));
});
const org={id:'10000000-0000-4000-8000-000000000001',name:'Synthetic',slug:'synthetic',timezone:'America/Cuiaba',currency:'BRL'};
const routes=['[section]/page.tsx','intelligence/page.tsx','reports/performance/page.tsx','reports/revenue/page.tsx','reports/targets/page.tsx','reports/campaign/page.tsx','reports/[report]/page.tsx'];
function route(path:string,denied=false){
 const events:string[]=[];const forbidden=()=>{events.push('private-read');throw new Error('Unexpected private read');};
 const unused=new Proxy({},{get:()=>()=>null});
 const session={tenant:async()=>{events.push('auth');if(denied)throw new Error('DENIED');return {org,db:{from:forbidden,storage:{from:forbidden}},superAdmin:true,user:{id:'synthetic-user'}};},dashboardConfig:async()=>{events.push('config');return {organization_id:org.id,enabled_pages:['paid','external','overview'],preferred_revenue_source:'crm'};}};
 const {default:Page}=loadTypescript<{default:(props:{params:Promise<{organizationSlug:string;section:string;report:string}>;searchParams:Promise<Record<string,unknown>>})=>Promise<React.ReactElement>}>(new URL('../src/app/(tenant)/[organizationSlug]/'+path,import.meta.url),(id,native)=>{
  if(id==='react'||id==='react/jsx-runtime')return native(id);
  if(id==='@/lib/auth/session')return session;
  if(id==='@/lib/metrics/query')return {...query,dashboardData:forbidden};
  if(id==='@/components/dashboard/invalid-report-filters')return {InvalidReportFilters};
  if(id==='@/components/ui/card')return native(id);
  if(id==='@/lib/metrics/campaign-selection')return {campaignSelection};
  if(id==='@/lib/metrics/platforms')return {platformDashboardByRoute,platformDashboards};
  if(id==='next/navigation')return {notFound(){throw new Error('NOT_FOUND');},redirect(){throw new Error('REDIRECT');}};
  return unused;
 });
 const props=(patch:Record<string,unknown>={})=>({params:Promise.resolve({organizationSlug:org.slug,section:'overview',report:'meta-audience'}),searchParams:Promise.resolve({from:'2026-10-20',to:'2026-10-21',platform:'meta_ads',account:'act_123',campaign:'synthetic',source:'crm',...patch})});
 return {Page,props,events};
}
test('all generic private routes explain an invalid period before facts, catalogs, branding or export controls',async()=>{
 for(const path of routes)for(const bad of [{from:'2026-02-30'},{to:''},{from:['2026-10-20','2026-10-21']},{from:'2026-10-22'}]){
  const r=route(path);const html=renderToStaticMarkup(await r.Page(r.props(bad)));assert.equal(r.events[0],'auth',path);assert.ok(!r.events.includes('private-read'),path);
  assert.ok(html.includes('Não foi possível validar o período'),path);assert.ok(html.includes('role="alert"'),path);
  for(const text of ['Exportar','Imprimir / salvar PDF','PRIVATE_','NaN'])assert.ok(!html.includes(text),path+text);
 }
});
test('date feedback never replaces the tenant authorization guard',async()=>{
 for(const path of routes){const r=route(path,true);await assert.rejects(r.Page(r.props({from:'invalid'})),/DENIED/);assert.deepEqual(r.events,['auth'],path);}
});
