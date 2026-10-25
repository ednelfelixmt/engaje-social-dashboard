import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTestDatabase} from '../scripts/local-database';
let db:Awaited<ReturnType<typeof createTestDatabase>>,baseline:string,migration:string,conservative:string;
const a='22222222-2222-4222-8222-222222222222',b='33333333-3333-4333-8333-333333333333';
const userA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',userB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const intA='11111111-1111-4111-8111-111111111111',intB='44444444-4444-4444-8444-444444444444',crm='55555555-5555-4555-8555-555555555555';
async function definition(){return (await db.query<{definition:string}>("select pg_get_viewdef('public.daily_performance'::regclass,true) as definition")).rows[0].definition;}
async function install(value:string){await db.exec('create or replace view public.daily_performance with (security_invoker=true) as '+value);}
async function rows(){return (await db.query<Record<string,unknown>>('select * from public.daily_performance order by organization_id,metric_date,currency')).rows;}
const isoDate=(value:unknown)=>value instanceof Date?value.toISOString().slice(0,10):String(value);
function withoutROI(values:Record<string,unknown>[]){return values.map(({roi:_roi,...rest})=>rest);}
async function root(){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");}
async function asUser(id:string){await root();await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
before(async()=>{
 db=await createTestDatabase();baseline=await definition();
 migration=await readFile(new URL('../supabase/migrations/20261025232744_withhold_unverified_financial_roi.sql',import.meta.url),'utf8');
 conservative=await readFile(new URL('./fixtures/daily-performance-production-view.sql',import.meta.url),'utf8');
 await db.query('insert into auth.users(id) values($1),($2)',[userA,userB]);
 await db.query("insert into public.organizations(id,name,slug) values($1,'Synthetic A','synthetic-roi-a'),($2,'Synthetic B','synthetic-roi-b')",[a,b]);
 await db.query("insert into public.organization_members(organization_id,user_id,role) values($1,$2,'viewer'),($3,$4,'viewer')",[a,userA,b,userB]);
 await db.query("insert into public.integrations(id,organization_id,provider,external_account_id,account_name) values($1,$2,'meta_ads','synthetic-a','Synthetic A'),($3,$4,'meta_ads','synthetic-b','Synthetic B'),($5,$2,'hubspot','synthetic-crm','Synthetic CRM')",[intA,a,intB,b,crm]);
 await db.query("insert into public.metrics_ads(organization_id,integration_id,metric_date,platform,account_id,campaign_id,campaign_name,ad_id,currency,spend,revenue,purchases,impressions,clicks,attribution_window) values($1,$2,'2026-10-01','meta_ads','a','campaign','Synthetic','ad','BRL',100,200,2,1000,10,'7d_click'),($1,$2,'2026-10-02','meta_ads','a','campaign','Synthetic','ad','BRL',0,0,0,0,0,'7d_click'),($1,$2,'2026-10-03','meta_ads','a','campaign','Synthetic','ad','BRL',100,0,0,1000,10,'7d_click'),($3,$4,'2026-10-01','meta_ads','b','campaign','Synthetic','ad','BRL',500,1000,10,2000,20,'7d_click')",[a,intA,b,intB]);
 await db.query("insert into public.metrics_crm(organization_id,integration_id,source,metric_date,currency,revenue,purchases,is_complete) values($1,$2,'crm','2026-10-01','BRL',300,3,true),($1,$2,'crm','2026-10-02','BRL',0,0,true)",[a,crm]);
});
after(async()=>{await db.close();});
test('ROI stays unknown while ROAS and known ratios remain usable',async()=>{
 const data=await rows();assert.ok(data.every(row=>row.roi===null));const day=data.find(row=>row.organization_id===a&&isoDate(row.metric_date)==='2026-10-01')!;
 assert.equal(Number(day.revenue),300);assert.equal(Number(day.roas),3);assert.equal(Number(day.ctr),1);assert.ok(Math.abs(Number(day.cpa)-100/3)<0.000001);
 const zero=data.find(row=>row.organization_id===a&&isoDate(row.metric_date)==='2026-10-02')!;assert.equal(Number(zero.revenue),0);assert.equal(zero.roas,null);assert.equal(zero.cpa,null);assert.equal(zero.ctr,null);
});
test('legacy expression is replaced without changing revenue policy, rows or grants',async()=>{
 await root();const legacy=baseline.replace('NULL::numeric AS roi','(revenue - spend) / NULLIF(spend, 0::numeric) * 100::numeric AS roi');assert.notEqual(legacy,baseline);await install(legacy);
 const before=await rows();assert.ok(before.some(row=>row.roi!==null));const grants=(await db.query("select relacl from pg_class where oid='public.daily_performance'::regclass")).rows;
 await db.exec(migration);const after=await rows();assert.ok(after.every(row=>row.roi===null));assert.deepEqual(withoutROI(after),withoutROI(before));assert.deepEqual((await db.query("select relacl from pg_class where oid='public.daily_performance'::regclass")).rows,grants);
});
test('production revenue_enabled gate and CRM-only revenue survive the migration',async()=>{
 await root();await db.exec('alter table public.dashboard_configs add column if not exists revenue_enabled boolean not null default true');await install(conservative);
 const before=await rows();await db.exec(migration);assert.deepEqual(withoutROI(await rows()),withoutROI(before));
 await db.query('update public.dashboard_configs set revenue_enabled=false where organization_id=$1',[a]);const disabled=(await rows()).filter(row=>row.organization_id===a);assert.ok(disabled.every(row=>row.revenue===null&&row.revenue_source==='unavailable'&&row.roi===null));
 await db.query('update public.dashboard_configs set revenue_enabled=true where organization_id=$1',[a]);const adsOnly=(await rows()).find(row=>row.organization_id===a&&isoDate(row.metric_date)==='2026-10-03')!;assert.equal(adsOnly.revenue,null);assert.equal(adsOnly.roas,null);
 await install(baseline);
});
test('reapplication is idempotent and always preserves security_invoker',async()=>{
 await root();await db.exec(migration);const before=await definition();await db.exec(migration);assert.equal(await definition(),before);const options=(await db.query<{reloptions:string[]}>("select reloptions from pg_class where oid='public.daily_performance'::regclass")).rows[0].reloptions;assert.ok(options.includes('security_invoker=true'));
});
test('unknown financial expression fails closed instead of replacing an unreviewed view',async()=>{
 await root();await install(baseline.replace('NULL::numeric AS roi','spend * 2 AS roi'));const before=await definition();await assert.rejects(db.exec(migration),/Unexpected daily_performance ROI/);await db.exec('rollback');assert.equal(await definition(),before);await install(baseline);
});
test('tenant RLS remains enforced in both directions after replacing view definition',async()=>{
 for(const [user,org,other] of [[userA,a,b],[userB,b,a]]){await asUser(user);const data=await rows();assert.ok(data.length>0);assert.ok(data.every(row=>row.organization_id===org));assert.ok(data.every(row=>row.organization_id!==other));assert.ok(data.every(row=>row.roi===null));}
 await root();await db.exec('set role anon');await assert.rejects(db.query('select * from public.daily_performance'),/permission denied/);await root();
});
test('migration changes no marketing source records',async()=>{
 await root();const query='select (select count(*) from public.metrics_ads) ads,(select count(*) from public.metrics_crm) crm,(select sum(spend) from public.metrics_ads) spend';const before=(await db.query(query)).rows;await db.exec(migration);assert.deepEqual((await db.query(query)).rows,before);
});
