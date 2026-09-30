import test from 'node:test';
import assert from 'node:assert/strict';
import {applyList, effectiveLayout, moveInList, parseLayout, toggleHidden, isEmptyLayout, MAX_IDS} from '../src/lib/layout/schema';

test('parseLayout descarta lixo e mantém só o que é válido', () => {
  assert.ok(isEmptyLayout(parseLayout(null)));
  assert.ok(isEmptyLayout(parseLayout('x')));
  assert.ok(isEmptyLayout(parseLayout([])));
  const layout = parseLayout({
    grids: {kpis: {order: ['a', 'b', 'a', 42, '<script>'], hidden: ['b']}, 'inválido key': {order: ['x']}, vazio: {}},
    blocks: {order: ['funnel', 'campaigns'], hidden: []},
    extra: 'ignorado',
  });
  assert.deepEqual(layout.grids, {kpis: {order: ['a', 'b'], hidden: ['b']}});
  assert.deepEqual(layout.blocks, {order: ['funnel', 'campaigns'], hidden: []});
});

test('parseLayout limita a quantidade de ids e de grades', () => {
  const many = Array.from({length: MAX_IDS + 50}, (_, index) => `id${index}`);
  assert.equal(parseLayout({blocks: {order: many}}).blocks?.order.length, MAX_IDS);
  const grids = Object.fromEntries(Array.from({length: 40}, (_, index) => [`g${index}`, {order: ['a']}]));
  assert.equal(Object.keys(parseLayout({grids}).grids).length, 20);
});

test('applyList ignora ids antigos e coloca ids novos no fim, visíveis', () => {
  const {order, hidden} = applyList(['a', 'b', 'c', 'd'], {order: ['c', 'zzz', 'a'], hidden: ['a', 'zzz']});
  assert.deepEqual(order, ['c', 'a', 'b', 'd']);
  assert.deepEqual([...hidden], ['a']);
  assert.deepEqual(applyList(['a', 'b'], undefined).order, ['a', 'b']);
});

test('moveInList e toggleHidden preservam o restante', () => {
  const known = ['a', 'b', 'c'];
  const moved = moveInList(undefined, known, 'c', 'a');
  assert.deepEqual(moved.order, ['c', 'a', 'b']);
  const hiddenOnce = toggleHidden(moved, 'a', known);
  assert.deepEqual(hiddenOnce, {order: ['c', 'a', 'b'], hidden: ['a']});
  assert.deepEqual(toggleHidden(hiddenOnce, 'a', known).hidden, []);
  assert.deepEqual(moveInList(moved, known, 'zzz', 'a'), {order: ['c', 'a', 'b'], hidden: []});
});

test('effectiveLayout: o layout pessoal vence o padrão do cliente', () => {
  const clientDefault = {blocks: {order: ['funnel'], hidden: []}};
  const mine = {blocks: {order: ['campaigns'], hidden: []}};
  const withMine = effectiveLayout(mine, clientDefault);
  assert.equal(withMine.personalized, true);
  assert.deepEqual(withMine.layout.blocks?.order, ['campaigns']);
  const withoutMine = effectiveLayout({}, clientDefault);
  assert.equal(withoutMine.personalized, false);
  assert.deepEqual(withoutMine.layout.blocks?.order, ['funnel']);
  assert.equal(effectiveLayout(null, null).personalized, false);
});
