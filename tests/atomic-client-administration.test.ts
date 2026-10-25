import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {createTestDatabase} from '../scripts/local-database';

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const agency='11111111-1111-4111-8111-111111111111', clientA='22222222-2222-4222-8222-222222222222', clientB='33333333-3333-4333-8333-333333333333';
const admin='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', viewer='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', target='cccccccc-cccc-4ccc-8ccc-cccccccccccc', unconfirmed='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const steps=[{metric:'impressions',label:'Impressões'},{metric:'leads',label:'Leads'}];
const sqlSteps=JSON.stringify(steps);
async function root(){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");}
async function asUser(id:string){await root();await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function asAdmin(){await asUser(admin);}
async function create(slug='synthetic-created'){return db.query('select public.create_client_organization($1,$2,$3,$4,$5,$6::jsonb) as result',['Synthetic client',slug,'retail','whatsapp','lead_generation',sqlSteps]);}
async function update(overrides:{id?:string;name?:string;apply?:boolean;timezone?:string;currency?:string;model?:string;steps?:unknown}={}){return db.query('select public.update_client_organization($1,$2,$3::public.organization_status,$4,$5,$6,$7,$8,$9,$10::jsonb) as result',[overrides.id??clientA,overrides.name??'Synthetic updated','active','retail','whatsapp',overrides.timezone??'America/Cuiaba',overrides.currency??'BRL',overrides.apply??true,overrides.model??'lead_generation',JSON.stringify(overrides.steps??steps)]);}
async function member(org=clientA,user=target,active=true){return db.query<{result:{revoked_invitations:number}}> ('select public.save_client_membership($1,$2,$3) as result',[org,user,active]);}
async function snapshot(){await root();return (await db.query('select name,status,niche,sales_model,timezone,currency,updated_at from public.organizations where id=$1',[clientA])).rows[0];}
async function failTrigger(table:string){await root();await db.exec("create or replace function private.synthetic_failure() returns trigger language plpgsql as $$ begin raise exception 'synthetic second-write failure'; end; $$; create trigger synthetic_second_write before update on public."+table+' for each row execute function private.synthetic_failure()');}
async function dropFailure(table:string){await root();await db.exec('drop trigger if exists synthetic_second_write on public.'+table);}

before(async()=>{
 db=await createTestDatabase();
 await db.query('insert into auth.users(id,email_confirmed_at) values ($1,now()),($2,now()),($3,now()),($4,null)',[admin,viewer,target,unconfirmed]);
 await db.query("insert into public.organizations(id,name,slug,is_agency) values ($1,'Synthetic agency','synthetic-agency',true),($2,'Synthetic A','synthetic-a',false),($3,'Synthetic B','synthetic-b',false)",[agency,clientA,clientB]);
 await db.query("insert into public.organization_members(organization_id,user_id,role) values ($1,$2,'super_admin'),($3,$4,'viewer')",[agency,admin,clientA,viewer]);
});
after(async()=>{await db.close();});

test('agency creates client, branding and configured funnel in one RPC',async()=>{
 await asAdmin();const result=await create();assert.equal(result.rows.length,1);
 await root();const row=(await db.query<{funnel_steps:unknown}>('select d.funnel_steps from public.organizations o join public.branding b on b.organization_id=o.id join public.dashboard_configs d on d.organization_id=o.id where o.slug=$1',['synthetic-created'])).rows[0];assert.deepEqual(row.funnel_steps,steps);
});
test('second-write failure rolls back creation and initialization records',async()=>{
 await root();const before=(await db.query('select (select count(*) from public.organizations) organizations,(select count(*) from public.branding) branding,(select count(*) from public.dashboard_configs) configs')).rows;
 await failTrigger('dashboard_configs');try{await asAdmin();await assert.rejects(create('synthetic-rollback'),/synthetic second-write/);}finally{await dropFailure('dashboard_configs');}
 const after=(await db.query('select (select count(*) from public.organizations) organizations,(select count(*) from public.branding) branding,(select count(*) from public.dashboard_configs) configs')).rows;assert.deepEqual(after,before);
});
test('update and funnel commit together and can preserve a custom funnel',async()=>{
 await asAdmin();await update();await root();assert.deepEqual((await db.query('select funnel_steps from public.dashboard_configs where organization_id=$1',[clientA])).rows[0].funnel_steps,steps);
 await asAdmin();await update({name:'Synthetic renamed',apply:false,steps:[]});await root();assert.deepEqual((await db.query('select funnel_steps from public.dashboard_configs where organization_id=$1',[clientA])).rows[0].funnel_steps,steps);
});
test('second-write error restores every organization field, including updated_at',async()=>{
 const before=await snapshot();await failTrigger('dashboard_configs');try{await asAdmin();await assert.rejects(update({name:'Must roll back'}),/synthetic second-write/);}finally{await dropFailure('dashboard_configs');}assert.deepEqual(await snapshot(),before);
});
test('missing config is an error and rolls back the organization update',async()=>{
 const before=await snapshot();await db.query('delete from public.dashboard_configs where organization_id=$1',[clientA]);
 try{await asAdmin();await assert.rejects(update(),/Client configuration missing/);assert.deepEqual(await snapshot(),before);}finally{await root();await db.query('insert into public.dashboard_configs(organization_id) values ($1)',[clientA]);}
});
test('invalid timezone, currency and funnel reject the entire operation',async()=>{
 const before=await snapshot();for(const change of [{timezone:'Invalid/Zone'},{currency:'INVALID'},{steps:[{metric:'leads',label:'x'},{metric:'leads',label:'duplicate'}]},{steps:{not:'an array'}}]){await asAdmin();await assert.rejects(update(change));assert.deepEqual(await snapshot(),before);}
});
test('agency record cannot be updated through the client RPC',async()=>{await asAdmin();await assert.rejects(update({id:agency}),/Client not found/);await assert.rejects(member(agency),/Client not found/);});
test('reserved slug is rejected by database even when bypassing the form',async()=>{await asAdmin();await assert.rejects(create('admin'),/Invalid client settings/);});

for(const role of ['viewer','editor','client_admin'])test(role+' cannot create, edit or assign access in own or other tenant',async()=>{
 await root();await db.query('update public.organization_members set role=$1::public.member_role where organization_id=$2 and user_id=$3',[role,clientA,viewer]);await asUser(viewer);
 await assert.rejects(create('synthetic-denied-'+role),/Agency administrator required/);
 await assert.rejects(db.query('select public.client_admin_audit($1,50)',[clientA]),/Agency administrator required/);
 for(const org of [clientA,clientB]){await assert.rejects(update({id:org}),/Agency administrator required/);await assert.rejects(member(org),/Agency administrator required/);}
});
test('anonymous caller has no execute grant on any administrative RPC',async()=>{
 await root();await db.exec('set role anon');await assert.rejects(create('synthetic-anon'),/permission denied/);await assert.rejects(update(),/permission denied/);await assert.rejects(member(),/permission denied/);await assert.rejects(db.query('select public.client_admin_audit($1,50)',[clientA]),/permission denied/);
});
test('revoked or paused agency administrator cannot mutate clients',async()=>{
 await root();await db.query('update public.organization_members set is_active=false where organization_id=$1 and user_id=$2',[agency,admin]);await asAdmin();await assert.rejects(update(),/Agency administrator required/);
 await root();await db.query('update public.organization_members set is_active=true where organization_id=$1 and user_id=$2',[agency,admin]);await db.query("update public.organizations set status='paused' where id=$1",[agency]);await asAdmin();await assert.rejects(member(),/Agency administrator required/);await root();await db.query("update public.organizations set status='active' where id=$1",[agency]);
});
test('confirmed user receives only viewer and pending revocation is scoped to this client',async()=>{
 await root();await db.query("insert into public.client_user_invitations(organization_id,user_id,email,role) values ($1,$3,'synthetic@example.test','editor'),($2,$3,'synthetic@example.test','viewer')",[clientA,clientB,target]);
 await asAdmin();const result=await member();assert.equal(result.rows[0].result.revoked_invitations,1);
 await root();assert.deepEqual((await db.query('select role,is_active from public.organization_members where organization_id=$1 and user_id=$2',[clientA,target])).rows[0],{role:'viewer',is_active:true});
 assert.equal((await db.query('select status from public.client_user_invitations where organization_id=$1 and user_id=$2',[clientB,target])).rows[0].status,'pending');
 await asAdmin();assert.equal((await member()).rows[0].result.revoked_invitations,0);
});
test('invitation revocation error rolls back an existing membership change',async()=>{
 await root();await db.query("update public.organization_members set is_active=false,role='editor' where organization_id=$1 and user_id=$2",[clientA,target]);await db.query("update public.client_user_invitations set status='pending' where organization_id=$1 and user_id=$2",[clientA,target]);
 await failTrigger('client_user_invitations');try{await asAdmin();await assert.rejects(member(),/synthetic second-write/);}finally{await dropFailure('client_user_invitations');}
 assert.deepEqual((await db.query('select role,is_active from public.organization_members where organization_id=$1 and user_id=$2',[clientA,target])).rows[0],{role:'editor',is_active:false});assert.equal((await db.query('select status from public.client_user_invitations where organization_id=$1 and user_id=$2',[clientA,target])).rows[0].status,'pending');
});
test('invitation revocation error also rolls back a new membership insert',async()=>{
 await failTrigger('client_user_invitations');try{await asAdmin();await assert.rejects(member(clientB),/synthetic second-write/);}finally{await dropFailure('client_user_invitations');}
 assert.equal((await db.query('select * from public.organization_members where organization_id=$1 and user_id=$2',[clientB,target])).rows.length,0);
});
for(const status of ['pending','revoked','expired'])test(status+' registration cannot activate an access but never blocks deactivation',async()=>{
 await root();await db.query("insert into public.agency_user_invitations(user_id,email,status) values ($1,'synthetic@example.test',$2) on conflict(user_id) do update set status=excluded.status",[target,status]);
 await asAdmin();await assert.rejects(member(),/Registration not completed/);await member(clientA,target,false);
});
test('accepted registration with confirmed Auth identity can be activated',async()=>{await root();await db.query("update public.agency_user_invitations set status='accepted' where user_id=$1",[target]);await asAdmin();await member();});
test('unconfirmed and missing Auth identities cannot be activated',async()=>{
 await asAdmin();await assert.rejects(member(clientA,unconfirmed),/Registration not completed/);await assert.rejects(member(clientA,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),/Auth identity not found/);
});
test('private invitation records stay inaccessible to authenticated users',async()=>{
 await asAdmin();await assert.rejects(db.query('select * from public.agency_user_invitations'),/permission denied/);await assert.rejects(db.query('select * from public.client_user_invitations'),/permission denied/);
});
test('public wrappers remain invoker; only private membership transaction is definer',async()=>{
 await root();const rows=(await db.query<{schema:string;proname:string;prosecdef:boolean;proconfig:string[]}> ("select n.nspname as schema,p.proname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname in ('create_client_organization','update_client_organization','save_client_membership') order by n.nspname,p.proname")).rows;
 assert.equal(rows.length,6);for(const row of rows){assert.equal(row.prosecdef,row.schema==='private'&&row.proname==='save_client_membership');assert.ok(row.proconfig.some(value=>value.startsWith('search_path=')));}
});


test('audit commits actor, scoped membership and revocation without invitation email',async()=>{
 await root();await db.query("update public.client_user_invitations set status='pending' where organization_id=$1 and user_id=$2",[clientA,target]);
 await asAdmin();await member(clientA,target,false);
 const events=(await db.query<{result: {actor_id:string;event:string;subject_user_id:string}[]}>('select public.client_admin_audit($1,100) as result',[clientA])).rows[0].result;
 assert.ok(events.some(event=>event.event==='membership_changed'&&event.actor_id===admin&&event.subject_user_id===target));assert.ok(events.some(event=>event.event==='invitation_revoked'&&event.actor_id===admin));
 assert.doesNotMatch(JSON.stringify(events),/synthetic@example.test/);
});
test('intermediate failure rolls back its audit trail as well as the state',async()=>{
 await root();await db.query("update public.client_user_invitations set status='pending' where organization_id=$1 and user_id=$2",[clientA,target]);
 const before=(await db.query('select count(*) from private.agency_admin_audit')).rows;
 await failTrigger('client_user_invitations');try{await asAdmin();await assert.rejects(member(),/synthetic second-write/);}finally{await dropFailure('client_user_invitations');}
 assert.deepEqual((await db.query('select count(*) from private.agency_admin_audit')).rows,before);
});
test('clients cannot read or forge administrative audit history',async()=>{
 await asUser(viewer);await assert.rejects(db.query('select public.client_admin_audit($1,50)',[clientA]),/Agency administrator required/);
 await assert.rejects(db.query('select * from private.agency_admin_audit'),/permission denied/);await assert.rejects(db.query("insert into private.agency_admin_audit(actor_id,organization_id,event) values ($1,$2,'client_created')",[viewer,clientA]),/permission denied/);
});
test('audit lookup is scoped to one client and bounded to at most 100 events',async()=>{
 await asAdmin();const a=(await db.query<{result:unknown[]}>('select public.client_admin_audit($1,1) as result',[clientA])).rows[0].result;assert.equal(a.length,1);
 const b=(await db.query<{result:unknown[]}>('select public.client_admin_audit($1,1000) as result',[clientB])).rows[0].result;assert.ok(b.length<=100);assert.doesNotMatch(JSON.stringify(b),/client_created/);
 await assert.rejects(db.query('select public.client_admin_audit($1,50)',[agency]),/Client not found/);
});


test('funnel-only change is audited even when organization fields do not change',async()=>{
 await asAdmin();await update({steps:[{metric:'impressions',label:'Entrega'},{metric:'purchases',label:'Vendas'}]});
 const events=(await db.query<{result:{event:string;after_state:{changed_fields?:string[]}}[]}>('select public.client_admin_audit($1,100) as result',[clientA])).rows[0].result;
 assert.ok(events.some(event=>event.event==='client_funnel_updated'&&event.after_state.changed_fields?.includes('funnel_steps')));
 assert.doesNotMatch(JSON.stringify(events),/Entrega/);
});
