import assert from 'node:assert/strict';
import { createTestDatabase } from './local-database';

const db = await createTestDatabase();
let passed = 0;
function check(value: unknown, message: string): void {
  assert.ok(value, message); passed++; console.log(`OK ${passed}: ${message}`);
}
async function scalar(sql: string): Promise<unknown> {
  const result = await db.query<Record<string, unknown>>(sql);
  return Object.values(result.rows[0] ?? {})[0];
}
async function denied(sql: string, code: string, message: string): Promise<void> {
  let failed = false;
  try { await db.exec(sql); } catch (e) {
    assert.equal((e as { code: string }).code, code, message); failed = true;
  }
  check(failed, message);
}
const orgA = '10000000-0000-0000-0000-000000000001';
const orgB = '10000000-0000-0000-0000-000000000002';
const agency = '10000000-0000-0000-0000-000000000003';
const viewer = '20000000-0000-0000-0000-000000000001';
const editor = '20000000-0000-0000-0000-000000000002';
const admin = '20000000-0000-0000-0000-000000000003';
const intA = '30000000-0000-0000-0000-000000000001';
const intB = '30000000-0000-0000-0000-000000000002';
const crmA = '30000000-0000-0000-0000-000000000003';
const uploadA = '40000000-0000-0000-0000-000000000001';
const creativeA = '50000000-0000-0000-0000-000000000001';
const connectionA = '60000000-0000-0000-0000-000000000001';
const assetA = '70000000-0000-0000-0000-000000000001';
const assignmentA = '80000000-0000-0000-0000-000000000001';
await db.exec(`
  insert into auth.users values ('${viewer}'),('${editor}'),('${admin}');
  insert into public.organizations(id,name,slug,is_agency) values
    ('${orgA}','Cliente A','cliente-a',false),('${orgB}','Cliente B','cliente-b',false),('${agency}','Agência','agencia',true);
  insert into public.organization_members(organization_id,user_id,role) values
    ('${orgA}','${viewer}','viewer'),('${orgA}','${editor}','editor'),('${agency}','${admin}','super_admin'),('${orgB}','${admin}','client_admin');
  insert into public.profiles(organization_id,user_id) values ('${orgA}','${viewer}'),('${orgB}','${admin}');
  insert into public.integrations(id,organization_id,provider,external_account_id,account_name) values
    ('${intA}','${orgA}','meta_ads','a','Conta A'),('${intB}','${orgB}','meta_ads','b','Conta B'),
    ('${crmA}','${orgA}','hubspot','c','CRM A');
  insert into public.ad_campaigns(organization_id,integration_id,platform,account_id,external_id,name,status) values
    ('${orgA}','${intA}','meta_ads','a','c1','Campanha 1','ACTIVE'),
    ('${orgA}','${intA}','meta_ads','a','c2','Campanha 2','PAUSED'),
    ('${orgB}','${intB}','meta_ads','b','b','Privada','ACTIVE');
  insert into public.spreadsheet_uploads(id,organization_id,uploaded_by,file_path,file_name,sha256) values
    ('${uploadA}','${orgA}','${admin}','${orgA}/file.csv','file.csv',repeat('a',64)),
    ('40000000-0000-0000-0000-000000000002','${orgB}','${admin}','${orgB}/file.csv','file.csv',repeat('b',64));
  insert into public.creatives(id,organization_id,integration_id,platform,account_id,external_id,kind) values
    ('${creativeA}','${orgA}','${intA}','instagram_organic','ig','post','image'),
    ('50000000-0000-0000-0000-000000000002','${orgB}','${intB}','instagram_organic','igb','postb','image');
  insert into public.metrics_organic(organization_id,integration_id,creative_id,metric_date,platform) values
    ('${orgA}','${intA}','${creativeA}','2026-09-01','instagram_organic'),
    ('${orgB}','${intB}','50000000-0000-0000-0000-000000000002','2026-09-01','instagram_organic');
  insert into public.metrics_ads(organization_id,integration_id,metric_date,platform,account_id,campaign_id,campaign_name,ad_id,currency,spend,revenue,impressions,clicks,purchases,attribution_window) values
    ('${orgA}','${intA}','2026-09-01','meta_ads','a','c1','Campanha 1','ad1','BRL',100,900,1000,100,9,'7d_click'),
    ('${orgA}','${intA}','2026-09-01','meta_ads','a','c2','Campanha 2','ad2','BRL',100,100,1000,100,1,'7d_click'),
    ('${orgA}','${intA}','2026-09-02','meta_ads','a','c1','Campanha 1','ad1','BRL',100,300,1000,100,3,'7d_click'),
    ('${orgA}','${intA}','2026-09-03','meta_ads','a','c1','Campanha 1','ad1','BRL',0,100,1000,100,1,'7d_click'),
    ('${orgA}','${intA}','2026-09-01','meta_ads','a','usd','USD','usd','USD',10,20,100,10,1,'7d_click'),
    ('${orgB}','${intB}','2026-09-01','meta_ads','b','b','Privada','b','BRL',1000,9000,1000,100,10,'7d_click');
  insert into public.metrics_ads_breakdowns(organization_id,integration_id,metric_date,platform,account_id,campaign_id,campaign_name,dimension_type,dimension_value,dimension_label,currency,spend,impressions,clicks,leads,attribution_window) values
    ('${orgA}','${intA}','2026-09-01','meta_ads','a','c1','Campanha 1','age','25-34','25 a 34','BRL',100,1000,100,10,'7d_click'),
    ('${orgB}','${intB}','2026-09-01','meta_ads','b','b','Privada','city','999','Cidade privada','BRL',1000,1000,100,10,'7d_click');
  insert into public.metrics_crm(organization_id,integration_id,source,metric_date,currency,channel,account_id,campaign_id,revenue,purchases,is_complete) values
    ('${orgA}','${crmA}','crm','2026-09-01','BRL','meta_ads','a','c1',400,4,true),
    ('${orgA}','${crmA}','crm','2026-09-01','BRL','meta_ads','a','c2',200,2,true),
    ('${orgA}','${crmA}','crm','2026-09-02','BRL','unattributed','','',0,0,true),
    ('${orgA}','${crmA}','crm','2026-09-04','BRL','unattributed','','',100,1,true);
  insert into public.metrics_crm(organization_id,spreadsheet_upload_id,source,metric_date,currency,revenue,purchases,is_complete) values
    ('${orgA}','${uploadA}','spreadsheet','2026-09-01','BRL',700,7,true),
    ('${orgB}','40000000-0000-0000-0000-000000000002','spreadsheet','2026-09-01','BRL',10000,10,true);
  insert into public.platform_connections(id,agency_organization_id,target_organization_id,provider,external_user_id,account_name,status) values
    ('${connectionA}','${agency}','${orgA}','meta_ads','meta-user-a','Meta User A','connected');
  insert into public.platform_assets(id,connection_id,provider,asset_type,external_id,name,asset_status) values
    ('${assetA}','${connectionA}','meta_ads','ad_account','act_a','Conta A','assigned');
  insert into public.client_asset_assignments(id,organization_id,asset_id,integration_id) values
    ('${assignmentA}','${orgA}','${assetA}','${intA}');
  insert into public.sync_configs(assignment_id,metric_family) values ('${assignmentA}','paid');
  insert into public.sync_jobs(organization_id,connection_id,assignment_id,status) values ('${orgA}','${connectionA}','${assignmentA}','completed');
  insert into public.integration_alerts(organization_id,alert_key,code,severity,title) values ('${orgA}','test-alert','stale_sync','warning','Conta sem atualização');
`);
check(await scalar("select count(*)::int from pg_tables where schemaname='public'") === 20, 'Exatamente 20 tabelas públicas');
check(await scalar("select count(*)::int from pg_tables where schemaname='public' and rowsecurity") === 20, 'RLS habilitada nas 20 tabelas');
let day = (await db.query<Record<string, unknown>>(`select * from public.daily_performance where organization_id='${orgA}' and metric_date='2026-09-01' and currency='BRL'`)).rows[0]!;
check(Number(day.spend) === 200 && Number(day.revenue) === 600, 'JOIN não multiplica Ads nem soma CRM com planilha');
check(Number(day.roas) === 3 && Number(day.roi) === 200 && Math.abs(Number(day.cpa) - 200/6) < 0.00001, 'ROAS, ROI e CPA reais');
check(await scalar(`select revenue_source from public.daily_performance where organization_id='${orgA}' and metric_date='2026-09-01' and currency='USD'`) === 'ads', 'Moedas separadas e fallback Ads');
check(Number(await scalar(`select revenue from public.daily_performance where organization_id='${orgA}' and metric_date='2026-09-02'`)) === 0, 'Receita real zero não vira receita da plataforma');
check(await scalar(`select cpa from public.daily_performance where organization_id='${orgA}' and metric_date='2026-09-02'`) === null, 'Sem compras: CPA null');
check(await scalar(`select roas from public.daily_performance where organization_id='${orgA}' and metric_date='2026-09-03'`) === null, 'Sem investimento: ROAS null');
check(Number(await scalar(`select spend from public.daily_performance where organization_id='${orgA}' and metric_date='2026-09-04'`)) === 0, 'Dia só de CRM incluído');
await db.exec(`update public.dashboard_configs set preferred_revenue_source='spreadsheet' where organization_id='${orgA}'`);
check(Number(await scalar(`select revenue from public.daily_performance where organization_id='${orgA}' and metric_date='2026-09-01' and currency='BRL'`)) === 700, 'Preferência por planilha respeitada');
await db.exec(`update public.metrics_crm set is_complete=false where source='spreadsheet'; update public.metrics_crm set is_complete=false where source='crm' and campaign_id='c1';`);
check(await scalar(`select revenue_source from public.daily_performance where organization_id='${orgA}' and metric_date='2026-09-01' and currency='BRL'`) === 'ads', 'Importações incompletas não substituem receita');

await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${viewer}',false);`);
check(await scalar('select count(*)::int from public.organizations') === 1, 'Viewer só vê sua organização');
check(await scalar(`select count(*)::int from public.daily_performance where organization_id='${orgB}'`) === 0, 'View respeita RLS de outro cliente');
check(await scalar('select public.is_super_admin()') === false, 'Viewer não é super admin');
for (const table of ['profiles','organization_members','branding','dashboard_configs','ad_campaigns','metrics_ads','metrics_ads_breakdowns','metrics_crm','metrics_organic','creatives','spreadsheet_uploads','client_asset_assignments','sync_jobs','integration_alerts']) {
  check(await scalar(`select count(*)::int from public.${table} where organization_id='${orgB}'`) === 0, `${table}: sem leitura cross-tenant`);
}
check(await scalar(`select count(id)::int from public.integrations where organization_id='${orgB}'`) === 0, 'integrations: sem leitura cross-tenant');
await denied('select credential_secret_id from public.integrations', '42501', 'Referência de segredo não exposta');
await denied(`insert into public.organization_members(organization_id,user_id,role) values ('${agency}','${viewer}','super_admin')`, '23514', 'Autopromoção bloqueada');
await denied(`insert into public.organization_members(organization_id,user_id,role) values ('${orgB}','${viewer}','client_admin')`, '42501', 'Autoinclusão em outro cliente bloqueada por RLS');
check((await db.query(`update public.organization_members set role='super_admin' where user_id='${viewer}' returning *`)).rows.length === 0, 'Alteração de role por viewer bloqueada');
check((await db.query(`update public.branding set primary_color='#FFFFFF' where organization_id='${orgA}' returning *`)).rows.length === 0, 'Viewer não edita branding');
await denied(`delete from public.metrics_ads where organization_id='${orgA}'`, '42501', 'Browser não apaga métricas');
await denied(`insert into public.metrics_ads default values`, '42501', 'Browser não falsifica métricas');
await db.exec(`select set_config('request.jwt.claim.sub','${editor}',false)`);
check((await db.query(`update public.branding set primary_color='#FFFFFF' where organization_id='${orgA}' returning organization_id`)).rows.length === 1, 'Editor edita branding próprio');
check((await db.query(`update public.branding set primary_color='#FFFFFF' where organization_id='${orgB}' returning organization_id`)).rows.length === 0, 'Editor não edita outro cliente');
await denied(`update public.branding set organization_id='${orgB}' where organization_id='${orgA}'`, '23514', 'Movimentação de tenant bloqueada');
await db.exec(`insert into storage.objects(bucket_id,name) values ('branding','${orgA}/cover.webp')`);
check(await scalar('select count(*)::int from storage.objects') === 1, 'Upload de branding próprio');
await denied(`insert into storage.objects(bucket_id,name) values ('branding','${orgB}/cover.webp')`, '42501', 'Storage bloqueia upload em outro tenant');
await denied(`insert into storage.objects(bucket_id,name) values ('branding','invalid/cover.webp')`, '42501', 'Storage rejeita prefixo inválido');
check((await db.query(`update storage.objects set name='${orgA}/new.webp' returning id`)).rows.length === 1, 'Storage permite substituição própria');
check((await db.query('delete from storage.objects returning id')).rows.length === 1, 'Storage permite remoção própria');
await db.exec(`reset role; update public.organizations set status='paused' where id='${orgA}'; set role authenticated;`);
check(await scalar('select count(*)::int from public.metrics_ads') === 0, 'Organização pausada perde acesso imediatamente');
await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false)`);
check(await scalar('select public.is_super_admin()') === true, 'Super admin da agência reconhecido');
check(await scalar('select count(*)::int from public.organizations') === 3, 'Super admin vê todos, inclusive pausados');
await db.exec('reset role');
await denied(`insert into public.client_asset_assignments(organization_id,asset_id) values ('${orgB}','${assetA}')`, '23505', 'Ativo não pode pertencer simultaneamente a dois clientes');
await denied(`insert into public.creatives(organization_id,integration_id,platform,account_id,external_id,kind) values ('${orgB}','${intA}','meta_ads','b','invalid','image')`, '23503', 'FK composta bloqueia integração de outro tenant');
await denied(`insert into public.metrics_ads(organization_id,integration_id,metric_date,platform,account_id,campaign_id,campaign_name,ad_id,currency,spend,attribution_window) values ('${orgA}','${intA}','2026-09-01','meta_ads','a','c1','Duplicada','ad1','BRL',100,'7d_click')`, '23505', 'Chave natural impede duplicação na ressincronização');
await db.exec('set role anon');
await denied('select * from public.organizations','42501','Anon não enumera organizações');
await denied('select * from public.daily_performance','42501','Anon não lê performance');
await denied('select public.is_super_admin()','42501','Anon não executa helper');
await db.exec('reset role');
await db.close();
console.log(`\n${passed} verificações aprovadas. Auth HTTP, Storage HTTP e deploy não fazem parte deste teste.`);
