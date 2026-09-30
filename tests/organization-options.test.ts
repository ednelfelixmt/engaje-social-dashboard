import test from 'node:test';
import assert from 'node:assert/strict';
import {isValidTimezone, timezoneOptions, currencyOptions} from '../src/lib/organization-options';

test('isValidTimezone aceita fusos reais e recusa lixo', () => {
  for (const option of timezoneOptions) assert.ok(isValidTimezone(option.id), option.id);
  assert.ok(isValidTimezone('America/Bahia'));
  assert.ok(!isValidTimezone('Marte/Olympus'));
  assert.ok(!isValidTimezone(''));
  assert.ok(!isValidTimezone('<script>'));
});

test('as opções de moeda são códigos de 3 letras maiúsculas', () => {
  for (const option of currencyOptions) assert.match(option.id, /^[A-Z]{3}$/);
});
