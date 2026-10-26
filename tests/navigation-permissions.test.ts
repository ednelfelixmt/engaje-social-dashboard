import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';

const {Navigation}=loadTypescript<{Navigation:(props:{slug:string;canShare:boolean;enabled:string[]})=>React.ReactNode}>(
 new URL('../src/components/navigation.tsx',import.meta.url),(id,native)=>{
  if(id==='next/navigation')return {usePathname:()=>'/fixture-a/overview'};
  if(id==='next/link')return ({children,...props}:{children:React.ReactNode})=>createElement('a',props,children);
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
