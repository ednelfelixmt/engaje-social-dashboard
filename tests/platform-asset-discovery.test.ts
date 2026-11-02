import test from 'node:test';
import assert from 'node:assert/strict';
import {clientDiscoveryCandidates} from '../src/lib/integrations/asset-discovery';
const asset=(id:string,status='active')=>({id,name:'Ativo sintético '+id,asset_status:status});
test('discovery keeps own linked assets visible and nonselectable while excluding foreign assigned assets',()=>{const own=asset('own','assigned'),foreign=asset('foreign','assigned'),available=asset('new');assert.deepEqual(clientDiscoveryCandidates([own,foreign,available],['own']),[own,available]);});
test('current client assignment remains authoritative when discovery reports an active asset',()=>{const own=asset('own');const result=clientDiscoveryCandidates([own],['own']);assert.equal(result[0].asset_status,'assigned');assert.equal(own.asset_status,'active');});
test('empty discovery or assignments cannot expose foreign assigned assets',()=>{assert.deepEqual(clientDiscoveryCandidates([],['own']),[]);assert.deepEqual(clientDiscoveryCandidates([asset('foreign','assigned'),asset('new')],[]),[asset('new')]);});

import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
test('linked client assets are visible but disabled in the selector, with an escape action',()=>{
 const {PlatformAssetSelector}=loadTypescript<typeof import('../src/components/platform-asset-selector')>(new URL('../src/components/platform-asset-selector.tsx',import.meta.url),(id,native)=>id==='next/navigation'?{useRouter:()=>({replace:()=>{},refresh:()=>{}})}:id==='@/lib/supabase/browser'?{browserClient:()=>{throw Error('Rendering must not invoke the backend');}}:native(id));
 const html=renderToStaticMarkup(React.createElement(PlatformAssetSelector,{organizationId:'synthetic-a',connectionId:'synthetic-connection',candidates:[{id:'own',name:'Conta sintética própria',externalId:'synthetic-account',assetType:'ad_account',status:'assigned',recommended:true}]}));
 assert.match(html,/Conta sintética própria/);assert.match(html,/1 já vinculados a este cliente/);assert.match(html,/type="checkbox" disabled=""/);assert.match(html,/Fechar seleção/);assert.match(html,/Revisar seleção/);
});
