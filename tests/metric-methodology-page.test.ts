import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
const org={id:'10000000-0000-4000-8000-000000000001',slug:'synthetic',name:'Synthetic <script>client</script>'};
let events:string[]=[],denied=false,enabled=true,configId=org.id,superAdmin=false;
const session={tenant:async()=>{events.push('auth');if(denied)throw new Error('DENIED');return {org,superAdmin,db:{from(){throw new Error('Guide must not query facts');},storage:{from(){throw new Error('Guide must not query storage');}}}};},dashboardConfig:async()=>{events.push('config');return {organization_id:configId,enabled_pages:enabled?['overview']:['paid']};}};
const {default:Page}=loadTypescript<{default:(p:{params:Promise<{organizationSlug:string}>;searchParams:Promise<Record<string,unknown>>})=>Promise<React.ReactElement>}>(new URL('../src/app/(tenant)/[organizationSlug]/reports/methodology/page.tsx',import.meta.url),(id,native)=>id==='@/lib/auth/session'?session:native(id));
const props=(search:Record<string,unknown>={})=>({params:Promise.resolve({organizationSlug:org.slug}),searchParams:Promise.resolve(search)});
function reset(){events=[];denied=false;enabled=true;configId=org.id;superAdmin=false;}
test('viewer and agency can read the versioned guide after tenant/config checks without loading measurements or mutations',async()=>{
 for(const admin of [false,true]){reset();superAdmin=admin;const html=renderToStaticMarkup(await Page(props({q:'CPC',scope:'paid',status:'documented'})));assert.deepEqual(events,['auth','config']);for(const text of ['Fórmulas, fontes e limitações','2026-10-27.1','Synthetic &lt;script&gt;client&lt;/script&gt;','não consulta medições','não são aplicadas automaticamente','Investimento total ÷ total de cliques','method="get"'])assert.ok(html.includes(text),text);for(const text of ['<script>client','type="checkbox"','name="enabled_metrics"','Imprimir / salvar PDF','Gerenciar integrações','R$'])assert.ok(!html.includes(text),text);}
});
test('methodology denies unauthenticated, foreign configuration and disabled overview before exposing a guide',async()=>{
 reset();denied=true;await assert.rejects(Page(props()),/DENIED/);assert.deepEqual(events,['auth']);
 for(const mode of ['foreign','disabled']){reset();if(mode==='foreign')configId='other';else enabled=false;const html=renderToStaticMarkup(await Page(props()));assert.deepEqual(events,['auth','config']);assert.ok(!html.includes('Definições e contratos'));assert.ok(!html.includes('Fórmula neste contrato'));assert.ok(!html.includes('method="get"'));}
});
test('invalid guide parameters give safe feedback and no reflected private diagnostics or unfiltered catalog',async()=>{
 for(const search of [{q:'PRIVATE_SEARCH'+'x'.repeat(121)},{q:['PRIVATE_ARRAY']},{group:'PRIVATE_GROUP'},{scope:'PRIVATE_SCOPE'},{status:'PRIVATE_STATUS'}]){reset();const html=renderToStaticMarkup(await Page(props(search)));assert.ok(html.includes('role="alert"'));assert.ok(html.includes('Restaurar filtros do guia'));assert.ok(!html.includes('PRIVATE_'));assert.ok(!html.includes('Definições e contratos'));}
});
test('empty and HTML-like searches remain definition states, with escaped input and no invented measurements',async()=>{
 reset();const html=renderToStaticMarkup(await Page(props({q:'"><script>alert(1)</script>'})));assert.ok(html.includes('Nenhuma definição corresponde'));assert.ok(html.includes('Isso não descreve a atividade do cliente'));assert.ok(!html.includes('<script>alert'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('R$'));assert.ok(!html.includes('0%'));
});
