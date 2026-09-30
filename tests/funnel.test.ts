import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFunnelSteps, funnelPresets, funnelModelIds, funnelMetricDefinitions, funnelIconKeys, funnelAutoColor, suggestFunnelModel, businessNiches, salesModels, funnelPresetFor} from '../src/lib/metrics/funnel-config';
import {coneProfile} from '../src/components/dashboard/funnel';

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

test('coneProfile: afunilamento uniforme, contínuo e sempre positivo', () => {
  for (const count of [2, 5, 12]) {
    const profile = coneProfile(count);
    assert.equal(profile.length, count);
    assert.equal(profile[0].top, 1);
    profile.forEach((layer, index) => {
      assert.ok(layer.bottom < layer.top, 'cada camada afunila');
      assert.ok(layer.bottom >= 0.34 - 1e-9, 'a base nunca fica mais estreita que o piso');
      if (index) assert.ok(Math.abs(layer.top - profile[index - 1].bottom) < 1e-9, 'sem degraus entre camadas');
    });
    const widths = profile.map((layer) => layer.top - layer.bottom);
    assert.ok(widths.every((width) => Math.abs(width - widths[0]) < 1e-9), 'afunilamento igual em todas as camadas');
  }
});

test('funnelAutoColor vai do vermelho ao verde', () => {
  const colors = Array.from({length: 6}, (_, index) => funnelAutoColor(index, 6));
  assert.ok(colors.every((color) => /^#[0-9A-F]{6}$/.test(color)));
  const [r0, g0] = [parseInt(colors[0].slice(1, 3), 16), parseInt(colors[0].slice(3, 5), 16)];
  const [r5, g5] = [parseInt(colors[5].slice(1, 3), 16), parseInt(colors[5].slice(3, 5), 16)];
  assert.ok(r0 > g0, 'primeira cor é avermelhada');
  assert.ok(g5 > r5, 'última cor é esverdeada');
  assert.equal(new Set(colors).size, 6);
  assert.match(funnelAutoColor(0, 1), /^#[0-9A-F]{6}$/);
});

test('suggestFunnelModel: lançamento digital e nichos com modelo próprio têm prioridade', () => {
  assert.equal(suggestFunnelModel('retail', 'digital_launch'), 'infoproduct');
  assert.equal(suggestFunnelModel('real_estate', 'lead_form'), 'real_estate');
  assert.equal(suggestFunnelModel('health', 'appointments'), 'clinic');
  assert.equal(suggestFunnelModel('education', 'whatsapp'), 'education');
  assert.equal(suggestFunnelModel('food', 'online_store'), 'delivery');
  assert.equal(suggestFunnelModel('digital', 'other'), 'infoproduct');
});

test('suggestFunnelModel: nos demais nichos vale o modelo de vendas', () => {
  assert.equal(suggestFunnelModel('retail', 'online_store'), 'ecommerce');
  assert.equal(suggestFunnelModel('beauty', 'whatsapp'), 'messages');
  assert.equal(suggestFunnelModel('automotive', 'lead_form'), 'lead_generation');
  assert.equal(suggestFunnelModel('services', 'appointments'), 'appointments');
  assert.equal(suggestFunnelModel('leisure', 'physical_store'), 'local_business');
  assert.equal(suggestFunnelModel('b2b', 'consultative'), 'inside_sales');
  assert.equal(suggestFunnelModel('other', 'other'), 'custom');
  assert.equal(suggestFunnelModel(null, null), 'lead_generation');
});

test('toda combinação de nicho e modelo gera um funil válido com etapas prontas', () => {
  const models = new Set<string>(funnelModelIds);
  for (const niche of businessNiches) for (const sales of salesModels) {
    const model = suggestFunnelModel(niche.id, sales.id);
    assert.ok(models.has(model), `${niche.id}+${sales.id}`);
    const preset = funnelPresetFor(model);
    assert.equal(preset.id, model);
    assert.ok(preset.steps.length >= 2);
  }
});
