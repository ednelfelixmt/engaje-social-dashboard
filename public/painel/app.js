/* Painel Marketing ZF — interface, filtros cruzados e gráficos. Depende de data.js (window.PAINEL) e ECharts. */
(function () {
  'use strict';
  const D = window.PAINEL;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } } };

  /* ---------- paleta: cor de marca de cada plataforma e categorias distintas ---------- */
  const COL = {
    plat: ['#2563EB', '#F59E0B', '#E11D48', '#0E7490'], ga: '#7C3AED',
    obj: ['#8B5CF6', '#06B6D4', '#EC4899', '#2563EB', '#10B981', '#F59E0B'],
    dev: ['#1D4ED8', '#14B8A6', '#A855F7', '#94A3B8'], gen: ['#EC4899', '#2563EB', '#94A3B8'],
    age: ['#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#1D4ED8', '#1E3A8A'],
    ch: ['#2563EB', '#F59E0B', '#E11D48', '#64748B', '#0E7490', '#10B981'],
    fmt: { 'Vídeo': '#2563EB', 'Imagem': '#F59E0B', 'Carrossel': '#10B981', 'Pesquisa': '#7C3AED', 'Display': '#0E7490', 'Documento': '#E11D48' }
  };
  const nf = new Intl.NumberFormat('pt-BR');
  const dec = (n, d) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const compact = (n) => (n >= 1e6 ? dec(n / 1e6, 2) + ' mi' : n >= 1e3 ? dec(n / 1e3, 1) + ' mil' : nf.format(Math.round(n)));
  const F = { int: (n) => nf.format(Math.round(n)), money: (n) => 'R$ ' + nf.format(Math.round(n)), money2: (n) => 'R$ ' + dec(n, 2), compact, mcompact: (n) => 'R$ ' + compact(n), pct: (n) => dec(n, 2) + '%', pct1: (n) => dec(n, 1) + '%', x: (n) => dec(n, 1) + 'x' };
  const KPIS = [
    { k: 'spend', l: 'Investimento', f: F.money }, { k: 'imp', l: 'Impressões', f: F.compact }, { k: 'clk', l: 'Cliques', f: F.compact },
    { k: 'ctr', l: 'CTR', f: F.pct, good: 'up' }, { k: 'ld', l: 'Leads', f: F.int, good: 'up' }, { k: 'cpl', l: 'Custo por lead', f: F.money2, good: 'down' },
    { k: 'sl', l: 'Vendas', f: F.int, good: 'up' }, { k: 'rv', l: 'Receita', f: F.money, good: 'up' }, { k: 'roas', l: 'ROAS', f: F.x, good: 'up' }
  ];
  const MF = Object.fromEntries(KPIS.map((k) => [k.k, k.f])); MF.cpc = F.money2; MF.cvr = F.pct; MF.cpa = F.money2;
  const ML = Object.fromEntries(KPIS.map((k) => [k.k, k.l])); ML.cpc = 'CPC'; ML.cvr = 'Taxa de lead';

  /* ---------- estado ---------- */
  const PG = [
    { id: 'overview', short: 'Visão', t: 'Visão geral', s: 'Todas as plataformas', i: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>' },
    { id: 'platforms', short: 'Plataformas', t: 'Plataformas', s: 'Meta, Google Ads, TikTok, LinkedIn e Google Analytics 4', i: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>' },
    { id: 'campaigns', short: 'Campanhas', t: 'Ranking de campanhas', s: 'Quem entrega mais por real investido', i: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>' },
    { id: 'ads', short: 'Anúncios', t: 'Ranking de anúncios', s: 'Criativos por resultado e formato', i: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4-4L5 21"/>' },
    { id: 'funnel', short: 'Funil', t: 'Funil de vendas', s: 'Do impacto à venda, etapa por etapa', i: '<path d="M3 4h18l-7 8v7l-4 2v-9L3 4Z"/>' },
    { id: 'rfm', short: 'RFM', t: 'RFM e análises', s: 'Valor do cliente, retenção e curva ABC', i: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.3c2.2.6 3.5 2.4 3.5 5.7"/>' },
    { id: 'devices', short: 'Dispositivos', t: 'Dispositivos', s: 'Desktop, mobile, tablet e outros', i: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>' },
    { id: 'demo', short: 'Demografia', t: 'Demografia', s: 'Sexo, idade, país e cidade cruzados com dispositivos', i: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>' },
    { id: 'objectives', short: 'Objetivos', t: 'Objetivos e grupos', s: 'Campanhas por objetivo e grupos personalizados', i: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>' }
  ];
  const DEFAULT_GROUPS = [
    { id: 'g1', name: 'Captação de leads', objectives: [3], platforms: [], q: '', min: 0 },
    { id: 'g2', name: 'Topo de funil', objectives: [0, 1, 2], platforms: [], q: '', min: 0 },
    { id: 'g3', name: 'Fundo de funil', objectives: [4, 5], platforms: [], q: '', min: 0 },
    { id: 'g4', name: 'Meta e Google • Leads', objectives: [3], platforms: [0, 1], q: '', min: 0 }
  ];
  const S = {
    page: 0, period: 30, view: 'all', metric: { evo: 'spend', plat: 'ld', rank: 'roas', ads: 'roas', dv: 'ld', demo: 'ld' }, sel: { stage: 3, seg: null },
    f: { platform: null, objective: null, device: null, gender: null, age: null, country: null, city: null, campaign: null, format: null, group: null },
    groups: store.get('zf-painel-grupos', DEFAULT_GROUPS), auto: false
  };
  let GSET = null; let timer = null;

  D.rows.forEach((r) => { r.w = (D.dateOf(r.d).getDay() + 6) % 7; });
  const CAMP30 = D.CAMPAIGNS.map(() => 0); D.rows.forEach((r) => { if (r.d >= D.DAYS - 30) CAMP30[r.c] += r.sp; });
  const inGroup = (g, ci) => { const c = D.CAMPAIGNS[ci]; if (g.objectives.length && !g.objectives.includes(c.o)) return false; if (g.platforms.length && !g.platforms.includes(c.p)) return false; if (g.q && !c.n.toLowerCase().includes(g.q.toLowerCase())) return false; if (g.min && CAMP30[ci] < g.min) return false; return true; };
  function refreshGroup() { const g = S.groups.find((x) => x.id === S.f.group); GSET = g ? new Set(D.CAMPAIGNS.map((_, i) => i).filter((i) => inGroup(g, i))) : null; if (S.f.group && !g) S.f.group = null; }

  /* ---------- filtros cruzados e agregação ---------- */
  function pass(r, ign) {
    const f = S.f;
    if (f.platform != null && ign !== 'platform' && r.p !== f.platform) return false;
    if (f.objective != null && ign !== 'objective' && r.o !== f.objective) return false;
    if (f.device != null && ign !== 'device' && r.v !== f.device) return false;
    if (f.gender != null && ign !== 'gender' && r.g !== f.gender) return false;
    if (f.age != null && ign !== 'age' && r.e !== f.age) return false;
    if (f.country != null && ign !== 'country' && r.co !== f.country) return false;
    if (f.city != null && ign !== 'city' && r.ci !== f.city) return false;
    if (f.campaign != null && ign !== 'campaign' && r.c !== f.campaign) return false;
    if (f.format != null && ign !== 'format' && D.ADS[r.a].f !== f.format) return false;
    if (GSET && ign !== 'group' && !GSET.has(r.c)) return false;
    return true;
  }
  const rowsIn = (from, to, ign) => D.rows.filter((r) => r.d >= from && r.d < to && pass(r, ign));
  const cur = (ign) => rowsIn(D.DAYS - S.period, D.DAYS, ign);
  const prv = (ign) => rowsIn(D.DAYS - 2 * S.period, D.DAYS - S.period, ign);
  const fin = (t) => { t.spend = t.sp; t.ctr = t.imp ? (t.clk / t.imp) * 100 : 0; t.cpc = t.clk ? t.sp / t.clk : 0; t.cpm = t.imp ? (t.sp / t.imp) * 1000 : 0; t.cpl = t.ld ? t.sp / t.ld : 0; t.cpa = t.sl ? t.sp / t.sl : 0; t.roas = t.sp ? t.rv / t.sp : 0; t.cvr = t.clk ? (t.ld / t.clk) * 100 : 0; return t; };
  const blank = () => ({ imp: 0, clk: 0, sp: 0, ld: 0, sl: 0, rv: 0 });
  const add = (t, r) => { t.imp += r.imp; t.clk += r.clk; t.sp += r.sp; t.ld += r.ld; t.sl += r.sl; t.rv += r.rv; };
  const tot = (rs) => { const t = blank(); for (const r of rs) add(t, r); return fin(t); };
  const groupBy = (rs, key, n) => { const a = Array.from({ length: n }, blank); for (const r of rs) add(a[key(r)], r); return a.map(fin); };
  const daily = (rs, from, to) => { const a = Array.from({ length: to - from }, blank); for (const r of rs) { const t = a[r.d - from]; if (t) add(t, r); } return a.map(fin); };
  const dayLabel = (d) => { const x = D.dateOf(d); return String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0'); };
  const FIELD = { ld: 'ld', sp: 'sp', sl: 'sl', imp: 'imp', clk: 'clk', rv: 'rv' };
  const FIELD_LABEL = { ld: 'Leads', sp: 'Investimento', sl: 'Vendas', imp: 'Impressões' };
  const FIELD_FMT = { ld: F.int, sp: F.money, sl: F.int, imp: F.compact };
  const dimmed = (sel, v) => sel != null && sel !== v;
  const filterCount = () => Object.values(S.f).filter((v) => v != null).length;

  /* ---------- ECharts ---------- */
  const CH = {};
  function chart(id) { const el = document.getElementById(id); if (!el) return null; let c = CH[id]; if (c && c.getDom() !== el) { c.dispose(); c = null; } if (!c) { c = echarts.init(el); CH[id] = c; } return c; }
  function put(id, opt, click) { const c = chart(id); if (!c) return; c.setOption(Object.assign({ textStyle: { fontFamily: css('--font') }, animationDuration: 450 }, opt), true); c.off('click'); if (click) c.on('click', click); }
  const TT = () => ({ backgroundColor: css('--card'), borderColor: css('--line'), borderWidth: 1, textStyle: { color: css('--tx'), fontSize: 12, fontFamily: css('--font') }, extraCssText: 'border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:8px 10px' });
  const AX = () => ({ axisLine: { lineStyle: { color: css('--line') } }, axisTick: { show: false }, axisLabel: { color: css('--mut'), fontSize: 10.5, fontFamily: css('--font') }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } });
  const mut = () => css('--mut'), tx = () => css('--tx'), cardc = () => css('--card');

  function donut(id, items, o) {
    const total = items.reduce((s, i) => s + i.value, 0) || 1;
    const names = Object.fromEntries(items.map((i) => [i.name, Math.round((i.value / total) * 100) + '%']));
    put(id, {
      tooltip: Object.assign(TT(), { trigger: 'item', formatter: (p) => `${p.marker} ${p.name}<br/><b>${o.fmt(p.value)}</b> &nbsp;(${dec(p.percent, 1)}%)` }),
      title: { text: o.center, subtext: o.sub, left: o.legend ? '31%' : 'center', top: 'center', textAlign: o.legend ? 'center' : undefined, itemGap: 2, textStyle: { color: tx(), fontSize: o.cs || 17, fontWeight: 800, fontFamily: css('--font') }, subtextStyle: { color: mut(), fontSize: 10.5, fontFamily: css('--font') } },
      legend: o.legend ? { orient: 'vertical', right: 4, top: 'middle', icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 9, textStyle: { color: mut(), fontSize: 11, fontFamily: css('--font') }, formatter: (n) => `${n}  ${names[n] || ''}` } : { show: false },
      series: [{ type: 'pie', radius: o.r || (o.legend ? ['44%', '66%'] : ['56%', '80%']), center: [o.legend ? '31%' : '50%', '50%'], label: { show: false }, itemStyle: { borderColor: cardc(), borderWidth: 3, borderRadius: 6 }, emphasis: { scaleSize: 4 }, data: items.map((i) => ({ name: i.name, value: i.value, itemStyle: { color: i.color, opacity: i.dim ? 0.28 : 1 } })) }]
    }, o.click);
  }
  function hbar(id, items, o) {
    put(id, {
      grid: { left: 6, right: o.right || 64, top: 4, bottom: 4, containLabel: true },
      tooltip: Object.assign(TT(), { trigger: 'item', formatter: (p) => `${p.name}<br/><b>${o.fmt(p.value)}</b>` }),
      xAxis: { type: 'value', show: false, max: o.max },
      yAxis: { type: 'category', inverse: true, data: items.map((i) => i.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: tx(), fontSize: 11, fontWeight: 600, width: o.lw || 118, overflow: 'truncate', fontFamily: css('--font') } },
      series: [{ type: 'bar', barCategoryGap: '34%', showBackground: true, backgroundStyle: { color: css('--card2'), borderRadius: [0, 7, 7, 0] }, data: items.map((i) => ({ value: i.value, itemStyle: { color: i.color, opacity: i.dim ? 0.3 : 1, borderRadius: [0, 7, 7, 0] } })), label: { show: true, position: 'right', color: tx(), fontSize: 11, fontWeight: 700, formatter: (p) => o.fmt(p.value), fontFamily: css('--font') } }]
    }, o.click);
  }
  const card = (cls, title, sub, body, extra) => `<section class="card ${cls}"><div class="hd"><div><h3>${title}</h3>${sub ? `<small>${sub}</small>` : ''}</div>${extra || ''}</div><div class="bd">${body}</div></section>`;
  const ch = (id) => `<div class="ch" id="${id}"></div>`;
  const seg = (name, opts, curv) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-seg="${name}" data-v="${v}" aria-pressed="${String(curv) === String(v)}">${l}</button>`).join('')}</div>`;
  const spark = (arr, color) => { if (!arr.length) return ''; const mn = Math.min(...arr), mx = Math.max(...arr), n = arr.length; const pts = arr.map((v, i) => `${((i / Math.max(1, n - 1)) * 100).toFixed(1)},${(22 - ((v - mn) / (mx - mn || 1)) * 19).toFixed(1)}`).join(' '); return `<svg class="sp" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,24 ${pts} 100,24" fill="${color}" opacity=".12"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`; };
  function deltaOf(v, p, good) { if (!p) return { cls: 'flat', txt: '—' }; const d = ((v - p) / p) * 100; if (!isFinite(d)) return { cls: 'flat', txt: '—' }; const better = good === 'down' ? d < 0 : d > 0; return { cls: good && Math.abs(d) >= 0.05 ? (better ? 'up' : 'down') : 'flat', txt: (d > 0 ? '▲ ' : '▼ ') + dec(Math.abs(d), 1) + '%' }; }
  function kpiHTML(list, tC, tP, ser, active) {
    return list.map((k) => { const dl = deltaOf(tC[k.k], tP ? tP[k.k] : 0, k.good); return `<button type="button" class="kpi" data-kpi="${k.k}" aria-pressed="${active === k.k}"><span class="l">${k.l}</span><span class="row"><span class="v">${k.f(tC[k.k])}</span><span class="delta ${dl.cls}">${dl.txt}</span></span>${ser ? spark(ser[k.k] || [], COL.plat[0]) : ''}</button>`; }).join('');
  }
  const seriesOf = (arr) => { const o = {}; ['spend', 'imp', 'clk', 'ctr', 'ld', 'cpl', 'sl', 'rv', 'roas', 'cpc', 'cvr'].forEach((k) => { o[k] = arr.map((t) => t[k]); }); return o; };

  /* ---------- páginas: HTML ---------- */
  const HTML = {};
  HTML.overview = () => `<div class="kpis" id="ov-kpis" style="--n:9"></div>
    ${card('c6', 'Evolução diária', '<span id="ov-evo-sub"></span>', ch('ov-evo'), '<span id="ov-evo-x"></span>')}
    ${card('c3', 'Investimento por plataforma', 'Clique para filtrar', ch('ov-plat'))}
    ${card('c3', 'Funil de marketing', 'Da impressão à venda', ch('ov-fun'))}
    ${card('c4', 'Investimento por objetivo', 'Empilhado por plataforma', ch('ov-obj'))}
    ${card('c4', 'Campanhas por ROAS', 'As 6 melhores', ch('ov-top'))}
    ${card('c4', 'Resultado por dia da semana', 'Leads e custo por lead', ch('ov-dow'))}`;
  HTML.platforms = () => `<div class="card c12" style="flex-direction:row;align-items:center;justify-content:space-between;padding:8px 12px;gap:10px"><div class="seg" id="pl-seg"></div><span style="font-size:11px;color:var(--mut);font-weight:700" id="pl-note"></span></div>
    <div id="pl-ads" style="display:contents">
      <div class="kpis" id="pl-kpis" style="--n:7"></div>
      ${card('c4', 'Perfil por plataforma', 'Índice 0–100 (melhor = 100)', ch('pl-radar'))}
      ${card('c8', 'Tendência por plataforma', '', ch('pl-trend'), seg('plat', [['ld', 'Leads'], ['spend', 'Invest.'], ['cpl', 'CPL'], ['roas', 'ROAS']], 'ld'))}
      ${card('c12', 'Comparativo', 'Clique em uma linha para filtrar', '<div class="tbl" id="pl-tbl"></div>')}
    </div>
    <div id="pl-ga" style="display:contents" hidden>
      <div class="kpis" id="ga-kpis" style="--n:6"></div>
      ${card('c7', 'Sessões por canal', 'Google Analytics 4', ch('ga-ch'))}
      ${card('c5', 'Origem e mídia', 'Sessões e conversões', '<div class="tbl" id="ga-src"></div>')}
      ${card('c4', 'Páginas mais vistas', 'Visualizações', ch('ga-pages'))}
      ${card('c4', 'Eventos do site', 'Da visita ao lead gerado', ch('ga-ev'))}
      ${card('c4', 'Sessões por dispositivo', 'Clique para filtrar', ch('ga-dev'))}
    </div>`;
  HTML.campaigns = () => `${card('c5', 'Ranking', '<span id="cp-sub"></span>', ch('cp-rank'), seg('rank', [['roas', 'ROAS'], ['cpl', 'CPL'], ['ld', 'Leads'], ['sl', 'Vendas'], ['spend', 'Invest.']], 'roas'))}
    ${card('c7', 'Investimento × retorno', 'Tamanho da bolha = leads • linha tracejada = ROAS 3x', ch('cp-bub'))}
    ${card('c12', 'Campanhas', 'Clique em uma linha para filtrar', '<div class="tbl" id="cp-tbl"></div>')}`;
  HTML.ads = () => `${card('c9', 'Melhores anúncios', '<span id="ad-sub"></span>', '<div class="ads" id="ad-grid"></div>', seg('ads', [['roas', 'ROAS'], ['ctr', 'CTR'], ['cpl', 'CPL'], ['ld', 'Leads']], 'roas'))}
    <div class="c3" style="display:grid;grid-template-rows:minmax(0,1fr) minmax(0,1fr);gap:12px;min-height:0">
      ${card('', 'Investimento por formato', 'Clique para filtrar', ch('ad-fmt'))}
      ${card('', 'Custo por lead por formato', 'Menor é melhor', ch('ad-cpl'))}
    </div>`;
  HTML.funnel = () => `${card('c7 r3', 'Funil de marketing e vendas', 'Clique em uma etapa para detalhar', '<div id="fn-svg" style="position:absolute;inset:0 8px 4px"></div>')}
    ${card('c5', 'Conversão entre etapas', '', '<div class="tbl" id="fn-rates"></div>')}
    ${card('c5', '<span id="fn-sel-t">Etapa</span> por plataforma', 'Participação na etapa selecionada', ch('fn-plat'))}
    ${card('c5', 'Tempo e perdas no comercial', 'Dias por etapa • motivos de perda', '<div style="position:absolute;inset:0 6px 4px;display:grid;grid-template-columns:1fr 1fr;gap:6px"><div style="position:relative"><div class="ch" id="fn-days"></div></div><div style="position:relative"><div class="ch" id="fn-loss"></div></div></div>')}`;
  HTML.rfm = () => `${card('c5', 'Matriz RFM', 'Recência × frequência • cor = segmento', ch('rf-grid'))}
    ${card('c4', 'Receita por segmento', 'Clique para destacar', ch('rf-tree'))}
    ${card('c3', 'Retenção por coorte', '% de clientes que voltam', ch('rf-coh'))}
    ${card('c5', 'Curva ABC das campanhas', 'Receita acumulada (80% = classe A)', ch('rf-abc'))}
    ${card('c7', 'Segmentos e ações sugeridas', 'Clique em uma linha para destacar', '<div class="tbl" id="rf-tbl"></div>')}`;
  HTML.devices = () => `${card('c3', 'Investimento por dispositivo', 'Clique para filtrar', ch('dv-donut'))}
    <div class="devcards c9" id="dv-cards"></div>
    ${card('c5', 'Tendência por dispositivo', '', ch('dv-trend'), seg('dv', [['ld', 'Leads'], ['spend', 'Invest.'], ['cpl', 'CPL']], 'ld'))}
    ${card('c4', 'Dispositivo por plataforma', 'Investimento', ch('dv-plat'))}
    ${card('c3', 'Taxa de lead por dispositivo', 'Leads por clique', ch('dv-cvr'))}`;
  HTML.demo = () => `${card('c3', 'Sexo', 'Clique para filtrar', ch('dm-gen'))}
    ${card('c5', 'Idade por sexo', '<span id="dm-sub"></span>', ch('dm-pyr'), seg('demo', [['ld', 'Leads'], ['sp', 'Invest.'], ['sl', 'Vendas']], 'ld'))}
    ${card('c4', 'Dispositivo', 'Clique para filtrar', ch('dm-dev'))}
    ${card('c3', 'País', 'Clique para filtrar', ch('dm-co'))}
    ${card('c4', 'Cidades', '<span id="dm-ci-sub"></span>', ch('dm-ci'))}
    ${card('c5', 'Idade × dispositivo', 'Clique em uma célula para cruzar', ch('dm-heat'))}`;
  HTML.objectives = () => `${card('c7', 'Objetivos de campanha', 'Resultado principal de cada objetivo • clique para filtrar', '<div class="objgrid" id="ob-grid"></div>')}
    ${card('c5', 'Fluxo do investimento', 'Plataforma → objetivo', ch('ob-sank'))}
    ${card('c8', 'Grupos personalizados', 'Combine objetivo, plataforma, nome e investimento mínimo', '<div class="groups" id="gr-list"></div>')}
    ${card('c4', 'Comparação dos grupos', 'ROAS e investimento', ch('gr-cmp'))}`;
  const ROWS = { overview: 'auto minmax(0,1fr) minmax(0,1fr)', platforms: 'auto auto minmax(0,1fr) minmax(0,1fr)', campaigns: 'minmax(0,1fr) minmax(0,1fr)', ads: 'minmax(0,1fr)', funnel: 'minmax(0,1.5fr) minmax(0,.9fr) minmax(0,1fr)', rfm: 'minmax(0,1fr) minmax(0,1fr)', devices: 'minmax(0,.62fr) minmax(0,1fr)', demo: 'repeat(2,minmax(0,1fr))', objectives: 'minmax(0,1fr) minmax(0,1fr)' };
  HTML.funnel = HTML.funnel; // etapa 'r3' ocupa as 3 linhas
  const r3 = '.r3{grid-row:span 3}';

  /* ---------- páginas: dados e gráficos ---------- */
  const RENDER = {};
  RENDER.overview = () => {
    const P = S.period, from = D.DAYS - P; const rc = cur(), rp = prv(); const tC = tot(rc), tP = tot(rp);
    const dc = daily(rc, from, D.DAYS), dp = daily(rp, from - P, from);
    $('#ov-kpis').innerHTML = kpiHTML(KPIS, tC, tP, seriesOf(dc), S.metric.evo);
    const k = S.metric.evo; $('#ov-evo-sub').textContent = `${ML[k]} • últimos ${P} dias contra os ${P} anteriores`;
    const acc = css('--acc');
    put('ov-evo', {
      grid: { left: 6, right: 12, top: 22, bottom: 4, containLabel: true }, legend: { right: 6, top: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 3, textStyle: { color: mut(), fontSize: 11 } },
      tooltip: Object.assign(TT(), { trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: css('--mut2') } }, valueFormatter: (v) => MF[k](v) }),
      xAxis: Object.assign({ type: 'category', data: dc.map((_, i) => dayLabel(from + i)), boundaryGap: false }, AX(), { splitLine: { show: false }, axisLabel: { color: mut(), fontSize: 10.5, interval: Math.ceil(P / 8) - 1 } }),
      yAxis: Object.assign({ type: 'value', axisLabel: { formatter: (v) => (k === 'ctr' || k === 'roas' ? dec(v, 1) : compact(v)), color: mut(), fontSize: 10.5 } }, { axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } }),
      series: [
        { name: 'Período atual', type: 'line', smooth: 0.25, showSymbol: false, data: dc.map((t) => t[k]), lineStyle: { width: 2.8, color: acc }, itemStyle: { color: acc }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: acc + '40' }, { offset: 1, color: acc + '00' }]) } },
        { name: 'Período anterior', type: 'line', smooth: 0.25, showSymbol: false, data: dp.map((t) => t[k]), lineStyle: { width: 1.6, type: [5, 4], color: css('--mut2') }, itemStyle: { color: css('--mut2') } }
      ]
    });
    const bp = groupBy(cur('platform'), (r) => r.p, 4);
    donut('ov-plat', D.PLATFORMS.map((n, i) => ({ name: n, value: bp[i].sp, color: COL.plat[i], dim: dimmed(S.f.platform, i) })), { center: F.mcompact(bp.reduce((s, t) => s + t.sp, 0)), sub: 'investidos', legend: true, cs: 15, fmt: F.money, click: (p) => toggle('platform', D.PLATFORMS.indexOf(p.name)) });
    const geo = (v) => Math.log10(v + 1) * 100;
    const st = [['Impressões', tC.imp, '#1D4ED8'], ['Cliques', tC.clk, '#3B82F6'], ['Leads', tC.ld, '#7C3AED'], ['Vendas', tC.sl, '#10B981']];
    put('ov-fun', { tooltip: Object.assign(TT(), { trigger: 'item', formatter: (p) => `${p.name}<br/><b>${F.int(p.data.real)}</b>` }), series: [{ type: 'funnel', left: '3%', width: '52%', top: 6, bottom: 6, minSize: '10%', maxSize: '100%', gap: 4, sort: 'none', label: { position: 'right', color: tx(), fontSize: 11, fontWeight: 700, formatter: (p) => `${p.name}\n${compact(p.data.real)}` }, labelLine: { length: 12, lineStyle: { color: css('--line') } }, itemStyle: { borderWidth: 0 }, data: st.map(([n, v, c]) => ({ name: n, value: geo(v), real: v, itemStyle: { color: c } })) }] });
    const mx = D.OBJECTIVES.map(() => D.PLATFORMS.map(() => 0)); cur('objective').forEach((r) => { mx[r.o][r.p] += r.sp; });
    put('ov-obj', {
      grid: { left: 6, right: 14, top: 4, bottom: 4, containLabel: true }, tooltip: Object.assign(TT(), { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: F.money }),
      xAxis: { type: 'value', show: false }, yAxis: { type: 'category', inverse: true, data: D.OBJECTIVES, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: tx(), fontSize: 11, fontWeight: 600 } },
      series: D.PLATFORMS.map((n, pi) => ({ name: n, type: 'bar', stack: 's', barCategoryGap: '34%', data: D.OBJECTIVES.map((_, oi) => ({ value: mx[oi][pi], itemStyle: { color: COL.plat[pi], opacity: dimmed(S.f.objective, oi) ? 0.3 : 1 } })) }))
    }, (p) => toggle('objective', p.dataIndex));
    const bc = groupBy(cur('campaign'), (r) => r.c, D.CAMPAIGNS.length).map((t, i) => ({ t, i })).filter((x) => x.t.sp > 0).sort((a, b) => b.t.roas - a.t.roas).slice(0, 6);
    hbar('ov-top', bc.map((x) => ({ name: D.CAMPAIGNS[x.i].n, value: x.t.roas, color: COL.plat[D.CAMPAIGNS[x.i].p], dim: dimmed(S.f.campaign, x.i), idx: x.i })), { fmt: F.x, lw: 128, right: 44, click: (p) => toggle('campaign', bc[p.dataIndex].i) });
    const bw = groupBy(cur(), (r) => r.w, 7); const wd = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    put('ov-dow', {
      grid: { left: 6, right: 8, top: 24, bottom: 4, containLabel: true }, legend: { right: 4, top: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 3, textStyle: { color: mut(), fontSize: 11 } }, tooltip: Object.assign(TT(), { trigger: 'axis' }),
      xAxis: Object.assign({ type: 'category', data: wd }, AX(), { splitLine: { show: false } }),
      yAxis: [{ type: 'value', axisLabel: { color: mut(), fontSize: 10.5, formatter: compact }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } }, { type: 'value', axisLabel: { color: mut(), fontSize: 10.5, formatter: (v) => 'R$' + Math.round(v) }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } }],
      series: [{ name: 'Leads', type: 'bar', barWidth: '48%', data: bw.map((t) => Math.round(t.ld)), itemStyle: { color: COL.obj[3], borderRadius: [6, 6, 0, 0] } }, { name: 'CPL', type: 'line', yAxisIndex: 1, smooth: 0.3, symbol: 'circle', symbolSize: 6, data: bw.map((t) => +t.cpl.toFixed(2)), lineStyle: { color: COL.plat[1], width: 2.4 }, itemStyle: { color: COL.plat[1] } }]
    });
  };

  RENDER.platforms = () => {
    const opts = [['all', 'Todas'], ...D.PLATFORMS.map((n, i) => [String(i), n]), ['ga4', 'Google Analytics 4']];
    const current = S.view === 'ga4' ? 'ga4' : S.f.platform != null ? String(S.f.platform) : 'all';
    $('#pl-seg').innerHTML = opts.map(([v, l]) => `<button type="button" data-plat="${v}" aria-pressed="${current === v}">${v !== 'all' && v !== 'ga4' ? `<span class="dot" style="background:${COL.plat[+v]};margin-right:5px"></span>` : v === 'ga4' ? `<span class="dot" style="background:${COL.ga};margin-right:5px"></span>` : ''}${l}</button>`).join('');
    const isGA = S.view === 'ga4'; $('#pl-ads').hidden = isGA; $('#pl-ga').hidden = !isGA;
    $('#pl-note').textContent = isGA ? 'Dados do site: sessões, engajamento e conversões' : 'Selecionar uma plataforma filtra todas as páginas';
    $('#pl-ads').parentElement.style.gridTemplateRows = 'auto auto minmax(0,1fr) minmax(0,1fr)';
    if (isGA) return renderGA();
    const rc = cur(), rp = prv(), tC = tot(rc), tP = tot(rp); const P = S.period, from = D.DAYS - P;
    const list = ['spend', 'imp', 'ctr', 'ld', 'cpl', 'sl', 'roas'].map((k) => KPIS.find((x) => x.k === k));
    $('#pl-kpis').innerHTML = kpiHTML(list, tC, tP, seriesOf(daily(rc, from, D.DAYS)), null);
    const all = groupBy(cur('platform'), (r) => r.p, 4);
    const norm = (arr, inv) => { const m = Math.max(...arr.map((v) => (inv ? (v ? 1 / v : 0) : v))); return arr.map((v) => (m ? ((inv ? (v ? 1 / v : 0) : v) / m) * 100 : 0)); };
    const idx = [norm(all.map((t) => t.ctr)), norm(all.map((t) => t.cvr)), norm(all.map((t) => t.cpl), true), norm(all.map((t) => t.roas)), norm(all.map((t) => t.cpc), true)];
    put('pl-radar', {
      tooltip: Object.assign(TT(), { trigger: 'item' }), legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: mut(), fontSize: 11 } },
      radar: { radius: '62%', center: ['50%', '46%'], indicator: ['CTR', 'Taxa de lead', 'Custo por lead', 'ROAS', 'CPC'].map((n) => ({ name: n, max: 100 })), axisName: { color: tx(), fontSize: 11, fontWeight: 600 }, splitLine: { lineStyle: { color: css('--line') } }, splitArea: { show: false }, axisLine: { lineStyle: { color: css('--line') } } },
      series: [{ type: 'radar', symbolSize: 5, data: D.PLATFORMS.map((n, i) => ({ name: n, value: idx.map((a) => +a[i].toFixed(1)), lineStyle: { color: COL.plat[i], width: dimmed(S.f.platform, i) ? 1 : 2.6, opacity: dimmed(S.f.platform, i) ? 0.35 : 1 }, itemStyle: { color: COL.plat[i] }, areaStyle: { color: COL.plat[i], opacity: dimmed(S.f.platform, i) ? 0.02 : 0.14 } })) }]
    });
    const k = S.metric.plat;
    put('pl-trend', {
      grid: { left: 6, right: 12, top: 26, bottom: 4, containLabel: true }, legend: { right: 6, top: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 3, textStyle: { color: mut(), fontSize: 11 } }, tooltip: Object.assign(TT(), { trigger: 'axis', valueFormatter: (v) => MF[k](v) }),
      xAxis: Object.assign({ type: 'category', boundaryGap: false, data: Array.from({ length: P }, (_, i) => dayLabel(from + i)) }, AX(), { splitLine: { show: false }, axisLabel: { color: mut(), fontSize: 10.5, interval: Math.ceil(P / 9) - 1 } }),
      yAxis: { type: 'value', axisLabel: { color: mut(), fontSize: 10.5, formatter: (v) => (k === 'roas' ? dec(v, 1) : compact(v)) }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } },
      series: D.PLATFORMS.map((n, i) => ({ name: n, type: 'line', smooth: 0.25, showSymbol: false, data: daily(cur('platform').filter((r) => r.p === i), from, D.DAYS).map((t) => t[k]), lineStyle: { width: dimmed(S.f.platform, i) ? 1.4 : 2.6, color: COL.plat[i], opacity: dimmed(S.f.platform, i) ? 0.35 : 1 }, itemStyle: { color: COL.plat[i] } }))
    });
    const mxR = Math.max(...all.map((t) => t.roas), 1); const totAll = tot(cur('platform'));
    const line = (n, t, c, i) => `<tr data-plat="${i}" class="${S.f.platform === i ? 'sel' : ''}"><td><span class="dot" style="background:${c}"></span><span class="name">${n}</span></td><td>${F.money(t.sp)}</td><td>${F.compact(t.imp)}</td><td>${F.compact(t.clk)}</td><td>${F.pct(t.ctr)}</td><td>${F.money2(t.cpc)}</td><td>${F.int(t.ld)}</td><td>${F.money2(t.cpl)}</td><td>${F.int(t.sl)}</td><td>${F.x(t.roas)}<span class="bar"><i style="width:${(t.roas / mxR) * 100}%;background:${c}"></i></span></td></tr>`;
    $('#pl-tbl').innerHTML = `<table><thead><tr><th>Plataforma</th><th>Investimento</th><th>Impressões</th><th>Cliques</th><th>CTR</th><th>CPC</th><th>Leads</th><th>CPL</th><th>Vendas</th><th>ROAS</th></tr></thead><tbody>${D.PLATFORMS.map((n, i) => line(n, all[i], COL.plat[i], i)).join('')}<tr class="total"><td>Total</td><td>${F.money(totAll.sp)}</td><td>${F.compact(totAll.imp)}</td><td>${F.compact(totAll.clk)}</td><td>${F.pct(totAll.ctr)}</td><td>${F.money2(totAll.cpc)}</td><td>${F.int(totAll.ld)}</td><td>${F.money2(totAll.cpl)}</td><td>${F.int(totAll.sl)}</td><td>${F.x(totAll.roas)}</td></tr></tbody></table>`;
  };
  function gaTot(from, to) { const t = { ses: 0, usr: 0, eng: 0, cv: 0, dur: 0 }; D.ga.forEach((r) => { if (r.d >= from && r.d < to && (S.f.device == null || r.v === S.f.device)) { t.ses += r.ses; t.usr += r.usr; t.eng += r.eng; t.cv += r.cv; t.dur += r.dur; } }); return t; }
  function renderGA() {
    const P = S.period, from = D.DAYS - P; const a = gaTot(from, D.DAYS), b = gaTot(from - P, from);
    const L = [['Sessões', (t) => t.ses, F.int, 'up'], ['Usuários', (t) => t.usr, F.int, 'up'], ['Engajamento', (t) => (t.ses ? (t.eng / t.ses) * 100 : 0), F.pct1, 'up'], ['Conversões', (t) => t.cv, F.int, 'up'], ['Taxa de conversão', (t) => (t.ses ? (t.cv / t.ses) * 100 : 0), F.pct, 'up'], ['Duração média', (t) => (t.ses ? t.dur / t.ses : 0), (v) => `${Math.floor(v / 60)}m ${String(Math.round(v % 60)).padStart(2, '0')}s`, 'up']];
    $('#ga-kpis').innerHTML = L.map(([l, g, f, good]) => { const dl = deltaOf(g(a), g(b), good); return `<div class="kpi"><span class="l">${l}</span><span class="row"><span class="v">${f(g(a))}</span><span class="delta ${dl.cls}">${dl.txt}</span></span></div>`; }).join('');
    const days = Array.from({ length: P }, (_, i) => from + i);
    const bycd = D.GA_CHANNELS.map(() => days.map(() => 0)); D.ga.forEach((r) => { if (r.d >= from && (S.f.device == null || r.v === S.f.device)) bycd[r.ch][r.d - from] += r.ses; });
    put('ga-ch', {
      grid: { left: 6, right: 12, top: 28, bottom: 4, containLabel: true }, legend: { right: 6, top: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: mut(), fontSize: 11 } }, tooltip: Object.assign(TT(), { trigger: 'axis', valueFormatter: F.int }),
      xAxis: Object.assign({ type: 'category', boundaryGap: false, data: days.map(dayLabel) }, AX(), { splitLine: { show: false }, axisLabel: { color: mut(), fontSize: 10.5, interval: Math.ceil(P / 9) - 1 } }),
      yAxis: { type: 'value', axisLabel: { color: mut(), fontSize: 10.5, formatter: compact }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } },
      series: D.GA_CHANNELS.map((n, i) => ({ name: n, type: 'line', stack: 's', smooth: 0.2, showSymbol: false, areaStyle: { opacity: 0.75 }, lineStyle: { width: 0 }, itemStyle: { color: COL.ch[i] }, data: bycd[i].map((v) => Math.round(v)) }))
    });
    const chTot = D.GA_CHANNELS.map(() => ({ s: 0, c: 0 })); D.ga.forEach((r) => { if (r.d >= from && (S.f.device == null || r.v === S.f.device)) { chTot[r.ch].s += r.ses; chTot[r.ch].c += r.cv; } });
    const srcRows = D.GA_SOURCES.map(([n, ci, w]) => { const base = chTot[ci]; const share = D.GA_SOURCES.filter((x) => x[1] === ci).reduce((s, x) => s + x[2], 0); const ses = base.s * (w / share); const cv = base.c * (w / share); return { n, ses, cv, ci }; }).sort((x, y) => y.ses - x.ses);
    const mxS = Math.max(...srcRows.map((x) => x.ses), 1);
    $('#ga-src').innerHTML = `<table><thead><tr><th>Origem / mídia</th><th>Sessões</th><th>Conv.</th><th>Taxa</th></tr></thead><tbody>${srcRows.slice(0, 7).map((x) => `<tr style="cursor:default"><td><span class="dot" style="background:${COL.ch[x.ci]}"></span><span class="name">${x.n}</span></td><td>${F.int(x.ses)}<span class="bar"><i style="width:${(x.ses / mxS) * 100}%;background:${COL.ch[x.ci]}"></i></span></td><td>${F.int(x.cv)}</td><td>${F.pct(x.ses ? (x.cv / x.ses) * 100 : 0)}</td></tr>`).join('')}</tbody></table>`;
    const pv = D.GA_PAGES.map(([n, w]) => ({ name: n, value: Math.round((a.ses * 2.6 * w) / 100 / 3.2), color: COL.ga }));
    hbar('ga-pages', pv, { fmt: F.int, lw: 120, right: 56 });
    put('ga-ev', { tooltip: Object.assign(TT(), { trigger: 'item', formatter: (p) => `${p.name}<br/><b>${F.int(p.data.real)}</b>` }), series: [{ type: 'funnel', left: '3%', width: '50%', top: 6, bottom: 6, minSize: '14%', gap: 4, sort: 'none', label: { position: 'right', color: tx(), fontSize: 11, fontWeight: 700, formatter: (p) => `${p.name}\n${compact(p.data.real)}` }, labelLine: { length: 10, lineStyle: { color: css('--line') } }, itemStyle: { borderWidth: 0 }, data: D.GA_EVENTS.map(([n, w], i) => ({ name: n, value: w, real: (a.ses * 3.4 * w) / 100, itemStyle: { color: ['#7C3AED', '#6366F1', '#3B82F6', '#0EA5E9', '#10B981'][i] } })) }] });
    const dv = D.DEVICES.map(() => 0); D.ga.forEach((r) => { if (r.d >= from) dv[r.v] += r.ses; });
    donut('ga-dev', D.DEVICES.map((n, i) => ({ name: n, value: dv[i], color: COL.dev[i], dim: dimmed(S.f.device, i) })), { center: F.compact(dv.reduce((s, v) => s + v, 0)), sub: 'sessões', legend: true, cs: 15, fmt: F.int, click: (p) => toggle('device', D.DEVICES.indexOf(p.name)) });
  }

  RENDER.campaigns = () => {
    const k = S.metric.rank; const rc = cur('campaign'); const by = groupBy(rc, (r) => r.c, D.CAMPAIGNS.length).map((t, i) => ({ t, i })).filter((x) => x.t.sp > 0);
    const asc = k === 'cpl'; const sorted = by.slice().sort((x, y) => (asc ? x.t[k] - y.t[k] : y.t[k] - x.t[k]));
    $('#cp-sub').textContent = `${ML[k]}${asc ? ' • menor é melhor' : ''}`;
    hbar('cp-rank', sorted.slice(0, 10).map((x) => ({ name: D.CAMPAIGNS[x.i].n, value: x.t[k], color: COL.plat[D.CAMPAIGNS[x.i].p], dim: dimmed(S.f.campaign, x.i) })), { fmt: MF[k], lw: 130, right: 70, click: (p) => toggle('campaign', sorted[p.dataIndex].i) });
    put('cp-bub', {
      grid: { left: 8, right: 60, top: 34, bottom: 8, containLabel: true }, tooltip: Object.assign(TT(), { trigger: 'item', formatter: (p) => `<b>${p.data.name}</b><br/>Investimento ${F.money(p.data.value[0])}<br/>ROAS ${F.x(p.data.value[1])}<br/>Leads ${F.int(p.data.value[2])}` }),
      xAxis: Object.assign({ type: 'value', name: 'Investimento', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: mut(), fontSize: 11 }, axisLabel: { color: mut(), fontSize: 10.5, formatter: (v) => 'R$ ' + compact(v) } }, { axisLine: { lineStyle: { color: css('--line') } }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } }),
      yAxis: Object.assign({ type: 'value', name: 'ROAS', nameTextStyle: { color: mut(), fontSize: 11 }, axisLabel: { color: mut(), fontSize: 10.5, formatter: (v) => dec(v, 0) + 'x' } }, { axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } }),
      series: [{ type: 'scatter', symbolSize: (v) => Math.max(14, Math.sqrt(v[2]) * 2.1), label: { show: true, position: 'right', color: mut(), fontSize: 10, formatter: (p) => (p.data.value[2] > 90 ? p.data.name.split(' • ')[0] : ''), fontFamily: css('--font') }, markLine: { silent: true, symbol: 'none', lineStyle: { color: css('--mut2'), type: [5, 4] }, label: { formatter: 'ROAS 3x', color: mut(), fontSize: 10 }, data: [{ yAxis: 3 }] }, data: by.map((x) => ({ name: D.CAMPAIGNS[x.i].n, value: [x.t.sp, x.t.roas, x.t.ld], itemStyle: { color: COL.plat[D.CAMPAIGNS[x.i].p], opacity: dimmed(S.f.campaign, x.i) ? 0.18 : 0.78, borderColor: cardc(), borderWidth: 2 }, idx: x.i })) }]
    }, (p) => toggle('campaign', p.data.idx));
    const mx = Math.max(...sorted.map((x) => x.t[k]), 1);
    $('#cp-tbl').innerHTML = `<table><thead><tr><th>#  Campanha</th><th>Plataforma</th><th>Objetivo</th><th>Investimento</th><th>Leads</th><th>CPL</th><th>Vendas</th><th>ROAS</th><th>Status</th></tr></thead><tbody>${sorted.slice(0, 6).map((x, n) => { const c = D.CAMPAIGNS[x.i], t = x.t; const st = t.roas >= 4 ? ['Escalar', 'up'] : t.roas >= 2.5 ? ['Manter', 'flat'] : ['Revisar', 'down']; return `<tr data-camp="${x.i}" class="${S.f.campaign === x.i ? 'sel' : ''}"><td><span class="name"><b style="color:var(--mut2);font-family:var(--mono);margin-right:6px">${String(n + 1).padStart(2, '0')}</b>${c.n}</span></td><td><span class="tag"><span class="dot" style="background:${COL.plat[c.p]};margin:0"></span>${D.PLATFORMS[c.p]}</span></td><td><span class="tag">${D.OBJECTIVES[c.o]}</span></td><td>${F.money(t.sp)}</td><td>${F.int(t.ld)}</td><td>${F.money2(t.cpl)}</td><td>${F.int(t.sl)}</td><td>${F.x(t.roas)}<span class="bar"><i style="width:${(t[k] / mx) * 100}%;background:${COL.plat[c.p]}"></i></span></td><td><span class="delta ${st[1]}">${st[0]}</span></td></tr>`; }).join('')}</tbody></table>`;
  };

  const ICON = { 'Vídeo': '<polygon points="6 4 20 12 6 20 6 4"/>', 'Imagem': '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4-4L5 21"/>', 'Carrossel': '<rect x="2" y="6" width="9" height="12" rx="1.5"/><rect x="13" y="6" width="9" height="12" rx="1.5"/>', 'Pesquisa': '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 'Display': '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', 'Documento': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>' };
  RENDER.ads = () => {
    const k = S.metric.ads; const rc = cur(); const by = groupBy(rc, (r) => r.a, D.ADS.length).map((t, i) => ({ t, i })).filter((x) => x.t.sp > 0);
    const asc = k === 'cpl'; by.sort((x, y) => (asc ? x.t[k] - y.t[k] : y.t[k] - x.t[k]));
    $('#ad-sub').textContent = `Por ${ML[k]}${asc ? ' (menor é melhor)' : ''} • ${by.length} anúncios no filtro`;
    $('#ad-grid').innerHTML = by.slice(0, 8).map((x, n) => { const a = D.ADS[x.i], c = D.CAMPAIGNS[a.c], t = x.t; return `<button type="button" class="ad" data-camp="${a.c}" aria-pressed="${S.f.campaign === a.c}"><span class="th" style="background:linear-gradient(135deg,hsl(${a.hue} 70% 46%),hsl(${(a.hue + 50) % 360} 70% 36%))"><span class="rk">#${n + 1}</span><span class="fm">${a.f}</span><svg viewBox="0 0 24 24">${ICON[a.f] || ICON['Imagem']}</svg></span><span class="info"><span class="nm">${a.n}</span><span class="cp"><span class="dot" style="background:${COL.plat[c.p]};margin-right:5px"></span>${c.n}</span><span class="big">${MF[k](t[k])}</span><span class="mini"><span>CTR <b>${F.pct(t.ctr)}</b></span><span>CPL <b>${F.money2(t.cpl)}</b></span><span>Leads <b>${F.int(t.ld)}</b></span></span></span></button>`; }).join('') || '<div style="grid-column:1/-1;display:grid;place-items:center;color:var(--mut)">Nenhum anúncio neste filtro</div>';
    const fm = {}; cur('format').forEach((r) => { const f = D.ADS[r.a].f; (fm[f] = fm[f] || blank()); add(fm[f], r); });
    const names = Object.keys(fm).sort((x, y) => fm[y].sp - fm[x].sp);
    donut('ad-fmt', names.map((n) => ({ name: n, value: fm[n].sp, color: COL.fmt[n], dim: dimmed(S.f.format, n) })), { center: F.mcompact(names.reduce((s, n) => s + fm[n].sp, 0)), sub: 'investidos', legend: true, cs: 14, fmt: F.money, click: (p) => toggle('format', p.name) });
    const cpl = names.map((n) => ({ name: n, t: fin(fm[n]) })).sort((x, y) => x.t.cpl - y.t.cpl);
    hbar('ad-cpl', cpl.map((x) => ({ name: x.name, value: x.t.cpl, color: COL.fmt[x.name], dim: dimmed(S.f.format, x.name) })), { fmt: F.money2, lw: 74, right: 64, click: (p) => toggle('format', cpl[p.dataIndex].name) });
  };

  const STAGES = ['Impressões', 'Cliques', 'Sessões na página', 'Leads', 'Qualificados (MQL)', 'Oportunidades (SQL)', 'Propostas', 'Vendas'];
  const STAGE_COL = ['#1D4ED8', '#2563EB', '#3B82F6', '#6366F1', '#8B5CF6', '#0D9488', '#16A34A', '#15803D'];
  function funnelValues(t) { const v = [t.imp, t.clk, t.clk * 0.74, t.ld, t.ld * 0.55, t.ld * 0.3, t.ld * 0.11, t.sl]; v[6] = Math.max(v[6], v[7] * 1.25); return v; }
  RENDER.funnel = () => {
    const rc = cur(); const t = tot(rc); const v = funnelValues(t);
    const W = 760, H = 520, top = 10, sh = 52, gap = 6, cx = 330, maxW = 470, minW = 96;
    const lg = (x) => Math.log10(Math.max(x, 1)); const lmax = lg(v[0]) || 1;
    const w = v.map((x) => minW + (maxW - minW) * Math.pow(Math.max(0, lg(x)) / lmax, 1.15));
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Funil de marketing e vendas"><defs>${STAGE_COL.map((c, i) => `<linearGradient id="fg${i}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c}" stop-opacity=".78"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".78"/></linearGradient>`).join('')}<filter id="fsh" x="-5%" y="-10%" width="110%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".18"/></filter></defs>`;
    svg += `<text x="6" y="${top + 2}" font-size="10" font-weight="800" fill="${css('--mut2')}" letter-spacing=".12em">MARKETING</text>`;
    v.forEach((x, i) => {
      const y = top + 14 + i * (sh + gap); const wt = w[i], wb = i < v.length - 1 ? w[i + 1] : wt * 0.82;
      const pts = [[cx - wt / 2, y], [cx + wt / 2, y], [cx + wb / 2, y + sh], [cx - wb / 2, y + sh]].map((p) => p.join(',')).join(' ');
      const on = S.sel.stage === i;
      svg += `<g class="stg" data-stage="${i}" style="cursor:pointer" opacity="${S.sel.stage != null && !on ? 0.62 : 1}"><polygon points="${pts}" fill="url(#fg${i})" filter="url(#fsh)" ${on ? `stroke="${css('--tx')}" stroke-width="2"` : ''}/>`;
      svg += `<text x="${cx}" y="${y + sh / 2 - 2}" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">${compact(x)}</text><text x="${cx}" y="${y + sh / 2 + 14}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff" opacity=".9">${STAGES[i]}</text></g>`;
      if (i < v.length - 1) { const rate = x ? (v[i + 1] / x) * 100 : 0; const yy = y + sh + gap / 2; const xr = cx + Math.max(wt, wb) / 2 + 22; svg += `<line x1="${cx + wb / 2 + 4}" y1="${yy}" x2="${xr - 6}" y2="${yy}" stroke="${css('--line')}" stroke-width="1.2"/><g><rect x="${xr - 4}" y="${yy - 11}" width="74" height="22" rx="11" fill="${css('--card2')}" stroke="${css('--line')}"/><text x="${xr + 33}" y="${yy + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="${css('--tx')}">↓ ${dec(rate, rate < 10 ? 2 : 1)}%</text></g>`; }
    });
    const yFirstSales = top + 14 + 3 * (sh + gap);
    svg += `<text x="6" y="${yFirstSales - 3}" font-size="10" font-weight="800" fill="${css('--mut2')}" letter-spacing=".12em">COMERCIAL</text><line x1="6" y1="${yFirstSales - 8}" x2="${cx - w[3] / 2 - 12}" y2="${yFirstSales - 8}" stroke="${css('--line')}" stroke-dasharray="4 4"/>`;
    svg += `</svg>`;
    const box = $('#fn-svg'); box.innerHTML = svg;
    $$('.stg', box).forEach((g) => g.addEventListener('click', () => { S.sel.stage = +g.dataset.stage; RENDER.funnel(); }));
    const ov = v[0] ? (v[7] / v[0]) * 100 : 0;
    $('#fn-rates').innerHTML = `<table><thead><tr><th>Etapa</th><th>Volume</th><th>Da etapa anterior</th><th>Custo por etapa</th></tr></thead><tbody>${v.map((x, i) => `<tr data-stage="${i}" class="${S.sel.stage === i ? 'sel' : ''}"><td><span class="dot" style="background:${STAGE_COL[i]}"></span><span class="name">${STAGES[i]}</span></td><td>${F.compact(x)}</td><td>${i ? F.pct(v[i - 1] ? (x / v[i - 1]) * 100 : 0) : '—'}</td><td>${x ? F.money2(t.sp / x) : '—'}</td></tr>`).join('')}<tr class="total"><td>Impressão → venda</td><td>${F.int(v[7])}</td><td colspan="2">${dec(ov, 4)}%</td></tr></tbody></table>`;
    const si = S.sel.stage ?? 3; $('#fn-sel-t').textContent = STAGES[si];
    const bp = groupBy(cur('platform'), (r) => r.p, 4); const scale = [(x) => x.imp, (x) => x.clk, (x) => x.clk * 0.74, (x) => x.ld, (x) => x.ld * 0.55, (x) => x.ld * 0.3, (x) => x.ld * 0.11, (x) => x.sl][si];
    hbar('fn-plat', D.PLATFORMS.map((n, i) => ({ name: n, value: scale(bp[i]), color: COL.plat[i], dim: dimmed(S.f.platform, i) })).sort((x, y) => y.value - x.value), { fmt: (x) => (si === 7 ? dec(x, 1) : compact(x)), lw: 92, right: 56, click: (p) => toggle('platform', D.PLATFORMS.indexOf(p.name)) });
    const names = ['Lead → MQL', 'MQL → SQL', 'SQL → Proposta', 'Proposta → Venda'];
    hbar('fn-days', names.map((n, i) => ({ name: n, value: D.CRM.days[i], color: ['#6366F1', '#8B5CF6', '#0D9488', '#16A34A'][i] })), { fmt: (x) => dec(x, 1) + ' d', lw: 96, right: 40 });
    hbar('fn-loss', D.CRM.loss.slice(0, 5).map(([n, p], i) => ({ name: n, value: p, color: ['#E11D48', '#F59E0B', '#64748B', '#7C3AED', '#0E7490'][i] })), { fmt: (x) => x + '%', lw: 118, right: 36 });
  };

  const RFM = (() => {
    const cs = D.customers; const segs = D.SEGMENTS.map((s, i) => { const m = cs.filter((c) => c.s === i); const rev = m.reduce((a, c) => a + c.m, 0); return { i, s, n: m.length, rev, tk: m.length ? rev / m.length : 0, rec: m.length ? m.reduce((a, c) => a + c.r, 0) / m.length : 0 }; });
    const cell = {}; cs.forEach((c) => { const k = c.R + '-' + c.F; (cell[k] = cell[k] || { n: 0, rev: 0, s: c.s }); cell[k].n++; cell[k].rev += c.m; });
    return { segs, cell, total: cs.length };
  })();
  RENDER.rfm = () => {
    const sel = S.sel.seg; const mxN = Math.max(...Object.values(RFM.cell).map((c) => c.n), 1);
    const data = []; for (let R = 5; R >= 1; R--) for (let Fq = 1; Fq <= 5; Fq++) { const c = RFM.cell[R + '-' + Fq] || { n: 0, rev: 0, s: 9 }; data.push({ value: [Fq - 1, 5 - R, c.n], seg: c.s, rev: c.rev, itemStyle: { color: D.SEGMENTS[c.s].c, opacity: c.n ? (sel != null && sel !== c.s ? 0.12 : 0.3 + 0.7 * (c.n / mxN)) : 0.05, borderColor: cardc(), borderWidth: 3, borderRadius: 7 } }); }
    put('rf-grid', {
      grid: { left: 52, right: 8, top: 8, bottom: 40 }, tooltip: Object.assign(TT(), { trigger: 'item', formatter: (p) => `<b>${D.SEGMENTS[p.data.seg].n}</b><br/>R${5 - p.data.value[1]} • F${p.data.value[0] + 1}<br/>${F.int(p.data.value[2])} clientes<br/>Receita ${F.money(p.data.rev)}` }),
      xAxis: { type: 'category', data: ['F1', 'F2', 'F3', 'F4', 'F5'], name: 'Frequência →', nameLocation: 'middle', nameGap: 24, nameTextStyle: { color: mut(), fontSize: 11, fontWeight: 700 }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: mut(), fontSize: 11 }, splitLine: { show: false } },
      yAxis: { type: 'category', data: ['R5', 'R4', 'R3', 'R2', 'R1'], name: 'Recência', nameLocation: 'middle', nameGap: 34, nameTextStyle: { color: mut(), fontSize: 11, fontWeight: 700 }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: mut(), fontSize: 11 }, splitLine: { show: false } },
      series: [{ type: 'heatmap', data, label: { show: true, color: '#fff', fontSize: 12, fontWeight: 800, formatter: (p) => (p.data.value[2] ? p.data.value[2] : '') }, emphasis: { itemStyle: { borderColor: tx(), borderWidth: 2 } } }]
    }, (p) => { S.sel.seg = S.sel.seg === p.data.seg ? null : p.data.seg; RENDER.rfm(); });
    put('rf-tree', { tooltip: Object.assign(TT(), { trigger: 'item', formatter: (p) => `<b>${p.name}</b><br/>${F.money(p.value)} • ${p.data.n} clientes` }), series: [{ type: 'treemap', roam: false, nodeClick: false, breadcrumb: { show: false }, left: 4, right: 4, top: 4, bottom: 4, itemStyle: { borderColor: cardc(), borderWidth: 3, gapWidth: 3, borderRadius: 7 }, label: { color: '#fff', fontSize: 11, fontWeight: 700, formatter: (p) => `${p.name}\n${F.mcompact(p.value)}`, overflow: 'truncate' }, upperLabel: { show: false }, data: RFM.segs.filter((x) => x.rev > 0).map((x) => ({ name: x.s.n, value: x.rev, n: x.n, idx: x.i, itemStyle: { color: x.s.c, opacity: sel != null && sel !== x.i ? 0.25 : 1 } })) }] }, (p) => { S.sel.seg = S.sel.seg === p.data.idx ? null : p.data.idx; RENDER.rfm(); });
    const coh = []; D.COHORTS.forEach((c, y) => c.v.forEach((v, x) => coh.push([x, y, v])));
    put('rf-coh', {
      grid: { left: 52, right: 6, top: 4, bottom: 24 }, tooltip: Object.assign(TT(), { trigger: 'item', formatter: (p) => `${D.COHORTS[p.data[1]].n} • mês ${p.data[0]}<br/><b>${p.data[2]}%</b>` }), visualMap: { show: false, min: 0, max: 100, inRange: { color: [css('--accsoft'), css('--acc')] } },
      xAxis: { type: 'category', data: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'], axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: mut(), fontSize: 10.5 } }, yAxis: { type: 'category', inverse: true, data: D.COHORTS.map((c) => c.n), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: tx(), fontSize: 10.5, fontWeight: 600 } },
      series: [{ type: 'heatmap', data: coh, label: { show: true, fontSize: 10.5, fontWeight: 700, color: tx(), formatter: (p) => p.data[2] + '%' }, itemStyle: { borderColor: cardc(), borderWidth: 2, borderRadius: 5 } }]
    });
    const bc = groupBy(cur('campaign'), (r) => r.c, D.CAMPAIGNS.length).map((t, i) => ({ t, i })).filter((x) => x.t.rv > 0).sort((a, b) => b.t.rv - a.t.rv); const totRv = bc.reduce((s, x) => s + x.t.rv, 0) || 1; let acc = 0;
    const cum = bc.map((x) => { acc += x.t.rv; return +((acc / totRv) * 100).toFixed(1); }); const cls = cum.map((c, i) => (i === 0 || cum[i - 1] < 80 ? 'A' : cum[i - 1] < 95 ? 'B' : 'C')); const CC = { A: '#16A34A', B: '#F59E0B', C: '#94A3B8' };
    put('rf-abc', {
      grid: { left: 6, right: 8, top: 22, bottom: 4, containLabel: true }, tooltip: Object.assign(TT(), { trigger: 'axis' }), legend: { show: false },
      xAxis: Object.assign({ type: 'category', data: bc.map((x) => D.CAMPAIGNS[x.i].n.split(' • ')[0] + ' ' + (D.CAMPAIGNS[x.i].n.split(' • ')[1] || '')), axisLabel: { color: mut(), fontSize: 9.5, interval: 0, rotate: 40, formatter: (v) => (v.length > 15 ? v.slice(0, 14) + '…' : v) } }, { axisLine: { lineStyle: { color: css('--line') } }, axisTick: { show: false } }),
      yAxis: [{ type: 'value', axisLabel: { color: mut(), fontSize: 10, formatter: (v) => (v ? Math.round(v / 1000) + ' mil' : '0') }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } }, { type: 'value', max: 100, axisLabel: { color: mut(), fontSize: 10, formatter: '{value}%' }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } }],
      series: [{ name: 'Receita', type: 'bar', barWidth: '58%', data: bc.map((x, i) => ({ value: Math.round(x.t.rv), itemStyle: { color: CC[cls[i]], borderRadius: [5, 5, 0, 0] } })) }, { name: 'Acumulado', type: 'line', yAxisIndex: 1, smooth: 0.2, symbol: 'circle', symbolSize: 5, data: cum, lineStyle: { color: tx(), width: 2 }, itemStyle: { color: tx() }, markLine: { silent: true, symbol: 'none', lineStyle: { color: css('--mut2'), type: [5, 4] }, label: { show: false }, data: [{ yAxis: 80 }] } }]
    });
    const rows = RFM.segs.slice().sort((a, b) => b.rev - a.rev).slice(0, 7); const mx = Math.max(...rows.map((x) => x.rev), 1);
    $('#rf-tbl').innerHTML = `<table><thead><tr><th>Segmento</th><th>Clientes</th><th>Receita</th><th>Ticket</th><th>Recência</th><th style="text-align:left">Ação sugerida</th></tr></thead><tbody>${rows.map((x) => `<tr data-seg="${x.i}" class="${sel === x.i ? 'sel' : ''}"><td><span class="dot" style="background:${x.s.c}"></span><span class="name">${x.s.n}</span></td><td>${F.int(x.n)} <small style="color:var(--mut)">(${dec((x.n / RFM.total) * 100, 0)}%)</small></td><td>${F.money(x.rev)}<span class="bar"><i style="width:${(x.rev / mx) * 100}%;background:${x.s.c}"></i></span></td><td>${F.money(x.tk)}</td><td>${Math.round(x.rec)} d</td><td style="text-align:left;white-space:normal;color:var(--mut);font-weight:600;font-size:11.5px">${x.s.act}</td></tr>`).join('')}</tbody></table>`;
  };

  RENDER.devices = () => {
    const bd = groupBy(cur('device'), (r) => r.v, 4); const totSp = bd.reduce((s, t) => s + t.sp, 0) || 1;
    donut('dv-donut', D.DEVICES.map((n, i) => ({ name: n, value: bd[i].sp, color: COL.dev[i], dim: dimmed(S.f.device, i) })), { center: F.mcompact(totSp), sub: 'investidos', legend: false, fmt: F.money, r: ['58%', '84%'], click: (p) => toggle('device', D.DEVICES.indexOf(p.name)) });
    $('#dv-cards').innerHTML = D.DEVICES.map((n, i) => `<button type="button" class="dev" data-dev="${i}" aria-pressed="${S.f.device === i}" style="border-top:3px solid ${COL.dev[i]}"><span class="t"><span><span class="dot" style="background:${COL.dev[i]}"></span>${n}</span><span class="tag">${F.pct1((bd[i].sp / totSp) * 100)}</span></span><span class="p">${F.money(bd[i].sp)}</span><span class="kv"><span>CTR<b>${F.pct(bd[i].ctr)}</b></span><span>Custo por lead<b>${F.money2(bd[i].cpl)}</b></span><span>Leads<b>${F.int(bd[i].ld)}</b></span><span>Taxa de lead<b>${F.pct(bd[i].cvr)}</b></span></span></button>`).join('');
    const k = S.metric.dv, P = S.period, from = D.DAYS - P;
    put('dv-trend', {
      grid: { left: 6, right: 12, top: 26, bottom: 4, containLabel: true }, legend: { right: 6, top: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 3, textStyle: { color: mut(), fontSize: 11 } }, tooltip: Object.assign(TT(), { trigger: 'axis', valueFormatter: (v) => MF[k](v) }),
      xAxis: Object.assign({ type: 'category', boundaryGap: false, data: Array.from({ length: P }, (_, i) => dayLabel(from + i)) }, AX(), { splitLine: { show: false }, axisLabel: { color: mut(), fontSize: 10.5, interval: Math.ceil(P / 8) - 1 } }),
      yAxis: { type: 'value', axisLabel: { color: mut(), fontSize: 10.5, formatter: compact }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } },
      series: D.DEVICES.map((n, i) => ({ name: n, type: 'line', smooth: 0.25, showSymbol: false, data: daily(cur('device').filter((r) => r.v === i), from, D.DAYS).map((t) => t[k]), lineStyle: { width: dimmed(S.f.device, i) ? 1.2 : 2.5, color: COL.dev[i], opacity: dimmed(S.f.device, i) ? 0.3 : 1 }, itemStyle: { color: COL.dev[i] } }))
    });
    const m = D.DEVICES.map(() => D.PLATFORMS.map(() => 0)); cur('device').forEach((r) => { m[r.v][r.p] += r.sp; });
    put('dv-plat', {
      grid: { left: 6, right: 12, top: 26, bottom: 4, containLabel: true }, legend: { right: 6, top: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: mut(), fontSize: 11 } }, tooltip: Object.assign(TT(), { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: F.money }),
      xAxis: Object.assign({ type: 'category', data: D.DEVICES }, AX(), { splitLine: { show: false } }), yAxis: { type: 'value', axisLabel: { color: mut(), fontSize: 10.5, formatter: compact }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } },
      series: D.PLATFORMS.map((n, pi) => ({ name: n, type: 'bar', stack: 's', barWidth: '46%', itemStyle: { color: COL.plat[pi] }, data: D.DEVICES.map((_, di) => ({ value: Math.round(m[di][pi]), itemStyle: { color: COL.plat[pi], opacity: dimmed(S.f.device, di) ? 0.3 : 1 } })) }))
    }, (p) => toggle('device', p.dataIndex));
    hbar('dv-cvr', D.DEVICES.map((n, i) => ({ name: n, value: bd[i].cvr, color: COL.dev[i], dim: dimmed(S.f.device, i) })), { fmt: F.pct, lw: 62, right: 52, click: (p) => toggle('device', p.dataIndex) });
  };

  RENDER.demo = () => {
    const k = S.metric.demo; const fld = FIELD[k]; const fm = FIELD_FMT[k];
    const g = D.GENDERS.map(() => 0), dv = D.DEVICES.map(() => 0), co = D.COUNTRIES.map(() => 0);
    cur('gender').forEach((r) => { g[r.g] += r[fld]; }); cur('device').forEach((r) => { dv[r.v] += r[fld]; });
    cur('country').forEach((r) => { co[r.co] += r[fld]; });
    donut('dm-gen', D.GENDERS.map((n, i) => ({ name: n, value: g[i], color: COL.gen[i], dim: dimmed(S.f.gender, i) })), { center: fm(g.reduce((s, v) => s + v, 0)), sub: FIELD_LABEL[k], legend: true, cs: 15, fmt: fm, click: (p) => toggle('gender', D.GENDERS.indexOf(p.name)) });
    donut('dm-dev', D.DEVICES.map((n, i) => ({ name: n, value: dv[i], color: COL.dev[i], dim: dimmed(S.f.device, i) })), { center: fm(dv.reduce((s, v) => s + v, 0)), sub: FIELD_LABEL[k], legend: true, cs: 15, fmt: fm, click: (p) => toggle('device', D.DEVICES.indexOf(p.name)) });
    const py = D.AGES.map(() => D.GENDERS.map(() => 0)); cur('age').forEach((r) => { py[r.e][r.g] += r[fld]; });
    $('#dm-sub').textContent = `${FIELD_LABEL[k]} por faixa etária • feminino à esquerda`;
    const dim = (ai, gi) => (S.f.age != null && S.f.age !== ai) || (S.f.gender != null && S.f.gender !== gi);
    put('dm-pyr', {
      grid: { left: 8, right: 8, top: 22, bottom: 4, containLabel: true }, legend: { right: 4, top: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: mut(), fontSize: 11 } }, tooltip: Object.assign(TT(), { trigger: 'item', formatter: (p) => `${p.marker}${p.seriesName} • ${p.name}<br/><b>${fm(Math.abs(p.value))}</b>` }),
      xAxis: { type: 'value', axisLabel: { color: mut(), fontSize: 10, formatter: (v) => compact(Math.abs(v)) }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } },
      yAxis: { type: 'category', inverse: true, data: D.AGES, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: tx(), fontSize: 11, fontWeight: 600 }, position: 'left' },
      series: [{ name: 'Feminino', type: 'bar', stack: 'a', barCategoryGap: '30%', data: D.AGES.map((_, ai) => ({ value: -Math.round(py[ai][0]), itemStyle: { color: COL.gen[0], opacity: dim(ai, 0) ? 0.25 : 1, borderRadius: [6, 0, 0, 6] } })) },
        { name: 'Masculino', type: 'bar', stack: 'a', data: D.AGES.map((_, ai) => ({ value: Math.round(py[ai][1]), itemStyle: { color: COL.gen[1], opacity: dim(ai, 1) ? 0.25 : 1 } })) },
        { name: 'Não informado', type: 'bar', stack: 'a', data: D.AGES.map((_, ai) => ({ value: Math.round(py[ai][2]), itemStyle: { color: COL.gen[2], opacity: dim(ai, 2) ? 0.25 : 1, borderRadius: [0, 6, 6, 0] } })) }]
    }, (p) => { const gi = D.GENDERS.indexOf(p.seriesName), ai = p.dataIndex; if (S.f.gender === gi && S.f.age === ai) { S.f.gender = null; S.f.age = null; } else { S.f.gender = gi; S.f.age = ai; } render(); });
    const cs = D.COUNTRIES.map((n, i) => ({ name: n, value: co[i], color: '#2563EB', dim: dimmed(S.f.country, i) })).sort((a, b) => b.value - a.value);
    hbar('dm-co', cs.map((x) => Object.assign(x, { color: '#0E7490' })), { fmt: fm, lw: 96, right: 56, click: (p) => toggle('country', D.COUNTRIES.indexOf(cs[p.dataIndex].name)) });
    const cm = D.CITIES.map(() => 0); cur('city').forEach((r) => { cm[r.ci] += r[fld]; });
    let list = D.CITIES.map((c, i) => ({ c, i, v: cm[i] })).filter((x) => (S.f.country == null ? true : x.c.country === S.f.country)).sort((a, b) => b.v - a.v).slice(0, 8);
    $('#dm-ci-sub').textContent = S.f.country != null ? `Cidades de ${D.COUNTRIES[S.f.country]}` : 'As 8 maiores • clique para filtrar';
    hbar('dm-ci', list.map((x) => ({ name: x.c.name + (S.f.country == null ? ` (${D.COUNTRIES[x.c.country].slice(0, 2).toUpperCase()})` : ''), value: x.v, color: '#7C3AED', dim: dimmed(S.f.city, x.i) })), { fmt: fm, lw: 120, right: 56, click: (p) => { const x = list[p.dataIndex]; if (S.f.city === x.i) S.f.city = null; else { S.f.city = x.i; S.f.country = x.c.country; } render(); } });
    const hm = D.AGES.map(() => D.DEVICES.map(() => 0)); cur('age').forEach((r) => { hm[r.e][r.v] += r[fld]; }); const data = []; let mx = 0; D.AGES.forEach((_, ai) => D.DEVICES.forEach((__, di) => { data.push([di, ai, Math.round(hm[ai][di])]); mx = Math.max(mx, hm[ai][di]); }));
    put('dm-heat', {
      grid: { left: 6, right: 8, top: 4, bottom: 4, containLabel: true }, tooltip: Object.assign(TT(), { trigger: 'item', formatter: (p) => `${D.AGES[p.data[1]]} • ${D.DEVICES[p.data[0]]}<br/><b>${fm(p.data[2])}</b>` }), visualMap: { show: false, min: 0, max: mx || 1, inRange: { color: [css('--accsoft'), css('--acc')] } },
      xAxis: { type: 'category', data: D.DEVICES, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: tx(), fontSize: 11, fontWeight: 600 }, position: 'top' }, yAxis: { type: 'category', inverse: true, data: D.AGES, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: tx(), fontSize: 11, fontWeight: 600 } },
      series: [{ type: 'heatmap', data: data.map((d) => ({ value: d, itemStyle: { borderColor: cardc(), borderWidth: 3, borderRadius: 6, opacity: (S.f.age != null && S.f.age !== d[1]) || (S.f.device != null && S.f.device !== d[0]) ? 0.3 : 1 } })), label: { show: true, fontSize: 11, fontWeight: 700, color: tx(), formatter: (p) => compact(p.data.value[2]) } }]
    }, (p) => { const d = p.data.value; if (S.f.age === d[1] && S.f.device === d[0]) { S.f.age = null; S.f.device = null; } else { S.f.age = d[1]; S.f.device = d[0]; } render(); });
  };

  const OBJ_RESULT = [['Alcance', (t) => t.imp, F.compact, 'CPM', (t) => F.money2(t.cpm)], ['Cliques', (t) => t.clk, F.compact, 'CPC', (t) => F.money2(t.cpc)], ['Cliques', (t) => t.clk, F.compact, 'CTR', (t) => F.pct(t.ctr)], ['Leads', (t) => t.ld, F.int, 'CPL', (t) => F.money2(t.cpl)], ['Vendas', (t) => t.sl, F.int, 'ROAS', (t) => F.x(t.roas)], ['Vendas', (t) => t.sl, F.int, 'ROAS', (t) => F.x(t.roas)]];
  RENDER.objectives = () => {
    const bo = groupBy(cur('objective'), (r) => r.o, 6);
    $('#ob-grid').innerHTML = D.OBJECTIVES.map((n, i) => { const t = bo[i], R = OBJ_RESULT[i]; return `<button type="button" class="obj" data-obj="${i}" aria-pressed="${S.f.objective === i}" style="border-top:3px solid ${COL.obj[i]}"><span class="n"><span class="dot" style="background:${COL.obj[i]};margin:0"></span>${n}</span><span><span class="big">${R[2](R[1](t))}</span><span class="sub"> ${R[0].toLowerCase()}</span></span><span class="sub">${F.money(t.sp)} investidos • ${R[3]} ${R[4](t)}</span></button>`; }).join('');
    const nodes = [...D.PLATFORMS.map((n, i) => ({ name: n, itemStyle: { color: COL.plat[i] } })), ...D.OBJECTIVES.map((n, i) => ({ name: n, itemStyle: { color: COL.obj[i] } }))]; const links = []; const m = D.PLATFORMS.map(() => D.OBJECTIVES.map(() => 0)); cur('platform').forEach((r) => { m[r.p][r.o] += r.sp; });
    D.PLATFORMS.forEach((p, pi) => D.OBJECTIVES.forEach((o, oi) => { if (m[pi][oi] > 1) links.push({ source: p, target: o, value: Math.round(m[pi][oi]) }); }));
    put('ob-sank', { tooltip: Object.assign(TT(), { trigger: 'item', valueFormatter: F.money }), series: [{ type: 'sankey', left: 6, right: 96, top: 8, bottom: 8, nodeWidth: 14, nodeGap: 10, draggable: false, emphasis: { focus: 'adjacency' }, lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.35 }, label: { color: tx(), fontSize: 11, fontWeight: 700 }, data: nodes, links }] }, (p) => { if (p.dataType !== 'node') return; const pi = D.PLATFORMS.indexOf(p.name); if (pi >= 0) toggle('platform', pi); else toggle('objective', D.OBJECTIVES.indexOf(p.name)); });
    const cmp = S.groups.map((g) => { const rs = cur('group').filter((r) => inGroup(g, r.c)); return { g, t: tot(rs) }; });
    $('#gr-list').innerHTML = cmp.map(({ g, t }) => `<div class="grp" role="button" tabindex="0" data-grp="${g.id}" aria-pressed="${S.f.group === g.id}"><span class="n"><span>${g.name}</span><button type="button" class="x" data-del="${g.id}" aria-label="Excluir grupo ${g.name}">×</button></span><span class="rules">${[g.objectives.length ? g.objectives.map((i) => D.OBJECTIVES[i]).join(', ') : 'Todos os objetivos', g.platforms.length ? g.platforms.map((i) => D.PLATFORMS[i]).join(', ') : 'Todas as plataformas', g.q ? `nome contém “${g.q}”` : '', g.min ? `≥ ${F.money(g.min)}/mês` : ''].filter(Boolean).join(' • ')}</span><span class="m"><span>Invest.<b>${F.mcompact(t.sp)}</b></span><span>Leads<b>${F.int(t.ld)}</b></span><span>CPL<b>${F.money2(t.cpl)}</b></span><span>ROAS<b>${F.x(t.roas)}</b></span></span></div>`).join('') + '<button type="button" class="grp new" id="gr-new">+ Novo grupo</button>';
    put('gr-cmp', {
      grid: { left: 6, right: 12, top: 28, bottom: 4, containLabel: true }, legend: { right: 4, top: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 3, textStyle: { color: mut(), fontSize: 11 } }, tooltip: Object.assign(TT(), { trigger: 'axis' }),
      xAxis: Object.assign({ type: 'category', data: cmp.map((c) => c.g.name.length > 14 ? c.g.name.slice(0, 13) + '…' : c.g.name), axisLabel: { color: mut(), fontSize: 10, interval: 0 } }, { axisLine: { lineStyle: { color: css('--line') } }, axisTick: { show: false } }),
      yAxis: [{ type: 'value', axisLabel: { color: mut(), fontSize: 10, formatter: compact }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } }, { type: 'value', axisLabel: { color: mut(), fontSize: 10, formatter: (v) => dec(v, 0) + 'x' }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } }],
      series: [{ name: 'Investimento', type: 'bar', barWidth: '44%', data: cmp.map((c) => Math.round(c.t.sp)), itemStyle: { color: COL.plat[0], borderRadius: [6, 6, 0, 0] } }, { name: 'ROAS', type: 'line', yAxisIndex: 1, smooth: 0.2, symbol: 'circle', symbolSize: 7, data: cmp.map((c) => +c.t.roas.toFixed(2)), lineStyle: { color: COL.plat[1], width: 2.4 }, itemStyle: { color: COL.plat[1] } }]
    });
  };

  /* ---------- núcleo: navegação, filtros e render ---------- */
  function toggle(dim, v) { if (v == null || v < 0) return; S.f[dim] = S.f[dim] === v ? null : v; if (dim === 'country') S.f.city = null; if (dim === 'platform') S.view = 'all'; render(); }
  const CHIPS = { platform: (v) => `Plataforma: <b>${D.PLATFORMS[v]}</b>`, objective: (v) => `Objetivo: <b>${D.OBJECTIVES[v]}</b>`, device: (v) => `Dispositivo: <b>${D.DEVICES[v]}</b>`, gender: (v) => `Sexo: <b>${D.GENDERS[v]}</b>`, age: (v) => `Idade: <b>${D.AGES[v]}</b>`, country: (v) => `País: <b>${D.COUNTRIES[v]}</b>`, city: (v) => `Cidade: <b>${D.CITIES[v].name}</b>`, campaign: (v) => `Campanha: <b>${D.CAMPAIGNS[v].n}</b>`, format: (v) => `Formato: <b>${v}</b>`, group: (v) => { const g = S.groups.find((x) => x.id === v); return `Grupo: <b>${g ? g.name : ''}</b>`; } };
  function syncTop() {
    const p = PG[S.page]; $('#t-eye').textContent = `${String(S.page + 1).padStart(2, '0')} / ${String(PG.length).padStart(2, '0')}`; $('#t-title').textContent = p.t; $('#t-sub').textContent = p.s;
    $('#f-period').value = String(S.period); $('#f-plat').value = S.f.platform == null ? '' : String(S.f.platform); $('#f-obj').value = S.f.objective == null ? '' : String(S.f.objective);
    $('#f-grp').innerHTML = '<option value="">Todas as campanhas</option>' + S.groups.map((g) => `<option value="${g.id}">${g.name}</option>`).join(''); $('#f-grp').value = S.f.group || '';
    const keys = Object.keys(CHIPS).filter((k) => S.f[k] != null && !['platform', 'objective', 'group'].includes(k) || (['platform', 'objective', 'group'].includes(k) && S.f[k] != null && false));
    const extra = ['device', 'gender', 'age', 'country', 'city', 'campaign', 'format'].filter((k) => S.f[k] != null);
    $('#chips').innerHTML = extra.map((k) => `<button type="button" class="chip" data-clear="${k}" aria-label="Remover filtro">${CHIPS[k](S.f[k])}<i>×</i></button>`).join('') + (filterCount() ? '<button type="button" class="chip clear" data-clear="all">Limpar tudo</button>' : '');
    $$('.nav').forEach((b, i) => b.setAttribute('aria-current', i === S.page ? 'page' : 'false')); $$('.dots button').forEach((b, i) => b.setAttribute('aria-current', i === S.page ? 'page' : 'false'));
    $$('.page').forEach((el, i) => el.classList.toggle('on', i === S.page));
    $('#btn-auto').classList.toggle('on', S.auto); $('#btn-auto').setAttribute('aria-pressed', S.auto);
    void keys;
  }
  function render() {
    refreshGroup(); syncTop();
    const empty = cur().length === 0; $('#banner').hidden = !empty;
    $$('[data-seg]').forEach((b) => b.setAttribute('aria-pressed', String(S.metric[b.dataset.seg] === b.dataset.v)));
    RENDER[PG[S.page].id](); $$('[data-seg]').forEach((b) => b.setAttribute('aria-pressed', String(S.metric[b.dataset.seg] === b.dataset.v)));
    requestAnimationFrame(() => Object.values(CH).forEach((c) => { try { c.resize(); } catch (e) { /* gráfico fora da página */ } }));
  }
  function go(i) { S.page = (i + PG.length) % PG.length; S.sel.stage = S.sel.stage ?? 3; render(); if (S.auto) schedule(); }
  function schedule() { clearTimeout(timer); const bar = $('#autobar'); bar.style.transition = 'none'; bar.style.width = '0'; if (!S.auto) return; requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = 'width 16s linear'; bar.style.width = '100%'; })); timer = setTimeout(() => go(S.page + 1), 16000); }

  function build() {
    $('#nav').innerHTML = PG.map((p, i) => `<button type="button" class="nav" data-go="${i}" title="${p.t}" aria-label="${p.t}"><svg viewBox="0 0 24 24" aria-hidden="true">${p.i}</svg><span>${p.short}</span></button>`).join('');
    $('#dots').innerHTML = PG.map((p, i) => `<button type="button" data-go="${i}" aria-label="${p.t}"></button>`).join('');
    $('#stage').innerHTML = PG.map((p) => `<section class="page" id="pg-${p.id}" style="grid-template-rows:${ROWS[p.id]}">${HTML[p.id]()}</section>`).join('');
    const st = document.createElement('style'); st.textContent = r3; document.head.appendChild(st);
    $('#f-plat').innerHTML = '<option value="">Todas as plataformas</option>' + D.PLATFORMS.map((n, i) => `<option value="${i}">${n}</option>`).join('');
    $('#f-obj').innerHTML = '<option value="">Todos os objetivos</option>' + D.OBJECTIVES.map((n, i) => `<option value="${i}">${n}</option>`).join('');
  }
  function groupDialog() {
    $('#dlg-obj').innerHTML = D.OBJECTIVES.map((n, i) => `<label><input type="checkbox" value="${i}"> ${n}</label>`).join(''); $('#dlg-plat').innerHTML = D.PLATFORMS.map((n, i) => `<label><input type="checkbox" value="${i}"> ${n}</label>`).join('');
    $('#dlg-name').value = ''; $('#dlg-q').value = ''; $('#dlg-min').value = ''; $('#dlg').hidden = false; $('#dlg-name').focus();
  }
  function wire() {
    document.addEventListener('click', (e) => {
      const t = e.target;
      let el;
      if ((el = t.closest('[data-go]'))) { go(+el.dataset.go); return; }
      if ((el = t.closest('[data-seg]'))) { S.metric[el.dataset.seg] = el.dataset.v; render(); return; }
      if ((el = t.closest('[data-kpi]'))) { S.metric.evo = el.dataset.kpi; if (PG[S.page].id === 'overview') render(); return; }
      if ((el = t.closest('[data-clear]'))) { if (el.dataset.clear === 'all') { Object.keys(S.f).forEach((k) => { S.f[k] = null; }); S.view = 'all'; S.sel.seg = null; } else S.f[el.dataset.clear] = null; render(); return; }
      if ((el = t.closest('[data-plat]'))) { const v = el.dataset.plat; if (v === 'ga4') S.view = 'ga4'; else { S.view = 'all'; S.f.platform = v === 'all' ? null : +v; } render(); return; }
      if ((el = t.closest('tr[data-camp], button[data-camp]'))) { toggle('campaign', +el.dataset.camp); return; }
      if ((el = t.closest('tr[data-stage]'))) { S.sel.stage = +el.dataset.stage; render(); return; }
      if ((el = t.closest('tr[data-seg]'))) { S.sel.seg = S.sel.seg === +el.dataset.seg ? null : +el.dataset.seg; render(); return; }
      if ((el = t.closest('[data-dev]'))) { toggle('device', +el.dataset.dev); return; }
      if ((el = t.closest('[data-obj]'))) { toggle('objective', +el.dataset.obj); return; }
      if ((el = t.closest('[data-del]'))) { e.stopPropagation(); S.groups = S.groups.filter((g) => g.id !== el.dataset.del); if (S.f.group === el.dataset.del) S.f.group = null; store.set('zf-painel-grupos', S.groups); render(); return; }
      if ((el = t.closest('[data-grp]'))) { S.f.group = S.f.group === el.dataset.grp ? null : el.dataset.grp; render(); return; }
      if (t.closest('#gr-new')) { groupDialog(); return; }
      if (t.closest('#dlg-cancel') || t.id === 'dlg') { $('#dlg').hidden = true; return; }
      if (t.closest('#dlg-save')) {
        const name = $('#dlg-name').value.trim(); if (!name) { $('#dlg-name').focus(); return; }
        const g = { id: 'g' + Date.now(), name, objectives: $$('#dlg-obj input:checked').map((i) => +i.value), platforms: $$('#dlg-plat input:checked').map((i) => +i.value), q: $('#dlg-q').value.trim(), min: +$('#dlg-min').value || 0 };
        S.groups.push(g); S.f.group = g.id; store.set('zf-painel-grupos', S.groups); $('#dlg').hidden = true; render(); return;
      }
      if (t.closest('#btn-theme')) { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; store.set('zf-painel-tema', next); render(); return; }
      if (t.closest('#btn-auto')) { S.auto = !S.auto; syncTop(); schedule(); return; }
      if (t.closest('#btn-prev')) { go(S.page - 1); return; }
      if (t.closest('#btn-next')) { go(S.page + 1); return; }
      if (t.closest('#banner button')) { Object.keys(S.f).forEach((k) => { S.f[k] = null; }); render(); }
    });
    $('#f-period').addEventListener('change', (e) => { S.period = +e.target.value; render(); });
    $('#f-plat').addEventListener('change', (e) => { S.f.platform = e.target.value === '' ? null : +e.target.value; S.view = 'all'; render(); });
    $('#f-obj').addEventListener('change', (e) => { S.f.objective = e.target.value === '' ? null : +e.target.value; render(); });
    $('#f-grp').addEventListener('change', (e) => { S.f.group = e.target.value || null; render(); });
    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, select, textarea') || !$('#dlg').hidden) { if (e.key === 'Escape') $('#dlg').hidden = true; return; }
      if (e.key === 'ArrowRight') go(S.page + 1); else if (e.key === 'ArrowLeft') go(S.page - 1); else if (/^[1-9]$/.test(e.key)) go(+e.key - 1); else if (e.key === 'p') { S.auto = !S.auto; syncTop(); schedule(); } else if (e.key === 'Escape') { Object.keys(S.f).forEach((k) => { S.f[k] = null; }); render(); }
    });
    let x0 = null; $('#stage').addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    $('#stage').addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 90) go(S.page + (dx < 0 ? 1 : -1)); }, { passive: true });
    let rz = 0; window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => Object.values(CH).forEach((c) => { try { c.resize(); } catch (err) { /* sem gráfico */ } })); });
    const dis = new ResizeObserver(() => { Object.values(CH).forEach((c) => { try { c.resize(); } catch (err) { /* sem gráfico */ } }); }); dis.observe($('#stage'));
  }
  function init() {
    const saved = store.get('zf-painel-tema', 'light'); document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light';
    build(); wire(); render();
    const hash = (location.hash || '').replace('#', ''); const hi = PG.findIndex((p) => p.id === hash); if (hi > 0) go(hi);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render());
  }
  init();
})();
