import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
let superAdmin=false,denied=false,reads=0;
const db={from(){reads++;const builder={select(){return builder;},eq(){return builder;},single:async()=>({data:{}})};return builder;}};
const {default:Layout}=loadTypescript<typeof import('../src/app/(tenant)/[organizationSlug]/layout')>(new URL('../src/app/(tenant)/[organizationSlug]/layout.tsx',import.meta.url),(id,native)=>{
 if(id==='@/lib/auth/session')return {tenant:async()=>{if(denied)throw new Error('Denied');return {db,org:{id:'synthetic-org',name:'Organização sintética',slug:'synthetic'},superAdmin};},dashboardConfig:async()=>({enabled_pages:['overview']})};
 if(id==='@/components/navigation')return {Navigation:()=>React.createElement('aside',{'data-report-navigation':''},'ADMIN_NAVIGATION')};
 if(id==='@/components/dashboard/report-studio-frame')return {ReportStudioFrame:({children}:{children:React.ReactNode})=>React.createElement('div',null,children)};
 return native(id);
});
test('client dashboard omits the navigation tree on the server and uses a full-width canvas',async()=>{
 superAdmin=false;denied=false;const html=renderToStaticMarkup(await Layout({params:Promise.resolve({organizationSlug:'synthetic'}),children:'DASHBOARD'}));
 assert.ok(!html.includes('ADMIN_NAVIGATION'));assert.ok(!html.includes('data-report-navigation'));assert.ok(!html.includes('lg:ml-'));assert.ok(html.includes('data-client-dashboard=""'));assert.ok(html.includes('Organização sintética'));assert.ok(html.includes('action="/auth/signout"'));assert.ok(html.includes('DASHBOARD'));assert.ok(html.includes('href="/"'));assert.ok(html.includes('Dashboards'));assert.ok(html.includes('href="/synthetic/reports"'));
});
test('verified agency administrators retain their navigation and tenant failures stop branding reads',async()=>{
 superAdmin=true;denied=false;const html=renderToStaticMarkup(await Layout({params:Promise.resolve({organizationSlug:'synthetic'}),children:'DASHBOARD'}));assert.ok(html.includes('ADMIN_NAVIGATION'));assert.ok(html.includes('lg:ml-[272px]'));assert.ok(!html.includes('data-client-dashboard=""'));
 denied=true;reads=0;await assert.rejects(Layout({params:Promise.resolve({organizationSlug:'synthetic'}),children:'DASHBOARD'}),/Denied/);assert.equal(reads,0);denied=false;
});

let homeOrganizations=[{id:'synthetic-org',name:'Organização sintética',slug:'synthetic'}];
const {default:Home}=loadTypescript<typeof import('../src/app/page')>(new URL('../src/app/page.tsx',import.meta.url),(id,native)=>{
 if(id==='@/lib/auth/session')return {session:async()=>({superAdmin,db:{from:()=>({select:async()=>({data:homeOrganizations,error:null})})}})};
 if(id==='next/navigation')return {redirect:(url:string)=>{throw new Error('REDIRECT:'+url);}};
 return native(id);
});
test('login entry opens the BI canvas for clients while administrators retain the agency home',async()=>{
 superAdmin=false;await assert.rejects(Home(),/REDIRECT:\/synthetic\/reports\/analytics/);
 homeOrganizations.push({id:'second',name:'Segunda sintética',slug:'second'});const html=renderToStaticMarkup(await Home());assert.ok(html.includes('/synthetic/reports/analytics'));assert.ok(html.includes('/second/reports/analytics'));assert.ok(!html.includes('/overview'));
 superAdmin=true;await assert.rejects(Home(),/REDIRECT:\/admin/);homeOrganizations=homeOrganizations.slice(0,1);
});
