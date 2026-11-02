/* Dados fictícios do painel: tabela de fatos (campanha × anúncio × dispositivo × sexo × idade × país × cidade × dia),
   Google Analytics 4, clientes para RFM, coortes e CRM. Gerador determinístico: os mesmos números a cada abertura. */
(function () {
  'use strict';
  function rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const rnd = rng(20261102);
  const pick = (n, w) => { let s = 0; for (let i = 0; i < n; i++) s += w[i]; let x = rnd() * s; for (let i = 0; i < n; i++) { x -= w[i]; if (x <= 0) return i; } return n - 1; };

  const DAYS = 60;                                   // 60 dias para comparar período atual × anterior
  const END = new Date(2026, 10, 1);                 // 01/11/2026
  const dateOf = (d) => { const x = new Date(END); x.setDate(x.getDate() - (DAYS - 1 - d)); return x; };

  const PLATFORMS = ['Meta', 'Google Ads', 'TikTok', 'LinkedIn'];
  const OBJECTIVES = ['Reconhecimento', 'Tráfego', 'Engajamento', 'Leads', 'Vendas', 'Remarketing'];
  const DEVICES = ['Desktop', 'Mobile', 'Tablet', 'Outros'];
  const GENDERS = ['Feminino', 'Masculino', 'Não informado'];
  const AGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
  const COUNTRIES = ['Brasil', 'Portugal', 'Estados Unidos', 'Argentina', 'Paraguai'];
  const CITY_DEF = {
    'Brasil': [['São Paulo', 28], ['Rio de Janeiro', 14], ['Belo Horizonte', 10], ['Cuiabá', 10], ['Curitiba', 8], ['Brasília', 8], ['Goiânia', 7], ['Porto Alegre', 7], ['Salvador', 5], ['Fortaleza', 3]],
    'Portugal': [['Lisboa', 50], ['Porto', 30], ['Braga', 20]],
    'Estados Unidos': [['Miami', 40], ['Orlando', 30], ['Nova York', 30]],
    'Argentina': [['Buenos Aires', 60], ['Córdoba', 40]],
    'Paraguai': [['Assunção', 60], ['Ciudad del Este', 40]]
  };
  const CITIES = []; const CITY_BY_COUNTRY = COUNTRIES.map(() => []);
  COUNTRIES.forEach((co, ci) => CITY_DEF[co].forEach(([name, w]) => { CITIES.push({ name, country: ci, w }); CITY_BY_COUNTRY[ci].push(CITIES.length - 1); }));
  const COUNTRY_W = [82, 7, 5, 3, 3];

  // p = plataforma, o = objetivo, b = orçamento diário (R$), q = qualidade (multiplica CTR/CVR), t = tendência
  const CAMPAIGNS = [
    { n: 'Lançamento • Vídeo', p: 0, o: 3, b: 310, q: 1.15, t: 0.9 },
    { n: 'Institucional • Carrossel', p: 0, o: 0, b: 120, q: 0.9, t: 0.2 },
    { n: 'Remarketing • Site', p: 0, o: 5, b: 140, q: 1.3, t: 0.5 },
    { n: 'Visitas • Mensagens', p: 0, o: 3, b: 180, q: 1.0, t: 0.4 },
    { n: 'Engajamento • Reels', p: 0, o: 2, b: 90, q: 1.1, t: 0.3 },
    { n: 'Tráfego • Landing', p: 0, o: 1, b: 110, q: 0.95, t: 0.1 },
    { n: 'Catálogo • Conversão', p: 0, o: 4, b: 130, q: 1.05, t: 0.6 },
    { n: 'Busca • Marca', p: 1, o: 3, b: 85, q: 1.6, t: 0.2 },
    { n: 'Busca • Genérica', p: 1, o: 3, b: 210, q: 0.85, t: 0.3 },
    { n: 'Display • Remarketing', p: 1, o: 5, b: 70, q: 1.1, t: 0.1 },
    { n: 'Performance Max • Vendas', p: 1, o: 4, b: 190, q: 1.2, t: 0.8 },
    { n: 'YouTube • Alcance', p: 1, o: 0, b: 100, q: 0.8, t: 0.0 },
    { n: 'Spark Ads • Engajamento', p: 2, o: 2, b: 75, q: 1.2, t: 0.7 },
    { n: 'TikTok • Tráfego', p: 2, o: 1, b: 60, q: 0.9, t: 0.2 },
    { n: 'TikTok • Leads', p: 2, o: 3, b: 95, q: 0.8, t: 0.3 },
    { n: 'Lead Gen • Decisores', p: 3, o: 3, b: 150, q: 1.1, t: 0.4 },
    { n: 'Conteúdo • Autoridade', p: 3, o: 0, b: 80, q: 0.85, t: 0.1 }
  ];
  const AD_FORMATS = { 0: ['Vídeo', 'Imagem', 'Carrossel'], 1: ['Pesquisa', 'Display', 'Vídeo'], 2: ['Vídeo'], 3: ['Imagem', 'Documento'] };
  const AD_NAMES = ['Depoimento', 'Tour guiado', 'Plantas', 'Oferta de lançamento', 'Visita VIP', 'Antes e depois', 'Prova social', 'Condições', 'Bastidores', 'Localização'];
  const ADS = [];
  CAMPAIGNS.forEach((c, ci) => {
    const fm = AD_FORMATS[c.p]; const n = 2 + (ci % 2);
    for (let i = 0; i < n; i++) ADS.push({ c: ci, n: `${fm[i % fm.length][0]}${i + 1} • ${AD_NAMES[(ci * 3 + i * 2) % AD_NAMES.length]}`, f: fm[i % fm.length], hue: Math.floor(rnd() * 360), q: 0.75 + rnd() * 0.6, fr: 1.2 + rnd() * 3.2 });
  });
  const ADS_BY_CAMP = CAMPAIGNS.map((_, ci) => ADS.map((a, i) => (a.c === ci ? i : -1)).filter((i) => i >= 0));

  const PLAT = [
    { cpm: 22, ctr: 1.4, dev: [18, 74, 6, 2], gen: [56, 40, 4], age: [10, 28, 26, 20, 12, 4], coAdj: [1, 1, 1, 1, 1] },
    { cpm: 30, ctr: 3.2, dev: [42, 50, 7, 1], gen: [45, 50, 5], age: [8, 30, 30, 18, 10, 4], coAdj: [1, 1, 1, 1, 1] },
    { cpm: 14, ctr: 0.9, dev: [4, 92, 3, 1], gen: [62, 34, 4], age: [50, 30, 12, 5, 2, 1], coAdj: [1, 0.4, 1.4, 1, 1] },
    { cpm: 70, ctr: 0.6, dev: [70, 27, 2, 1], gen: [40, 56, 4], age: [4, 38, 36, 16, 5, 1], coAdj: [1, 2.2, 1.6, 0.6, 0.3] }
  ];
  const DEV_CTR = [1.0, 1.15, 0.8, 0.6], DEV_CVR = [1.25, 0.85, 1.0, 0.5];
  const AGE_CVR = [0.7, 1.0, 1.15, 1.2, 1.1, 0.9];
  const OBJ_CVR = [0.006, 0.02, 0.01, 0.09, 0.04, 0.08];
  const OBJ_SALE = [0.004, 0.006, 0.004, 0.03, 0.25, 0.12];
  const WD = [0.85, 1.0, 1.06, 1.1, 1.05, 0.92, 0.78];
  const TICKET = 680;

  const rows = [];
  for (let d = 0; d < DAYS; d++) {
    const dow = (dateOf(d).getDay() + 6) % 7; // segunda = 0
    CAMPAIGNS.forEach((c, ci) => {
      const pl = PLAT[c.p];
      const base = c.b * (0.85 + 0.3 * rnd()) * WD[dow] * (1 + c.t * 0.004 * d);
      for (let k = 0; k < 12; k++) {
        const ads = ADS_BY_CAMP[ci], a = ads[Math.floor(rnd() * ads.length)];
        const dev = pick(4, pl.dev), g = pick(3, pl.gen), ag = pick(6, pl.age);
        const co = pick(5, COUNTRY_W.map((w, i) => w * pl.coAdj[i]));
        const cw = CITY_BY_COUNTRY[co]; const cityLocal = pick(cw.length, cw.map((i) => CITIES[i].w));
        const sp = (base / 12) * (0.6 + 0.8 * rnd());
        const imp = (sp / (pl.cpm * (0.85 + 0.3 * rnd()))) * 1000;
        const clk = imp * ((pl.ctr * c.q * ADS[a].q * DEV_CTR[dev] * (0.8 + 0.4 * rnd())) / 100);
        const ld = clk * OBJ_CVR[c.o] * DEV_CVR[dev] * AGE_CVR[ag] * c.q * (0.8 + 0.4 * rnd());
        const sl = ld * OBJ_SALE[c.o] * (0.7 + 0.6 * rnd());
        const rv = sl * TICKET * (0.8 + 0.4 * rnd());
        rows.push({ d, c: ci, a, p: c.p, o: c.o, v: dev, g, e: ag, co, ci: cw[cityLocal], sp, imp, clk, ld, sl, rv });
      }
    });
  }

  // ---------- Google Analytics 4 ----------
  const GA_CHANNELS = ['Busca orgânica', 'Busca paga', 'Social pago', 'Direto', 'Referência', 'E-mail'];
  const GA_BASE = [420, 260, 380, 210, 90, 70], GA_ENG = [0.64, 0.58, 0.46, 0.7, 0.62, 0.74], GA_CR = [0.034, 0.047, 0.028, 0.041, 0.022, 0.052], GA_DUR = [142, 118, 74, 166, 121, 188];
  const GA_DEVMIX = [34, 58, 6, 2];
  const ga = [];
  for (let d = 0; d < DAYS; d++) {
    const dow = (dateOf(d).getDay() + 6) % 7;
    GA_CHANNELS.forEach((ch, i) => {
      for (let v = 0; v < 4; v++) {
        const s = GA_BASE[i] * (GA_DEVMIX[v] / 100) * WD[dow] * (0.88 + 0.24 * rnd()) * (1 + 0.003 * d);
        ga.push({ d, ch: i, v, ses: s, usr: s * 0.83, eng: s * GA_ENG[i] * (0.95 + 0.1 * rnd()), cv: s * GA_CR[i] * (0.85 + 0.3 * rnd()), dur: GA_DUR[i] * s });
      }
    });
  }
  const GA_PAGES = [['/', 100], ['/empreendimento', 78], ['/plantas', 54], ['/agendar-visita', 41], ['/blog/financiamento', 33], ['/contato', 21]];
  const GA_SOURCES = [['google / organic', 0, 1], ['google / cpc', 1, 1.1], ['facebook / paid-social', 2, 0.62], ['instagram / paid-social', 2, 0.5], ['(direct) / (none)', 3, 1], ['tiktok / paid-social', 2, 0.2], ['newsletter / email', 5, 1], ['linkedin / referral', 4, 0.5]];
  const GA_EVENTS = [['page_view', 100], ['scroll', 71], ['click_cta', 38], ['form_start', 17], ['generate_lead', 8.6]];

  // ---------- RFM ----------
  const customers = [];
  for (let i = 0; i < 900; i++) {
    const f = 1 + Math.floor(-Math.log(1 - rnd()) * 2.1);
    const recScale = 40 + 160 / (1 + f * 0.5);
    const r = Math.min(400, 1 + Math.floor(-Math.log(1 - rnd()) * recScale));
    const m = Math.round(f * (900 + rnd() * 2600) * (0.55 + rnd()));
    customers.push({ r, f: Math.min(f, 14), m });
  }
  const quintAll = (arr, inv) => { const idx = arr.map((_, i) => i).sort((a, b) => arr[a] - arr[b] || a - b); const out = new Array(arr.length); idx.forEach((ix, pos) => { const n = Math.floor((pos / arr.length) * 5) + 1; out[ix] = inv ? 6 - n : n; }); return out; };
  const rs = customers.map((c) => c.r), fs = customers.map((c) => c.f), ms = customers.map((c) => c.m);
  const Rq = quintAll(rs, true), Fq = quintAll(fs, false), Mq = quintAll(ms, false);
  customers.forEach((c, i) => { c.R = Rq[i]; c.F = Fq[i]; c.M = Mq[i]; });
  const SEGMENTS = [
    { id: 'campeoes', n: 'Campeões', c: '#16A34A', act: 'Recompensar, pedir indicação e antecipar lançamentos' },
    { id: 'leais', n: 'Leais', c: '#0D9488', act: 'Upsell, programa de benefícios e conteúdo exclusivo' },
    { id: 'potenciais', n: 'Potenciais leais', c: '#2563EB', act: 'Oferta de recompra e cross-sell' },
    { id: 'novos', n: 'Novos', c: '#7C3AED', act: 'Onboarding e segunda compra em 30 dias' },
    { id: 'promissores', n: 'Promissores', c: '#A855F7', act: 'Nutrir com prova social e condições' },
    { id: 'atencao', n: 'Precisam de atenção', c: '#F59E0B', act: 'Oferta por tempo limitado e lembrete' },
    { id: 'dormir', n: 'Quase dormindo', c: '#FB923C', act: 'Reativação com conteúdo útil' },
    { id: 'risco', n: 'Em risco', c: '#EF4444', act: 'Contato direto e condição especial' },
    { id: 'naoperder', n: 'Não posso perder', c: '#BE123C', act: 'Atendimento consultivo imediato' },
    { id: 'hiberna', n: 'Hibernando', c: '#64748B', act: 'Campanha de retomada de baixo custo' }
  ];
  const segOf = (R, F) => {
    if (R >= 4 && F >= 4) return 0; if (R >= 3 && F >= 4) return 1; if (R >= 4 && F >= 2 && F <= 3) return 2;
    if (R === 5 && F === 1) return 3; if (R === 4 && F === 1) return 4; if (R === 3 && F === 3) return 5;
    if (R === 3 && F <= 2) return 6; if (R <= 2 && F === 5) return 8; if (R <= 2 && F >= 3) return 7; return 9;
  };
  customers.forEach((c) => { c.s = segOf(c.R, c.F); });
  const COHORTS = ['Mai/26', 'Jun/26', 'Jul/26', 'Ago/26', 'Set/26', 'Out/26'].map((n, i) => ({
    n, v: [100, 38, 27, 21, 17, 14].map((x, k) => (k === 0 ? 100 : Math.max(4, Math.round(x * (0.85 + rnd() * 0.3) * (1 + (i % 3) * 0.04))))).slice(0, 6 - i)
  }));

  // ---------- CRM ----------
  const CRM = {
    stages: ['Lead', 'Qualificado (MQL)', 'Oportunidade (SQL)', 'Proposta', 'Venda'],
    ratio: [1, 0.55, 0.3, 0.11, null],
    days: [1.4, 3.2, 6.8, 12.5],
    loss: [['Preço acima do esperado', 31], ['Sem retorno do contato', 27], ['Escolheu concorrente', 17], ['Prazo de entrega', 12], ['Crédito não aprovado', 8], ['Outros', 5]]
  };

  window.PAINEL = { DAYS, dateOf, PLATFORMS, OBJECTIVES, DEVICES, GENDERS, AGES, COUNTRIES, CITIES, CITY_BY_COUNTRY, CAMPAIGNS, ADS, rows, GA_CHANNELS, ga, GA_PAGES, GA_SOURCES, GA_EVENTS, customers, SEGMENTS, COHORTS, CRM, TICKET };
})();
