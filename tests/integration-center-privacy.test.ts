import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {summarizeClientConnectionHealth} from '../src/lib/integrations/operational-state';

const fixtures=[
 {organization_id:'synthetic-allowed',status:'connected',is_enabled:true,external_account_id:'act_private_account_123',last_synced_at:'2026-10-29T10:00:00Z',config:{}},
 {organization_id:'synthetic-allowed',status:'expired',is_enabled:true,external_account_id:'private_pixel_900',last_synced_at:'2026-10-30T10:00:00Z',config:{}},
 {organization_id:'synthetic-allowed',status:'connected',is_enabled:true,external_account_id:'foundation:pending',last_synced_at:'2026-10-30T20:00:00Z',config:{}},
 {organization_id:'synthetic-other',status:'error',is_enabled:true,external_account_id:'private_other_tenant',last_synced_at:'2026-10-30T21:00:00Z',config:{}},
];

test('global integration catalog receives only authorized aggregated health, never asset identities',()=>{
 const result=summarizeClientConnectionHealth(['synthetic-allowed','synthetic-empty'],fixtures);
 assert.deepEqual(result,[
  {organizationId:'synthetic-allowed',connected:1,attention:1,pending:0,inactive:0,lastSyncedAt:'2026-10-30T10:00:00Z'},
  {organizationId:'synthetic-empty',connected:0,attention:0,pending:0,inactive:0,lastSyncedAt:null},
 ]);
 for(const privateAsset of ['act_private_account_123','private_pixel_900','private_other_tenant','foundation:pending'])
  assert.equal(JSON.stringify(result).includes(privateAsset),false);
 assert.equal(fixtures[0].external_account_id,'act_private_account_123');
});

const {IntegrationCenter}=loadTypescript<{IntegrationCenter:(props:{summary:ReturnType<typeof summarizeClientConnectionHealth>;workspaces:{id:string;name:string;slug:string}[]})=>React.ReactNode}>(
 new URL('../src/components/admin/integration-center.tsx',import.meta.url),(id,native)=>{
  if(id==='next/link')return ({children,...props}:{children:React.ReactNode})=>createElement('a',props,children);
  if(id==='@/lib/integrations/catalog')return {connectorCatalog:[{provider:'meta_ads',name:'Meta',stage:'live',description:'Meta Ads',capabilities:['mídia paga']}]};
  if(id==='@/components/admin-integration-start-button')return {AdminIntegrationStartButton:()=>createElement('button',null,'Iniciar conexão')};
  if(id==='@/components/platform-connection-hub')return {PlatformConnectionHub:()=>createElement('button',null,'Nova conexão')};
  return native(id);
 });

test('agency integrations surface links to client without listing linked assets',()=>{
 const summary=summarizeClientConnectionHealth(['synthetic-allowed'],fixtures);
 const html=renderToStaticMarkup(createElement(IntegrationCenter,{summary,workspaces:[{id:'synthetic-allowed',name:'Cliente sintético',slug:'fixture-client'}]}));
 assert.ok(html.includes('Saúde das conexões por cliente'));
 assert.ok(html.includes('href="/fixture-client/settings/integrations"'));
 assert.ok(html.includes('Conexões habilitadas'));
 assert.ok(html.includes('Cliente sintético'));
 for(const value of ['act_private_account_123','private_pixel_900','private_other_tenant','foundation:pending'])
  assert.ok(!html.includes(value),value);
 assert.ok(!html.includes('Cliente / conta'));
});

test('client search in the agency integration center ignores diacritics without exposing account identifiers',()=>{
 const {matchesIntegrationClientQuery}=loadTypescript<{matchesIntegrationClientQuery:(name:string,query:string)=>boolean}>(
   new URL('../src/components/admin/integration-center.tsx',import.meta.url),(id,native)=>{
    if(id==='next/link')return ({children,...props}:{children:React.ReactNode})=>createElement('a',props,children);
    if(id==='@/lib/integrations/catalog')return {connectorCatalog:[]};
    if(id==='@/components/admin-integration-start-button')return {AdminIntegrationStartButton:()=>createElement('button',null,'Conectar')};
    if(id==='@/components/platform-connection-hub')return {PlatformConnectionHub:()=>createElement('button',null,'Nova conexão')};
  return native(id);
   });
 for(const [name,query] of [['São João Mídia','sao joao'],['CUIABÁ Marketing','cuiaba'],['Água Viva','  AGUA  '],['Cliente sintético','CLIENTE']]){
  assert.equal(matchesIntegrationClientQuery(name,query),true,name);
 }
 assert.equal(matchesIntegrationClientQuery('São João Mídia','rio'),false);
 assert.equal(matchesIntegrationClientQuery('São João Mídia','sao paulo'),false);
});

test('accent-insensitive search filters only authorized client rows in the global center',()=>{
 let call=0;
 const {IntegrationCenter:FilteredCenter}=loadTypescript<{IntegrationCenter:typeof IntegrationCenter}>(
  new URL('../src/components/admin/integration-center.tsx',import.meta.url),(id,native)=>{
   if(id==='react')return {...native(id),useState:(initial:unknown)=>{const index=call++;return [index===2?'  SAO JOAO  ':initial,()=>{}];}};
   if(id==='next/link')return ({children,...props}:{children:React.ReactNode})=>createElement('a',props,children);
   if(id==='@/lib/integrations/catalog')return {connectorCatalog:[]};
   if(id==='@/components/admin-integration-start-button')return {AdminIntegrationStartButton:()=>createElement('button',null,'Conectar')};
   if(id==='@/components/platform-connection-hub')return {PlatformConnectionHub:()=>createElement('button',null,'Nova conexão')};
  return native(id);
  });
 const summary=summarizeClientConnectionHealth(['synthetic-sao','synthetic-rio'],[
  {organization_id:'synthetic-sao',status:'connected',is_enabled:true,external_account_id:'private_sao_account',last_synced_at:null,config:{}},
  {organization_id:'synthetic-outside',status:'connected',is_enabled:true,external_account_id:'private_other_tenant',last_synced_at:null,config:{}},
 ]);
 const html=renderToStaticMarkup(FilteredCenter({summary,workspaces:[
  {id:'synthetic-sao',name:'São João Mídia',slug:'sao-joao-sintetico'},
  {id:'synthetic-rio',name:'Rio Serviços',slug:'rio-sintetico'},
 ]}));
 assert.ok(html.includes('href="/sao-joao-sintetico/settings/integrations"'));
 assert.ok(!html.includes('href="/rio-sintetico/settings/integrations"'));
 assert.ok(html.includes('1 cliente(s)'));
 for(const identifier of ['private_sao_account','private_other_tenant'])assert.equal(html.includes(identifier),false);
});
