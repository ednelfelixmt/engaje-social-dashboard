import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import Papa from 'papaparse';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildRevenueReport, type RevenueScope} from '../src/lib/reports/revenue-report';
import {revenueReportCsv, revenueReportFilename} from '../src/lib/export/revenue-report';
import {loadTypescript} from './helpers/load-typescript';
import type {Row} from '../src/types/database.types';

const scope: RevenueScope = {
 organizationId:'11111111-1111-4111-8111-111111111111', organizationName: 'Synthetic A', organizationSlug: 'synthetic-a',
 timezone: 'America/Cuiaba', currency: 'BRL', source: 'crm',
 from: '2026-10-20', to: '2026-10-21', compare: 'previous_period',
};
const fact = (patch: Partial<Row<'metrics_crm'>> = {}) => ({
 id: 'PRIVATE-SYNTHETIC-ROW-ID', organization_id: scope.organizationId,
 source: 'crm', channel: 'unattributed', account_id: '', campaign_id: '',
 metric_date: scope.from, currency: 'BRL', revenue: -20, purchases: 0,
 leads: null, checkouts: 2, is_complete: true, synced_at: '2026-10-22T12:00:00.000Z',
 ...patch,
} as Row<'metrics_crm'>);

test('private revenue CSV follows authorized period totals, source and daily reconciliation', () => {
 const current = [
  fact(), fact({id: 'SECOND-PRIVATE-ID', metric_date: scope.to, revenue: 0, purchases: 1, leads: 4, checkouts: 0}),
  fact({id: 'OTHER-SOURCE-PRIVATE-ID', source: 'spreadsheet', revenue: 999}),
 ];
 const previous = [
  fact({id: 'PRIOR-PRIVATE-1', metric_date: '2026-10-18', revenue: 50, leads: 1}),
  fact({id: 'PRIOR-PRIVATE-2', metric_date: '2026-10-19', revenue: 60, leads: 2}),
 ];
 const report = buildRevenueReport(current, previous, scope);
 const csv = revenueReportCsv(report);
 const parsed = Papa.parse<Record<string, string>>(csv, {header: true, delimiter: ';'});
 assert.deepEqual(parsed.errors, []);
 assert.equal(parsed.data.length, 6); // two period totals + four daily details
 assert.equal(revenueReportCsv(report), csv);
 assert.ok(csv.startsWith('\ufeff"versao";"cliente"'));
 assert.ok(!csv.includes('PRIVATE-')); // Never export raw source record IDs.
 assert.ok(!csv.includes('999')); // Other source is explicitly excluded.
 const totals = parsed.data.find(row => row.tipo_linha === 'total_periodo' && row.periodo === 'atual')!;
 assert.equal(totals.fonte, 'crm');
 assert.equal(totals.moeda, 'BRL');
 assert.equal(totals.fuso_cadastral, 'America/Cuiaba');
 assert.equal(totals.modo_comparacao, 'previous_period');
 assert.equal(totals.registros_fonte_periodo, '2');
 assert.equal(totals.registros_outra_fonte_periodo, '1');
 assert.equal(totals.dias_esperados, '2');
 assert.equal(totals.dias_conciliados, '2');
 assert.equal(totals.dias_leads_validos, '1');
 assert.equal(totals.receita_liquida_informada, String(report.current.totals.revenue));
 assert.equal(totals.leads_informados, ''); // Never sum only known days.
 const first = parsed.data.find(row => row.tipo_linha === 'dia' && row.dia === scope.from)!;
 assert.equal(first.receita_liquida_informada, '-20'); // Refund.
 assert.equal(first.compras_informadas, '0'); // Measured zero.
 assert.equal(first.leads_informados, ''); // Unknown is not zero.
 assert.equal(first.situacao_conciliacao, 'declarada_pela_origem');
 assert.equal(first.ultima_sincronizacao_utc, '2026-10-22T12:00:00.000Z');
 const last = parsed.data.find(row => row.tipo_linha === 'dia' && row.dia === scope.to)!;
 assert.equal(last.receita_liquida_informada, '0');
 const comparison = parsed.data.find(row => row.tipo_linha === 'total_periodo' && row.periodo === 'comparativo')!;
 assert.equal(comparison.inicio, '2026-10-18');
 assert.equal(comparison.receita_liquida_informada, String(report.previous?.totals.revenue));
});

test('absent dates, incomplete facts and missing source cannot be exported as zeros', () => {
 const partial = buildRevenueReport([fact({is_complete: false})], [], scope);
 const parsed = Papa.parse<Record<string, string>>(revenueReportCsv(partial), {header: true, delimiter: ';'});
 assert.deepEqual(parsed.errors, []);
 assert.equal(parsed.data.length, 6); // comparison still has two missing calendar days
 assert.ok(parsed.data.filter(row => row.tipo_linha === 'total_periodo').every(row => row.receita_liquida_informada === ''));
 const pending = parsed.data.find(row => row.dia === scope.from)!;
 assert.equal(pending.situacao_conciliacao, 'pendente');
 assert.equal(pending.receita_liquida_informada, '');
 const absent = parsed.data.find(row => row.dia === scope.to)!;
 assert.equal(absent.situacao_conciliacao, 'sem_registro');
 assert.equal(absent.registros_dia, '0');
 assert.equal(absent.ultima_sincronizacao_utc, '');
 const empty = buildRevenueReport([], [], {...scope, source: 'spreadsheet', compare: 'none'});
 const rows = Papa.parse<Record<string, string>>(revenueReportCsv(empty), {header: true, delimiter: ';'});
 assert.deepEqual(rows.errors, []);
 assert.equal(rows.data.length, 3); // current total + two calendar days
 assert.ok(rows.data.every(row => row.fonte === 'spreadsheet' && row.receita_liquida_informada === ''));
 assert.ok(rows.data.every(row => row.periodo === 'atual'));
});

test('CSV neutralizes spreadsheet formula text and produces a path-safe bounded filename', () => {
 const dangerous = ' =SUM(1;2)\n"Test"';
 const report = buildRevenueReport([fact()], [], {...scope, organizationName: dangerous, compare: 'none'});
 const parsed = Papa.parse<Record<string, string>>(revenueReportCsv(report), {header: true, delimiter: ';'});
 assert.deepEqual(parsed.errors, []);
 assert.ok(parsed.data.every(row => row.cliente === "'" + dangerous));
 const filename = revenueReportFilename({...scope, organizationSlug: '../unsafe / C\n=1'});
 assert.ok(!filename.includes('/') && !filename.includes('\\') && !filename.includes('\n'));
 assert.ok(filename.endsWith('-receita-crm-2026-10-20-2026-10-21-previous_period.csv'));
 assert.ok(revenueReportFilename({...scope, organizationSlug: '/'.repeat(150)}).length < 150);
});

let message = '', clicks = 0, fail = false;
const {RevenueReportExport} = loadTypescript<{
 RevenueReportExport: (props: {content: string; filename: string; disabled: boolean}) => React.ReactElement
}>(new URL('../src/components/dashboard/revenue-report-export.tsx', import.meta.url), (id, native) => {
 if (id === 'react') return {...React, useId: () => 'revenue-csv-note', useState: () => [message, (value: string) => {message = value;}]};
 if (id === '@/lib/export/download') return {downloadCsv: () => {clicks++; if (fail) throw new Error('PRIVATE UPSTREAM ERROR');}};
 return native(id);
});
function button(node: React.ReactNode): React.ReactElement<{onClick: () => void; disabled: boolean}> | undefined {
 if (!React.isValidElement<{children?: React.ReactNode}>(node)) return;
 if (node.type === 'button') return node as React.ReactElement<{onClick: () => void; disabled: boolean}>;
 for (const child of React.Children.toArray(node.props.children)) {
  const found = button(child);
  if (found) return found;
 }
}
test('client download executes only on click and never for disabled or empty content', () => {
 clicks = 0; message = ''; fail = false;
 const enabled = RevenueReportExport({content: 'synthetic', filename: 'synthetic.csv', disabled: false});
 assert.equal(clicks, 0);
 assert.equal(button(enabled)?.props.disabled, false);
 assert.ok(renderToStaticMarkup(enabled).includes('aria-describedby="revenue-csv-note"'));
 button(enabled)!.props.onClick();
 assert.equal(clicks, 1);
 button(RevenueReportExport({content: 'synthetic', filename: 'synthetic.csv', disabled: true}))!.props.onClick();
 button(RevenueReportExport({content: '', filename: 'synthetic.csv', disabled: false}))!.props.onClick();
 assert.equal(clicks, 1);
});
test('download errors are sanitized, not leaked into customer-facing messages', () => {
 clicks = 0; message = ''; fail = true;
 button(RevenueReportExport({content: 'synthetic', filename: 'synthetic.csv', disabled: false}))!.props.onClick();
 const html = renderToStaticMarkup(RevenueReportExport({content: 'synthetic', filename: 'synthetic.csv', disabled: false}));
 assert.ok(html.includes('role="alert"'));
 assert.ok(html.includes('Não foi possível preparar o CSV'));
 assert.ok(!html.includes('PRIVATE UPSTREAM ERROR'));
 fail = false;
});


test('spreadsheet year comparison exports each canonical metric without coercing overflow or inventing a leap date',()=>{
 const report=buildRevenueReport([fact({source:'spreadsheet',metric_date:'2024-02-29',revenue:Number.MAX_VALUE,purchases:3,leads:0,checkouts:null}),fact({id:'synthetic-2',source:'spreadsheet',channel:'direct',metric_date:'2024-02-29',revenue:Number.MAX_VALUE,purchases:4,leads:0,checkouts:2})],[fact({source:'spreadsheet',metric_date:'2023-02-28',revenue:-0.000001,purchases:0,leads:5,checkouts:1})],{...scope,source:'spreadsheet',from:'2024-02-29',to:'2024-02-29',compare:'previous_year'});
 const before=JSON.stringify(report);const csv=revenueReportCsv(report);assert.equal(JSON.stringify(report),before);
 const parsed=Papa.parse<Record<string,string>>(csv,{header:true,delimiter:';'});assert.deepEqual(parsed.errors,[]);assert.equal(parsed.data.length,4);
 const columns={revenue:'receita_liquida_informada',purchases:'compras_informadas',leads:'leads_informados',checkouts:'checkouts_informados'} as const;
 for(const [label,period] of [['atual',report.current],['comparativo',report.previous!]] as const){const rows=parsed.data.filter(row=>row.periodo===label);assert.ok(rows.every(row=>row.fonte==='spreadsheet'));for(const row of rows){const values=row.tipo_linha==='dia'?period.days[0].values:period.totals;for(const key of Object.keys(columns) as (keyof typeof columns)[])assert.equal(row[columns[key]],values[key]===null?'':String(values[key]));}}
 assert.equal(parsed.data.find(row=>row.periodo==='comparativo'&&row.tipo_linha==='dia')?.dia,'2023-02-28');assert.ok(!csv.includes('Infinity'));assert.ok(!csv.includes('NaN'));
});
