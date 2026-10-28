import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';

const {Navigation}=loadTypescript<{Navigation:(props:{slug:string;canShare:boolean;enabled:string[]})=>React.ReactNode}>(
 new URL('../src/components/navigation.tsx',import.meta.url),(id,native)=>{
  if(id==='next/navigation')return {usePathname:()=>'/fixture-a/overview'};
  if(id==='next/link')return ({children,prefetch:_prefetch,...props}:{children:React.ReactNode;prefetch?:boolean})=>createElement('a',props,children);
  return native(id);
 });
test('viewer navigation retains dashboards and filters while hiding administrative settings',()=>{
 const html=renderToStaticMarkup(createElement(Navigation,{slug:'fixture-a',canShare:false,enabled:['overview','paid','external']}));
 assert.ok(html.includes('/fixture-a/overview'));
 assert.ok(html.includes('/fixture-a/paid'));
 assert.ok(!html.includes('/fixture-a/settings/'));
 assert.ok(!html.includes('/fixture-a/sharing'));
});
test('authorized agency administrator retains configuration and sharing navigation',()=>{
 const html=renderToStaticMarkup(createElement(Navigation,{slug:'fixture-a',canShare:true,enabled:['overview']}));
 for(const path of ['settings/dashboard','settings/integrations','settings/branding','settings/data-quality','sharing'])
  assert.ok(html.includes('/fixture-a/'+path),path);
});


test('executive report navigation respects the tenant paid-page setting for viewers',()=>{
 const enabled=renderToStaticMarkup(createElement(Navigation,{slug:'fixture-a',canShare:false,enabled:['paid']}));
 const disabled=renderToStaticMarkup(createElement(Navigation,{slug:'fixture-a',canShare:false,enabled:['overview']}));
 assert.ok(enabled.includes('/fixture-a/reports/performance'));assert.ok(enabled.includes('data-report-navigation'));assert.ok(!disabled.includes('/fixture-a/reports/performance'));
});


test('revenue analysis is a read-only option gated by the tenant external-page setting',()=>{
 const shown=renderToStaticMarkup(createElement(Navigation,{slug:'fixture-a',canShare:false,enabled:['external']}));
 const hidden=renderToStaticMarkup(createElement(Navigation,{slug:'fixture-a',canShare:false,enabled:['paid']}));
 assert.ok(shown.includes('/fixture-a/reports/revenue'));assert.ok(shown.includes('/fixture-a/external'));assert.ok(!hidden.includes('/fixture-a/reports/revenue'));assert.ok(!shown.includes('/fixture-a/settings/'));
});


test('target-reference navigation is read-only and follows the paid-page setting',()=>{
 const shown=renderToStaticMarkup(createElement(Navigation,{slug:'fixture-a',canShare:false,enabled:['paid']}));
 const hidden=renderToStaticMarkup(createElement(Navigation,{slug:'fixture-a',canShare:false,enabled:['external']}));
 assert.ok(shown.includes('/fixture-a/reports/targets'));assert.ok(!shown.includes('/fixture-a/settings/'));assert.ok(!hidden.includes('/fixture-a/reports/targets'));
});


test('organic content report is read-only and visible only when organic is enabled for the tenant',()=>{
 const shown=renderToStaticMarkup(createElement(Navigation,{slug:'fixture-a',canShare:false,enabled:['organic']}));
 const hidden=renderToStaticMarkup(createElement(Navigation,{slug:'fixture-a',canShare:false,enabled:['paid','creatives']}));
 assert.ok(shown.includes('/fixture-a/reports/organic-content'));assert.ok(shown.includes('/fixture-a/reports/organic-accounts'));assert.ok(!shown.includes('/fixture-a/settings/'));
 assert.ok(!hidden.includes('/fixture-a/reports/organic-content'));assert.ok(!hidden.includes('/fixture-a/reports/organic-accounts'));
});

test('metric guide is a read-only overview option for viewers and respects overview configuration',()=>{
 const shown=renderToStaticMarkup(createElement(Navigation,{slug:'fixture-a',canShare:false,enabled:['overview']}));
 const hidden=renderToStaticMarkup(createElement(Navigation,{slug:'fixture-a',canShare:false,enabled:['paid','external']}));
 assert.ok(shown.includes('/fixture-a/reports/methodology'));assert.ok(!hidden.includes('/fixture-a/reports/methodology'));assert.ok(!shown.includes('/fixture-a/settings/'));
});
