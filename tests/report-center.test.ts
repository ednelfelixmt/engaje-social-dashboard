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
