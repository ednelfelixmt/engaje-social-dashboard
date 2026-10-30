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
