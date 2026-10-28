import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import {buildAudienceReport, type BreakdownPoint, type AudienceReport} from '../src/lib/reports/audience-report';
const report=buildAudienceReport([],{organizationId:'11111111-1111-4111-8111-111111111111',organizationName:'Synthetic',organizationSlug:'synthetic',platform:'meta_ads',currency:'BRL',timezone:'America/Cuiaba',from:'2026-10-20',to:'2026-10-20',generatedAt:'2026-10-26T12:00:00.000Z'});
let message='',downloads=0,fail=false;
const {AudienceReportExport}=loadTypescript<{AudienceReportExport:(p:{report:AudienceReport})=>React.ReactElement}>(new URL('../src/components/dashboard/audience-report-export.tsx',import.meta.url),(id,native)=>{
 if(id==='react')return {...React,useId:()=> 'synthetic-export',useState:()=>[message,(value:string)=>{message=value;}]};
 if(id==='@/lib/export/download')return {downloadCsv:()=>{downloads++;if(fail)throw new Error('Synthetic download error');}};
 return native(id);
});
function button(node:React.ReactNode):React.ReactElement<{onClick:()=>void;disabled:boolean}>|undefined{
 if(!React.isValidElement<{children?:React.ReactNode}>(node))return undefined;
 if(node.type==='button')return node as React.ReactElement<{onClick:()=>void;disabled:boolean}>;
 for(const child of React.Children.toArray(node.props.children)){const found=button(child);if(found)return found;}
}

test('export is local, disabled without facts and does not run during render',()=>{
 message='';downloads=0;fail=false;const tree=AudienceReportExport({report});assert.equal(button(tree)?.props.disabled,true);assert.equal(downloads,0);
 const html=renderToStaticMarkup(tree);assert.ok(html.includes('aria-describedby="synthetic-export"'));assert.ok(html.includes('Campos vazios representam dados indisponíveis'));
 const available=AudienceReportExport({report:{...report,sourceRecords:1}});assert.equal(button(available)?.props.disabled,false);button(available)!.props.onClick();assert.equal(downloads,1);
});

test('export failure is announced and does not claim a file was saved',()=>{
 message='';downloads=0;fail=true;button(AudienceReportExport({report:{...report,sourceRecords:1}}))!.props.onClick();
 const html=renderToStaticMarkup(AudienceReportExport({report}));assert.ok(html.includes('role="alert"'));assert.ok(html.includes('Não foi possível preparar'));assert.ok(!html.includes('Synthetic download error'));fail=false;
});

const chartData: {name:string;data:unknown}[]=[];
const passthrough=({children}:{children?:React.ReactNode})=>React.createElement('div',null,children);
const {AudienceOverview}=loadTypescript<{AudienceOverview:React.ComponentType<{gender:BreakdownPoint[];age:BreakdownPoint[];device:BreakdownPoint[]}>}>(new URL('../src/components/dashboard/audience-overview-v3.tsx',import.meta.url),(id,native)=>{
 if(id==='recharts')return new Proxy({}, {get:(_target,key)=>key==='Pie'||key==='BarChart'?({children,data}:{children?:React.ReactNode;data:unknown})=>{chartData.push({name:String(key),data});return React.createElement('div',null,children);}:passthrough});
 return native(id);
});
const point=(impressions:number|null,clicks:number|null=1):BreakdownPoint=>({label:'Synthetic',spend:1,impressions,clicks,leads:null});

test('partial and overflowing demographic distributions do not become a pie of a subset',()=>{
 chartData.length=0;const html=renderToStaticMarkup(React.createElement(AudienceOverview,{gender:[point(10),point(null)],age:[],device:[point(1e308),point(1e308)]}));
 assert.equal(chartData.filter(row=>row.name==='Pie').length,0);assert.ok(html.includes('cobertura incompleta'));
});

test('age series preserves missing clicks and explicit zero rather than inventing a bar',()=>{
 chartData.length=0;renderToStaticMarkup(React.createElement(AudienceOverview,{gender:[],age:[point(10,null),{...point(20,0),label:'Other'}],device:[]}));
 const rows=chartData.find(row=>row.name==='BarChart')!.data as {clicks:number|null}[];assert.ok(rows.some(row=>row.clicks===null));assert.ok(rows.some(row=>row.clicks===0));
});

test('observed zero demographic data is distinct from absent data',()=>{
 const html=renderToStaticMarkup(React.createElement(AudienceOverview,{gender:[point(0)],age:[],device:[]}));assert.ok(html.includes('Zero impressões informadas'));assert.ok(html.includes('Sem dados de dispositivos'));
});


test('metric card makes partial group coverage visible without treating missing values as zero',()=>{
 const {MetricBreakdownCard}=loadTypescript<{MetricBreakdownCard:React.ComponentType<{title:string;rows:BreakdownPoint[];currency:string}>}>(new URL('../src/components/dashboard/metric-breakdown-card.tsx',import.meta.url),(id,native)=>native(id));
 const html=renderToStaticMarkup(React.createElement(MetricBreakdownCard,{title:'Synthetic dimension',rows:[point(20),{...point(null),label:'Unavailable'}],currency:'BRL'}));
 assert.ok(html.includes('1 de 2 grupos recebidos'));assert.ok(!html.includes('Unavailable'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
});


const {RegionPerformance}=loadTypescript<{RegionPerformance:React.ComponentType<{states:BreakdownPoint[];cities:BreakdownPoint[];currency:string}>}>(new URL('../src/components/dashboard/geography-cross-analysis.tsx',import.meta.url),(id,native)=>native(id));

test('geographic ranking identifies partial measurement coverage rather than claiming a complete distribution',()=>{
 const html=renderToStaticMarkup(React.createElement(RegionPerformance,{states:[{...point(100),label:'Observed'}, {...point(null),label:'Missing'}],cities:[],currency:'BRL'}));
 assert.ok(html.includes('1 de 2 grupos recebidos com valor válido'));
 assert.ok(html.includes('Recorte parcial'));
 assert.ok(html.includes('Observed'));
 assert.ok(!html.includes('>Missing<'));
 assert.ok(!html.includes('NaN'));
});

test('geographic ranking distinguishes no rows from received groups lacking the selected metric',()=>{
 const empty=renderToStaticMarkup(React.createElement(RegionPerformance,{states:[],cities:[],currency:'BRL'}));
 const unavailable=renderToStaticMarkup(React.createElement(RegionPerformance,{states:[point(null)],cities:[],currency:'BRL'}));
 assert.ok(empty.includes('Sem registros geográficos recebidos'));
 assert.ok(!empty.includes('Grupos geográficos recebidos, mas'));
 assert.ok(unavailable.includes('0 de 1 grupos recebidos'));
 assert.ok(unavailable.includes('Grupos geográficos recebidos, mas sem valores válidos'));
 assert.ok(!unavailable.includes('Sem registros geográficos recebidos'));
});

test('geographic ranking preserves observed zeros, rejects non-finite observations and discloses truncation',()=>{
 const zero=renderToStaticMarkup(React.createElement(RegionPerformance,{states:[{...point(0),label:'Observed zero'},{...point(Number.POSITIVE_INFINITY),label:'Invalid'}],cities:[],currency:'BRL'}));
 assert.ok(zero.includes('1 de 2 grupos recebidos'));
 assert.ok(zero.includes('Observed zero'));
 assert.ok(!zero.includes('>Invalid<'));
 assert.ok(!zero.includes('Infinity'));
 const states=Array.from({length:13},(_,i)=>({...point(i+1),label:'Place '+(i+1)}));
 const clipped=renderToStaticMarkup(React.createElement(RegionPerformance,{states,cities:[],currency:'BRL'}));
 assert.ok(clipped.includes('13 de 13 grupos recebidos'));
 assert.ok(clipped.includes('Exibindo os 12 maiores valores'));
 assert.ok(!clipped.includes('>Place 1<'));
 assert.ok(clipped.includes('>Place 13<'));
});


test('geographic coverage follows the selected city and lead metric instead of the default state impressions',()=>{
 let hook=0;
 const {RegionPerformance:SelectedRegion}=loadTypescript<{RegionPerformance:React.ComponentType<{states:BreakdownPoint[];cities:BreakdownPoint[];currency:string}>}>(new URL('../src/components/dashboard/geography-cross-analysis.tsx',import.meta.url),(id,native)=>id==='react'?{...React,useState:()=>[['Leads','city'][hook++],()=>{}]}:native(id));
 const html=renderToStaticMarkup(React.createElement(SelectedRegion,{states:[{...point(999),label:'State only',leads:99}],cities:[{...point(1),label:'City observed',leads:3},{...point(1),label:'City missing',leads:null}],currency:'BRL'}));
 assert.ok(html.includes('1 de 2 grupos recebidos com valor válido para leads'));assert.ok(html.includes('Recorte parcial'));assert.ok(html.includes('City observed'));assert.ok(!html.includes('>City missing<'));assert.ok(!html.includes('State only'));
});
