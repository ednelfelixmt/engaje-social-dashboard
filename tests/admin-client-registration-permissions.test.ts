import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');
test('admin client page offers standalone registration',()=>{
 const page=read('src/app/(agency)/admin/organizations/page.tsx');
 assert.match(page,/ActionForm action=\{createOrganization\}/);
 assert.match(page,/name="slug"/);
 assert.match(page,/name="niche"/);
 assert.match(page,/name="sales_model"/);
});
test('only viewer access can be assigned to clients through admin UI and server action',()=>{
 const detail=read('src/app/(agency)/admin/users/[userId]/page.tsx');
 const actions=read('src/app/(agency)/admin/actions.ts');
 assert.match(detail,/name="role" value="viewer"/);
 assert.doesNotMatch(detail,/<option value="editor">/);
 assert.doesNotMatch(detail,/<option value="client_admin">/);
 assert.match(actions,/role:z\.literal\('viewer'\)/);
 assert.match(actions,/await requireAdmin\(\)/);
});
