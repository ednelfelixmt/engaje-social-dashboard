/* Engaje Mídia Hub — Dashboard v2
   Separa Orgânico e Pago, melhora leitura e mantém somente dados reais. */
(function(){
  const MODE_KEY='engaje_dashboard_mode_v2';
  let dashMode=localStorage.getItem(MODE_KEY)==='paid'?'paid':'organic';

  const css=`
  :root{--blue:#4f6ef7;--blue2:#3154ea;--surface:#111722;--surface2:#171e2b;--surface3:#1d2635;--border:#2a3445;--text:#eef3fb;--text2:#9ba9bc;--text3:#6f7d90}
  body{background:#0b1018!important;color:var(--text);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
  .topbar{background:rgba(12,17,26,.94)!important;backdrop-filter:blur(16px);border-bottom:1px solid rgba(148,163,184,.12)!important}
  .sidebar{background:#0d131d!important;border-right:1px solid rgba(148,163,184,.12)!important}
  .client-header{padding:18px 22px!important;background:linear-gradient(180deg,rgba(79,110,247,.055),rgba(79,110,247,0)),#101722!important;border-bottom:1px solid rgba(148,163,184,.1)!important}
  .client-name{font-size:18px!important;font-weight:700!important;letter-spacing:-.02em}
  .client-meta{color:#7f8ca0!important;text-transform:capitalize}
  .dashboard-modebar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 22px;background:#0f1621;border-bottom:1px solid rgba(148,163,184,.11)}
  .mode-switch{display:inline-flex;gap:4px;padding:4px;border-radius:11px;background:#0a1018;border:1px solid rgba(148,163,184,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.02)}
  .mode-btn{border:0;background:transparent;color:#8290a3;padding:8px 18px;border-radius:8px;font:600 12px Inter;cursor:pointer;transition:.18s ease;min-width:102px}
  .mode-btn:hover{color:#dfe7f2}.mode-btn.active{background:linear-gradient(135deg,#4f6ef7,#3154ea);color:#fff;box-shadow:0 5px 18px rgba(49,84,234,.28)}
  .mode-context{display:flex;align-items:center;gap:9px;color:#7f8ca0;font-size:11px}.mode-context-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.09)}
  .dash-tabs{padding:0 22px!important;gap:6px!important;background:#0f1621!important;border-bottom:1px solid rgba(148,163,184,.11)!important}
  .dash-tab{padding:12px 14px!important;border-radius:8px 8px 0 0!important;color:#8794a6!important;font-weight:600!important;font-size:11px!important;letter-spacing:.01em}
  .dash-tab:hover{background:rgba(79,110,247,.06);color:#dfe7f2!important}.dash-tab.active{color:#fff!important;border-bottom-color:#5674ff!important;background:linear-gradient(180deg,rgba(79,110,247,.12),rgba(79,110,247,.03))!important}
  .dash-content{padding:18px 22px 30px!important}
  .kpi-row{gap:10px!important}.kpi-card{background:linear-gradient(180deg,#171f2c,#141b26)!important;border:1px solid rgba(148,163,184,.13)!important;border-top-width:1px!important;border-radius:12px!important;padding:14px!important;min-height:112px;box-shadow:0 10px 30px rgba(0,0,0,.13)}
  .kpi-card:hover{transform:translateY(-1px);border-color:rgba(93,119,255,.32)!important;transition:.15s ease}
  .kpi-name{font-size:10px!important;letter-spacing:.055em!important;text-transform:uppercase;color:#8290a3!important}.kpi-val{font-size:25px!important;letter-spacing:-.035em;font-weight:750!important;margin-top:8px!important}.kpi-footer{margin-top:8px!important}.kpi-delta{border-radius:6px;padding:3px 6px;font-weight:700;font-size:9px}.kpi-delta.up{background:rgba(34,197,94,.1);color:#4ade80}.kpi-delta.down{background:rgba(239,68,68,.1);color:#fb7185}.kpi-delta.na{background:rgba(148,163,184,.08);color:#8d9aae}
  .section-card,.chart-card,.donut-card,.plat-metric-card,.share-card,.insights-card{background:linear-gradient(180deg,#151d29,#121923)!important;border:1px solid rgba(148,163,184,.13)!important;border-radius:12px!important;box-shadow:0 10px 28px rgba(0,0,0,.11)}
  .section-title{font-weight:700!important;letter-spacing:-.01em}.ctrl-btn,.ctrl-sel,.btn-sm-ghost{border-radius:8px!important}
  .platform-summary{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))!important;gap:10px!important;margin-bottom:14px!important}.platform-summary>div{background:linear-gradient(180deg,#171f2c,#131a25)!important;border:1px solid rgba(148,163,184,.13)!important;border-radius:11px!important;padding:14px!important}.platform-summary small{color:#7f8ca0!important;font-size:9px!important;text-transform:uppercase;letter-spacing:.055em}.platform-summary strong{display:block;margin-top:7px;font-size:20px!important;letter-spacing:-.03em}
  .paid-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px;padding:16px 18px;border:1px solid rgba(79,110,247,.2);border-radius:12px;background:linear-gradient(135deg,rgba(79,110,247,.12),rgba(79,110,247,.025) 52%,rgba(34,197,94,.035))}.paid-hero h3{margin:0;color:#f4f7fb;font-size:15px}.paid-hero p{margin:5px 0 0;color:#8492a6;font-size:11px;line-height:1.55}.paid-status{display:inline-flex;align-items:center;gap:7px;padding:6px 9px;border-radius:8px;background:rgba(34,197,94,.08);color:#5ee38a;font-size:10px;font-weight:700;white-space:nowrap}.paid-status:before{content:"";width:6px;height:6px;border-radius:50%;background:#22c55e}
  .paid-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px;margin-bottom:14px}.paid-kpi{position:relative;overflow:hidden;padding:15px;border:1px solid rgba(148,163,184,.13);border-radius:12px;background:linear-gradient(180deg,#171f2c,#131a25)}.paid-kpi:after{content:"";position:absolute;inset:auto -20px -35px auto;width:80px;height:80px;border-radius:50%;background:rgba(79,110,247,.05)}.paid-kpi-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#7f8ca0}.paid-kpi-value{display:block;margin-top:7px;font-size:23px;line-height:1;font-weight:750;letter-spacing:-.035em;color:#f4f7fb}.paid-kpi-sub{margin-top:8px;font-size:9px;color:#68778d}.paid-kpi-sub.good{color:#4ade80}.paid-kpi-sub.bad{color:#fb7185}
  .paid-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(260px,.8fr);gap:12px;margin-bottom:14px}.paid-chart-wrap{height:250px;padding:14px}.paid-side{padding:15px}.paid-side h4,.paid-chart-title{margin:0 0 12px;font-size:11px;color:#dfe7f2}.paid-funnel{display:flex;flex-direction:column;gap:9px}.paid-funnel-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.paid-funnel-row span{font-size:10px;color:#8290a3}.paid-funnel-row strong{font-size:12px;color:#eef3fb}.paid-bar{grid-column:1/-1;height:5px;border-radius:999px;background:#0a1018;overflow:hidden}.paid-bar i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#4f6ef7,#7c5cff)}
  .paid-table{width:100%;border-collapse:collapse;font-size:10px}.paid-table th{padding:10px 9px;color:#78869a;text-align:right;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid rgba(148,163,184,.12)}.paid-table th:first-child,.paid-table td:first-child{text-align:left}.paid-table td{padding:10px 9px;color:#dce4ef;text-align:right;border-bottom:1px solid rgba(148,163,184,.075)}.paid-table tbody tr:hover td{background:rgba(79,110,247,.045)}.campaign-name{max-width:360px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}.metric-good{color:#4ade80!important}.metric-bad{color:#fb7185!important}
  @media(max-width:1180px){.paid-kpi-grid{grid-template-columns:repeat(2,minmax(150px,1fr))}.paid-layout{grid-template-columns:1fr}}
  @media(max-width:760px){.dashboard-modebar{align-items:flex-start;flex-direction:column}.mode-context{display:none}.mode-switch{width:100%}.mode-btn{flex:1}.paid-kpi-grid{grid-template-columns:1fr 1fr}.dash-content{padding:14px!important}}
  `;

  function injectModernStyles(){if(document.getElementById('engaje-dashboard-v2-style'))return;const s=document.createElement('style');s.id='engaje-dashboard-v2-style';s.textContent=css;document.head.appendChild(s);}
  function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
  function n(v){const x=Number(v);return Number.isFinite(x)?x:0;}
  function pct(v,d=2){return Number(v||0).toFixed(d).replace('.',',')+'%';}
  function dlt(cur,prev){if(typeof ST==='undefined'||ST.compare==='none')return null;if(prev===0)return cur===0?0:null;return (cur-prev)/prev*100;}
  function semanticDelta(label,cur,prev){const d=dlt(cur,prev);if(d===null)return '';const inverse=/custo|cpc|cpm|cpl|cpa|frequência/i.test(label);const good=inverse?d<0:d>0;const cls=d===0?'':good?'good':'bad';const arrow=d>0?'▲':d<0?'▼':'•';return `<div class="paid-kpi-sub ${cls}">${arrow} ${Math.abs(d).toFixed(1).replace('.',',')}% vs. comparação</div>`;}
  function aggregate(rows){const s={spend:0,impressions:0,reach:0,clicks:0,results:0};(rows||[]).forEach(r=>{s.spend+=n(r.spend);s.impressions+=n(r.impressions);s.reach+=n(r.reach);s.clicks+=n(r.clicks);s.results+=n(r.results||r.conversions||r.leads||r.purchases)});s.ctr=s.impressions?s.clicks/s.impressions*100:0;s.cpc=s.clicks?s.spend/s.clicks:0;s.cpm=s.impressions?s.spend/s.impressions*1000:0;s.cpr=s.results?s.spend/s.results:0;s.frequency=s.reach?s.impressions/s.reach:0;return s;}
  function paidCard(label,value,cur,prev){return `<div class="paid-kpi"><span class="paid-kpi-label">${label}</span><strong class="paid-kpi-value">${value}</strong>${semanticDelta(label,cur,prev)}</div>`;}
  function groupCampaigns(rows){const map=new Map();(rows||[]).forEach((r,i)=>{const name=r.campaign_name||r.campaign||r.campaign_id||('Campanha '+(i+1));if(!map.has(name))map.set(name,[]);map.get(name).push(r)});return [...map.entries()].map(([name,items])=>({name,...aggregate(items)})).sort((a,b)=>b.spend-a.spend);}
  function buildSeries(rows){const by={};(rows||[]).forEach(r=>{const k=String(r.date_start||r.date||r.day||'').slice(0,10);if(!k)return;if(!by[k])by[k]={spend:0,results:0};by[k].spend+=n(r.spend);by[k].results+=n(r.results||r.conversions||r.leads||r.purchases)});const labels=Object.keys(by).sort();return{labels,spend:labels.map(k=>by[k].spend),results:labels.map(k=>by[k].results)};}
  function renderPaidChart(rows){const canvas=document.getElementById('paid-performance-chart');if(!canvas||typeof Chart==='undefined')return;const s=buildSeries(rows);if(window.__engajePaidChart)window.__engajePaidChart.destroy();window.__engajePaidChart=new Chart(canvas,{data:{labels:s.labels.map(x=>x.slice(5)),datasets:[{type:'bar',label:'Investimento',data:s.spend,backgroundColor:'rgba(79,110,247,.45)',borderColor:'#5d77ff',borderWidth:1,borderRadius:5,yAxisID:'y'},{type:'line',label:'Resultados',data:s.results,borderColor:'#31d17c',backgroundColor:'rgba(49,209,124,.08)',tension:.35,pointRadius:0,pointHoverRadius:3,borderWidth:2,yAxisID:'y1'}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#8794a6',boxWidth:10,boxHeight:10,font:{size:10}}}},scales:{x:{grid:{display:false},ticks:{color:'#68778d',font:{size:9}}},y:{position:'left',grid:{color:'rgba(148,163,184,.07)'},ticks:{color:'#68778d',font:{size:9},callback:v=>'R$ '+Number(v).toLocaleString('pt-BR')}},y1:{position:'right',grid:{display:false},ticks:{color:'#68778d',font:{size:9}}}}}});}

  function ensureModeSwitcher(){
    const tabs=document.querySelector('.dash-tabs');if(!tabs||document.querySelector('.dashboard-modebar'))return;
    const bar=document.createElement('div');bar.className='dashboard-modebar';bar.innerHTML=`<div class="mode-switch" role="tablist" aria-label="Tipo de mídia"><button class="mode-btn" data-mode="organic" type="button">Orgânico</button><button class="mode-btn" data-mode="paid" type="button">Pago</button></div><div class="mode-context"><span class="mode-context-dot"></span><span>Exibindo apenas fontes conectadas com dados reais</span></div>`;tabs.parentNode.insertBefore(bar,tabs);bar.querySelectorAll('.mode-btn').forEach(b=>b.addEventListener('click',()=>setDashboardMode(b.dataset.mode,true)));
  }

  function availablePaid(){return typeof ST!=='undefined'&&Array.isArray(ST.available?.paid)&&ST.available.paid.length>0;}
  function updateModeUI(activate=false){
    ensureModeSwitcher();
    document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===dashMode));
    const tabs=[...document.querySelectorAll('.dash-tab')];
    const defs={overview:'Visão Geral',instagram:'Instagram',facebook:'Facebook',audience:'Audiência',paid:'Visão Geral',conversions:'Conversões'};
    tabs.forEach(t=>{if(defs[t.dataset.tab])t.textContent=defs[t.dataset.tab];const tab=t.dataset.tab;let show=false;if(dashMode==='organic')show=['overview','instagram','facebook','audience'].includes(tab);else show=['paid','conversions'].includes(tab)&&availablePaid();t.style.display=show?'flex':'none';});
    const paidBtn=document.querySelector('.mode-btn[data-mode="paid"]');if(paidBtn){paidBtn.disabled=!availablePaid();paidBtn.title=availablePaid()?'':'Nenhuma conta de mídia paga com dados para este cliente';paidBtn.style.opacity=availablePaid()?'1':'.45';paidBtn.style.cursor=availablePaid()?'pointer':'not-allowed';}
    if(activate){
      if(dashMode==='paid'&&availablePaid()){const t=tabs.find(x=>x.dataset.tab==='paid');if(t&&typeof setTab==='function')setTab('paid',t);}
      if(dashMode==='organic'){const target=['overview','instagram','facebook','audience'].includes(ST.activeTab)?ST.activeTab:'overview';const t=tabs.find(x=>x.dataset.tab===target)||tabs.find(x=>x.dataset.tab==='overview');if(t&&typeof setTab==='function')setTab(target,t);}
    }
  }
  function setDashboardMode(mode,activate){if(mode==='paid'&&!availablePaid())return;dashMode=mode==='paid'?'paid':'organic';localStorage.setItem(MODE_KEY,dashMode);updateModeUI(activate);}
  window.setDashboardMode=setDashboardMode;

  const legacyApply=typeof applyAvailability==='function'?applyAvailability:null;
  if(legacyApply)applyAvailability=function(){legacyApply();ensureModeSwitcher();if(dashMode==='paid'&&!availablePaid())dashMode='organic';updateModeUI(false);};

  const legacyRestore=typeof restoreDashboardShell==='function'?restoreDashboardShell:null;
  if(legacyRestore)restoreDashboardShell=function(){legacyRestore();ensureModeSwitcher();const bar=document.querySelector('.dashboard-modebar');if(bar)bar.style.display='flex';updateModeUI(false);};
  const legacyHide=typeof hideDashboardShell==='function'?hideDashboardShell:null;
  if(legacyHide)hideDashboardShell=function(){legacyHide();const bar=document.querySelector('.dashboard-modebar');if(bar)bar.style.display='none';};

  if(typeof renderPaidTab==='function')renderPaidTab=async function(conversionsOnly=false){
    const id=conversionsOnly?'tab-conversions':'tab-paid',el=document.getElementById(id);if(!el)return;el.innerHTML='<div class="empty-state"><div class="empty-title">Carregando dados reais de Meta Ads...</div></div>';
    const range=currentRange(),prevRange=compareRange();
    const mkq=r=>'meta_ad_metrics?client_id=eq.'+encodeURIComponent(ST.clientId)+'&date_start=gte.'+isoDate(r.start)+'&date_start=lt.'+isoDate(r.end)+'&select=*&order=date_start.desc&limit=5000';
    try{
      const [rows,prevRows]=await Promise.all([rest(mkq(range))||[],ST.compare==='none'?Promise.resolve([]):rest(mkq(prevRange)).catch(()=>[])]);
      if(!rows.length){el.innerHTML='<div class="section-card"><div class="empty-state"><div class="empty-title">Sem dados de Meta Ads no período</div><div class="empty-desc">A área paga só é habilitada quando existem dados reais vinculados ao cliente.</div></div></div>';return;}
      const cur=aggregate(rows),prev=aggregate(prevRows),campaigns=groupCampaigns(conversionsOnly?rows.filter(r=>n(r.results||r.conversions||r.leads||r.purchases)>0):rows);
      const maxFunnel=Math.max(cur.impressions,1),funnel=[['Impressões',cur.impressions],['Cliques',cur.clicks],['Resultados',cur.results]];
      el.innerHTML=`
        <div class="paid-hero"><div><h3>${conversionsOnly?'Conversões':'Performance de mídia paga'}</h3><p>Meta Ads consolidado no período selecionado. Custos e taxas são recalculados a partir dos dados reais disponíveis.</p></div><div class="paid-status">Dados conectados</div></div>
        <div class="paid-kpi-grid">
          ${paidCard('Investimento',money(cur.spend),cur.spend,prev.spend)}
          ${paidCard('Resultados',fmtK(cur.results),cur.results,prev.results)}
          ${paidCard('Custo por resultado',cur.results?money(cur.cpr):'—',cur.cpr,prev.cpr)}
          ${paidCard('Impressões',fmtK(cur.impressions),cur.impressions,prev.impressions)}
          ${paidCard('Alcance',fmtK(cur.reach),cur.reach,prev.reach)}
          ${paidCard('CTR',pct(cur.ctr),cur.ctr,prev.ctr)}
          ${paidCard('CPC',cur.clicks?money(cur.cpc):'—',cur.cpc,prev.cpc)}
          ${paidCard('CPM',cur.impressions?money(cur.cpm):'—',cur.cpm,prev.cpm)}
        </div>
        <div class="paid-layout">
          <div class="section-card paid-chart-wrap"><div class="paid-chart-title">Investimento e resultados ao longo do tempo</div><div style="height:205px"><canvas id="paid-performance-chart"></canvas></div></div>
          <div class="section-card paid-side"><h4>Funil de entrega</h4><div class="paid-funnel">${funnel.map(([label,val])=>`<div class="paid-funnel-row"><span>${label}</span><strong>${fmtK(val)}</strong><div class="paid-bar"><i style="width:${Math.max(2,Math.min(100,val/maxFunnel*100))}%"></i></div></div>`).join('')}</div><div style="margin-top:15px;padding-top:12px;border-top:1px solid rgba(148,163,184,.1);display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><div class="paid-kpi-label">Frequência</div><div style="margin-top:5px;font-weight:700">${cur.frequency?cur.frequency.toFixed(2).replace('.',','):'—'}</div></div><div><div class="paid-kpi-label">Cliques</div><div style="margin-top:5px;font-weight:700">${fmtK(cur.clicks)}</div></div></div></div>
        </div>
        <div class="section-card"><div class="section-hdr"><span class="section-title">Performance por campanha</span><span style="font-size:9px;color:#6f7d90">${campaigns.length} campanha(s)</span></div><div style="overflow:auto"><table class="paid-table"><thead><tr><th>Campanha</th><th>Investimento</th><th>Impressões</th><th>Cliques</th><th>CTR</th><th>CPC</th><th>Resultados</th><th>Custo/resultado</th></tr></thead><tbody>${campaigns.slice(0,100).map(c=>`<tr><td class="campaign-name">${esc(c.name)}</td><td>${money(c.spend)}</td><td>${fmtK(c.impressions)}</td><td>${fmtK(c.clicks)}</td><td>${pct(c.ctr)}</td><td>${c.clicks?money(c.cpc):'—'}</td><td>${fmtK(c.results)}</td><td>${c.results?money(c.cpr):'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
      requestAnimationFrame(()=>renderPaidChart(rows));
    }catch(e){el.innerHTML='<div class="empty-state"><div class="empty-title">Falha ao carregar Meta Ads</div><div class="empty-desc">'+esc(e.message)+'</div></div>';}
  };

  const legacyRender=typeof renderDashboard==='function'?renderDashboard:null;
  if(legacyRender)renderDashboard=async function(){await legacyRender();ensureModeSwitcher();if(dashMode==='paid'&&!availablePaid())dashMode='organic';updateModeUI(false);if(dashMode==='paid'&&availablePaid()&&ST.activeTab!=='paid'&&ST.activeTab!=='conversions'){const t=[...document.querySelectorAll('.dash-tab')].find(x=>x.dataset.tab==='paid');if(t)setTab('paid',t);}};

  injectModernStyles();
  document.addEventListener('DOMContentLoaded',()=>{injectModernStyles();ensureModeSwitcher();setTimeout(()=>updateModeUI(true),120);});
})();
