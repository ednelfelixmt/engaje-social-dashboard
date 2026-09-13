/* Engaje Mídia Hub — data integrity + Meta workflow */
(function(){
  function wait(fn,tries=50){if(fn())return; if(tries>0)setTimeout(()=>wait(fn,tries-1),100)}
  function fnHeaders(){return {'Content-Type':'application/json','apikey':SB_ANON,'Authorization':'Bearer '+(SESSION?.access_token||SB_ANON)}}
  async function edge(slug,body){const r=await fetch(SB_URL+'/functions/v1/'+slug,{method:'POST',headers:fnHeaders(),body:JSON.stringify(body||{})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||d.message||('HTTP '+r.status));return d}

  function patchMetrics(){
    if(typeof renderKPIs==='function'&&!renderKPIs.__integrity){
      const old=renderKPIs;
      renderKPIs=function(...a){old(...a);document.querySelectorAll('#kpi-row .kpi-name').forEach(el=>{if(el.textContent==='Alcance')el.textContent='Alcance dos conteúdos';if(el.textContent==='Impressões')el.textContent='Impressões dos conteúdos';});};
      renderKPIs.__integrity=true;
    }
    if(typeof renderPaidTab==='function'&&!renderPaidTab.__integrity){
      const old=renderPaidTab;
      renderPaidTab=async function(...a){await old(...a);document.querySelectorAll('.paid-kpi').forEach(card=>{const label=card.querySelector('.paid-kpi-label')?.textContent?.trim();if(label==='Alcance')card.remove();});const funnel=[...document.querySelectorAll('.paid-side h4')].find(x=>x.textContent==='Funil de entrega');if(funnel){const note=document.createElement('div');note.style.cssText='font-size:9px;color:#718096;margin:-6px 0 12px';note.textContent='O alcance único não é somado entre anúncios; por integridade, o consolidado usa impressões, cliques e resultados.';funnel.insertAdjacentElement('afterend',note);}};
      renderPaidTab.__integrity=true;
    }
  }

  function clientOptions(selected){return (ST?.clients||[]).filter(c=>!c.is_agency).map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(selected||'')?'selected':''}>${esc(c.name)}</option>`).join('')}
  async function renderMetaManager(){
    if(typeof isSuperAdmin==='function'&&!isSuperAdmin())return;
    const host=document.getElementById('module-page');if(!host||host.querySelector('#meta-manager'))return;
    const box=document.createElement('div');box.id='meta-manager';box.className='section-card';box.innerHTML='<div class="section-hdr"><span class="section-title">Meta Business · conexão direta</span><div style="display:flex;gap:8px"><button class="btn-sm-ghost" id="meta-refresh">Atualizar</button><button class="btn-sm-prim" id="meta-connect">Conectar Meta</button></div></div><div id="meta-assets-body" class="empty-state"><div class="empty-desc">Carregando ativos Meta...</div></div>';
    host.prepend(box);box.querySelector('#meta-connect').onclick=connectMeta;box.querySelector('#meta-refresh').onclick=loadMetaAssets;await loadMetaAssets();
  }
  async function loadMetaAssets(){
    const body=document.getElementById('meta-assets-body');if(!body)return;
    try{const rows=await rest('meta_assets?select=id,asset_type,name,username,client_id,page_id,instagram_account_id,ad_account_id,status,last_synced_at,last_error&order=asset_type.asc,name.asc')||[];
      if(!rows.length){body.innerHTML='<div class="empty-state"><div class="empty-title">Nenhum ativo Meta conectado</div><div class="empty-desc">Use “Conectar Meta” para autorizar páginas, Instagram e contas de anúncios.</div></div>';return;}
      body.className='';body.innerHTML=`<div style="overflow:auto"><table class="real-table"><thead><tr><th>Tipo</th><th>Ativo</th><th>Cliente</th><th>Status</th><th>Última sync</th><th>Ações</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.asset_type)}</td><td><b>${esc(r.name||r.username||r.id)}</b><div style="font-size:9px;color:var(--text3)">${esc(r.ad_account_id||r.instagram_account_id||r.page_id||'')}</div></td><td><select class="ctrl-sel meta-client" data-id="${esc(r.id)}"><option value="">Não vinculado</option>${clientOptions(r.client_id)}</select></td><td>${esc(r.status||'—')}${r.last_error?`<div style="font-size:9px;color:#fb7185">${esc(r.last_error)}</div>`:''}</td><td>${r.last_synced_at?new Date(r.last_synced_at).toLocaleString('pt-BR'):'—'}</td><td>${r.asset_type==='ad_account'?`<button class="btn-sm-ghost meta-sync" data-id="${esc(r.id)}" ${r.client_id?'':'disabled'}>Sincronizar Ads</button>`:'—'}</td></tr>`).join('')}</tbody></table></div>`;
      body.querySelectorAll('.meta-client').forEach(s=>s.onchange=()=>linkMetaAsset(s.dataset.id,s.value));body.querySelectorAll('.meta-sync').forEach(b=>b.onclick=()=>syncMeta(b.dataset.id));
    }catch(e){body.innerHTML='<div class="empty-state"><div class="empty-title">Falha ao carregar Meta</div><div class="empty-desc">'+esc(e.message)+'</div></div>'}
  }
  async function connectMeta(){try{const d=await edge('meta-auth',{});if(!d.url)throw new Error('URL de autorização não recebida');location.href=d.url}catch(e){toast(e.message,'error')}}
  async function linkMetaAsset(id,clientId){try{await rest('meta_assets?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({client_id:clientId||null,updated_at:new Date().toISOString()})});toast(clientId?'Ativo vinculado ao cliente.':'Vínculo removido.');await loadMetaAssets()}catch(e){toast(e.message,'error')}}
  async function syncMeta(id){try{const rows=await rest('meta_assets?id=eq.'+encodeURIComponent(id)+'&select=client_id,ad_account_id');const a=rows?.[0];if(!a?.client_id)return toast('Vincule a conta de anúncios a um cliente.','error');toast('Sincronizando Meta Ads...');const d=await edge('meta-sync',{client_id:a.client_id,ad_account_id:a.ad_account_id,days:90});toast('Meta Ads sincronizado: '+(d.upserted||0)+' registros.');await loadMetaAssets();if(String(ST.clientId)===String(a.client_id))await renderDashboard()}catch(e){toast(e.message,'error')}}
  window.connectMeta=connectMeta;window.loadMetaAssets=loadMetaAssets;window.linkMetaAsset=linkMetaAsset;window.syncMeta=syncMeta;

  function patchNav(){if(typeof nav!=='function'||nav.__integrity)return false;const old=nav;nav=async function(page){const r=await old(page);if(page==='accounts')setTimeout(renderMetaManager,0);return r};nav.__integrity=true;return true}
  wait(()=>{patchMetrics();return patchNav()});
})();
