import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';

const id='11111111-1111-4111-8111-111111111111';
type Call={table:string;filters:[string,string,unknown][]};
let calls:Call[]=[],events:string[]=[],denied=false;
const sources:Record<string,Record<string,unknown>[]>={organizations:[{id,name:'Aurora sintética',slug:'aurora-sintetica',is_agency:false,status:'active',currency:'BRL'}],integrations:[],branding:[],metrics_ads:[]};
const db={from(table:string){const call:Call={table,filters:[]};calls.push(call);events.push(table);const result=()=>({data:sources[table]??[],error:null});const builder={select(){return builder;},eq(key:string,value:unknown){call.filters.push(['eq',key,value]);return builder;},gte(key:string,value:unknown){call.filters.push(['gte',key,value]);return builder;},lte(key:string,value:unknown){call.filters.push(['lte',key,value]);return builder;},order(){return builder;},range(){return Promise.resolve(result());},then(resolve:(value:unknown)=>unknown){return Promise.resolve(result()).then(resolve);}};return builder;}};
const session={requireAdmin:async()=>{events.push('auth');if(denied)throw new Error('Denied');return{db};}};
const query=loadTypescript<typeof import('../src/lib/metrics/query')>(new URL('../src/lib/metrics/query.ts',import.meta.url),(name,native)=>name==='server-only'?{}:name==='@/lib/auth/session'?session:native(name));
const {default:Page}=loadTypescript<{default:(props:{searchParams:Promise<Record<string,string>>})=>Promise<React.ReactElement>}>(new URL('../src/app/(agency)/admin/page.tsx',import.meta.url),(name,native)=>name==='@/lib/auth/session'?session:name==='@/lib/metrics/query'?query:native(name));
const props=(search:Record<string,string>={})=>({searchParams:Promise.resolve({from:'2026-10-01',to:'2026-10-20',...search})});
function reset(){calls=[];events=[];denied=false;}

test('agency authenticates before queries, applies exact selected dates and renders active clients without facts',async()=>{
  reset();const html=renderToStaticMarkup(await Page(props()));assert.equal(events[0],'auth');assert.equal(calls.length,4);
  const ads=calls.find(call=>call.table==='metrics_ads');assert.ok(ads);assert.deepEqual(ads.filters,[['gte','metric_date','2026-10-01'],['lte','metric_date','2026-10-20']]);
  assert.ok(calls.find(call=>call.table==='organizations')?.filters.some(f=>f[1]==='is_agency'&&f[2]===false));
  assert.ok(calls.find(call=>call.table==='integrations')?.filters.some(f=>f[1]==='is_enabled'&&f[2]===true));
  assert.ok(html.includes('Aurora sintética'));assert.ok(html.includes('Sem registros de mídia'));assert.ok(html.includes('Nenhuma medição válida'));assert.ok(!html.includes('R$'));
});

test('agency denial and malformed, reversed, repeated or excessive dates never execute data reads',async()=>{
  reset();denied=true;await assert.rejects(Page(props()),/Denied/);assert.deepEqual(events,['auth']);assert.equal(calls.length,0);
  for(const from of ['2026-02-30','2027-01-01','2020-01-01',['2026-10-01','2026-10-02'] as unknown as string]){reset();const html=renderToStaticMarkup(await Page(props({from})));assert.ok(html.includes('Período inválido'));assert.equal(calls.length,0);assert.deepEqual(events,['auth']);}
});
