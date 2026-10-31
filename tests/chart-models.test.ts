import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateTextWidth, formatAxisValue, formatChartValue, numericAxisWidth, categoryAxisWidth, wrapLabel, shortDate} from '../src/lib/charts/format';
import {groupSlices, safeSum, sharesOf, paretoSeries, waterfallBars, histogramBins, median, rampThresholds, rampStepFor, heatmapGrid, radarIndex, spreadLabels} from '../src/lib/charts/models';

test('formatação: ausência nunca vira zero e o eixo de valores pequenos mantém casas decimais', () => {
  assert.equal(formatChartValue({kind: 'money'}, null), '—');
  assert.equal(formatChartValue({kind: 'count'}, undefined), '—');
  assert.equal(formatChartValue({kind: 'count'}, Number.NaN), '—');
  assert.equal(formatChartValue({kind: 'percent'}, 1.5), '1,50%');
  assert.equal(formatChartValue({kind: 'count'}, 0), '0', 'zero observado é zero');
  assert.ok(formatChartValue({kind: 'money'}, 9000, {short: true}).replace(/\s/g, ' ') === 'R$ 9.000');
  assert.ok(formatChartValue({kind: 'money'}, 9000.5).includes(',50'), 'o valor exato mantém os centavos');
  const ticks = [8, 8.5, 9, 9.5].map(value => formatAxisValue({kind: 'money'}, value, 9.5));
  assert.equal(new Set(ticks).size, ticks.length, 'o eixo do CPL não repete "R$ 8, R$ 8, R$ 9"');
  const plain = (text: string) => text.replace(/ /g, ' ');
  assert.equal(plain(formatAxisValue({kind: 'count'}, 1300000, 1300000)), '1,3 mi');
  assert.equal(plain(formatAxisValue({kind: 'count'}, 15000, 1300000)), '15 mil');
});

test('larguras reservadas cobrem o maior rótulo e respeitam o teto', () => {
  assert.ok(numericAxisWidth({kind: 'money'}, 1_300_000) >= estimateTextWidth('R$ 1,3 mi') + 10);
  const long = '[ZF][Vendas][Conversão][WhatsApp] - Campanha Fecha Pesca';
  assert.equal(categoryAxisWidth([long], 1000), 240, 'teto de 240px');
  assert.equal(categoryAxisWidth([long], 300), 126, 'em painel estreito, no máximo 42% da largura');
  assert.equal(categoryAxisWidth(['A'], 1000), 84, 'piso de 84px');
  assert.ok(categoryAxisWidth(['Google Ads'], 1000) >= estimateTextWidth('Google Ads') + 20, 'um nome curto também ganha folga');
});

test('wrapLabel quebra em até duas linhas, usa reticências só quando corta e dá pontos de quebra entre tags', () => {
  const short = wrapLabel('Catálogo', 150);
  assert.deepEqual(short, {lines: ['Catálogo'], truncated: false, broken: false});
  const long = wrapLabel('[ZF][Vendas][Conversão][WhatsApp] - Campanha Fecha Pesca', 240);
  assert.equal(long.lines.length, 2);
  assert.ok(long.lines[0].startsWith('[ZF] [Vendas]'));
  const cut = wrapLabel('[ZF][Vendas][Conversão][WhatsApp] - Campanha Fecha Pesca', 120);
  assert.equal(cut.truncated, true);
  assert.ok(cut.lines[cut.lines.length - 1].endsWith('…'));
  assert.ok(cut.lines.every(line => line.length <= 17), 'nenhuma linha passa do que cabe na largura');
});

test('wrapLabel avisa quando precisou partir uma palavra no meio (o gráfico então inclina o rótulo)', () => {
  assert.equal(wrapLabel('Distribuição de Conteúdo', 56).broken, true);
  assert.equal(wrapLabel('Institucional', 120).broken, false);
  assert.equal(wrapLabel('Remarketing 30d', 200).broken, false);
});

test('shortDate só aceita datas ISO', () => {
  assert.equal(shortDate('2026-10-05'), '05/10');
  assert.equal(shortDate('2026-10-05', true), '05/10/2026');
  assert.equal(shortDate(null), '');
  assert.equal(shortDate('lixo'), '');
});

test('groupSlices ordena, agrupa a cauda em Outros e descarta valores inválidos', () => {
  const slices = Array.from({length: 10}, (_, i) => ({id: 's' + i, label: 'Fatia ' + i, value: 100 - i * 5}));
  const grouped = groupSlices([...slices, {id: 'z', label: 'Zero', value: 0}, {id: 'n', label: 'Nulo', value: null}, {id: 'x', label: 'Neg', value: -3}], 6);
  assert.equal(grouped.slices.length, 6);
  assert.equal(grouped.slices.at(-1)!.id, '__others__');
  assert.equal(grouped.slices.at(-1)!.label, 'Outros (5)');
  assert.equal(grouped.ignored, 3);
  assert.ok(Math.abs(grouped.slices.reduce((sum, slice) => sum + slice.share, 0) - 1) < 1e-9, 'as participações somam 100%');
  assert.equal(groupSlices([], 6).total, 0);
});

test('Pareto acumula sobre o total, informa onde cruza 80% e agrupa a cauda', () => {
  const rows = [50, 25, 10, 5, 4, 3, 2, 1].map((value, i) => ({id: 'p' + i, label: 'Campanha ' + i, value}));
  const result = paretoSeries([...rows, {id: 'nulo', label: 'Sem dado', value: null}], 5);
  assert.equal(result.rows.length, 5);
  assert.equal(result.rows[0].cumulative, 50);
  assert.equal(result.rows[1].cumulative, 75);
  assert.equal(result.rows.at(-1)!.id, '__others__');
  assert.equal(result.rows.at(-1)!.cumulative, 100);
  assert.equal(result.reaches, 3, '3 campanhas respondem por 85% do total');
  assert.equal(result.ignored, 1);
});

test('cascata: totais ancoram em zero e variações flutuam a partir do nível corrente, inclusive abaixo de zero', () => {
  const bars = waterfallBars([{id: 'a', label: 'Anterior', value: 100, kind: 'total'}, {id: 'b', label: 'Subiu', value: 30, kind: 'delta'}, {id: 'c', label: 'Caiu', value: -50, kind: 'delta'}, {id: 'd', label: 'Atual', value: 80, kind: 'total'}]);
  assert.deepEqual(bars.map(bar => [bar.base, bar.up, bar.down, bar.total]), [[0, 0, 0, 100], [100, 30, 0, 0], [80, 0, 50, 0], [0, 0, 0, 80]]);
  assert.equal(bars[2].end, 80);
  const negative = waterfallBars([{id: 'a', label: 'Início', value: 10, kind: 'total'}, {id: 'b', label: 'Queda', value: -25, kind: 'delta'}]);
  assert.equal(negative[1].base, -15, 'a base é a borda inferior mesmo abaixo de zero');
  assert.equal(negative[1].down, 25);
});

test('histograma: faixas iguais, todos os valores contados e entradas inválidas ignoradas', () => {
  const {bins, ignored} = histogramBins([1, 2, 2, 3, 9, 10, null, Number.NaN], 3);
  assert.equal(ignored, 2);
  assert.equal(bins.reduce((sum, bin) => sum + bin.count, 0), 6);
  assert.equal(bins[0].from, 1);
  assert.equal(bins.at(-1)!.to, 10);
  assert.equal(bins.at(-1)!.count, 2, 'o valor máximo cai na última faixa');
  assert.deepEqual(histogramBins([5, 5, 5]).bins, [{from: 5, to: 5, count: 3}]);
  assert.deepEqual(histogramBins([]).bins, []);
});

test('mediana ignora ausências', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([null, undefined]), null);
});

test('mapa de calor: degraus por quantil, zero observado é o menor degrau e a grade começa na segunda-feira', () => {
  const cuts = rampThresholds([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(cuts.length, 4);
  assert.equal(rampStepFor(0, cuts), 0);
  assert.equal(rampStepFor(9, cuts), 4);
  assert.deepEqual(rampThresholds([]), []);
  const grid = heatmapGrid('2026-10-01', '2026-10-14', date => (date === '2026-10-03' ? null : 1));
  assert.equal(grid.cells.length, 14);
  assert.equal(grid.cells[0].weekday, 3, '01/10/2026 é quinta-feira');
  assert.equal(grid.cells[0].week, 0);
  assert.equal(grid.cells.find(cell => cell.date === '2026-10-05')!.weekday, 0, 'segunda-feira');
  assert.equal(grid.cells.find(cell => cell.date === '2026-10-05')!.week, 1);
  assert.equal(grid.cells.find(cell => cell.date === '2026-10-03')!.value, null, 'sem dado continua sem dado');
  assert.deepEqual(heatmapGrid('2026-10-05', '2026-10-01', () => 1), {cells: [], weeks: 0});
});

test('radar: índice relativo por eixo, eixo sem valor é descartado e ausência não vira zero', () => {
  const result = radarIndex(
    [{key: 'spend', label: 'Investimento'}, {key: 'leads', label: 'Leads'}, {key: 'revenue', label: 'Receita'}, {key: 'zeros', label: 'Zeros'}],
    [{id: 'a', label: 'Aurora', values: {spend: 100, leads: 20, revenue: null, zeros: 0}}, {id: 'b', label: 'Cais', values: {spend: 50, leads: null, revenue: null, zeros: 0}}]);
  assert.deepEqual(result.axes.map(axis => axis.key), ['spend', 'leads']);
  assert.equal(result.rows[0].a, 100);
  assert.equal(result.rows[0].b, 50);
  assert.equal(result.rows[1].a, 100);
  assert.equal(result.rows[1].b, null, 'quem não tem leads fica sem ponto, não em zero');
});

test('spreadLabels separa rótulos que colidem, preserva a ordem e respeita os limites', () => {
  const placed = spreadLabels([100, 102, 104, 300], 16, 0, 400);
  for (let i = 1; i < 3; i++) assert.ok(placed[i] - placed[i - 1] >= 16 - 1e-9, 'distância mínima entre vizinhos');
  assert.ok(placed[0] < placed[1] && placed[1] < placed[2] && placed[2] < placed[3], 'a ordem original é mantida');
  assert.equal(placed[3], 300, 'quem não colide não se move');
  const edge = spreadLabels([2, 3, 4], 16, 0, 40);
  assert.ok(edge[0] >= 0 && edge[2] <= 40, 'dentro dos limites');
  assert.ok(edge[1] - edge[0] >= 16 - 1e-9 && edge[2] - edge[1] >= 16 - 1e-9);
  const reversed = spreadLabels([300, 104, 102, 100], 16, 0, 400);
  assert.ok(reversed[0] === 300 && reversed[1] > reversed[2] && reversed[2] > reversed[3], 'a entrada pode vir em qualquer ordem');
  assert.deepEqual(spreadLabels([], 16, 0, 10), []);
});

test('somas que transbordam viram indisponíveis, nunca zero nem Infinity', () => {
  const huge = [{id: 'a', label: 'A', value: 1e308}, {id: 'b', label: 'B', value: 1e308}];
  const grouped = groupSlices(huge, 6);
  assert.equal(grouped.total, null);
  assert.deepEqual(grouped.slices.map(slice => slice.share), [0.5, 0.5]);
  const pareto = paretoSeries(huge, 5);
  assert.equal(pareto.total, null);
  assert.deepEqual(pareto.rows.map(row => row.cumulative), [50, 100]);
  assert.equal(median([1e308, 1e308]), 1e308);
  assert.equal(median([-1e308, 1e308]), 0);
  assert.equal(safeSum([1e308, 1e308]), null);
  assert.equal(safeSum([1, NaN]), null);
  assert.equal(safeSum([]), 0);
});

test('"Outros" pesa a soma dos membros mesmo quando o valor absoluto é indisponível', () => {
  const many = Array.from({length: 4}, (_, i) => ({id: 'f' + i, label: 'F' + i, value: 1e308}));
  const grouped = groupSlices(many, 3);
  assert.equal(grouped.slices.length, 3);
  assert.equal(grouped.slices[2].value, null);
  assert.deepEqual(grouped.slices.map(slice => slice.share), [0.25, 0.25, 0.5]);
});

test('zero observado continua zero e não confunde com indisponível', () => {
  assert.equal(groupSlices([{id: 'z', label: 'Z', value: 0}], 6).total, 0);
  assert.deepEqual(sharesOf([0, 0]), [0, 0]);
  assert.deepEqual(sharesOf([1, 3]), [0.25, 0.75]);
  assert.equal(paretoSeries([{id: 'a', label: 'A', value: 10}, {id: 'b', label: 'B', value: 10}], 5).total, 20);
});

test('histograma com extremos opostos mantém contagens e faixas finitas', () => {
  const {bins} = histogramBins([-1e308, 0, 1e308], 2);
  assert.equal(bins.reduce((sum, bin) => sum + bin.count, 0), 3);
  assert.ok(bins.every(bin => Number.isFinite(bin.from) && Number.isFinite(bin.to)));
});
