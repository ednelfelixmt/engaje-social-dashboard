import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Funnel, type FunnelStep} from '../src/components/dashboard/funnel';

const render = (steps: FunnelStep[], comparing = true) => renderToStaticMarkup(React.createElement(Funnel, {steps, comparing}));

test('actual funnel displays coverage on desktop and mobile and explains its scope', () => {
  const html = render([{label: 'Cliques', value: null, costLabel: 'CPC', cost: null,
    detail: 'Total indisponível: 1 de 2 campanhas com valor válido.'}, {label: 'Leads', value: 2}]);
  assert.equal((html.match(/Total indisponível: 1 de 2 campanhas/g) ?? []).length, 1);
  assert.match(html, /não comprova completude da ingestão/);
  assert.match(html, /Taxa indisponível/); assert.doesNotMatch(html, /NaN|Infinity/);
});

test('actual funnel suppresses overflow in conversion, comparison and progress', () => {
  const html = render([{label: 'Entrada', value: 1e-308},
    {label: 'Saída', value: 1e308, previousValue: 1e-308, target: 1e-308}]);
  assert.doesNotMatch(html, /Infinity|NaN|aria-valuenow|vs. anterior/);
  assert.match(html, /Taxa indisponível/);
});

test('event counts above the prior step do not claim a negative loss', () => {
  const html = render([{label: 'Entrada', value: 10}, {label: 'Eventos', value: 20}]);
  assert.doesNotMatch(html, /% não avançam/);
  assert.match(html, /200/);
});

test('valid comparison, goal and real drop remain available', () => {
  const html = render([{label: 'Entrada', value: 100}, {label: 'Leads', value: 25, previousValue: 20, target: 50}]);
  assert.match(html, /75% não avançam/); assert.match(html, /25%/);
  assert.match(html, /aria-valuenow="50"/); assert.match(html, /vs. anterior/);
});
