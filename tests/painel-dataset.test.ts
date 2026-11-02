import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTypescript} from './helpers/load-typescript';

type Mod=typeof import('../src/lib/painel/dataset');
const mod=loadTypescript<Mod>(new URL('../src/lib/painel/dataset.ts',import.meta.url),()=>({}));

const ad=(over:Record<string,unknown>={})=>({metric_date:'2026-11-01',platform:'meta_ads',account_id:'a',campaign_id:'c1',campaign_name:'Leads • Site',ad_id:'ad1',spend:100,revenue:null,impressions:1000,clicks:50,page_views:30,leads:4,message_leads:1,checkouts:null,purchases:null,...over}) as never;
const brk=(over:Record<string,unknown>={})=>({metric_date:'2026-11-01',platform:'meta_ads',campaign_id:'c1',dimension_type:'device',dimension_value:'mobile_app',dimension_label:'mobile_app',spend:60,revenue:null,impressions:600,clicks:30,leads:3,message_leads:null,purchases:null,...over}) as never;

test('monta linhas por dia, campanha e anúncio com métricas reais e nulos como zero',()=>{
 const d=mod.buildPainelDataset({end:'2026-11-01',currency:'BRL',ads:[ad(),ad({metric_date:'2026-10-31',ad_id:'ad2',spend:50})],breakdowns:[],crm:[],creatives:[]});
 assert.equal(d.days,60);
 assert.equal(d.platforms[0].name,'Meta Ads');
 assert.equal(d.campaigns.length,1);
 assert.equal(d.rows.length,2);
 assert.deepEqual(d.rows[0],[59,0,0,1000,50,100,5,0,0,30,0]);
 assert.equal(d.rows[1][0],58);
});
test('ignora dias fora da janela de 60 dias',()=>{
 const d=mod.buildPainelDataset({end:'2026-11-01',currency:'BRL',ads:[ad({metric_date:'2026-08-01'})],breakdowns:[],crm:[],creatives:[]});
 assert.equal(d.rows.length,0);
});
test('infere objetivo pelo resultado e pelo nome',()=>{
 assert.equal(mod.inferObjective('Promo',{imp:1,clk:1,ld:0,sl:2,rv:0}),4);
 assert.equal(mod.inferObjective('Remarketing site',{imp:1,clk:1,ld:5,sl:0,rv:0}),5);
 assert.equal(mod.inferObjective('X',{imp:1,clk:1,ld:5,sl:0,rv:0}),3);
 assert.equal(mod.inferObjective('X',{imp:1,clk:9,ld:0,sl:0,rv:0}),1);
});
test('normaliza dispositivo e sexo e descarta detalhamento sem campanha conhecida',()=>{
 assert.equal(mod.normalizeDevice('mobile_app'),'Mobile');
 assert.equal(mod.normalizeDevice('DESKTOP'),'Desktop');
 assert.equal(mod.normalizeDevice('connected_tv'),'Outros');
 assert.equal(mod.normalizeGender('female'),'Feminino');
 assert.equal(mod.normalizeGender('unknown'),'Não informado');
 const d=mod.buildPainelDataset({end:'2026-11-01',currency:'BRL',ads:[ad()],breakdowns:[brk(),brk({campaign_id:'outra'})],crm:[],creatives:[]});
 assert.equal(d.brk.length,1);
 assert.equal(d.dims.device[d.brk[0][3]],'Mobile');
});
test('ordena faixas etárias e mantém os índices coerentes',()=>{
 const d=mod.buildPainelDataset({end:'2026-11-01',currency:'BRL',ads:[ad()],breakdowns:[brk({dimension_type:'age',dimension_value:'35-44',dimension_label:'35-44'}),brk({dimension_type:'age',dimension_value:'18-24',dimension_label:'18-24'})],crm:[],creatives:[]});
 assert.deepEqual(d.dims.age,['18-24','35-44']);
 const labels=d.brk.map(r=>d.dims.age[r[3]]);
 assert.deepEqual(labels,['35-44','18-24']);
});
test('agrupa CRM por canal',()=>{
 const d=mod.buildPainelDataset({end:'2026-11-01',currency:'BRL',ads:[],breakdowns:[],crm:[{metric_date:'2026-11-01',channel:'whatsapp',revenue:300,purchases:2,leads:null} as never],creatives:[]});
 assert.deepEqual(d.crmChannels,['whatsapp']);
 assert.deepEqual(d.crm[0],[59,0,300,2,0]);
});
