import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(path:string)=>readFileSync(path,'utf8');
const root='src/app/(tenant)/[organizationSlug]';

test('agency-only tenant helper fails closed for every non-superadmin',()=>{
 const auth=source('src/lib/auth/session.ts');
 assert.match(auth,/export async function agencyTenant\(slug:string\)\{const t=await tenant\(slug\);if\(!t\.superAdmin\)notFound\(\);return t;\}/);
});

test('all administrative tenant pages gate before loading data or rendering controls',()=>{
 for(const path of ['settings/branding/page.tsx','settings/dashboard/page.tsx','settings/integrations/page.tsx','settings/data-quality/page.tsx','sharing/page.tsx']){
  const code=source(root+'/'+path);
  assert.match(code,/agencyTenant\(/,path);
  assert.doesNotMatch(code,/await tenant\(/,path);
  assert.doesNotMatch(code,/\['client_admin','editor'\]\.includes/,path);
 }
});

test('viewer navigation excludes the entire settings and sharing group',()=>{
 const nav=source('src/components/navigation.tsx');
 const layout=source(root+'/layout.tsx');
 assert.match(nav,/\.filter\(\(group\)=>admin\|\|canShare\|\|group\.id!=='settings'\)/);
 assert.match(layout,/const canShare=superAdmin;/);
 assert.match(layout,/<Navigation slug=\{org\.slug\} enabled=\{config\?\.enabled_pages\} canShare=\{canShare\}\/>/);
});
