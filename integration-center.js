/* Engaje Mídia Hub — Central simples de integradores */
(function(){
  const ALLOWED_PROVIDERS=['windsor','stract'];
  const PROVIDER_LABELS={windsor:'Windsor.ai',stract:'Stract'};
  const PLATFORM_DEFS=[
    {platform:'facebook_organic',domain:'organic',label:'Facebook orgânico',windsor:'facebook_organic'},
    {platform:'instagram',domain:'organic',label:'Instagram orgânico',windsor:'instagram'},
    {platform:'meta_ads',domain:'paid',label:'Meta Ads',windsor:'facebook'},
    {platform:'google_ads',domain:'paid',label:'Google Ads',windsor:'google_ads'},
    {platform:'ga4',domain:'analytics',label:'Google Analytics 4',windsor:'googleanalytics4'},
    {platform:'tiktok_ads',domain:'paid',label:'TikTok Ads',windsor:'tiktok'},
    {platform:'linkedin_ads',domain:'paid',label:'LinkedIn Ads',windsor:'linkedin'},
    {platform:'microsoft_ads',domain:'paid',label:'Microsoft Ads',windsor:'bing_ads'}
  ];
  let providers=[],routes=[];

  const css=`
  #integration-center{margin-bottom:14px}.ic-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}.ic-title{font-size:17px;font-weight:780;color:var(--text);letter-spacing:-.02em}.ic-sub{font-size:10px;color:var(--text2);margin-top:4px;line-height:1.5}.ic-provider-grid{display:grid;grid-template-columns:repeat(2,minmax(260px,1fr));gap:12px;margin-bottom:18px}.ic-provider{border:1px solid var(--border);border-radius:14px;background:linear-gradient(180deg,var(--surface2),var(--surface));padding:16px}.ic-provider-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ic-provider-name{font-size:14px;font-weight:780}.ic-provider-type{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-top:3px}.ic-badge{font-size:8px;font-weight:750;padding:4px 8px;border-radius:999px;white-space:nowrap}.ic-badge.ok{background:rgba(34,197,94,.1);color:#4ade80}.ic-badge.warn{background:rgba(245,158,11,.1);color:#fbbf24}.ic-provider-desc{font-size:10px;color:var(--text2);line-height:1.55;margin:12px 0}.ic-route-card{border-top:1px solid rgba(148,163,184,.12);padding-top:16px}.ic-route-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.ic-route-table{width:100%;border-collapse:collapse;font-size:10px}.ic-route-table th{font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:var(--text3);font-weight:700;text-align:left;padding:9px;border-bottom:1px solid var(--border)}.ic-route-table td{padding:10px 9px;border-bottom:1px solid rgba(148,163,184,.075);vertical-align:middle}.ic-route-table select{min-width:145px}.ic-source-status{font-size:8px;color:var(--text3);margin-top:3px}.ic-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.ic-note{margin-top:12px;padding:10px 12px;border:1px solid rgba(245,158,11,.16);background:rgba(245,158,11,.035);border-radius:9px;color:#c4a65b;font-size:9px;line-height:1.5}@media(max-width:900px){.ic-provider-grid{grid-template-columns:1fr}.ic-route-toolbar,.ic-head{align-items:flex-start;flex-direction:column}}
  `;
  function injectStyles(){if(document.getElementById('integration-center-style'))return;const s=document.createElement('style');s.id='integration-center-style';s.textContent=css;document.head.appendChild(s)}
  function wait(fn,tries=60){if(fn())return;if(tries>0)setTimeout(()=>wait(fn,tries-1),100)}
  function routeFor(clientId,platform,domain){return routes.find(r=>String(r.client_id)===String(clientId)&&r.platform===platform&&r.data_domain===domain)}
  function providerOptions(selected){return ALLOWED_PROVIDERS.map(id=>`<option value="${id}" ${id===selected?'selected':''}>${PROVIDER_LABELS[id]}</option>`).join('')}
  async function loadIntegrationData(){
    const [p,r]=await Promise.all([
      rest('integration_providers?id=in.(windsor,stract)&select=id,name,provider_type,status,capabilities,is_active&order=name.asc'),
      rest('data_source_routes?select=id,client_id,platform,data_domain,provider_id,source_asset_id,enabled,last_sync_at,last_error&order=platform.asc')
    ]);providers=(p||[]).filter(x=>ALLOWED_PROVIDERS.includes(x.id));routes=r||[];
  }
  function providerCard(id){
    const p=providers.find(x=>x.id===id)||{id,name:PROVIDER_LABELS[id],status:id==='windsor'?'available':'bridge_required'};
    const isW=id==='windsor';
    return `<div class="ic-provider"><div class="ic-provider-top"><div><div class="ic-provider-name">${esc(PROVIDER_LABELS[id])}</div><div class="ic-provider-type">Integrador</div></div><span class="ic-badge ${isW?'ok':'warn'}">${isW?'Disponível':'Aguardando configuração'}</span></div><div class="ic-provider-desc">${isW?'Integrador principal para conectar as plataformas e importar os dados para o dashboard.':'Integrador alternativo. Será ativado quando tivermos o endpoint/bridge da sua conta Stract.'}</div><div class="ic-actions">${isW?'<button class="btn-sm-prim" data-action="windsor-main">Conectar plataformas</button><button class="btn-sm-ghost" data-action="windsor-sync">Sincronizar dados</button>':'<button class="btn-sm-ghost" disabled>Configuração necessária</button>'}</div></div>`;
  }
  async function renderIntegrationCenter(){
    if(typeof isSuperAdmin==='function'&&!isSuperAdmin())return;
    const host=document.getElementById('module-page');if(!host)return;
    document.getElementById('integration-center')?.remove();injectStyles();
    try{await loadIntegrationData()}catch(e){console.warn('integration-center',e);return}
    const clientId=ST?.clientId||ST?.clients?.find(c=>!c.is_agency)?.id||'';
    const box=document.createElement('section');box.id='integration-center';box.className='section-card';
    box.innerHTML=`<div class="ic-head"><div><div class="ic-title">Integradores de dados</div><div class="ic-sub">Escolha o integrador que alimentará cada plataforma. Sem conexões diretas e sem misturar fontes.</div></div><button class="btn-sm-ghost" id="ic-refresh">Atualizar</button></div>
      <div class="ic-provider-grid">${providerCard('windsor')}${providerCard('stract')}</div>
      <div class="ic-route-card"><div class="ic-route-toolbar"><div><div class="section-title">Plataformas do cliente</div><div class="ic-sub">Cada plataforma deve ter um integrador definido.</div></div><select id="ic-client" class="ctrl-sel">${(ST.clients||[]).filter(c=>!c.is_agency).map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(clientId)?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div id="ic-routes"></div><div class="ic-note"><b>Stract:</b> fica visível apenas como opção planejada. Enquanto o bridge da conta não estiver configurado, selecione Windsor.ai para coleta real.</div></div>`;
    host.prepend(box);
    box.querySelector('#ic-refresh').onclick=renderIntegrationCenter;box.querySelector('#ic-client').onchange=renderRoutes;
    box.querySelector('[data-action="windsor-main"]')?.addEventListener('click',()=>connectWindsorFor(PLATFORM_DEFS[0]));
    box.querySelector('[data-action="windsor-sync"]')?.addEventListener('click',syncWindsorLegacy);
    renderRoutes();
  }
  function renderRoutes(){
    const root=document.getElementById('ic-routes');if(!root)return;const clientId=document.getElementById('ic-client')?.value||'';
    root.innerHTML=`<div style="overflow:auto"><table class="ic-route-table"><thead><tr><th>Plataforma</th><th>Tipo</th><th>Integrador</th><th>Conexão</th><th>Status</th></tr></thead><tbody>${PLATFORM_DEFS.map(def=>{const r=routeFor(clientId,def.platform,def.domain),selected=ALLOWED_PROVIDERS.includes(r?.provider_id)?r.provider_id:'';const provider=selected||'';return `<tr><td><b>${esc(def.label)}</b></td><td>${def.domain==='organic'?'Orgânico':def.domain==='paid'?'Pago':'Analytics'}</td><td><select class="ctrl-sel ic-source" data-platform="${def.platform}" data-domain="${def.domain}"><option value="">Escolher integrador</option>${providerOptions(selected)}</select></td><td><div class="ic-actions">${provider==='windsor'?`<button class="btn-sm-ghost ic-connect-windsor" data-platform="${def.platform}">Conectar via Windsor</button>`:provider==='stract'?'<button class="btn-sm-ghost" disabled>Bridge Stract pendente</button>':'<span class="ic-source-status">Defina o integrador</span>'}</div></td><td><div>${r?.enabled?'Ativa':'—'}</div><div class="ic-source-status">${r?.last_sync_at?'Última sync '+new Date(r.last_sync_at).toLocaleString('pt-BR'):r?.last_error?esc(r.last_error):selected?'Integrador definido':'Sem integrador'}</div></td></tr>`}).join('')}</tbody></table></div>`;
    root.querySelectorAll('.ic-source').forEach(s=>{const r=routeFor(clientId,s.dataset.platform,s.dataset.domain);s.value=ALLOWED_PROVIDERS.includes(r?.provider_id)?r.provider_id:'';s.onchange=()=>saveRoute(clientId,s.dataset.platform,s.dataset.domain,s.value)});
    root.querySelectorAll('.ic-connect-windsor').forEach(b=>b.onclick=()=>connectWindsorFor(PLATFORM_DEFS.find(x=>x.platform===b.dataset.platform)));
  }
  async function saveRoute(clientId,platform,domain,providerId){
    if(!clientId)return;
    try{
      if(providerId&&!ALLOWED_PROVIDERS.includes(providerId))throw new Error('Integrador inválido');
      if(!providerId){await rest(`data_source_routes?client_id=eq.${encodeURIComponent(clientId)}&platform=eq.${encodeURIComponent(platform)}&data_domain=eq.${encodeURIComponent(domain)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});}
      else{const payload={client_id:clientId,platform,data_domain:domain,provider_id:providerId,enabled:true,updated_at:new Date().toISOString()};await rest('data_source_routes?on_conflict=client_id,platform,data_domain',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});}
      await loadIntegrationData();renderRoutes();toast(providerId?'Integrador atualizado.':'Integrador removido.');
    }catch(e){toast('Falha ao salvar integrador: '+e.message,'error')}
  }
  async function edge(slug,body){const r=await fetch(SB_URL+'/functions/v1/'+slug,{method:'POST',headers:{'Content-Type':'application/json','apikey':SB_ANON,'Authorization':'Bearer '+(SESSION?.access_token||SB_ANON)},body:JSON.stringify(body||{})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j}
  async function connectWindsorFor(def){
    if(!def)return;
    try{toast('Abrindo conexão '+def.label+' no Windsor...');const d=await edge('windsor-connect',{connector:def.windsor});if(!d.connect_url)throw new Error('URL de conexão não recebida');window.open(d.connect_url,'_blank','noopener,noreferrer');}
    catch(e){toast('Falha ao abrir Windsor: '+e.message,'error')}
  }
  async function syncWindsorLegacy(){try{toast('Sincronizando Windsor...');const d=await edge('windsor-sync',{days:30});toast('Windsor sincronizado: '+(d.posts||0)+' posts.');await renderIntegrationCenter()}catch(e){toast(e.message,'error')}}
  function patchNav(){if(typeof nav!=='function'||nav.__integrationCenter)return false;const old=nav;nav=async function(page){const r=await old(page);if(page==='accounts')setTimeout(renderIntegrationCenter,30);return r};nav.__integrationCenter=true;return true}
  window.renderIntegrationCenter=renderIntegrationCenter;window.saveDataSourceRoute=saveRoute;window.connectWindsorFor=connectWindsorFor;
  wait(()=>patchNav());
})();
