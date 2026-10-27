import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import type {OrganicContentRecord} from '../src/lib/reports/organic-content';

const org={id:'10000000-0000-4000-8000-000000000001',name:'Synthetic organization',slug:'synthetic',timezone:'America/Cuiaba',currency:'BRL'};
let events:string[]=[],calls:{method:string;args:unknown[]}[]=[],denied=false,enabled=true,configOrg=org.id,queryError=false;
let rows:OrganicContentRecord[]=[];
const fact=():OrganicContentRecord=>({id:'post-1',organization_id:org.id,platform:'instagram_organic',account_id:'synthetic',external_id:'external-1',kind:'image',caption:'Synthetic <script>caption</script>',name:null,published_at:'2026-10-20T00:00:00Z',synced_at:'2026-10-21T00:00:00Z',lifetime_metrics:{likes:0,comments:3}});
const db={from(table:string){
 events.push('query:'+table);
 const builder={
  select(...args:unknown[]){calls.push({method:'select',args});return builder;},
  eq(...args:unknown[]){calls.push({method:'eq',args});return builder;},
  in(...args:unknown[]){calls.push({method:'in',args});return builder;},
  gte(...args:unknown[]){calls.push({method:'gte',args});return builder;},
  lt(...args:unknown[]){calls.push({method:'lt',args});return builder;},
  order(...args:unknown[]){calls.push({method:'order',args});return builder;},
  range(...args:unknown[]){calls.push({method:'range',args});return Promise.resolve({data:rows,error:queryError?new Error('PRIVATE_UPSTREAM_DETAIL'):null});},
 };return builder;
}};
const session={
 tenant:async()=>{events.push('auth');if(denied)throw new Error('Synthetic denied');return {db,org,superAdmin:false};},
 dashboardConfig:async()=>{events.push('config');return {organization_id:configOrg,enabled_pages:enabled?['organic']:['paid']};},
};
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(id,native)=>id==='server-only'?{}:id==='@/lib/auth/session'?session:native(id));
const organicQuery=loadTypescript<typeof import('../src/lib/reports/organic-content-query')>(new URL('../src/lib/reports/organic-content-query.ts',import.meta.url),(id,native)=>id==='server-only'?{}:native(id));
const {default:Page}=loadTypescript<{default:(props:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,string>>})=>Promise<React.ReactElement>}>(new URL('../src/app/(tenant)/[organizationSlug]/reports/organic-content/page.tsx',import.meta.url),(id,native)=>{
 if(id==='@/lib/auth/session')return session;
 if(id==='@/lib/metrics/query')return query;
 if(id==='@/lib/reports/organic-content-query')return organicQuery;
 return native(id);
});
function reset(){events=[];calls=[];denied=false;enabled=true;configOrg=org.id;queryError=false;rows=[fact()];}
const props=(extra:Record<string,string>={})=>({params:Promise.resolve({organizationSlug:org.slug}),searchParams:Promise.resolve({from:'2026-10-20',to:'2026-10-21',...extra})});
test('organic page authenticates and gates config before one session-scoped bounded UTC content query',async()=>{
 reset();const html=renderToStaticMarkup(await Page(props()));
 assert.deepEqual(events,['auth','config','query:creatives']);
 for(const call of [
  {method:'eq',args:['organization_id',org.id]},
  {method:'in',args:['platform',['facebook_organic','instagram_organic']]},
  {method:'gte',args:['published_at','2026-10-20T00:00:00.000Z']},
  {method:'lt',args:['published_at','2026-10-22T00:00:00.000Z']},
  {method:'range',args:[0,500]},
 ])assert.ok(calls.some(actual=>JSON.stringify(actual)===JSON.stringify(call)),JSON.stringify(call));
 assert.equal(calls.filter(call=>call.method==='order').length,2);
 const selected=calls.find(call=>call.method==='select')!.args[0] as string;
 assert.ok(!selected.includes('*'));assert.ok(!selected.includes('media_url'));assert.ok(!selected.includes('permalink'));
 for(const text of ['Exportar conteúdos CSV','coleta por conteúdo','por data UTC','contadores acumulados','pessoas únicas','Curtidas / reações','&lt;script&gt;caption&lt;/script&gt;'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('<script>caption'));assert.ok(!html.includes('name="currency"'));assert.ok(!html.includes('name="compare"'));assert.ok(!html.includes('settings/'));
});
test('organic report denies unauthorized viewers, wrong config, disabled organic and invalid filters before facts',async()=>{
 reset();denied=true;await assert.rejects(Page(props()),/denied/);assert.deepEqual(events,['auth']);
 for(const bad of ['config','disabled','platform','dates']){
  reset();if(bad==='config')configOrg='foreign';if(bad==='disabled')enabled=false;
  const html=renderToStaticMarkup(await Page(props(bad==='platform'?{platform:'meta_ads'}:bad==='dates'?{from:'2026-10-22'}:{})));
  assert.ok(!events.includes('query:creatives'));assert.ok(!html.includes('Exportar conteúdos CSV'));assert.ok(!html.includes('Imprimir / salvar PDF'));assert.ok(!html.includes('Synthetic &lt;script&gt;'));
 }
});
test('organic source or scope errors cannot render partial rows, exports or internal errors',async()=>{
 for(const bad of ['upstream','tenant','paid']){
  reset();if(bad==='upstream')queryError=true;else rows=[{...fact(),...(bad==='tenant'?{organization_id:'foreign'}:{platform:'meta_ads' as const})}];
  const html=renderToStaticMarkup(await Page(props()));
  assert.ok(html.includes('role="alert"'));assert.ok(html.includes('Nenhum relatório ou CSV parcial'));
  assert.ok(!html.includes('PRIVATE_UPSTREAM_DETAIL'));assert.ok(!html.includes('Synthetic &lt;script&gt;'));assert.ok(!html.includes('Exportar conteúdos CSV'));assert.ok(!html.includes('Imprimir / salvar PDF'));
 }
});
test('organic filters select one authorized platform and empty results explain absence without counters',async()=>{
 reset();let html=renderToStaticMarkup(await Page(props({platform:'instagram_organic',compare:'previous_year',currency:'USD'})));
 assert.ok(calls.some(call=>call.method==='in'&&JSON.stringify(call.args)===JSON.stringify(['platform',['instagram_organic']])));
 assert.equal(events.filter(event=>event==='query:creatives').length,1);assert.ok(html.includes('Contadores')||html.includes('contadores'));
 reset();rows=[];html=renderToStaticMarkup(await Page(props()));assert.ok(html.includes('Nenhum conteúdo orgânico recebido'));assert.ok(html.includes('não significa ausência de atividade'));assert.match(html,/<button type="button" disabled=""/);
});


test('explicit malformed or impossible publication dates cannot fall back to a different report period',async()=>{
 for(const extra of [{from:'2026-02-30'},{to:'2026-02-30'},{from:'invalid'},{to:''},{from:'2026-1-1'}]){
  reset();
  const html=renderToStaticMarkup(await Page(props(extra)));
  assert.ok(html.includes('Selecione datas válidas'));assert.deepEqual(events,['auth','config']);
  assert.ok(!html.includes('Exportar conteúdos CSV'));assert.ok(!html.includes('Imprimir / salvar PDF'));
 }
 reset();rows=[];
 const html=renderToStaticMarkup(await Page({params:Promise.resolve({organizationSlug:org.slug}),searchParams:Promise.resolve({})}));
 assert.ok(events.includes('query:creatives'));assert.ok(html.includes('Nenhum conteúdo orgânico recebido'));
 assert.ok(calls.some(call=>call.method==='gte'&&String(call.args[1]).endsWith('T00:00:00.000Z')));
});
