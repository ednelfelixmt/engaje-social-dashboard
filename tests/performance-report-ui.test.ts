import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {buildPerformanceReport} from '../src/lib/reports/performance-report';
import type {Row} from '../src/types/database.types';
const scope={organizationId:'11111111-1111-4111-8111-111111111111',organizationName:'Synthetic organization',organizationSlug:'synthetic',timezone:'America/Cuiaba',currency:'BRL',from:'2026-10-20',to:'2026-10-20',compare:'previous_period' as const,generatedAt:'2026-10-26T12:00:00.000Z'};
const fact={id:'synthetic-fact',organization_id:scope.organizationId,platform:'meta_ads',account_id:'act_123',campaign_id:'synthetic',campaign_name:'Synthetic campaign <script>private</script>',ad_id:'synthetic-ad',metric_date:scope.from,currency:'BRL',spend:100,impressions:1000,clicks:20,leads:null,attribution_window:'7d_click'} as Row<'metrics_ads'>;
let error='',effects:(()=>void|(()=>void))[]=[],prints=0,failed=false;
const {PerformanceReportPrint}=loadTypescript<{PerformanceReportPrint:(p:{disabled?:boolean})=>React.ReactElement}>(new URL('../src/components/dashboard/performance-report-print.tsx',import.meta.url),(id,native)=>{
 if(id==='react')return {...React,useId:()=> 'synthetic-print',useState:()=>[error,(v:string)=>{error=v;}],useEffect:(f:()=>void|(()=>void))=>{effects.push(f);}};
 return native(id);
});
function button(node:React.ReactNode):React.ReactElement<{onClick:()=>void;disabled:boolean}>|undefined{
 if(!React.isValidElement<{children?:React.ReactNode}>(node))return undefined;
 if(node.type==='button')return node as React.ReactElement<{onClick:()=>void;disabled:boolean}>;
 for(const child of React.Children.toArray(node.props.children)){const found=button(child);if(found)return found;}
}
test('print is user initiated, blocked for empty data, and cleans its route-specific class on unmount',()=>{
 error='';effects=[];prints=0;failed=false;const events:string[]=[];
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{print(){prints++;if(failed)throw new Error('Synthetic print internal');}}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{documentElement:{classList:{add(value:string){events.push('add:'+value);},remove(value:string){events.push('remove:'+value);}}}}});
 try{
  const tree=PerformanceReportPrint({});assert.equal(prints,0);assert.ok(renderToStaticMarkup(tree).includes('aria-describedby="synthetic-print"'));
  const cleanup=effects[0]();assert.deepEqual(events,['add:engaje-performance-print']);
  button(tree)!.props.onClick();assert.equal(prints,1);
  const disabled=button(PerformanceReportPrint({disabled:true}))!;assert.equal(disabled.props.disabled,true);disabled.props.onClick();assert.equal(prints,1);
  failed=true;button(PerformanceReportPrint({}))!.props.onClick();const html=renderToStaticMarkup(PerformanceReportPrint({}));assert.ok(html.includes('role="alert"'));assert.ok(!html.includes('Synthetic print internal'));
  if(cleanup)cleanup();assert.equal(events.at(-1),'remove:engaje-performance-print');
 }finally{if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');}
});
const {PerformanceReportView}=loadTypescript<typeof import('../src/components/dashboard/performance-report-view')>(new URL('../src/components/dashboard/performance-report-view.tsx',import.meta.url),(id,native)=>native(id));
test('executive presentation includes both periods, provenance, attribution warning and escaped source names',()=>{
 const report=buildPerformanceReport([fact],[{...fact,id:'prior',metric_date:'2026-10-19',attribution_window:'1d_click'}],scope);
 const html=renderToStaticMarkup(React.createElement(PerformanceReportView,{report}));
 for(const text of ['Atual: 2026-10-20','Comparativo: 2026-10-19','Leads atribuídos','Por plataforma','Por campanha','não representam pessoas únicas','Variação de leads e CPL indisponível','1 registros recebidos','Fuso cadastral: America/Cuiaba'])assert.ok(html.includes(text),text);
 assert.ok(html.includes('Exportar CSV'));assert.ok(html.includes('Campos vazios indicam métricas indisponíveis'));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>private'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
});
test('unselected comparison is omitted and empty reports cannot print',()=>{
 const html=renderToStaticMarkup(React.createElement(PerformanceReportView,{report:buildPerformanceReport([],[],{...scope,compare:'none'})}));
 assert.ok(html.includes('Sem registros de mídia paga'));assert.ok(html.includes('Exportar CSV'));assert.equal((html.match(/disabled=\"\"/g)||[]).length,2);assert.ok(html.includes('disabled=""'));assert.ok(!html.includes('vs. comparativo'));assert.ok(!html.includes('Por plataforma'));
});
