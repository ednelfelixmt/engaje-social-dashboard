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
  insert into public.metrics_organic_accounts(organization_id,integration_id,metric_date,platform,account_id,followers,reach) values
    ('${orgA}','${intA}','2026-09-01','instagram_organic','ig',1200,500),
    ('${orgB}','${intB}','2026-09-01','instagram_organic','igb',9000,4000);
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
  insert into public.platform_connections(id,agency_organization_id,target_organization_id,provider,external_user_id,account_name,status) values
    ('60000000-0000-0000-0000-000000000002','${agency}','${orgB}','meta_ads','meta-user-b','Meta User B','connected');
  insert into public.platform_assets(id,connection_id,provider,asset_type,external_id,name,asset_status) values
    ('70000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000002','meta_ads','ad_account','act_b','Conta B','assigned');
  insert into public.client_asset_assignments(id,organization_id,asset_id,integration_id) values
    ('80000000-0000-0000-0000-000000000002','${orgB}','70000000-0000-0000-0000-000000000002','${intB}');
  insert into public.sync_configs(assignment_id,metric_family) values ('${assignmentA}','paid');
  insert into public.sync_jobs(organization_id,connection_id,assignment_id,status) values ('${orgA}','${connectionA}','${assignmentA}','completed');
  insert into public.integration_alerts(organization_id,alert_key,code,severity,title) values ('${orgA}','test-alert','stale_sync','warning','Conta sem atualização');
`);
check(await scalar("select count(*)::int from pg_tables where schemaname='public'") === 25, 'Exatamente 25 tabelas públicas, incluindo convites');
check(await scalar("select count(*)::int from pg_tables where schemaname='public' and rowsecurity") === 25, 'RLS habilitada nas 25 tabelas');
check(await scalar("select rowsecurity from pg_tables where schemaname='private' and tablename='agency_admin_audit'") === true, 'Auditoria privada mantém RLS');
check(await scalar("select has_table_privilege('authenticated','private.agency_admin_audit','SELECT')") === false, 'Auditoria sem leitura direta de authenticated');
check(await scalar("select has_table_privilege('authenticated','public.agency_user_invitations','SELECT') or has_table_privilege('authenticated','public.client_user_invitations','SELECT')") === false, 'Convites continuam privados');
check(await scalar("select has_function_privilege('anon','public.save_client_membership(uuid,uuid,boolean)','EXECUTE') or has_function_privilege('anon','public.client_admin_audit(uuid,integer)','EXECUTE')") === false, 'Anon sem RPC administrativa ou de auditoria');
let day = (await db.query<Record<string, unknown>>(`select * from public.daily_performance where organization_id='${orgA}' and metric_date='2026-09-01' and currency='BRL'`)).rows[0]!;
check(Number(day.spend) === 200 && Number(day.revenue) === 600, 'JOIN não multiplica Ads nem soma CRM com planilha');
check(Number(day.roas) === 3 && Math.abs(Number(day.cpa) - 200/6) < 0.00001, 'ROAS e CPA conciliados');
check(day.roi === null, 'ROI financeiro indisponível sem custos completos');
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

check(await scalar("select count(*)::int from public.platform_assets") === 1, 'Viewer vê somente o ativo vinculado ao próprio cliente');
check(await scalar("select count(*)::int from public.platform_assets where name='Conta B'") === 0, 'Viewer não vê ativo atribuído a outro cliente');
check(await scalar(`select count(*)::int from public.client_asset_assignments where organization_id='${orgB}'`) === 0, 'Viewer não vê vínculo de ativos de outra empresa');
check(await scalar(`select count(*)::int from public.platform_connections where target_organization_id='${orgB}'`) === 0, 'Viewer não enumera conexões de outra empresa');

check(await scalar(`select count(*)::int from public.daily_performance where organization_id='${orgB}'`) === 0, 'View respeita RLS de outro cliente');
check(await scalar('select public.is_super_admin()') === false, 'Viewer não é super admin');
for (const table of ['profiles','organization_members','branding','dashboard_configs','ad_campaigns','metrics_ads','metrics_ads_breakdowns','metrics_crm','metrics_organic','metrics_organic_accounts','creatives','spreadsheet_uploads','client_asset_assignments','sync_jobs','integration_alerts']) {
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

await db.exec(`reset role;
 insert into auth.users values ('20000000-0000-0000-0000-000000000004'),('20000000-0000-0000-0000-000000000005');
 insert into public.organization_members(organization_id,user_id,role) values
 ('${orgA}','20000000-0000-0000-0000-000000000004','client_admin'),
 ('${orgB}','20000000-0000-0000-0000-000000000005','viewer');
 insert into public.profiles(organization_id,user_id) values ('${orgA}','${editor}'),('${orgA}','20000000-0000-0000-0000-000000000004');
 insert into storage.objects(bucket_id,name) values
 ('branding','${orgA}/fixture.png'),('branding','${orgB}/fixture.png'),
 ('spreadsheets','${orgA}/fixture.csv'),('spreadsheets','${orgB}/fixture.csv');
 insert into public.user_dashboard_layouts(user_id,organization_id,scope,layout) values
 ('${viewer}','${orgA}','overview','{}'),('${editor}','${orgA}','overview','{}'),
 ('20000000-0000-0000-0000-000000000004','${orgA}','overview','{}');
`);
for(const [actor,role] of [[viewer,'viewer'],[editor,'editor'],['20000000-0000-0000-0000-000000000004','client_admin']]){
 await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${actor}',false);`);
 check(await scalar(`select count(*)::int from public.organizations where id='${orgA}'`)===1,role+': lê o próprio cliente');
 check(await scalar(`select count(*)::int from public.organizations where id='${orgB}'`)===0,role+': não lê o outro cliente');
 check((await db.query(`update public.branding set primary_color='#FFFFFF' where organization_id='${orgA}' returning organization_id`)).rows.length===0,role+': não edita branding próprio');
 check((await db.query(`update public.dashboard_configs set default_layouts='{"overview":{}}' where organization_id='${orgA}' returning organization_id`)).rows.length===0,role+': não edita configuração própria');
 check((await db.query(`delete from public.branding where organization_id='${orgA}' returning organization_id`)).rows.length===0,role+': não apaga branding');
 await denied(`insert into public.branding(organization_id) values ('${orgB}')`,'42501',role+': não insere configuração em outro tenant');
 check((await db.query(`update public.profiles set display_name='synthetic change' where user_id='${actor}' returning user_id`)).rows.length===0,role+': não edita perfil próprio');
 check(await scalar('select count(*)::int from public.user_dashboard_layouts')===1,role+': pode ler seu layout existente');
 await denied(`insert into public.user_dashboard_layouts(user_id,organization_id,scope,layout) values ('${actor}','${orgA}','paid','{}')`,'42501',role+': não cria layout próprio');
 check((await db.query("update public.user_dashboard_layouts set layout='{}' returning user_id")).rows.length===0,role+': não altera layout existente');
 check((await db.query('delete from public.user_dashboard_layouts returning user_id')).rows.length===0,role+': não apaga layout existente');
 check(await scalar(`select count(*)::int from storage.objects where name like '${orgA}/%'`)===2,role+': lê os dois arquivos próprios');
 check(await scalar(`select count(*)::int from storage.objects where name like '${orgB}/%'`)===0,role+': não lê arquivos alheios');
 for(const bucket of ['branding','spreadsheets']){
  await denied(`insert into storage.objects(bucket_id,name) values ('${bucket}','${orgA}/forbidden')`,'42501',role+': upload próprio negado em '+bucket);
  check((await db.query(`update storage.objects set name='${orgA}/changed' where bucket_id='${bucket}' returning id`)).rows.length===0,role+': substituição negada em '+bucket);
  check((await db.query(`delete from storage.objects where bucket_id='${bucket}' returning id`)).rows.length===0,role+': exclusão negada em '+bucket);
 }
 await denied(`insert into storage.objects(bucket_id,name) values ('branding','invalid/fixture.png')`,'42501',role+': prefixo inválido não permite upload');
 await denied(`select public.import_spreadsheet('${orgA}','${orgA}/fixture.csv','fixture.csv',repeat('c',64),'[{"metric_date":"2026-10-03","currency":"BRL","revenue":"42"}]'::jsonb)`,'42501',role+': RPC privilegiada recusa importação válida');
 await db.exec('reset role');
}
// Positive read canaries in both directions; SQL role simulation is not Auth HTTP E2E.
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000005',false);`);
check(await scalar(`select count(*)::int from public.organizations where id='${orgB}'`)===1,'Viewer B lê B');
check(await scalar(`select count(*)::int from public.organizations where id='${orgA}'`)===0,'Viewer B não lê A');
check(await scalar(`select count(*)::int from storage.objects where name like '${orgB}/%'`)===2,'Viewer B lê arquivos B');
check(await scalar(`select count(*)::int from storage.objects where name like '${orgA}/%'`)===0,'Viewer B não lê arquivos A');
await db.exec(`reset role; update public.organizations set status='paused' where id='${orgA}'; set role authenticated; select set_config('request.jwt.claim.sub','${viewer}',false);`);
check(await scalar('select count(*)::int from public.metrics_ads')===0,'Organização pausada perde acesso no banco');
await db.exec(`reset role; update public.organizations set status='active' where id='${orgA}'; update public.organization_members set is_active=false where user_id='${viewer}'; set role authenticated;`);
check(await scalar('select count(*)::int from public.organizations')===0,'Membership revogado perde leitura no contexto SQL');
await db.exec(`reset role; update public.organization_members set is_active=true where user_id='${viewer}'; set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false);`);
check(await scalar('select public.is_super_admin()')===true,'Superadmin ativo da agência reconhecido');
check(await scalar('select count(*)::int from public.organizations')===3,'Superadmin vê os tenants autorizados');
check((await db.query(`update public.branding set primary_color='#FFFFFF' where organization_id='${orgA}' returning organization_id`)).rows.length===1,'Agência edita branding');
check((await db.query(`update public.dashboard_configs set default_layouts='{"overview":{}}' where organization_id='${orgA}' returning organization_id`)).rows.length===1,'Agência define layout padrão');
check((await db.query(`update public.profiles set display_name='Synthetic viewer' where user_id='${viewer}' returning user_id`)).rows.length===1,'Agência gerencia perfil');
await denied(`update public.branding set organization_id='${orgB}' where organization_id='${orgA}'`,'23514','Nem administrador move configuração entre tenants');
await db.exec(`insert into storage.objects(bucket_id,name) values ('branding','${orgA}/admin.png')`);
check((await db.query(`update storage.objects set name='${orgA}/admin-updated.png' where name='${orgA}/admin.png' returning id`)).rows.length===1,'Agência substitui arquivo de branding');
check((await db.query(`delete from storage.objects where name='${orgA}/admin-updated.png' returning id`)).rows.length===1,'Agência remove arquivo de branding');
await db.exec(`insert into public.user_dashboard_layouts(user_id,organization_id,scope,layout) values ('${admin}','${orgA}','overview','{}')`);
check(await scalar('select count(*)::int from public.user_dashboard_layouts')===1,'Administrador lê seu layout');
check((await db.query("update public.user_dashboard_layouts set layout='{}' returning user_id")).rows.length===1,'Administrador atualiza seu layout');
check((await db.query('delete from public.user_dashboard_layouts returning user_id')).rows.length===1,'Administrador restaura seu layout');
await denied(`insert into public.user_dashboard_layouts(user_id,organization_id,scope,layout) values ('${admin}','${orgA}','Escopo Inválido','{}')`,'23514','Escopo inválido recusado');
await denied(`insert into public.user_dashboard_layouts(user_id,organization_id,scope,layout) values ('${admin}','${orgA}','paid','[]')`,'23514','Layout precisa ser objeto');
await denied(`insert into public.user_dashboard_layouts(user_id,organization_id,scope,layout) values ('${admin}','${orgA}','paid','{"x":"${'a'.repeat(17000)}"}')`,'23514','Layout acima de 16 KB recusado');
await db.exec(`select public.import_spreadsheet('${orgA}','${orgA}/fixture.csv','fixture.csv',repeat('c',64),'[{"metric_date":"2026-10-03","currency":"BRL","revenue":"42","purchases":"1"}]'::jsonb)`);
check(Number(await scalar(`select revenue from public.metrics_crm where organization_id='${orgA}' and metric_date='2026-10-03'`))===42,'Agência importa receita sintética pela RPC');
check(await scalar(`select count(*)::int from public.metrics_crm where organization_id='${orgB}' and metric_date='2026-10-03'`)===0,'Importação não grava no outro tenant');
await db.exec('reset role');
await denied(`insert into public.client_asset_assignments(organization_id,asset_id) values ('${orgB}','${assetA}')`,'23505','Ativo não pertence simultaneamente a dois clientes');
await denied(`insert into public.creatives(organization_id,integration_id,platform,account_id,external_id,kind) values ('${orgB}','${intA}','meta_ads','b','invalid','image')`,'23503','FK composta bloqueia integração de outro tenant');
await denied(`insert into public.metrics_ads(organization_id,integration_id,metric_date,platform,account_id,campaign_id,campaign_name,ad_id,currency,spend,attribution_window) values ('${orgA}','${intA}','2026-09-01','meta_ads','a','c1','Duplicada','ad1','BRL',100,'7d_click')`,'23505','Chave natural impede duplicação na ressincronização');
// Nicho e modelo de vendas do cliente: só aceitam identificadores em minúsculas.
await db.exec('reset role');
await db.exec(`update public.organizations set niche='health', sales_model='whatsapp' where id='${orgA}'`);
check(await scalar(`select niche||'/'||sales_model from public.organizations where id='${orgA}'`) === 'health/whatsapp', 'Nicho e modelo de vendas são gravados no cliente');
await denied(`update public.organizations set niche='Clínica e Saúde' where id='${orgA}'`, '23514', 'Nicho fora do formato é recusado');
await denied(`update public.organizations set sales_model='1 venda' where id='${orgA}'`, '23514', 'Modelo de vendas fora do formato é recusado');
await db.exec('set role anon');
await denied('select * from public.organizations','42501','Anon não enumera organizações');
await denied('select * from public.daily_performance','42501','Anon não lê performance');
await denied('select public.is_super_admin()','42501','Anon não executa helper');
await db.exec('reset role');
await db.close();
console.log(`\n${passed} verificações aprovadas. Auth HTTP, Storage HTTP e deploy não fazem parte deste teste.`);
