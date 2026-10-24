import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('agency-only directory shows existing Auth accounts without requiring an invitation',()=>{
 const source=readFileSync('src/app/(agency)/admin/users/page.tsx','utf8');
 assert.match(source,/await requireAdmin\(\)/);
 assert.match(source,/admin\.auth\.admin\.listUsers\(\{page:1,perPage:200\}\)/);
 assert.match(source,/Sem cliente vinculado/);
 assert.match(source,/Configurar acesso →/);
 assert.match(source,/privileged\?<span/);
 assert.match(source,/Não foi possível consultar as contas/);
});
