import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFunnelSteps, funnelPresets, funnelModelIds, funnelMetricDefinitions, funnelIconKeys} from '../src/lib/metrics/funnel-config';
import {coneRatios} from '../src/components/dashboard/funnel';

test('parseFunnelSteps mantém cor, ícone e meta válidos', () => {
  const steps = parseFunnelSteps([
    {metric: 'impressions', label: 'Impressões', color: '#ff7a59', icon: 'eye', target: 1000},
    {metric: 'clicks', label: 'Cliques', color: 'vermelho', icon: 'inexistente', target: -5},
  ]);
  assert.deepEqual(steps[0], {metric: 'impressions', label: 'Impressões', color: '#FF7A59', icon: 'eye', target: 1000});
  assert.deepEqual(steps[1], {metric: 'clicks', label: 'Cliques'});
});

test('parseFunnelSteps rejeita listas inválidas e volta ao modelo padrão', () => {
  const fallback = funnelPresets[0].steps;
  assert.deepEqual(parseFunnelSteps('x'), fallback);
  assert.deepEqual(parseFunnelSteps([{metric: 'impressions', label: 'A'}]), fallback);
  assert.deepEqual(parseFunnelSteps([{metric: 'impressions', label: 'A'}, {metric: 'impressions', label: 'B'}]), fallback);
  assert.deepEqual(parseFunnelSteps([{metric: 'nao_existe', label: 'A'}, {metric: 'clicks', label: 'B'}]), fallback);
});

test('todo modelo pronto tem etapas válidas, sem repetição e ícones existentes', () => {
  const metrics = new Set<string>(funnelMetricDefinitions.map((item) => item.key));
  const icons = new Set<string>(funnelIconKeys);
  for (const preset of funnelPresets) {
    assert.ok(funnelModelIds.includes(preset.id), `${preset.id} fora da lista de modelos`);
    assert.ok(preset.steps.length >= 2 && preset.steps.length <= 12, preset.id);
    assert.equal(new Set(preset.steps.map((step) => step.metric)).size, preset.steps.length, `${preset.id} repete etapa`);
    for (const step of preset.steps) {
      assert.ok(metrics.has(step.metric), `${preset.id}: métrica ${step.metric}`);
      if (step.icon) assert.ok(icons.has(step.icon), `${preset.id}: ícone ${step.icon}`);
    }
  }
  assert.deepEqual(new Set(funnelPresets.map((preset) => preset.id)), new Set(funnelModelIds));
});

test('coneRatios: escala logarítmica, piso mínimo e ordem preservada', () => {
  const ratios = coneRatios([120000, 2520, 960, 40, 10]);
  assert.equal(ratios[0], 1);
  assert.ok(ratios.every((ratio) => ratio >= 0.24 && ratio <= 1));
  for (let index = 1; index < ratios.length; index++) assert.ok(ratios[index] < ratios[index - 1], `camada ${index} deveria ser mais estreita`);
  assert.equal(ratios.at(-1), 0.24);
});

test('coneRatios: valores iguais, nulos e zero não quebram', () => {
  assert.deepEqual(coneRatios([500, 500, 500]), [1, 1, 1]);
  const withGap = coneRatios([1000, null, 10]);
  assert.ok(withGap[1] < withGap[0] && withGap[1] >= 0.24);
  assert.ok(coneRatios([null, null]).every((ratio) => ratio >= 0.24 && ratio <= 1));
  assert.ok(coneRatios([100, 0]).every((ratio) => Number.isFinite(ratio)));
});
