import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTypescript} from './helpers/load-typescript';

type Mod=typeof import('../supabase/functions/_shared/api-connectors');
const m=loadTypescript<Mod>(new URL('../supabase/functions/_shared/api-connectors.ts',import.meta.url),()=>({}));
const now='2026-11-04T10:00:00.000Z';

test('origem do CRM vira canal aceito, sem adivinhar quando não há evidência',()=>{
 assert.equal(m.crmChannel('PAID_SOCIAL','Facebook'),'meta_ads');
 assert.equal(m.crmChannel('PAID_SOCIAL','instagram.com'),'meta_ads');
 assert.equal(m.crmChannel('PAID_SOCIAL','TikTok'),'tiktok_ads');
 assert.equal(m.crmChannel('PAID_SEARCH',''),'google_ads');
 assert.equal(m.crmChannel('ORGANIC_SEARCH',''),'organic');
 assert.equal(m.crmChannel('DIRECT_TRAFFIC',''),'direct');
 assert.equal(m.crmChannel('PAID_SOCIAL',''),'unattributed');
 assert.equal(m.crmChannel('',''),'unattributed');
});

test('HubSpot: negócios ganhos somam receita e vendas no dia do fechamento; contatos viram leads',()=>{
 const facts=m.hubspotCrmFacts({organizationId:'org',integrationId:'int',portalId:'123',fallbackCurrency:'BRL',now,
  deals:[{properties:{amount:'1000.50',closedate:'2026-11-01T15:00:00Z',deal_currency_code:'BRL',hs_analytics_source:'PAID_SEARCH'}},{properties:{amount:'500',closedate:'2026-11-01T18:00:00Z',hs_analytics_source:'PAID_SEARCH'}},{properties:{amount:null,closedate:'2026-11-02T10:00:00Z',hs_analytics_source:'DIRECT_TRAFFIC'}}],
  contacts:[{properties:{createdate:'2026-11-01T09:00:00Z',hs_analytics_source:'PAID_SEARCH'}},{properties:{createdate:'invalida'}}]});
 const google=facts.find(f=>f.metric_date==='2026-11-01'&&f.channel==='google_ads')!;
 assert.equal(google.revenue,1500.5);assert.equal(google.purchases,2);assert.equal(google.leads,1);
 assert.equal(google.source,'crm');assert.equal(google.account_id,'123');assert.equal(google.campaign_id,'');
 const direct=facts.find(f=>f.channel==='direct')!;
 assert.equal(direct.purchases,1);assert.equal(direct.revenue,null,'valor ausente não vira zero');
 assert.equal(facts.length,2,'contato com data inválida é descartado');
});

test('RD Station CRM: só negócios vendidos contam, com a fonte do negócio como canal',()=>{
 const facts=m.rdCrmFacts({organizationId:'org',integrationId:'int',accountId:'rdcrm:abc',currency:'BRL',now,
  deals:[{win:true,closed_at:'2026-11-03T12:00:00-03:00',amount_total:2000,deal_source:{name:'Facebook Ads'}},{win:false,closed_at:'2026-11-03T12:00:00-03:00',amount_total:999},{win:true,closed_at:'2026-11-03T13:00:00-03:00',amount_total:'300'}]});
 const meta=facts.find(f=>f.channel==='meta_ads')!;assert.equal(meta.revenue,2000);assert.equal(meta.purchases,1);
 const other=facts.find(f=>f.channel==='unattributed')!;assert.equal(other.revenue,300);
 assert.equal(facts.reduce((s,f)=>s+(f.purchases??0),0),2);
});

test('TikTok: relatório diário por anúncio vira métrica de anúncio, sem inventar leads ou receita',()=>{
 const facts=m.tiktokAdFacts({organizationId:'org',integrationId:'int',advertiserId:'adv',currency:'brl',now,
  rows:[{dimensions:{ad_id:'111',stat_time_day:'2026-11-02 00:00:00'},metrics:{spend:'12.5',impressions:'1000',clicks:'20',conversion:'3',campaign_id:'c1',campaign_name:'Campanha TikTok',reach:'800',video_play_actions:'400'}},{dimensions:{ad_id:'',stat_time_day:'2026-11-02 00:00:00'},metrics:{spend:'1'}}]});
 assert.equal(facts.length,1);
 const f=facts[0];
 assert.equal(f.platform,'tiktok_ads');assert.equal(f.metric_date,'2026-11-02');assert.equal(f.currency,'BRL');
 assert.equal(f.spend,12.5);assert.equal(f.impressions,1000);assert.equal(f.clicks,20);assert.equal(f.conversions,3);
 assert.equal(f.leads,null);assert.equal(f.revenue,null);assert.equal(f.campaign_id,'c1');assert.equal(f.attribution_window,'tiktok_default');
});

test('endereços de autorização levam a URL de retorno e o estado assinado',()=>{
 const h=new URL(m.hubspotAuthorizeUrl('cid','https://x.supabase.co/functions/v1/meta-auth/callback','st'));
 assert.equal(h.host,'app.hubspot.com');assert.equal(h.searchParams.get('state'),'st');assert.ok(h.searchParams.get('scope')!.includes('crm.objects.deals.read'));
 const t=new URL(m.tiktokAuthorizeUrl('app','https://x.supabase.co/functions/v1/meta-auth/callback','st'));
 assert.equal(t.host,'business-api.tiktok.com');assert.equal(t.searchParams.get('app_id'),'app');assert.equal(t.searchParams.get('state'),'st');
});
