import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {validateInitialPassword} from '../src/lib/auth/initial-password';

const actions = readFileSync('src/app/(agency)/admin/actions.ts', 'utf8');
const page = readFileSync('src/app/(agency)/admin/users/page.tsx', 'utf8');

test('cadastro direto exige administrador e não concede acesso a clientes', () => {
  const body = actions.slice(actions.indexOf('export async function createClientUser'));
  assert.match(body, /await requireAdmin\(\)/);
  assert.match(body, /email_confirm:\s*true/);
  assert.doesNotMatch(body, /organization_members|save_client_membership/);
});

test('política da senha inicial: tamanho mínimo, letras e números', () => {
  assert.ok(validateInitialPassword('curta1'));
  assert.ok(validateInitialPassword('somenteletrasaqui'));
  assert.ok(validateInitialPassword('123456789012345'));
  assert.equal(validateInitialPassword('SenhaForte2026x'), null);
  assert.ok(validateInitialPassword('x'.repeat(73) + '1'));
  assert.ok(validateInitialPassword('zf@123'), 'senhas curtas e previsíveis são recusadas');
});

test('a tela oferece o cadastro sem convite e avisa que nada é enviado por e-mail', () => {
  assert.match(page, /createClientUser/);
  assert.match(page, /Cadastrar sem convite/);
  assert.match(page, /Nenhum e-mail é enviado/);
});
