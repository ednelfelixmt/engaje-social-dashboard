import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTypescript} from './helpers/load-typescript';
import type {Filters as FilterType} from '../src/lib/metrics/query';
const {Filters} = loadTypescript<{Filters: React.ComponentType<{value: FilterType; organizations: {name: string; slug: string}[]; slug: string}>}>(new URL('../src/components/dashboard/filters.tsx', import.meta.url), (id, native) => {
 if (id === 'next/navigation') return {useRouter: () => ({push() {throw new Error('No navigation during render');}}), usePathname: () => '/synthetic/funnel', useSearchParams: () => new URLSearchParams()};
 return native(id);
});
const render = (compare: FilterType['compare']) => renderToStaticMarkup(React.createElement(Filters, {value: {from: '2024-02-29', to: '2024-03-01', compare, currency: 'BRL'}, organizations: [{name: 'Synthetic organization', slug: 'synthetic'}], slug: 'synthetic'}));

test('filter shows applied annual dates and the explicit leap-day policy', () => {
 const html = render('previous_year');
 assert.ok(html.includes('Comparação aplicada: 28/02/2023 a 01/03/2023'));
 assert.ok(html.includes('29/02 é ajustado para 28/02'));
});

test('filter shows prior period dates without annual policy and hides disabled comparison', () => {
 const html = render('previous_period');
 assert.ok(html.includes('Comparação aplicada: 27/02/2024 a 28/02/2024'));
 assert.doesNotMatch(html, /Datas do calendário anterior/);
 assert.doesNotMatch(render('none'), /Comparação aplicada/);
});
