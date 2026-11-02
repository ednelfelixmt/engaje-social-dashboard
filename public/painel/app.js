/* Painel Marketing ZF — interface, filtros cruzados e gráficos. Depende de data.js (window.PAINEL) e ECharts. */
(function () {
  'use strict';
  const SLUG = new URLSearchParams(location.search).get('org') || '';
  const PLAT_COLORS = { meta_ads: '#2563EB', google_ads: '#F59E0B', tiktok_ads: '#E11D48' };
  const PLAT_EXTRA = ['#0E7490', '#7C3AED', '#10B981'];
  function adapt(raw) {
    const end = new Date(raw.end + 'T12:00:00Z');
    const D = { DAYS: raw.days, END: raw.end, currency: raw.currency, dateOf: (d) => { const x = new Date(end); x.setUTCDate(x.getUTCDate() - (raw.days - 1 - d)); return new Date(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()); } };
    D.PLATFORM_IDS = raw.platforms.map((p) => p.id); D.PLATFORMS = raw.platforms.map((p) => p.name);
    D.OBJECTIVES = ['Reconhecimento', 'Tráfego', 'Engajamento', 'Leads', 'Vendas', 'Remarketing'];
    D.CAMPAIGNS = raw.campaigns;
    D.ADS = raw.ads.map((a) => { let h = 0; for (const ch of a.id) h = (h * 31 + ch.charCodeAt(0)) % 360; return Object.assign({ hue: h }, a); });
    D.DEVICES = raw.dims.device; D.GENDERS = raw.dims.gender; D.AGES = raw.dims.age; D.STATES = raw.dims.state; D.CITIES = raw.dims.city;
    D.rows = raw.rows.map((r) => { const c = raw.campaigns[r[1]]; return { d: r[0], c: r[1], a: r[2], p: c.p, o: c.o, imp: r[3], clk: r[4], sp: r[5], ld: r[6], sl: r[7], rv: r[8], pv: r[9], ck: r[10] }; });
    D.brk = raw.brk.map((r) => { const c = raw.campaigns[r[1]]; return { d: r[0], c: r[1], p: c.p, o: c.o, t: r[2], v: r[3], imp: r[4], clk: r[5], sp: r[6], ld: r[7], sl: r[8], rv: r[9] }; });
    D.crmChannels = raw.crmChannels; D.crm = raw.crm.map((r) => ({ d: r[0], ch: r[1], rv: r[2], pu: r[3], ld: r[4] }));
    return D;
  }
  function boot(D) {
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
  COL.plat = D.PLATFORM_IDS.map((id, i) => PLAT_COLORS[id] || PLAT_EXTRA[i % PLAT_EXTRA.length]);
  COL.fmt = new Proxy(COL.fmt, { get: (t, k) => t[k] || '#64748B' });
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
    { id: 'rfm', short: 'RFM', t: 'RFM e análises', s: 'RFM, curva ABC e ação sugerida por campanha', i: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.3c2.2.6 3.5 2.4 3.5 5.7"/>' },
    { id: 'devices', short: 'Dispositivos', t: 'Dispositivos', s: 'Desktop, mobile, tablet e outros', i: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>' },
    { id: 'demo', short: 'Demografia', t: 'Demografia', s: 'Sexo, idade, dispositivo, estado e cidade (detalhamentos independentes)', i: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>' },
    { id: 'objectives', short: 'Objetivos', t: 'Objetivos e grupos', s: 'Campanhas por objetivo e grupos personalizados', i: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>' }
  ];
  const DEFAULT_GROUPS = [
    { id: 'g1', name: 'Captação de leads', objectives: [3], platforms: [], q: '', min: 0 },
    { id: 'g2', name: 'Topo de funil', objectives: [0, 1, 2], platforms: [], q: '', min: 0 },
    { id: 'g3', name: 'Fundo de funil', objectives: [4, 5], platforms: [], q: '', min: 0 }
  ];
  const S = {
    page: 0, period: 30, view: 'all', metric: { evo: 'spend', plat: 'ld', rank: 'roas', ads: 'roas', dv: 'ld', demo: 'ld' }, sel: { stage: 3, seg: null, dev: null, gen: null, age: null, st: null, ci: null },
    f: { platform: null, objective: null, campaign: null, format: null, group: null },
    groups: store.get(('zf-painel-grupos-' + SLUG), DEFAULT_GROUPS), auto: false
  };
  let GSET = null; let timer = null;

  D.rows.forEach((r) => { r.w = (D.dateOf(r.d).getDay() + 6) % 7; });
  const CAMP30 = D.CAMPAIGNS.map(() => 0); D.rows.forEach((r) => { if (r.d >= D.DAYS - 30) CAMP30[r.c] += r.sp; });
  const inGroup = (g, ci) => { const c = D.CAMPAIGNS[ci]; if (g.objectives.length && !g.objectives.includes(c.o)) return false; if (g.platforms.length && !g.platforms.includes(D.PLATFORM_IDS[c.p])) return false; if (g.q && !c.n.toLowerCase().includes(g.q.toLowerCase())) return false; if (g.min && CAMP30[ci] < g.min) return false; return true; };
  function refreshGroup() { const g = S.groups.find((x) => x.id === S.f.group); GSET = g ? new Set(D.CAMPAIGNS.map((_, i) => i).filter((i) => inGroup(g, i))) : null; if (S.f.group && !g) S.f.group = null; }

  /* ---------- filtros cruzados e agregação ---------- */
  function pass(r, ign) {
    const f = S.f;
    if (f.platform != null && ign !== 'platform' && r.p !== f.platform) return false;
    if (f.objective != null && ign !== 'objective' && r.o !== f.objective) return false;
    if (f.campaign != null && ign !== 'campaign' && r.c !== f.campaign) return false;
    if (r.a != null && f.format != null && ign !== 'format' && D.ADS[r.a].f !== f.format) return false;
    if (GSET && ign !== 'group' && !GSET.has(r.c)) return false;
    return true;
  }
  const T_GEN = 0, T_AGE = 1, T_DEV = 2, T_ST = 3, T_CI = 4;
  const rowsIn = (from, to, ign) => D.rows.filter((r) => r.d >= from && r.d < to && pass(r, ign));
  const cur = (ign) => rowsIn(D.DAYS - S.period, D.DAYS, ign);
  const prv = (ign) => rowsIn(D.DAYS - 2 * S.period, D.DAYS - S.period, ign);
  const bk = (t) => D.brk.filter((r) => r.t === t && r.d >= D.DAYS - S.period && pass(r));
  const fin = (t) => { t.spend = t.sp; t.ctr = t.imp ? (t.clk / t.imp) * 100 : 0; t.cpc = t.clk ? t.sp / t.clk : 0; t.cpm = t.imp ? (t.sp / t.imp) * 1000 : 0; t.cpl = t.ld ? t.sp / t.ld : 0; t.cpa = t.sl ? t.sp / t.sl : 0; t.roas = t.sp ? t.rv / t.sp : 0; t.cvr = t.clk ? (t.ld / t.clk) * 100 : 0; return t; };
  const blank = () => ({ imp: 0, clk: 0, sp: 0, ld: 0, sl: 0, rv: 0, pv: 0, ck: 0 });
  const add = (t, r) => { t.imp += r.imp; t.clk += r.clk; t.sp += r.sp; t.ld += r.ld; t.sl += r.sl; t.rv += r.rv; t.pv += r.pv || 0; t.ck += r.ck || 0; };
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
  function chart(id) { const el = document.getElementById(id); if (!el) return null; let c = CH[id]; if (c && c.getDom() !== el) { c.dispose(); c = null; } if (!c) { el.innerHTML = ''; c = echarts.init(el); CH[id] = c; } return c; }
  function put(id, opt, click) { const c = chart(id); if (!c) return; c.setOption(Object.assign({ textStyle: { fontFamily: css('--font') }, animationDuration: 450 }, opt), true); c.off('click'); if (click) c.on('click', click); }
  function nodata(id, msg) { const el = document.getElementById(id); if (!el) return; if (CH[id]) { try { CH[id].dispose(); } catch (e) { /* já removido */ } delete CH[id]; } el.innerHTML = '<div class="nodata"><b>Sem dados</b><span>' + msg + '</span></div>'; }
  function selT(k, i) { if (i == null || i < 0) return; S.sel[k] = S.sel[k] === i ? null : i; render(); }
  const TT = () => ({ backgroundColor: css('--card'), borderColor: css('--line'), borderWidth: 1, textStyle: { color: css('--tx'), fontSize: 12, fontFamily: css('--font') }, extraCssText: 'border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:8px 10px' });
  const AX = () => ({ axisLine: { lineStyle: { color: css('--line') } }, axisTick: { show: false }, axisLabel: { color: css('--mut'), fontSize: 10.5, fontFamily: css('--font') }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } });
  const mut = () => css('--mut'), tx = () => css('--tx'), cardc = () => css('--card');

  function donut(id, items, o) {
    const total = items.reduce((s, i) => s + i.value, 0) || 1;
    const names = Object.fromEntries(items.map((i) => [i.name, Math.round((i.value / total) * 100) + '%']));
    put(id, {
      tooltip: Object.assign(TT(), { trigger: 'item', formatter: (p) => `${p.marker} ${p.name}<br/><b>${o.fmt(p.value)}</b> &nbsp;(${dec(p.percent, 1)}%)` }),
      title: { text: o.center, subtext: o.sub, left: o.legend ? '32%' : 'center', top: 'center', textAlign: o.legend ? 'center' : undefined, itemGap: 2, textStyle: { color: tx(), fontSize: o.cs || 17, fontWeight: 800, fontFamily: css('--font') }, subtextStyle: { color: mut(), fontSize: 10.5, fontFamily: css('--font') } },
      legend: o.legend ? { orient: 'vertical', right: 4, top: 'middle', icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 9, textStyle: { color: mut(), fontSize: 11, fontFamily: css('--font') }, formatter: (n) => `${n}  ${names[n] || ''}` } : { show: false },
      series: [{ type: 'pie', radius: o.r || (o.legend ? ['36%', '56%'] : ['56%', '80%']), center: [o.legend ? '32%' : '50%', '50%'], label: { show: false }, itemStyle: { borderColor: cardc(), borderWidth: 3, borderRadius: 6 }, emphasis: { scaleSize: 4 }, data: items.map((i) => ({ name: i.name, value: i.value, itemStyle: { color: i.color, opacity: i.dim ? 0.28 : 1 } })) }]
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
      ${card('c12', 'Google Analytics 4', 'Sessões, engajamento e conversões do site', '<div class="nodata"><b>O Google Analytics 4 ainda não está conectado a este cliente.</b><span>Com a integração ativa, aparecem aqui as sessões por canal, as páginas mais vistas e os eventos do site. Hoje o painel usa apenas mídia paga e CRM já sincronizados.</span></div>')}
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
    ${card('c5', 'Resultados por dia', 'Leads, checkouts e vendas', ch('fn-day'))}`;
  HTML.rfm = () => `${card('c5', 'Matriz RFM', 'Recência × frequência dos clientes', '<div class="nodata" id="rf-grid"></div>')}
    ${card('c4', 'Leads por dia da semana', 'Plataforma × dia • cor = volume', ch('rf-tree'))}
    ${card('c3', 'Receita do CRM por canal', 'Período selecionado', ch('rf-coh'))}
    ${card('c5', 'Curva ABC das campanhas', 'Receita acumulada (80% = classe A)', ch('rf-abc'))}
    ${card('c7', 'Campanhas e ação sugerida', 'Regras por ROAS e custo por lead', '<div class="tbl" id="rf-tbl"></div>')}`;
  HTML.devices = () => `${card('c3', 'Investimento por dispositivo', 'Clique para filtrar', ch('dv-donut'))}
    <div class="devcards c9" id="dv-cards"></div>
    ${card('c5', 'Tendência por dispositivo', '', ch('dv-trend'), seg('dv', [['ld', 'Leads'], ['spend', 'Invest.'], ['cpl', 'CPL']], 'ld'))}
    ${card('c4', 'Dispositivo por plataforma', 'Investimento', ch('dv-plat'))}
    ${card('c3', 'Taxa de lead por dispositivo', 'Leads por clique', ch('dv-cvr'))}`;
  HTML.demo = () => `${card('c3', 'Sexo', 'Clique para destacar', ch('dm-gen'))}
    ${card('c5', 'Faixa etária', '<span id="dm-sub"></span>', ch('dm-age'), seg('demo', [['ld', 'Leads'], ['sp', 'Invest.'], ['sl', 'Vendas']], 'ld'))}
    ${card('c4', 'Dispositivo', 'Clique para destacar', ch('dm-dev'))}
    ${card('c3', 'Estados', 'Clique para destacar', ch('dm-st'))}
    ${card('c4', 'Cidades', 'As 8 maiores • clique para destacar', ch('dm-ci'))}
    ${card('c5', 'Resultado por faixa etária', 'Custo e conversão', '<div class="tbl" id="dm-tbl"></div>')}`;
  HTML.objectives = () => `${card('c7', 'Objetivos de campanha', 'Objetivo inferido pelo resultado principal da campanha • clique para filtrar', '<div class="objgrid" id="ob-grid"></div>')}
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
    if (isGA) return;
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
    $('#ad-grid').innerHTML = by.slice(0, 8).map((x, n) => { const a = D.ADS[x.i], c = D.CAMPAIGNS[a.c], t = x.t; return `<button type="button" class="ad" data-camp="${a.c}" aria-pressed="${S.f.campaign === a.c}"><span class="th" style="background:${a.t ? `url('${encodeURI(a.t).replace(/'/g, '%27')}') center/cover no-repeat, ` : ''}linear-gradient(135deg,hsl(${a.hue} 70% 46%),hsl(${(a.hue + 50) % 360} 70% 36%))"><span class="rk">#${n + 1}</span><span class="fm">${a.f}</span><svg viewBox="0 0 24 24">${ICON[a.f] || ICON['Imagem']}</svg></span><span class="info"><span class="nm">${a.n}</span><span class="cp"><span class="dot" style="background:${COL.plat[c.p]};margin-right:5px"></span>${c.n}</span><span class="big">${MF[k](t[k])}</span><span class="mini"><span>CTR <b>${F.pct(t.ctr)}</b></span><span>CPL <b>${F.money2(t.cpl)}</b></span><span>Leads <b>${F.int(t.ld)}</b></span></span></span></button>`; }).join('') || '<div style="grid-column:1/-1;display:grid;place-items:center;color:var(--mut)">Nenhum anúncio neste filtro</div>';
    const fm = {}; cur('format').forEach((r) => { const f = D.ADS[r.a].f; (fm[f] = fm[f] || blank()); add(fm[f], r); });
    const names = Object.keys(fm).sort((x, y) => fm[y].sp - fm[x].sp);
    donut('ad-fmt', names.map((n) => ({ name: n, value: fm[n].sp, color: COL.fmt[n], dim: dimmed(S.f.format, n) })), { center: F.mcompact(names.reduce((s, n) => s + fm[n].sp, 0)), sub: 'investidos', legend: true, cs: 14, fmt: F.money, click: (p) => toggle('format', p.name) });
    const cpl = names.map((n) => ({ name: n, t: fin(fm[n]) })).sort((x, y) => x.t.cpl - y.t.cpl);
    hbar('ad-cpl', cpl.map((x) => ({ name: x.name, value: x.t.cpl, color: COL.fmt[x.name], dim: dimmed(S.f.format, x.name) })), { fmt: F.money2, lw: 74, right: 64, click: (p) => toggle('format', cpl[p.dataIndex].name) });
  };

  const STAGES = ['Impressões', 'Cliques', 'Visualizações da página', 'Leads', 'Checkouts', 'Vendas'];
  const STAGE_KEY = ['imp', 'clk', 'pv', 'ld', 'ck', 'sl'];
  const STAGE_COL = ['#1D4ED8', '#2563EB', '#3B82F6', '#7C3AED', '#0D9488', '#15803D'];
  RENDER.funnel = () => {
    const rc = cur(); const t = tot(rc); const v = STAGE_KEY.map((k) => t[k]);
    const W = 760, H = 520, top = 10, sh = 62, gap = 8, cx = 330, maxW = 470, minW = 110;
    const lg = (x) => Math.log10(Math.max(x, 1)); const lmax = lg(Math.max(...v)) || 1;
    const w = v.map((x) => minW + (maxW - minW) * Math.pow(Math.max(0, lg(x)) / lmax, 1.15));
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Funil de marketing e vendas"><defs>${STAGE_COL.map((c, i) => `<linearGradient id="fg${i}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c}" stop-opacity=".78"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".78"/></linearGradient>`).join('')}<filter id="fsh" x="-5%" y="-10%" width="110%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".18"/></filter></defs>`;
    svg += `<text x="6" y="${top + 2}" font-size="10" font-weight="800" fill="${css('--mut2')}" letter-spacing=".12em">MARKETING</text>`;
    v.forEach((x, i) => {
      const y = top + 14 + i * (sh + gap); const wt = w[i], wb = i < v.length - 1 ? w[i + 1] : wt * 0.82;
      const pts = [[cx - wt / 2, y], [cx + wt / 2, y], [cx + wb / 2, y + sh], [cx - wb / 2, y + sh]].map((p) => p.join(',')).join(' ');
      const on = S.sel.stage === i;
      svg += `<g class="stg" data-stage="${i}" style="cursor:pointer" opacity="${S.sel.stage != null && !on ? 0.62 : 1}"><polygon points="${pts}" fill="url(#fg${i})" filter="url(#fsh)" ${on ? `stroke="${css('--tx')}" stroke-width="2"` : ''}/>`;
      svg += `<text x="${cx}" y="${y + sh / 2 - 2}" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">${x ? compact(x) : '—'}</text><text x="${cx}" y="${y + sh / 2 + 14}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff" opacity=".9">${STAGES[i]}${x ? '' : ' (sem dado)'}</text></g>`;
      if (i < v.length - 1) { const rate = x && v[i + 1] ? (v[i + 1] / x) * 100 : null; const yy = y + sh + gap / 2; const xr = cx + Math.max(wt, wb) / 2 + 22; svg += `<line x1="${cx + wb / 2 + 4}" y1="${yy}" x2="${xr - 6}" y2="${yy}" stroke="${css('--line')}" stroke-width="1.2"/><g><rect x="${xr - 4}" y="${yy - 11}" width="74" height="22" rx="11" fill="${css('--card2')}" stroke="${css('--line')}"/><text x="${xr + 33}" y="${yy + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="${css('--tx')}">${rate == null ? '—' : '↓ ' + dec(rate, rate < 10 ? 2 : 1) + '%'}</text></g>`; }
    });
    svg += `</svg>`;
    const box = $('#fn-svg'); box.innerHTML = svg;
    $$('.stg', box).forEach((g) => g.addEventListener('click', () => { S.sel.stage = +g.dataset.stage; RENDER.funnel(); }));
    const ov = v[0] ? (v[5] / v[0]) * 100 : 0;
    $('#fn-rates').innerHTML = `<table><thead><tr><th>Etapa</th><th>Volume</th><th>Da etapa anterior</th><th>Custo por etapa</th></tr></thead><tbody>${v.map((x, i) => `<tr data-stage="${i}" class="${S.sel.stage === i ? 'sel' : ''}"><td><span class="dot" style="background:${STAGE_COL[i]}"></span><span class="name">${STAGES[i]}</span></td><td>${x ? F.compact(x) : '—'}</td><td>${i && x && v[i - 1] ? F.pct((x / v[i - 1]) * 100) : '—'}</td><td>${x ? F.money2(t.sp / x) : '—'}</td></tr>`).join('')}<tr class="total"><td>Impressão → venda</td><td>${F.int(v[5])}</td><td colspan="2">${dec(ov, 4)}%</td></tr></tbody></table>`;
    const si = S.sel.stage ?? 3; $('#fn-sel-t').textContent = STAGES[si];
    const bp = groupBy(cur('platform'), (r) => r.p, D.PLATFORMS.length);
    hbar('fn-plat', D.PLATFORMS.map((n, i) => ({ name: n, value: bp[i][STAGE_KEY[si]], color: COL.plat[i], dim: dimmed(S.f.platform, i) })).sort((x, y) => y.value - x.value), { fmt: (x) => compact(x), lw: 92, right: 56, click: (p) => toggle('platform', D.PLATFORMS.indexOf(p.name)) });
    const P = S.period, from = D.DAYS - P; const dd = daily(rc, from, D.DAYS);
    put('fn-day', {
      grid: { left: 6, right: 10, top: 26, bottom: 4, containLabel: true }, legend: { right: 6, top: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 3, textStyle: { color: mut(), fontSize: 11 } }, tooltip: Object.assign(TT(), { trigger: 'axis' }),
      xAxis: Object.assign({ type: 'category', boundaryGap: false, data: dd.map((_, i) => dayLabel(from + i)) }, AX(), { splitLine: { show: false }, axisLabel: { color: mut(), fontSize: 10.5, interval: Math.ceil(P / 7) - 1 } }),
      yAxis: { type: 'value', axisLabel: { color: mut(), fontSize: 10.5, formatter: compact }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } },
      series: [['Leads', 'ld', STAGE_COL[3]], ['Checkouts', 'ck', STAGE_COL[4]], ['Vendas', 'sl', STAGE_COL[5]]].map(([n, k, c]) => ({ name: n, type: 'line', smooth: 0.25, showSymbol: false, data: dd.map((x) => x[k]), lineStyle: { width: 2.4, color: c }, itemStyle: { color: c } }))
    });
  };

  RENDER.rfm = () => {
    $('#rf-grid').innerHTML = '<b>A matriz RFM precisa da base de clientes.</b><span>Ela cruza a data da última compra, a frequência e o valor de cada cliente. A sincronização atual traz receita por canal, mas não por cliente. Quando o CRM enviar as compras por cliente, esta área calcula os segmentos e as ações.</span>';
    const wd = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']; const m = D.PLATFORMS.map(() => wd.map(() => 0)); cur('platform').forEach((r) => { m[r.p][r.w] += r.ld; });
    const hdata = []; let hmx = 0; D.PLATFORMS.forEach((_, pi) => wd.forEach((__, di) => { hdata.push([di, pi, Math.round(m[pi][di])]); hmx = Math.max(hmx, m[pi][di]); }));
    put('rf-tree', {
      grid: { left: 6, right: 8, top: 22, bottom: 4, containLabel: true }, tooltip: Object.assign(TT(), { trigger: 'item', formatter: (p) => `${D.PLATFORMS[p.data[1]]} • ${wd[p.data[0]]}<br/><b>${F.int(p.data[2])} leads</b>` }), visualMap: { show: false, min: 0, max: hmx || 1, inRange: { color: [css('--accsoft'), css('--acc')] } },
      xAxis: { type: 'category', data: wd, position: 'top', axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: tx(), fontSize: 11, fontWeight: 600 } }, yAxis: { type: 'category', inverse: true, data: D.PLATFORMS, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: tx(), fontSize: 11, fontWeight: 600 } },
      series: [{ type: 'heatmap', data: hdata, label: { show: true, fontSize: 11, fontWeight: 700, color: tx(), formatter: (p) => compact(p.data[2]) }, itemStyle: { borderColor: cardc(), borderWidth: 3, borderRadius: 6 } }]
    });
    const crmRows = D.crm.filter((r) => r.d >= D.DAYS - S.period); const chv = D.crmChannels.map(() => 0); crmRows.forEach((r) => { chv[r.ch] += r.rv; });
    if (!crmRows.length || !chv.some((x) => x > 0)) nodata('rf-coh', 'Sem receita de CRM sincronizada neste período.');
    else hbar('rf-coh', D.crmChannels.map((n, i) => ({ name: n, value: chv[i], color: COL.ch[i % COL.ch.length] })).sort((x, y) => y.value - x.value).slice(0, 6), { fmt: F.mcompact, lw: 70, right: 60 });
    const bc = groupBy(cur('campaign'), (r) => r.c, D.CAMPAIGNS.length).map((t, i) => ({ t, i })).filter((x) => x.t.rv > 0).sort((a, b) => b.t.rv - a.t.rv); const totRv = bc.reduce((s, x) => s + x.t.rv, 0) || 1; let acc = 0;
    const cum = bc.map((x) => { acc += x.t.rv; return +((acc / totRv) * 100).toFixed(1); }); const cls = cum.map((c, i) => (i === 0 || cum[i - 1] < 80 ? 'A' : cum[i - 1] < 95 ? 'B' : 'C')); const CC = { A: '#16A34A', B: '#F59E0B', C: '#94A3B8' };
    put('rf-abc', {
      grid: { left: 6, right: 8, top: 22, bottom: 4, containLabel: true }, tooltip: Object.assign(TT(), { trigger: 'axis' }), legend: { show: false },
      xAxis: Object.assign({ type: 'category', data: bc.map((x) => D.CAMPAIGNS[x.i].n.split(' • ')[0] + ' ' + (D.CAMPAIGNS[x.i].n.split(' • ')[1] || '')), axisLabel: { color: mut(), fontSize: 9.5, interval: 0, rotate: 40, formatter: (v) => (v.length > 15 ? v.slice(0, 14) + '…' : v) } }, { axisLine: { lineStyle: { color: css('--line') } }, axisTick: { show: false } }),
      yAxis: [{ type: 'value', axisLabel: { color: mut(), fontSize: 10, formatter: (v) => (v ? Math.round(v / 1000) + ' mil' : '0') }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } }, { type: 'value', max: 100, axisLabel: { color: mut(), fontSize: 10, formatter: '{value}%' }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } }],
      series: [{ name: 'Receita', type: 'bar', barWidth: '58%', data: bc.map((x, i) => ({ value: Math.round(x.t.rv), itemStyle: { color: CC[cls[i]], borderRadius: [5, 5, 0, 0] } })) }, { name: 'Acumulado', type: 'line', yAxisIndex: 1, smooth: 0.2, symbol: 'circle', symbolSize: 5, data: cum, lineStyle: { color: tx(), width: 2 }, itemStyle: { color: tx() }, markLine: { silent: true, symbol: 'none', lineStyle: { color: css('--mut2'), type: [5, 4] }, label: { show: false }, data: [{ yAxis: 80 }] } }]
    });
    const med = (() => { const a = groupBy(cur('campaign'), (r) => r.c, D.CAMPAIGNS.length).filter((t) => t.ld > 0).map((t) => t.cpl).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0; })();
    const rows = groupBy(cur('campaign'), (r) => r.c, D.CAMPAIGNS.length).map((t, i) => ({ t, i })).filter((x) => x.t.sp > 0).sort((a, b) => b.t.sp - a.t.sp).slice(0, 7);
    const act = (t) => { if (t.rv > 0 && t.roas >= 4) return ['Escalar', 'up', 'Aumentar o orçamento com acompanhamento diário']; if (t.rv > 0 && t.roas < 1.5) return ['Revisar', 'down', 'Custo acima do retorno: revisar público e criativos']; if (t.rv > 0) return ['Manter', 'flat', 'Retorno saudável: testar novas variações']; if (t.ld === 0 && t.sl === 0) return ['Revisar', 'down', 'Sem resultado no período: pausar ou revisar a oferta']; if (med && t.cpl <= med) return ['Manter', 'flat', 'Custo por lead abaixo da mediana das campanhas']; return ['Otimizar', 'down', 'Custo por lead acima da mediana: testar criativos e público']; };
    $('#rf-tbl').innerHTML = `<table><thead><tr><th>Campanha</th><th>Plataforma</th><th>Invest.</th><th>Leads</th><th>CPL</th><th>ROAS</th><th>Status</th><th style="text-align:left">Ação sugerida</th></tr></thead><tbody>${rows.map(({ t, i }) => { const a = act(t); const c = D.CAMPAIGNS[i]; return `<tr data-camp="${i}"><td><span class="name">${c.n}</span></td><td><span class="tag"><span class="dot" style="background:${COL.plat[c.p]};margin:0"></span>${D.PLATFORMS[c.p]}</span></td><td>${F.money(t.sp)}</td><td>${F.int(t.ld)}</td><td>${t.ld ? F.money2(t.cpl) : '—'}</td><td>${t.rv > 0 ? F.x(t.roas) : '—'}</td><td><span class="delta ${a[1]}">${a[0]}</span></td><td style="text-align:left;white-space:normal;color:var(--mut);font-weight:600;font-size:11.5px">${a[2]}</td></tr>`; }).join('')}</tbody></table>`;
  };

  RENDER.devices = () => {
    if (!bk(T_DEV).some((r) => r.sp > 0 || r.imp > 0)) { ['dv-donut', 'dv-trend', 'dv-plat', 'dv-cvr'].forEach((id) => nodata(id, 'O detalhamento por dispositivo ainda não foi sincronizado para este período e filtros.')); $('#dv-cards').innerHTML = '<div class="nodata"><b>Sem dados por dispositivo.</b><span>Ative a coleta de detalhamentos nas integrações para ver desktop, mobile, tablet e outros.</span></div>'; return; }
    const bd = groupBy(bk(T_DEV), (r) => r.v, 4); const totSp = bd.reduce((s, t) => s + t.sp, 0) || 1;
    donut('dv-donut', D.DEVICES.map((n, i) => ({ name: n, value: bd[i].sp, color: COL.dev[i], dim: dimmed(S.sel.dev, i) })), { center: F.mcompact(totSp), sub: 'investidos', legend: false, fmt: F.money, r: ['58%', '84%'], click: (p) => selT('dev', D.DEVICES.indexOf(p.name)) });
    $('#dv-cards').innerHTML = D.DEVICES.map((n, i) => `<button type="button" class="dev" data-dev="${i}" aria-pressed="${S.sel.dev === i}" style="border-top:3px solid ${COL.dev[i]}"><span class="t"><span><span class="dot" style="background:${COL.dev[i]}"></span>${n}</span><span class="tag">${F.pct1((bd[i].sp / totSp) * 100)}</span></span><span class="p">${F.money(bd[i].sp)}</span><span class="kv"><span>CTR<b>${F.pct(bd[i].ctr)}</b></span><span>Custo por lead<b>${F.money2(bd[i].cpl)}</b></span><span>Leads<b>${F.int(bd[i].ld)}</b></span><span>Taxa de lead<b>${F.pct(bd[i].cvr)}</b></span></span></button>`).join('');
    const k = S.metric.dv, P = S.period, from = D.DAYS - P;
    put('dv-trend', {
      grid: { left: 6, right: 12, top: 26, bottom: 4, containLabel: true }, legend: { right: 6, top: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 3, textStyle: { color: mut(), fontSize: 11 } }, tooltip: Object.assign(TT(), { trigger: 'axis', valueFormatter: (v) => MF[k](v) }),
      xAxis: Object.assign({ type: 'category', boundaryGap: false, data: Array.from({ length: P }, (_, i) => dayLabel(from + i)) }, AX(), { splitLine: { show: false }, axisLabel: { color: mut(), fontSize: 10.5, interval: Math.ceil(P / 8) - 1 } }),
      yAxis: { type: 'value', axisLabel: { color: mut(), fontSize: 10.5, formatter: compact }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } },
      series: D.DEVICES.map((n, i) => ({ name: n, type: 'line', smooth: 0.25, showSymbol: false, data: daily(bk(T_DEV).filter((r) => r.v === i), from, D.DAYS).map((t) => t[k]), lineStyle: { width: dimmed(S.sel.dev, i) ? 1.2 : 2.5, color: COL.dev[i], opacity: dimmed(S.sel.dev, i) ? 0.3 : 1 }, itemStyle: { color: COL.dev[i] } }))
    });
    const m = D.DEVICES.map(() => D.PLATFORMS.map(() => 0)); bk(T_DEV).forEach((r) => { m[r.v][r.p] += r.sp; });
    put('dv-plat', {
      grid: { left: 6, right: 12, top: 26, bottom: 4, containLabel: true }, legend: { right: 6, top: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: mut(), fontSize: 11 } }, tooltip: Object.assign(TT(), { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: F.money }),
      xAxis: Object.assign({ type: 'category', data: D.DEVICES }, AX(), { splitLine: { show: false } }), yAxis: { type: 'value', axisLabel: { color: mut(), fontSize: 10.5, formatter: compact }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: css('--line'), type: [3, 4] } } },
      series: D.PLATFORMS.map((n, pi) => ({ name: n, type: 'bar', stack: 's', barWidth: '46%', itemStyle: { color: COL.plat[pi] }, data: D.DEVICES.map((_, di) => ({ value: Math.round(m[di][pi]), itemStyle: { color: COL.plat[pi], opacity: dimmed(S.sel.dev, di) ? 0.3 : 1 } })) }))
    }, (p) => selT('dev', p.dataIndex));
    hbar('dv-cvr', D.DEVICES.map((n, i) => ({ name: n, value: bd[i].cvr, color: COL.dev[i], dim: dimmed(S.sel.dev, i) })), { fmt: F.pct, lw: 62, right: 52, click: (p) => selT('dev', p.dataIndex) });
  };

  RENDER.demo = () => {
    const k = S.metric.demo, fld = FIELD[k], fm = FIELD_FMT[k];
    const agg = (t, n) => groupBy(bk(t), (r) => r.v, n);
    const g = agg(T_GEN, D.GENDERS.length), dv = agg(T_DEV, D.DEVICES.length), ag = agg(T_AGE, D.AGES.length), st = agg(T_ST, D.STATES.length), ci = agg(T_CI, D.CITIES.length);
    const sum = (a) => a.reduce((x, t) => x + t[fld], 0);
    const none = (id, a, what) => { if (a.some((t) => t.sp > 0 || t.imp > 0)) return false; nodata(id, 'O detalhamento por ' + what + ' ainda não foi sincronizado para este período e filtros.'); return true; };
    if (!none('dm-gen', g, 'sexo')) donut('dm-gen', D.GENDERS.map((n, i) => ({ name: n, value: g[i][fld], color: COL.gen[i], dim: dimmed(S.sel.gen, i) })).filter((x) => x.value > 0), { center: fm(sum(g)), sub: FIELD_LABEL[k], legend: true, cs: 15, fmt: fm, click: (p) => selT('gen', D.GENDERS.indexOf(p.name)) });
    if (!none('dm-dev', dv, 'dispositivo')) donut('dm-dev', D.DEVICES.map((n, i) => ({ name: n, value: dv[i][fld], color: COL.dev[i], dim: dimmed(S.sel.dev, i) })).filter((x) => x.value > 0), { center: fm(sum(dv)), sub: FIELD_LABEL[k], legend: true, cs: 15, fmt: fm, click: (p) => selT('dev', D.DEVICES.indexOf(p.name)) });
    if (!none('dm-age', ag, 'faixa etária')) hbar('dm-age', D.AGES.map((n, i) => ({ name: n, value: ag[i][fld], color: COL.age[Math.min(i, COL.age.length - 1) + 0], dim: dimmed(S.sel.age, i) })), { fmt: fm, lw: 64, right: 70, click: (p) => selT('age', p.dataIndex) });
    const top = (a, names, n) => names.map((name, i) => ({ name, i, v: a[i][fld] })).sort((x, y) => y.v - x.v).slice(0, n);
    const sl = top(st, D.STATES, 6), cl = top(ci, D.CITIES, 8);
    if (!none('dm-st', st, 'estado')) hbar('dm-st', sl.map((x) => ({ name: x.name, value: x.v, color: '#0E7490', dim: dimmed(S.sel.st, x.i) })), { fmt: fm, lw: 96, right: 60, click: (p) => selT('st', sl[p.dataIndex].i) });
    if (!none('dm-ci', ci, 'cidade')) hbar('dm-ci', cl.map((x) => ({ name: x.name, value: x.v, color: '#7C3AED', dim: dimmed(S.sel.ci, x.i) })), { fmt: fm, lw: 120, right: 60, click: (p) => selT('ci', cl[p.dataIndex].i) });
    const parts = [];
    const note = (label, name, t) => parts.push(label + ' ' + name + ': ' + fm(t[fld]) + ' • CPL ' + (t.ld ? F.money2(t.cpl) : '—'));
    if (S.sel.gen != null) note('Sexo', D.GENDERS[S.sel.gen], g[S.sel.gen]);
    if (S.sel.dev != null) note('Dispositivo', D.DEVICES[S.sel.dev], dv[S.sel.dev]);
    if (S.sel.age != null) note('Idade', D.AGES[S.sel.age], ag[S.sel.age]);
    if (S.sel.st != null) note('Estado', D.STATES[S.sel.st], st[S.sel.st]);
    if (S.sel.ci != null) note('Cidade', D.CITIES[S.sel.ci], ci[S.sel.ci]);
    $('#dm-sub').textContent = parts.length ? parts.join(' | ') : FIELD_LABEL[k] + ' por faixa etária • clique para destacar';
    if (none('dm-tbl', ag, 'faixa etária')) { $('#dm-tbl').innerHTML = '<div class="nodata"><b>Sem dados</b><span>O detalhamento por faixa etária ainda não foi sincronizado.</span></div>'; return; }
    $('#dm-tbl').innerHTML = `<table><thead><tr><th>Faixa</th><th>Invest.</th><th>Leads</th><th>CPL</th><th>CTR</th><th>Taxa de lead</th></tr></thead><tbody>${D.AGES.map((n, i) => { const t = ag[i]; return `<tr style="cursor:default" class="${S.sel.age === i ? 'sel' : ''}"><td><span class="name">${n}</span></td><td>${F.money(t.sp)}</td><td>${F.int(t.ld)}</td><td>${t.ld ? F.money2(t.cpl) : '—'}</td><td>${F.pct(t.ctr)}</td><td>${F.pct(t.cvr)}</td></tr>`; }).join('')}</tbody></table>`;
  };

  const OBJ_RESULT = [['Alcance', (t) => t.imp, F.compact, 'CPM', (t) => F.money2(t.cpm)], ['Cliques', (t) => t.clk, F.compact, 'CPC', (t) => F.money2(t.cpc)], ['Cliques', (t) => t.clk, F.compact, 'CTR', (t) => F.pct(t.ctr)], ['Leads', (t) => t.ld, F.int, 'CPL', (t) => F.money2(t.cpl)], ['Vendas', (t) => t.sl, F.int, 'ROAS', (t) => F.x(t.roas)], ['Vendas', (t) => t.sl, F.int, 'ROAS', (t) => F.x(t.roas)]];
  RENDER.objectives = () => {
    const bo = groupBy(cur('objective'), (r) => r.o, 6);
    $('#ob-grid').innerHTML = D.OBJECTIVES.map((n, i) => { const t = bo[i], R = OBJ_RESULT[i]; return `<button type="button" class="obj" data-obj="${i}" aria-pressed="${S.f.objective === i}" style="border-top:3px solid ${COL.obj[i]}"><span class="n"><span class="dot" style="background:${COL.obj[i]};margin:0"></span>${n}</span><span><span class="big">${R[2](R[1](t))}</span><span class="sub"> ${R[0].toLowerCase()}</span></span><span class="sub">${F.money(t.sp)} investidos • ${R[3]} ${R[4](t)}</span></button>`; }).join('');
    const nodes = [...D.PLATFORMS.map((n, i) => ({ name: n, itemStyle: { color: COL.plat[i] } })), ...D.OBJECTIVES.map((n, i) => ({ name: n, itemStyle: { color: COL.obj[i] } }))]; const links = []; const m = D.PLATFORMS.map(() => D.OBJECTIVES.map(() => 0)); cur('platform').forEach((r) => { m[r.p][r.o] += r.sp; });
    D.PLATFORMS.forEach((p, pi) => D.OBJECTIVES.forEach((o, oi) => { if (m[pi][oi] > 1) links.push({ source: p, target: o, value: Math.round(m[pi][oi]) }); }));
    put('ob-sank', { tooltip: Object.assign(TT(), { trigger: 'item', valueFormatter: F.money }), series: [{ type: 'sankey', left: 6, right: 96, top: 8, bottom: 8, nodeWidth: 14, nodeGap: 10, draggable: false, emphasis: { focus: 'adjacency' }, lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.35 }, label: { color: tx(), fontSize: 11, fontWeight: 700 }, data: nodes, links }] }, (p) => { if (p.dataType !== 'node') return; const pi = D.PLATFORMS.indexOf(p.name); if (pi >= 0) toggle('platform', pi); else toggle('objective', D.OBJECTIVES.indexOf(p.name)); });
    const cmp = S.groups.map((g) => { const rs = cur('group').filter((r) => inGroup(g, r.c)); return { g, t: tot(rs) }; });
    $('#gr-list').innerHTML = cmp.map(({ g, t }) => `<div class="grp" role="button" tabindex="0" data-grp="${g.id}" aria-pressed="${S.f.group === g.id}"><span class="n"><span>${g.name}</span><button type="button" class="x" data-del="${g.id}" aria-label="Excluir grupo ${g.name}">×</button></span><span class="rules">${[g.objectives.length ? g.objectives.map((i) => D.OBJECTIVES[i]).join(', ') : 'Todos os objetivos', g.platforms.length ? g.platforms.map((id) => D.PLATFORMS[D.PLATFORM_IDS.indexOf(id)] || id).join(', ') : 'Todas as plataformas', g.q ? `nome contém “${g.q}”` : '', g.min ? `≥ ${F.money(g.min)}/mês` : ''].filter(Boolean).join(' • ')}</span><span class="m"><span>Invest.<b>${F.mcompact(t.sp)}</b></span><span>Leads<b>${F.int(t.ld)}</b></span><span>CPL<b>${F.money2(t.cpl)}</b></span><span>ROAS<b>${F.x(t.roas)}</b></span></span></div>`).join('') + '<button type="button" class="grp new" id="gr-new">+ Novo grupo</button>';
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
    const extra = ['campaign', 'format'].filter((k) => S.f[k] != null);
    $('#chips').innerHTML = extra.map((k) => `<button type="button" class="chip" data-clear="${k}" aria-label="Remover filtro">${CHIPS[k](S.f[k])}<i>×</i></button>`).join('') + (filterCount() ? '<button type="button" class="chip clear" data-clear="all">Limpar tudo</button>' : '');
    $$('.nav').forEach((b, i) => b.setAttribute('aria-current', i === S.page ? 'page' : 'false')); $$('.dots button').forEach((b, i) => b.setAttribute('aria-current', i === S.page ? 'page' : 'false'));
    $$('.page').forEach((el, i) => el.classList.toggle('on', i === S.page));
    $('#btn-auto').classList.toggle('on', S.auto); $('#btn-auto').setAttribute('aria-pressed', S.auto);
    void keys;
  }
  function render() {
    refreshGroup(); syncTop();
    const noSync = D.rows.length === 0; const empty = noSync || cur().length === 0; $('#banner').hidden = !empty; $('#banner').firstChild.textContent = noSync ? 'Ainda não há dados sincronizados nos últimos 60 dias para este cliente.' : 'Nenhum dado para esta combinação de filtros. '; $('#banner button').hidden = noSync;
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
    $('#dlg-obj').innerHTML = D.OBJECTIVES.map((n, i) => `<label><input type="checkbox" value="${i}"> ${n}</label>`).join(''); $('#dlg-plat').innerHTML = D.PLATFORMS.map((n, i) => `<label><input type="checkbox" value="${D.PLATFORM_IDS[i]}"> ${n}</label>`).join('');
    $('#dlg-name').value = ''; $('#dlg-q').value = ''; $('#dlg-min').value = ''; $('#dlg').hidden = false; $('#dlg-name').focus();
  }
  function wire() {
    document.addEventListener('click', (e) => {
      const t = e.target;
      let el;
      if ((el = t.closest('[data-go]'))) { go(+el.dataset.go); return; }
      if ((el = t.closest('[data-seg]'))) { S.metric[el.dataset.seg] = el.dataset.v; render(); return; }
      if ((el = t.closest('[data-kpi]'))) { S.metric.evo = el.dataset.kpi; if (PG[S.page].id === 'overview') render(); return; }
      if ((el = t.closest('[data-clear]'))) { if (el.dataset.clear === 'all') { Object.keys(S.f).forEach((k) => { S.f[k] = null; }); S.view = 'all'; S.sel.seg = null; S.sel.dev = S.sel.gen = S.sel.age = S.sel.st = S.sel.ci = null; } else S.f[el.dataset.clear] = null; render(); return; }
      if ((el = t.closest('[data-plat]'))) { const v = el.dataset.plat; if (v === 'ga4') S.view = 'ga4'; else { S.view = 'all'; S.f.platform = v === 'all' ? null : +v; } render(); return; }
      if ((el = t.closest('tr[data-camp], button[data-camp]'))) { toggle('campaign', +el.dataset.camp); return; }
      if ((el = t.closest('tr[data-stage]'))) { S.sel.stage = +el.dataset.stage; render(); return; }
      if ((el = t.closest('tr[data-seg]'))) { S.sel.seg = S.sel.seg === +el.dataset.seg ? null : +el.dataset.seg; render(); return; }
      if ((el = t.closest('[data-dev]'))) { selT('dev', +el.dataset.dev); return; }
      if ((el = t.closest('[data-obj]'))) { toggle('objective', +el.dataset.obj); return; }
      if ((el = t.closest('[data-del]'))) { e.stopPropagation(); S.groups = S.groups.filter((g) => g.id !== el.dataset.del); if (S.f.group === el.dataset.del) S.f.group = null; store.set(('zf-painel-grupos-' + SLUG), S.groups); render(); return; }
      if ((el = t.closest('[data-grp]'))) { S.f.group = S.f.group === el.dataset.grp ? null : el.dataset.grp; render(); return; }
      if (t.closest('#gr-new')) { groupDialog(); return; }
      if (t.closest('#dlg-cancel') || t.id === 'dlg') { $('#dlg').hidden = true; return; }
      if (t.closest('#dlg-save')) {
        const name = $('#dlg-name').value.trim(); if (!name) { $('#dlg-name').focus(); return; }
        const g = { id: 'g' + Date.now(), name, objectives: $$('#dlg-obj input:checked').map((i) => +i.value), platforms: $$('#dlg-plat input:checked').map((i) => i.value), q: $('#dlg-q').value.trim(), min: +$('#dlg-min').value || 0 };
        S.groups.push(g); S.f.group = g.id; store.set(('zf-painel-grupos-' + SLUG), S.groups); $('#dlg').hidden = true; render(); return;
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
    build(); wire();
    $('.foot .zf span').textContent = 'Dados reais sincronizados • até ' + D.END.split('-').reverse().join('/') + ' • ' + D.currency;
    render();
    const hash = (location.hash || '').replace('#', ''); const hi = PG.findIndex((p) => p.id === hash); if (hi > 0) go(hi);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render());
  }
  init();
  }
  fetch('/' + SLUG + '/painel/dados', { credentials: 'same-origin' })
    .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then((raw) => boot(adapt(raw)))
    .catch(() => { document.body.insertAdjacentHTML('afterbegin', '<div class="nodata" style="margin:24px"><b>Não foi possível carregar os dados do painel.</b><span>Atualize a página ou entre novamente.</span></div>'); });
})();
