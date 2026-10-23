import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('save and reset layout actions require agency superadmin',()=>{
 const source=readFileSync('src/app/(tenant)/[organizationSlug]/layout-actions.ts','utf8');
 assert.equal((source.match(/if \(!superAdmin\) return \{ok:false,message:'Somente administradores podem personalizar dashboards\.'\};/g)||[]).length,2);
 assert.doesNotMatch(source,/Somente editores e administradores definem/);
});
test('dashboard sharing option is only exposed to agency superadmin',()=>{
 const source=readFileSync('src/app/(tenant)/[organizationSlug]/layout.tsx','utf8');
 assert.match(source,/const canShare=superAdmin;/);
 assert.doesNotMatch(source,/\['editor','client_admin'\]\.includes/);
});
