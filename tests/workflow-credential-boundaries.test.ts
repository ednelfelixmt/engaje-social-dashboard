import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow = (name: string) =>
  readFileSync(new URL('../.github/workflows/' + name, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

const names = [
  'quality.yml',
  'phase02-final-auth.yml',
  'phase02-protected-isolation.yml',
  'staging-security.yml',
] as const;

test('CI and protected workflows pin approved actions, disable git credential persistence and use a fixed runner', () => {
  for (const name of names) {
    const source = workflow(name);
    assert.match(source, /^permissions:\n  contents: read$/m, name);
    assert.match(source, /^    runs-on: ubuntu-24\.04$/m, name);
    assert.ok(source.includes('actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1'), name);
    assert.ok(source.includes('actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1'), name);
    assert.match(source, /^          persist-credentials: false$/m, name);
    assert.match(source, /^          node-version: '22'$/m, name);
    assert.doesNotMatch(source, /^    env:$/m, 'No workflow may put secrets at job scope: ' + name);
  }
});

test('privileged synthetic Storage upload requires an explicit opt-in, with secret limited to its step', () => {
  const source = workflow('phase02-final-auth.yml');
  assert.match(source, /^        default: false$/m);
  const upload = source.split('      - name: Provision private synthetic fixtures through Storage API')[1]
    ?.split('      - name: Real A/B authenticated read-only isolation')[0];
  assert.ok(upload, 'The provisioning step must exist');
  assert.ok(upload.includes('if: ' + '$' + '{{ inputs.provision_private_fixtures }}'));
  assert.ok(upload.includes('MEDIAHUB_SERVICE_ROLE_KEY: ' + '$' + '{{ secrets.PHASE02_SERVICE_ROLE_KEY }}'));
  assert.equal(source.split('MEDIAHUB_SERVICE_ROLE_KEY').length - 1, 1);
  assert.doesNotMatch(source.split('      - run: npm ci')[1]?.split('      - name: Validate')[0] ?? '', /secrets\./);
});

test('protected A/B read-only credentials are not inherited by checkout, setup-node or npm ci', () => {
  const source = workflow('phase02-protected-isolation.yml');
  assert.match(source, /      - name: Assert protected fixture configuration\n        env:/);
  assert.match(source, /      - name: Execute read-only isolation verifier\n        env:/);
  const bootstrap = source.split('    steps:\n')[1]?.split('      - name: Assert protected fixture configuration')[0] ?? '';
  assert.doesNotMatch(bootstrap, /secrets\./);
  const installation = source.split('      - run: npm ci --ignore-scripts')[1]
    ?.split('      - name: Execute read-only isolation verifier')[0] ?? '';
  assert.doesNotMatch(installation, /secrets\./);
  assert.ok(source.includes('run: npm run verify:production-isolation'));
});

test('authenticated gates remain manual and protected; tests do not substitute live tenant validation', () => {
  for (const name of names.filter(name => name !== 'quality.yml')) {
    const source = workflow(name);
    assert.match(source, /workflow_dispatch:/, name);
    assert.doesNotMatch(source, /^  push:$/m, name);
    assert.doesNotMatch(source, /^  pull_request:$/m, name);
    assert.match(source, /^    environment: (phase02-homologation|staging)$/m, name);
  }
});
