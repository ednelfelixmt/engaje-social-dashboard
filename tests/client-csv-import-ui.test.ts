import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('CSV import action is visible only to agency admin',()=>{
 const source=readFileSync('src/app/(tenant)/[organizationSlug]/[section]/page.tsx','utf8');
 assert.match(source,/superAdmin \? <UploadForm organizationId=\{org\.id\} \/>/);
 assert.match(source,/Importações são gerenciadas pela agência/);
});
