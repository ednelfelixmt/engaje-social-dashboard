import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {reportCatalog,reportHref} from '../src/lib/reports/report-catalog';
import {scope} from './helpers/funnel-report-fixture';
const {ReportCenter}=loadTypescript<typeof import('../src/components/dashboard/report-center')>(new URL('../src/components/dashboard/report-center.tsx',import.meta.url),(id,native)=>id==='next/link'?({children,href,...props}:{children?:React.ReactNode;href:string})=>React.createElement('a',{...props,href},children):native(id));
test('catalog respects each existing report comparison contract and does not copy private selectors',()=>{
 for(const item of reportCatalog){const href=reportHref(scope.organizationSlug,item.path,{...scope,account:'PRIVATE',campaign:'PRIVATE'} as typeof scope);const u=new URL(href,'https://example.test');assert.deepEqual([...u.searchParams.keys()],['from','to','currency','compare']);assert.equal(u.searchParams.get('compare'),['analytics','performance','funnel','revenue'].includes(item.path)?scope.compare:'none');assert.ok(!href.includes('PRIVATE'));}
 for(const from of ['2026-02-30','2026-12-01'])assert.throws(()=>reportHref('synthetic','funnel',{...scope,from}));
 for(const slug of ['','..','.',' padded'])assert.throws(()=>reportHref(slug,'funnel',scope));
 assert.ok(reportHref('a/b','funnel',scope).startsWith('/a%2Fb/reports/funnel?'));
});
test('center exposes only enabled report links, no writes, and an honest GA4 pending state',()=>{
 const html=renderToStaticMarkup(React.createElement(ReportCenter,{slug:scope.organizationSlug,enabled:['paid','funnel'],context:scope}));
 assert.ok(html.includes('/reports/funnel?'));assert.ok(html.includes('/reports/performance?'));assert.ok(!html.includes('/reports/organic-content?'));assert.ok(!html.includes('/reports/revenue?'));assert.ok(html.includes('Desabilitado na configuração'));assert.ok(html.includes('Em preparação'));assert.ok(html.includes('não comprova conexão'));assert.ok(!html.includes('/settings/'));assert.ok(!html.includes('<form'));assert.ok(!html.includes('Conectado'));
 const empty=renderToStaticMarkup(React.createElement(ReportCenter,{slug:scope.organizationSlug,enabled:[],context:scope}));assert.ok(!empty.includes('<a '));
});

test('creative library remains discoverable without a sidebar only when the agency enabled creatives',()=>{
 const shown=renderToStaticMarkup(React.createElement(ReportCenter,{slug:scope.organizationSlug,enabled:['creatives'],context:scope}));const hidden=renderToStaticMarkup(React.createElement(ReportCenter,{slug:scope.organizationSlug,enabled:[],context:scope}));assert.ok(shown.includes('Biblioteca de criativos'));assert.ok(shown.includes('/'+scope.organizationSlug+'/paid-creatives?'));assert.ok(!hidden.includes('/paid-creatives?'));
 const href=new URL(reportHref(scope.organizationSlug,'creatives',scope),'https://example.test');assert.equal(href.pathname,'/'+scope.organizationSlug+'/paid-creatives');assert.equal(href.searchParams.get('from'),scope.from);assert.equal(href.searchParams.get('to'),scope.to);assert.equal(href.searchParams.get('currency'),scope.currency);assert.equal(href.searchParams.get('compare'),'none');assert.ok(!href.pathname.includes('/reports/creatives'));
});


test('report links reject hidden slug delimiters instead of percent-encoding unsafe tenant routes',()=>{
 const context={...scope},snapshot=structuredClone(context);
 for(const slug of ['client\nname','client\tname','client\u0000name','client\u001fname','client\u007fname','client\u0085name','client\u009fname','client\u2028name','client\u2029name']){
  assert.throws(()=>reportHref(slug,'analytics',context),/Invalid report navigation/,JSON.stringify(slug));
 }
 assert.deepEqual(context,snapshot,'validation does not rewrite the caller context');
});

test('slug validation preserves safe escaped segments and all report-specific route contracts',()=>{
 const context={...scope},slug='client/segment';
 assert.ok(reportHref(slug,'analytics',context).startsWith('/client%2Fsegment/reports/analytics?'));
 assert.ok(reportHref(slug,'creatives',context).startsWith('/client%2Fsegment/paid-creatives?'));
 assert.equal(new URL(reportHref(slug,'creatives',context),'https://example.test').searchParams.get('compare'),'none');
 for(const path of ['analytics','creatives','methodology'] as const){
  assert.throws(()=>reportHref('client\u001fname',path,context),/Invalid report navigation/);
 }
});
