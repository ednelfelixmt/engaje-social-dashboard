/* Engaje Mídia Hub — Central de Integrações e roteamento de fontes */
(function(){
  const PROVIDER_LABELS={
    meta_direct:'Meta Direct',google_direct:'Google Direct',tiktok_direct:'TikTok Direct',
    linkedin_direct:'LinkedIn Direct',microsoft_direct:'Microsoft Ads Direct',windsor:'Windsor.ai',stract:'Stract'
  };
  const PLATFORM_DEFS=[
    {platform:'facebook_organic',domain:'organic',label:'Facebook orgânico'},
    {platform:'instagram',domain:'organic',label:'Instagram orgânico'},
    {platform:'meta_ads',domain:'paid',label:'Meta Ads'},
    {platform:'google_ads',domain:'paid',label:'Google Ads'},
    {platform:'ga4',domain:'analytics',label:'Google Analytics 4'},
    {platform:'tiktok_ads',domain:'paid',label:'TikTok Ads'},
    {platform:'linkedin_ads',domain:'paid',label:'LinkedIn Ads'},
    {platform:'microsoft_ads',domain:'paid',label:'Microsoft Ads'}
  ];
  let providers=[],routes=[];

  const css=`
  #integration-center{margin-bottom:14px}.ic-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}.ic-title{font-size:16px;font-weight:750;color:var(--text);letter-spacing:-.02em}.ic-sub{font-size:10px;color:var(--text2);margin-top:4px;line-height:1.5}.ic-provider-grid{display:grid;grid-template-columns:repeat(4,minmax(180px,1fr));gap:10px;margin-bottom:16px}.ic-provider{border:1px solid var(--border);border-radius:12px;background:linear-gradient(180deg,var(--surface2),var(--surface));padding:14px;min-height:122px}.ic-provider-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ic-provider-name{font-size:12px;font-weight:750}.ic-provider-type{font-size:8px;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);margin-top:3px}.ic-badge{font-size:8px;font-weight:750;padding:4px 7px;border-radius:999px;white-space:nowrap}.ic-badge.ok{background:rgba(34,197,94,.1);color:#4ade80}.ic-badge.warn{background:rgba(245,158,11,.1);color:#fbbf24}.ic-badge.off{background:rgba(148,163,184,.08);color:#94a3b8}.ic-provider-desc{font-size:9px;color:var(--text2);line-height:1.5;margin:11px 0}.ic-provider-actions{display:flex;gap:6px;flex-wrap:wrap}.ic-route-card{border-top:1px solid rgba(148,163,184,.12);padding-top:14px}.ic-route-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.ic-route-table{width:100%;border-collapse:collapse;font-size:10px}.ic-route-table th{font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700;text-align:left;padding:9px;border-bottom:1px solid var(--border)}.ic-route-table td{padding:9px;border-bottom:1px solid rgba(148,163,184,.075);vertical-align:middle}.ic-route-table select{min-width:150px}.ic-source-status{font-size:8px;color:var(--text3);margin-top:3px}.ic-note{margin-top:12px;padding:10px 12px;border:1px solid rgba(245,158,11,.18);background:rgba(245,158,11,.045);border-radius:9px;color:#c4a65b;font-size:9px;line-height:1.5}@media(max-width:1180px){.ic-provider-grid{grid-template-columns:repeat(2,minmax(180px,1fr))}}@media(max-width:720px){.ic-provider-grid{grid-template-columns:1fr}.ic-route-toolbar,.ic-head{align-items:flex-start;flex-direction:column}}
  `;
  function injectStyles(){if(document.getElementById('integration-center-style'))return;const s=document.createElement('style');s.id='integration-center-style';s.textContent=css;document.head.appendChild(s)}
  function wait(fn,tries=60){if(fn())return;if(tries>0)setTimeout(()=>wait(fn,tries-1),100)}
  function providerSupports(p,platform,domain){const c=p?.capabilities||{};return (c.platforms||[]).includes(platform)&&(c.domains||[]).includes(domain)}
  function badge(p){if(p.status==='available')return '<span class="ic-badge ok">Disponível</span>';if(p.status==='bridge_required')return '<span class="ic-badge warn">Bridge necessário</span>';return '<span class="ic-badge off">Configuração pendente</span>'}
  function providerDesc(p){
    if(p.id==='meta_direct')return 'API oficial Meta para Facebook, Instagram e Meta Ads.';
    if(p.id==='windsor')return 'Agregador multicanal. Já utilizado no Facebook orgânico e preparado para novos conectores.';
    if(p.id==='stract')return 'Agregador alternativo. O roteamento está preparado, mas a ingestão depende de um endpoint/bridge disponibilizado pela Stract.';
    if(p.id==='google_direct')return 'Conexão oficial Google para Google Ads, GA4 e YouTube.';
    if(p.id==='tiktok_direct')return 'Conexão oficial TikTok para mídia paga e futuras métricas orgânicas.';
    if(p.id==='linkedin_direct')return 'Conexão oficial LinkedIn para Ads e Company Pages quando habilitada.';
    if(p.id==='microsoft_direct')return 'Conexão oficial Microsoft Advertising.';
    return 'Fonte de dados configurável.';
  }
  function providerActions(p){
    if(p.id==='meta_direct')return '<button class="btn-sm-ghost" data-action="meta">Gerenciar Meta</button>';
    if(p.id==='windsor')return '<button class="btn-sm-ghost" data-action="windsor">Sincronizar legado</button>';
    if(p.id==='stract')return '<button class="btn-sm-ghost" data-action="stract">Ver requisito</button>';
    return '<button class="btn-sm-ghost" disabled>OAuth a configurar</button>';
  }
  function routeFor(clientId,platform,domain){return routes.find(r=>String(r.client_id)===String(clientId)&&r.platform===platform&&r.data_domain===domain)}
  function providerOptions(def,selected){return providers.filter(p=>p.is_active&&providerSupports(p,def.platform,def.domain)).map(p=>`<option value="${esc(p.id)}" ${p.id===selected?'selected':''}>${esc(PROVIDER_LABELS[p.id]||p.name)}</option>`).join('')}
  async function loadIntegrationData(){
    const [p,r]=await Promise.all([
      rest('integration_providers?is_active=eq.true&select=id,name,provider_type,status,capabilities,is_active&order=provider_type.asc,name.asc'),
      rest('data_source_routes?select=id,client_id,platform,data_domain,provider_id,source_asset_id,enabled,last_sync_at,last_error&order=platform.asc')
    ]);providers=p||[];routes=r||[];
  }
  async function renderIntegrationCenter(){
    if(typeof isSuperAdmin==='function'&&!isSuperAdmin())return;
    const host=document.getElementById('module-page');if(!host)return;
    document.getElementById('integration-center')?.remove();injectStyles();
    try{await loadIntegrationData()}catch(e){console.warn('integration-center',e);return}
    const clientId=ST?.clientId||ST?.clients?.find(c=>!c.is_agency)?.id||'';
    const box=document.createElement('section');box.id='integration-center';box.className='section-card';
    box.innerHTML=`<div class="ic-head"><div><div class="ic-title">Central de Integrações</div><div class="ic-sub">Escolha a fonte de verdade por cliente e plataforma. Os dashboards continuam usando o modelo normalizado; a origem fica controlada aqui.</div></div><button class="btn-sm-ghost" id="ic-refresh">Atualizar</button></div>
      <div class="ic-provider-grid">${providers.map(p=>`<div class="ic-provider"><div class="ic-provider-top"><div><div class="ic-provider-name">${esc(p.name)}</div><div class="ic-provider-type">${p.provider_type==='direct'?'API direta':'Agregador'}</div></div>${badge(p)}</div><div class="ic-provider-desc">${providerDesc(p)}</div><div class="ic-provider-actions">${providerActions(p)}</div></div>`).join('')}</div>
      <div class="ic-route-card"><div class="ic-route-toolbar"><div><div class="section-title">Fonte de dados por cliente</div><div class="ic-sub">Uma fonte principal por domínio evita duplicidade e divergência de métricas.</div></div><select id="ic-client" class="ctrl-sel">${(ST.clients||[]).filter(c=>!c.is_agency).map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(clientId)?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div id="ic-routes"></div><div class="ic-note"><b>Stract:</b> o seletor já está preparado, porém a Stract não expõe hoje uma API pública documentada para leitura direta das contas. Para ativá-la como fonte real será necessário um endpoint privado, exportação ou bridge fornecido pela sua conta Stract.</div></div>`;
    host.prepend(box);
    box.querySelector('#ic-refresh').onclick=renderIntegrationCenter;box.querySelector('#ic-client').onchange=renderRoutes;
    box.querySelector('[data-action="meta"]')?.addEventListener('click',()=>document.getElementById('meta-manager')?.scrollIntoView({behavior:'smooth',block:'start'}));
    box.querySelector('[data-action="windsor"]')?.addEventListener('click',syncWindsorLegacy);
    box.querySelector('[data-action="stract"]')?.addEventListener('click',()=>toast('Stract preparada como fonte lógica; falta um endpoint/bridge de ingestão para ativar a coleta.','error'));
    renderRoutes();
  }
  function renderRoutes(){
    const root=document.getElementById('ic-routes');if(!root)return;const clientId=document.getElementById('ic-client')?.value||'';
    root.innerHTML=`<div style="overflow:auto"><table class="ic-route-table"><thead><tr><th>Plataforma</th><th>Domínio</th><th>Fonte principal</th><th>Status</th></tr></thead><tbody>${PLATFORM_DEFS.map(def=>{const r=routeFor(clientId,def.platform,def.domain),selected=r?.provider_id||'';return `<tr><td><b>${esc(def.label)}</b></td><td>${def.domain==='organic'?'Orgânico':def.domain==='paid'?'Pago':'Analytics'}</td><td><select class="ctrl-sel ic-source" data-platform="${def.platform}" data-domain="${def.domain}"><option value="">Automático / não definido</option>${providerOptions(def,selected)}</select></td><td><div>${r?.enabled?'Ativa':'—'}</div><div class="ic-source-status">${r?.last_sync_at?'Última sync '+new Date(r.last_sync_at).toLocaleString('pt-BR'):r?.last_error?esc(r.last_error):selected?'Fonte definida':'Sem rota'}</div></td></tr>`}).join('')}</tbody></table></div>`;
    root.querySelectorAll('.ic-source').forEach(s=>{const r=routeFor(clientId,s.dataset.platform,s.dataset.domain);s.value=r?.provider_id||'';s.onchange=()=>saveRoute(clientId,s.dataset.platform,s.dataset.domain,s.value)});
  }
  async function saveRoute(clientId,platform,domain,providerId){
    if(!clientId)return;
    try{
      if(!providerId){await rest(`data_source_routes?client_id=eq.${encodeURIComponent(clientId)}&platform=eq.${encodeURIComponent(platform)}&data_domain=eq.${encodeURIComponent(domain)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});}
      else{const payload={client_id:clientId,platform,data_domain:domain,provider_id:providerId,enabled:true,updated_at:new Date().toISOString()};await rest('data_source_routes?on_conflict=client_id,platform,data_domain',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});}
      await loadIntegrationData();renderRoutes();toast(providerId?'Fonte principal atualizada.':'Rota removida.');
    }catch(e){toast('Falha ao salvar fonte: '+e.message,'error')}
  }
  async function syncWindsorLegacy(){try{toast('Sincronizando Windsor...');const d=await fetch(SB_URL+'/functions/v1/windsor-sync',{method:'POST',headers:{'Content-Type':'application/json','apikey':SB_ANON,'Authorization':'Bearer '+(SESSION?.access_token||SB_ANON)},body:JSON.stringify({days:30})}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j});toast('Windsor sincronizado: '+(d.posts||0)+' posts.');await renderIntegrationCenter()}catch(e){toast(e.message,'error')}}

  function patchNav(){if(typeof nav!=='function'||nav.__integrationCenter)return false;const old=nav;nav=async function(page){const r=await old(page);if(page==='accounts')setTimeout(renderIntegrationCenter,30);return r};nav.__integrationCenter=true;return true}
  window.renderIntegrationCenter=renderIntegrationCenter;window.saveDataSourceRoute=saveRoute;
  wait(()=>patchNav());
})();
