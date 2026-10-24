import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('tenant personalization control requires superadmin and customizable content',()=>{
 const source=readFileSync('src/app/(tenant)/[organizationSlug]/[section]/page.tsx','utf8');
 assert.match(source,/const canCustomizeClient = superAdmin;/);
 assert.match(source,/actions=\{customizable && canCustomizeClient \? <PersonalizeBar\/> : undefined\}/);
 assert.doesNotMatch(source,/actions=\{customizable \? <PersonalizeBar\/> : undefined\}/);
});
