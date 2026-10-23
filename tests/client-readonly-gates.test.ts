import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('tenant editor gate never grants client writes',()=>{
 const session=readFileSync('src/lib/auth/session.ts','utf8');
 assert.match(session,/if\(t\.superAdmin\)return \{\.\.\.t,canEdit:true\}/);
 assert.match(session,/return \{\.\.\.t,canEdit:false\}/);
 assert.doesNotMatch(session,/\['client_admin','editor'\]\.includes/);
});
test('dashboard configuration and branding writes require agency superadmin',()=>{
 const migration=readFileSync('supabase/migrations/20261023183000_client_dashboard_readonly.sql','utf8');
 for(const table of ['dashboard_configs','branding']){
  for(const action of ['insert','update','delete']){
   assert.match(migration,new RegExp('create policy config_'+action+' on public\\.'+table+' for '+action+' to authenticated'));
  }
 }
 assert.equal((migration.match(/private\.is_super_admin\(\)/g)||[]).length,8);
 assert.doesNotMatch(migration,/has_org_role/);
});
