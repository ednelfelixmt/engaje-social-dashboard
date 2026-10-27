import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {loadTypescript} from './helpers/load-typescript';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Row} from '../src/types/database.types';
import {buildTargetReferences,targetFields,type TargetConfig,type TargetScope} from '../src/lib/reports/target-references';
import {TargetReferences} from '../src/components/dashboard/target-references';
const scope: TargetScope={organizationId:'synthetic-a',organizationName:'Synthetic A',organizationSlug:'synthetic-a',timezone:'America/Cuiaba',currency:'BRL',referenceCurrency:'BRL',from:'2026-10-20',to:'2026-10-20',generatedAt:'2026-10-26T12:00:00.000Z'};
const fact={id:'synthetic',organization_id:scope.organizationId,metric_date:scope.from,platform:'meta_ads',account_id:'act_123',campaign_id:'synthetic-campaign',campaign_name:'Synthetic',ad_id:'synthetic-ad',currency:'BRL',spend:0,impressions:1000,clicks:20,leads:5,attribution_window:'7d_click'} as Row<'metrics_ads'>;
const config={...Object.fromEntries(targetFields.map(key=>[key,null])),organization_id:scope.organizationId,target_spend:0,target_ctr:1} as TargetConfig;

test('reference presentation keeps observed zero and factual positions without inventing monthly achievement or pacing',()=>{
 const html=renderToStaticMarkup(React.createElement(TargetReferences,{report:buildTargetReferences([fact],config,scope)}));
 for(const text of ['não possuem vigência definida','Investimento maior ou menor','Igual à referência','Acima da referência','2 de 10 referências cadastradas','1 de 1 dias','1 p.p.','Zero só aparece quando informado','não são pessoas únicas ou vendas'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('Meta atingida'));assert.ok(!html.includes('Projeção do período'));assert.ok(!html.includes('Operação dentro dos parâmetros'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
});

test('empty references and missing observations remain separate unavailable states',()=>{
 const settings={...Object.fromEntries(targetFields.map(key=>[key,null])),organization_id:scope.organizationId} as TargetConfig;
 const html=renderToStaticMarkup(React.createElement(TargetReferences,{report:buildTargetReferences([],settings,scope)}));
 assert.ok(html.includes('A agência ainda não cadastrou referências'));assert.ok(html.includes('Sem referência'));assert.ok(html.includes('0 registros de anúncios'));assert.ok(html.includes('0 de 1 dias'));assert.ok(!html.includes('>0%</dd>'));
});

test('unsupported metrics, invalid configuration and currency mismatch carry explicit reasons without fabricated values',()=>{
 const settings={...config,target_roi:15,target_frequency:3,target_leads:10,target_spend:NaN};
 const html=renderToStaticMarkup(React.createElement(TargetReferences,{report:buildTargetReferences([{...fact,currency:'USD',revenue:123456,purchases:999}],settings,{...scope,currency:'USD'})}));
 for(const text of ['Moeda não comparável','Cadastro inválido','Aguardando base compatível','custos financeiros completos','audiência deduplicada','Moeda filtrada: USD','Moeda cadastral das referências: BRL'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('123456'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));assert.ok(!html.includes('type="submit"'));
});


test('sub-cent observations and derived ratios cannot be rendered as an invented zero',()=>{
 const html=renderToStaticMarkup(React.createElement(TargetReferences,{report:buildTargetReferences([{...fact,spend:0.000001}],config,scope)}));
 assert.ok(html.includes('0,000001'));assert.ok(html.includes('E-7'));assert.ok(html.includes('Acima da referência'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));
});


test('local export is available to a viewer without mutating references or implying a monthly goal',()=>{
 const html=renderToStaticMarkup(React.createElement(TargetReferences,{report:buildTargetReferences([fact],config,scope)}));
 assert.ok(html.includes('Exportar referências CSV'));
 assert.ok(html.includes('sem vigência da referência'));
 assert.ok(html.includes('não representa meta mensal'));
 assert.ok(!html.includes('type="submit"'));
 const empty={...Object.fromEntries(targetFields.map(key=>[key,null])),organization_id:scope.organizationId} as TargetConfig;
 const noTargets=renderToStaticMarkup(React.createElement(TargetReferences,{report:buildTargetReferences([],empty,scope)}));
 assert.match(noTargets,/<button type="button" disabled=""/);
});


let exportMessage='',exportCount=0,exportFailure=false;
const {TargetReferencesExport}=loadTypescript<typeof import('../src/components/dashboard/target-references-export')>(new URL('../src/components/dashboard/target-references-export.tsx',import.meta.url),(id,native)=>{
 if(id==='react')return {...React,useId:()=> 'synthetic-export-note',useState:()=>[exportMessage,(value:string)=>{exportMessage=value;}]};
 if(id==='@/lib/export/download')return {downloadCsv:()=>{exportCount++;if(exportFailure)throw new Error('Private synthetic export failure');}};
 return native(id);
});
function findExportButton(node:React.ReactNode):React.ReactElement<{onClick:()=>void;disabled:boolean}>|undefined{
 if(!React.isValidElement<{children?:React.ReactNode}>(node))return;
 if(node.type==='button')return node as React.ReactElement<{onClick:()=>void;disabled:boolean}>;
 for(const child of React.Children.toArray(node.props.children)){const found=findExportButton(child);if(found)return found;}
}
test('reference download is click-only and guards disabled/empty content even under direct handler invocation',()=>{
 exportMessage='';exportCount=0;exportFailure=false;const enabled=TargetReferencesExport({content:'synthetic',filename:'synthetic.csv',disabled:false});assert.equal(exportCount,0);findExportButton(enabled)!.props.onClick();assert.equal(exportCount,1);
 findExportButton(TargetReferencesExport({content:'synthetic',filename:'synthetic.csv',disabled:true}))!.props.onClick();findExportButton(TargetReferencesExport({content:'',filename:'synthetic.csv',disabled:false}))!.props.onClick();assert.equal(exportCount,1);
});
test('reference download errors are announced without exposing private failure details or claiming success',()=>{
 exportMessage='';exportFailure=true;findExportButton(TargetReferencesExport({content:'synthetic',filename:'synthetic.csv',disabled:false}))!.props.onClick();const html=renderToStaticMarkup(TargetReferencesExport({content:'synthetic',filename:'synthetic.csv',disabled:false}));assert.ok(html.includes('role="alert"'));assert.ok(!html.includes('Private synthetic export failure'));exportFailure=false;
});


test('printed reference document identifies its tenant and keeps provenance, units and unavailable reasons',()=>{
 const named={...scope,organizationName:'Synthetic <script>example</script> & A'};
 const settings={...config,target_roi:15,target_frequency:2,target_leads:10};
 const html=renderToStaticMarkup(React.createElement(TargetReferences,{report:buildTargetReferences([{...fact,currency:'USD',leads:null}],settings,{...named,currency:'USD'})}));
 for(const text of ['target-reference-report','Metas e referências','Synthetic &lt;script&gt;example&lt;/script&gt; &amp; A',
  scope.from,scope.to,scope.timezone,scope.generatedAt,'Moeda filtrada: USD','Moeda cadastral das referências: BRL',
  'Moeda não comparável','custos financeiros completos','audiência deduplicada','não possuem vigência definida',
  'não comprovam que todas as contas','Janela: 7d_click','Imprimir / salvar PDF'])
  assert.ok(html.includes(text),text);
 assert.ok(!html.includes('<script>example'));
 assert.equal((html.match(/data-reference-card/g)||[]).length,10);
 assert.ok(html.includes('data-print-hide="true"'));
});

test('printing uses the registered reference document even with missing facts, and disables an unconfigured document',()=>{
 const configured=renderToStaticMarkup(React.createElement(TargetReferences,{report:buildTargetReferences([],config,scope)}));
 const printButton=configured.match(/<button[^>]*>Imprimir \/ salvar PDF<\/button>/)?.[0];
 assert.ok(printButton);assert.ok(!/\sdisabled=/.test(printButton));
 assert.ok(configured.includes('Dados insuficientes'));assert.ok(configured.includes('0 registros de anúncios'));
 assert.ok(configured.includes('0 de 1 dias'));assert.ok(configured.includes('escolha salvar como PDF'));
 const settings={...Object.fromEntries(targetFields.map(key=>[key,null])),organization_id:scope.organizationId} as TargetConfig;
 const empty=renderToStaticMarkup(React.createElement(TargetReferences,{report:buildTargetReferences([],settings,scope)}));
 assert.match(empty,/<button type="button" disabled=""[^>]*>Imprimir \/ salvar PDF<\/button>/);
 assert.equal((empty.match(/disabled=""/g)||[]).length,2);
 assert.ok(empty.includes('A agência ainda não cadastrou referências'));
});
