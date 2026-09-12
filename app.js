const SB_URL='https://ityidnsfhgotucgvcifq.supabase.co';
const SB_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0eWlkbnNmaGdvdHVjZ3ZjaWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDYwMDksImV4cCI6MjEwNDU4MjAwOX0.IByuvnSlhNYeO-mipYk_xFWizcGWVaQmbK_w9H7ohBw';
let SESSION=null,PROFILE=null;
const hdrs=()=>({'Content-Type':'application/json','apikey':SB_ANON,'Authorization':'Bearer '+(SESSION&&SESSION.access_token||SB_ANON)});
const sb=async(path,opts={})=>{
  const r=await fetch(SB_URL+'/rest/v1/'+path,{...opts,headers:{...hdrs(),...(opts.headers||{})}});
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.message||'HTTP '+r.status);}
  if(r.status===204)return null;
  return r.json();
};
const ST={period:30,compare:'prev_period',clientId:null,clientName:'',clients:[],accounts:[],posts:[],charts:{},activeTab:'overview',chartGran:'month',seriesVisible:[true,true,true],shareLink:null};

function showForgot(){document.getElementById('login-form').style.display='none';document.getElementById('forgot-form').style.display='block';}
function showLogin(){document.getElementById('forgot-form').style.display='none';document.getElementById('login-form').style.display='block';}

async function doLogin(){
  const email=document.getElementById('l-email').value.trim(),pass=document.getElementById('l-pass').value;
  const errEl=document.getElementById('l-err'),btn=document.getElementById('l-btn');
  errEl.style.display='none';
  if(!email||!pass){errEl.textContent='Preencha e-mail e senha.';errEl.style.display='block';return;}
  btn.disabled=true;btn.textContent='Entrando...';
  try{
    const r=await fetch(SB_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json','apikey':SB_ANON},body:JSON.stringify({email,password:pass})});
    const d=await r.json();if(!r.ok)throw new Error(d.error_description||'Erro');
    SESSION=d;await afterLogin(d.user);
  }catch(e){
    errEl.textContent=e.message==='Invalid login credentials'?'E-mail ou senha incorretos.':e.message;
    errEl.style.display='block';btn.disabled=false;btn.textContent='Entrar';
  }
}

async function doForgot(){
  const email=document.getElementById('f-email').value.trim();
  const errEl=document.getElementById('f-err'),okEl=document.getElementById('f-ok'),btn=document.getElementById('f-btn');
  errEl.style.display='none';okEl.style.display='none';
  if(!email){errEl.textContent='Digite seu e-mail.';errEl.style.display='block';return;}
  btn.disabled=true;btn.textContent='Enviando...';
  await fetch(SB_URL+'/auth/v1/recover',{method:'POST',headers:{'Content-Type':'application/json','apikey':SB_ANON},body:JSON.stringify({email})});
  okEl.textContent='Link enviado! Verifique seu e-mail.';okEl.style.display='block';
  btn.disabled=false;btn.textContent='Enviar link';
}

async function doLogout(){
  try{await fetch(SB_URL+'/auth/v1/logout',{method:'POST',headers:hdrs()});}catch(e){}
  SESSION=null;PROFILE=null;
  document.getElementById('app').style.display='none';
  document.getElementById('auth-wrap').style.display='flex';
}

async function afterLogin(user){
  try{const p=await sb('user_profiles?id=eq.'+user.id+'&select=*');PROFILE=p&&p[0]||null;}catch(e){}
  const name=PROFILE&&PROFILE.full_name||user.email.split('@')[0]||'Usuario';
  document.getElementById('user-initials').textContent=name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('um-name').textContent=name;
  document.getElementById('um-email').textContent=user.email;
  document.getElementById('auth-wrap').style.display='none';
  document.getElementById('app').style.display='block';
  await loadClients();
  await renderDashboard();
}

async function loadClients(){
  try{
    // clients nao tem segment/city — usar apenas colunas existentes
    ST.clients=await sb('clients?order=name.asc&select=id,name,slug,status,is_agency')||[];
    buildClientDrop();
    if(ST.clients.length&&!ST.clientId){
      const first=ST.clients.find(c=>!c.is_agency)||ST.clients[0];
      if(first){ST.clientId=first.id;ST.clientName=first.name;document.getElementById('tb-client-name').textContent=first.name;}
    }
  }catch(e){console.error('loadClients:',e);ST.clients=[];}
}

function since(){const d=new Date();d.setDate(d.getDate()-ST.period);return d.toISOString().split('T')[0];}

async function loadPosts(){
  if(!ST.clientId)return[];
  try{
    const pf=document.getElementById('chart-plat-filter')&&document.getElementById('chart-plat-filter').value;
    let qs='posts?client_id=eq.'+ST.clientId+'&published_at=gte.'+since()+'&select=id,account_id,platform,media_type,media_url,thumbnail_url,permalink,caption,published_at&order=published_at.desc&limit=200';
    if(pf&&pf!=='all')qs+='&platform=eq.'+pf;
    ST.posts=await sb(qs)||[];
    if(ST.posts.length){
      // post_metrics usa post_id (text), campos: reach, impressions, engagement, like_count, comment_count, shares
      const ids=ST.posts.map(p=>'"'+p.id+'"').join(',');
      try{
        const mets=await sb('post_metrics?post_id=in.('+ids+')&select=post_id,reach,impressions,engagement,like_count,comment_count,shares,saved,views&order=synced_at.desc')||[];
        const mm={};
        mets.forEach(m=>{if(!mm[m.post_id])mm[m.post_id]=m;});
        ST.posts.forEach(p=>{p.metrics=mm[p.id]||{};});
      }catch(e){console.error('metrics:',e);}
    }
    return ST.posts;
  }catch(e){console.error('loadPosts:',e);ST.posts=[];return[];}
}

async function renderDashboard(){
  if(!ST.clientId)return;
  updateClientHeader();
  await loadPosts();
  renderKPIs(ST.posts);
  renderPerformanceChart(ST.posts);
  renderDonut(ST.posts);
  renderPlatformMetrics(ST.posts);
  renderTopContent(ST.posts);
  renderInsights(ST.posts);
  updateShareCard();
}

function updateClientHeader(){
  const c=ST.clients.find(x=>x.id===ST.clientId);if(!c)return;
  const av=document.getElementById('client-avatar');
  av.textContent=c.name&&c.name[0]||'?';
  av.style.background='linear-gradient(135deg,#1B2B6B,#4361ee)';
  av.style.color='#fff';
  document.getElementById('client-name').textContent=c.name;
  document.getElementById('client-meta').textContent=c.status||'Ativo';
  document.getElementById('share-client').value=c.name;
  const slug=c.slug||c.name.toLowerCase().replace(/[^a-z0-9]/g,'-');
  ST.shareLink=location.origin+'/cliente/'+slug+'/'+generateToken();
  document.getElementById('sc-link-url').textContent=ST.shareLink;
}

// Helpers de métricas — mapeia campos reais do banco
function getReach(m){return m&&(m.impressions||m.reach)||0;}
function getEng(m){return m&&(m.engagement||0);}
function getLikes(m){return m&&(m.like_count||0);}
function getComments(m){return m&&(m.comment_count||0);}
function getShares(m){return m&&(m.shares||0);}
function getSaved(m){return m&&(m.saved||0);}
function getViews(m){return m&&(m.views||0);}

function renderKPIs(posts){
  const tP=posts.length;
  const tR=posts.reduce((s,p)=>s+getReach(p.metrics),0);
  const tE=posts.reduce((s,p)=>s+getEng(p.metrics),0);
  const tL=posts.reduce((s,p)=>s+getLikes(p.metrics),0);
  const tS=posts.reduce((s,p)=>s+getSaved(p.metrics),0);
  const er=tR>0?((tE/tR)*100).toFixed(1):0;
  const kpis=[
    {name:'Posts publicados',val:fmt(tP),delta:null,color:'kpi-blue',ico:'📝',bg:'rgba(67,97,238,.15)',data:spark(tP)},
    {name:'Alcance total',val:fmtK(tR),delta:null,color:'kpi-green',ico:'👁',bg:'rgba(34,197,94,.15)',data:spark(tR)},
    {name:'Engajamento',val:fmtK(tE),delta:null,color:'kpi-red',ico:'💬',bg:'rgba(239,68,68,.15)',data:spark(tE)},
    {name:'Curtidas',val:fmtK(tL),delta:null,color:'kpi-purple',ico:'❤️',bg:'rgba(139,92,246,.15)',data:spark(tL)},
    {name:'Salvamentos',val:fmtK(tS),delta:null,color:'kpi-yellow',ico:'🔖',bg:'rgba(245,158,11,.15)',data:spark(tS)},
    {name:'Taxa engajamento',val:er+'%',delta:null,color:'kpi-teal',ico:'⚡',bg:'rgba(34,211,238,.15)',data:spark(parseFloat(er))},
  ];
  const g=document.getElementById('kpi-row');
  g.innerHTML=kpis.map((k,i)=>`<div class="kpi-card ${k.color}"><div class="kpi-head"><div class="kpi-icon" style="background:${k.bg}">${k.ico}</div><span class="kpi-name">${k.name}</span></div><div class="kpi-val">${k.val}</div><div class="kpi-footer"><span class="kpi-delta ${tP>0?'up':'na'}">${tP>0?'dados reais':'sem dados'}</span><div class="kpi-sparkline"><canvas id="sp-${i}"></canvas></div></div></div>`).join('');
  kpis.forEach((k,i)=>{
    const ctx=document.getElementById('sp-'+i);if(!ctx)return;
    if(ST.charts['sp'+i])ST.charts['sp'+i].destroy();
    const col='#4361ee';
    ST.charts['sp'+i]=new Chart(ctx,{type:'line',data:{labels:k.data.map((_,j)=>j),datasets:[{data:k.data,borderColor:col,backgroundColor:col+'20',tension:.4,fill:true,pointRadius:0,borderWidth:1.5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}},animation:{duration:0}}});
  });
}

function renderPerformanceChart(posts){
  const ctx=document.getElementById('perf-chart');if(!ctx)return;
  if(ST.charts.perf)ST.charts.perf.destroy();
  const byDay={};
  posts.forEach(p=>{
    if(!p.published_at)return;
    const d=p.published_at.slice(0,10);
    if(!byDay[d])byDay[d]={r:0,e:0,l:0};
    byDay[d].r+=getReach(p.metrics);
    byDay[d].e+=getEng(p.metrics);
    byDay[d].l+=getLikes(p.metrics);
  });
  const days=Object.keys(byDay).sort();
  if(!days.length){
    ctx.parentElement.innerHTML='<div class="empty-state" style="height:200px"><div class="empty-icon">📉</div><div class="empty-title">Nenhum dado no periodo</div><div class="empty-desc">Ajuste o periodo ou conecte uma plataforma.</div></div>';
    return;
  }
  ST.charts.perf=new Chart(ctx,{
    type:'line',
    data:{labels:days.map(d=>d.slice(5)),datasets:[
      {label:'Alcance',data:days.map(d=>byDay[d].r),borderColor:'#4361ee',backgroundColor:'rgba(67,97,238,.08)',tension:.4,fill:true,pointRadius:0,pointHoverRadius:4,borderWidth:2,hidden:!ST.seriesVisible[0]},
      {label:'Engajamento',data:days.map(d=>byDay[d].e),borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,.08)',tension:.4,fill:true,pointRadius:0,pointHoverRadius:4,borderWidth:2,hidden:!ST.seriesVisible[1]},
      {label:'Curtidas',data:days.map(d=>byDay[d].l),borderColor:'#8b5cf6',backgroundColor:'rgba(139,92,246,.08)',tension:.4,fill:true,pointRadius:0,pointHoverRadius:4,borderWidth:2,hidden:!ST.seriesVisible[2]},
    ]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{backgroundColor:'#1c2333',borderColor:'#2a3347',borderWidth:1,titleColor:'#e6edf3',bodyColor:'#8b949e',padding:10,cornerRadius:6,callbacks:{label:c=>c.dataset.label+': '+fmtK(c.raw)}}},scales:{x:{grid:{color:'rgba(42,51,71,.5)'},ticks:{color:'#6e7681',font:{size:10},maxTicksLimit:8}},y:{grid:{color:'rgba(42,51,71,.5)'},ticks:{color:'#6e7681',font:{size:10},callback:v=>fmtK(v)}}}}
  });
}

function updatePerformanceChart(){
  loadPosts().then(posts=>{renderPerformanceChart(posts);renderDonut(posts);renderKPIs(posts);});
}

function toggleSeries(idx,el){
  ST.seriesVisible[idx]=!ST.seriesVisible[idx];
  el.classList.toggle('inactive');
  if(ST.charts.perf){ST.charts.perf.data.datasets[idx].hidden=!ST.seriesVisible[idx];ST.charts.perf.update();}
}

function renderDonut(posts){
  const byP={};
  const pC={instagram:'#e1306c',facebook_organic:'#1877f2',facebook:'#1877f2',tiktok:'#69c9d0',youtube:'#ff0000',google_my_business:'#4285f4'};
  const pN={instagram:'Instagram',facebook_organic:'Facebook',facebook:'Facebook',tiktok:'TikTok',youtube:'YouTube',google_my_business:'Google Meu Neg.'};
  posts.forEach(p=>{const r=getReach(p.metrics);byP[p.platform]=(byP[p.platform]||0)+r;});
  const total=Object.values(byP).reduce((s,v)=>s+v,0);
  document.getElementById('donut-center-val').textContent=fmtK(total)||'—';
  const entries=Object.entries(byP).sort((a,b)=>b[1]-a[1]);
  const ctx=document.getElementById('donut-chart');
  if(ST.charts.donut)ST.charts.donut.destroy();
  if(total>0){
    ST.charts.donut=new Chart(ctx,{type:'doughnut',data:{labels:entries.map(([k])=>pN[k]||k),datasets:[{data:entries.map(([,v])=>v),backgroundColor:entries.map(([k])=>pC[k]||'#4361ee'),borderWidth:0,hoverOffset:4}]},options:{responsive:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.label+': '+fmtK(c.raw)+' ('+((c.raw/total)*100).toFixed(0)+'%)'}}},cutout:'70%'}});
    document.getElementById('plat-list').innerHTML=entries.slice(0,5).map(([k,v])=>`<div class="plat-list-item"><div class="plat-list-dot" style="background:${pC[k]||'#4361ee'}"></div><span class="plat-list-name">${pN[k]||k}</span><span class="plat-list-pct">${total>0?((v/total)*100).toFixed(0):0}%</span><span class="plat-list-abs">${fmtK(v)}</span></div>`).join('');
  }else{
    document.getElementById('plat-list').innerHTML='<div style="text-align:center;color:var(--text2);font-size:11px;padding:10px">Sem dados no periodo</div>';
  }
}

function renderPlatformMetrics(posts){
  var pCfg=[
    {key:'instagram',name:'Instagram',color:'#e1306c',m3:'Salvamentos',svg:'<svg viewBox="0 0 24 24" fill="white" width="12" height="12"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>'},
    {key:'facebook_organic',name:'Facebook',color:'#1877f2',m3:'Compartilhamentos',svg:'<svg viewBox="0 0 24 24" fill="white" width="12" height="12"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'},
    {key:'tiktok',name:'TikTok',color:'#69c9d0',m3:'Visualizacoes',svg:'<svg viewBox="0 0 24 24" fill="white" width="12" height="12"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.98a8.28 8.28 0 004.83 1.54V7.07a4.85 4.85 0 01-1.06-.38z"/></svg>'},
    {key:'youtube',name:'YouTube',color:'#ff0000',m3:'Visualizacoes',svg:'<svg viewBox="0 0 24 24" fill="white" width="12" height="12"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>'},
    {key:'google_my_business',name:'Google Meu Neg.',color:'#4285f4',m3:'Perfil visto',svg:'<svg viewBox="0 0 24 24" fill="white" width="12" height="12"><path d="M12 11.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5zM12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>'},
  ];
  var byP={};
  posts.forEach(function(p){
    if(!byP[p.platform])byP[p.platform]={r:0,e:0,l:0,s:0,n:0};
    byP[p.platform].r+=getReach(p.metrics);
    byP[p.platform].e+=getEng(p.metrics);
    byP[p.platform].l+=getLikes(p.metrics);
    byP[p.platform].s+=getSaved(p.metrics)||getShares(p.metrics)||getViews(p.metrics)||0;
    byP[p.platform].n++;
  });
  var active=pCfg.filter(function(p){return byP[p.key]&&byP[p.key].n>0;});
  var section=document.getElementById('plat-metrics-section');
  var row=document.getElementById('plat-metrics-row');
  if(!active.length){
    if(section)section.style.display='none';
    row.innerHTML='';
    return;
  }
  if(section)section.style.display='';
  row.style.gridTemplateColumns='repeat('+Math.min(active.length,5)+',1fr)';
  row.innerHTML=active.map(function(p){
    var d=byP[p.key];
    var er=d.r>0?((d.e/d.r)*100).toFixed(1)+'%':'-';
    var card='<div class="plat-metric-card">';
    card+='<div class="pmcard-hdr">';
    card+='<div class="pmcard-icon" style="background:'+p.color+'">'+p.svg+'</div>';
    card+='<span class="pmcard-name">'+p.name+'</span>';
    card+='<span style="font-size:10px;color:var(--text3);margin-left:auto">'+d.n+' post'+(d.n!==1?'s':'')+'</span>';
    card+='</div>';
    card+='<div class="pmcard-metrics">';
    card+='<div class="pmcard-row"><span class="pmcard-lbl">Alcance</span><div class="pmcard-val">'+fmtK(d.r)+'</div></div>';
    card+='<div class="pmcard-row"><span class="pmcard-lbl">Engajamento</span><div class="pmcard-val">'+(d.r>0?er:'-')+'</div></div>';
    card+='<div class="pmcard-row"><span class="pmcard-lbl">'+p.m3+'</span><div class="pmcard-val">'+fmtK(d.s)+'</div></div>';
    card+='</div>';
    card+='<button class="pmcard-btn" style="background:'+p.color+'20;color:'+p.color+';border:1px solid '+p.color+'30">Ver detalhes</button>';
    card+='</div>';
    return card;
  }).join('');
}

function renderTopContent(posts){
  const sorted=[...posts].sort((a,b)=>getEng(b.metrics)-getEng(a.metrics)).slice(0,5);
  const el=document.getElementById('top-content');
  if(!sorted.length){
    el.innerHTML='<div class="empty-state" style="height:120px"><div class="empty-icon">📸</div><div class="empty-desc">Nenhum conteudo no periodo</div></div>';
    return;
  }
  const fl={IMAGE:'Feed',VIDEO:'Reels',CAROUSEL_ALBUM:'Carrossel',REEL:'Reels'};
  el.innerHTML=sorted.map((p,i)=>{
    const img=p.thumbnail_url||p.media_url;
    const ft=fl[p.media_type]||p.media_type||'Post';
    const val=getReach(p.metrics);
    const lic=getLikes(p.metrics);
    return `<div class="tc-card"><div class="tc-thumb">${img?`<img src="${img}" alt="" onerror="this.style.display='none'">`:'📸'}<span class="tc-rank">#${i+1}</span><span class="tc-format">${ft}</span></div><div class="tc-body"><div class="tc-title">${(p.caption||'—').slice(0,28)}</div><div class="tc-metric">${fmtK(val)} alcance</div><div class="tc-sub">${lic>0?fmtK(lic)+' curtidas':p.platform==='instagram'?'Instagram':'Facebook'}</div></div></div>`;
  }).join('');
}

function renderInsights(posts){
  const el=document.getElementById('insight-list');
  const ins=[];
  const tR=posts.reduce((s,p)=>s+getReach(p.metrics),0);
  const tE=posts.reduce((s,p)=>s+getEng(p.metrics),0);
  const reels=posts.filter(p=>p.media_type==='REEL'||p.media_type==='VIDEO');
  const feed=posts.filter(p=>p.media_type==='IMAGE');
  if(tR>0)ins.push({t:'op',tag:'OPORTUNIDADE',title:'Alcance acumulado no periodo',desc:'Seus posts atingiram '+fmtK(tR)+' impressoes com '+posts.length+' publicacoes.',time:'periodo atual'});
  if(reels.length>0&&feed.length>0){
    const rA=reels.reduce((s,p)=>s+getEng(p.metrics),0)/(reels.length||1);
    const fA=feed.reduce((s,p)=>s+getEng(p.metrics),0)/(feed.length||1);
    if(rA>fA&&fA>0)ins.push({t:'op',tag:'OPORTUNIDADE',title:'Reels performam melhor que feed',desc:'Reels geraram '+Math.round((rA/fA-1)*100)+'% mais engajamento que posts no feed.',time:'analise do periodo'});
    else if(rA>0&&fA>0)ins.push({t:'info',tag:'INFORMACAO',title:'Distribuicao de formatos',desc:reels.length+' Reels e '+feed.length+' posts de feed publicados no periodo.',time:'analise do periodo'});
  }
  const tS=posts.reduce((s,p)=>s+getSaved(p.metrics),0);
  if(tS>0)ins.push({t:'op',tag:'OPORTUNIDADE',title:'Conteudo salvo pelos seguidores',desc:fmtK(tS)+' salvamentos no periodo — sinal de conteudo de valor.',time:'periodo atual'});
  else if(posts.length>0&&tR>0)ins.push({t:'att',tag:'ATENCAO',title:'Taxa de salvamento baixa',desc:'Nenhum salvamento registrado. Crie conteudo de referencia para aumentar saves.',time:'sugestao'});
  if(!ins.length)ins.push({t:'info',tag:'INFORMACAO',title:'Analise em andamento',desc:'Continue publicando para gerar insights automaticos baseados em dados reais.',time:'agora'});
  el.innerHTML=ins.slice(0,3).map(i=>`<div class="insight-item ${i.t}"><div class="insight-tag ${i.t}">${i.tag}</div><div class="insight-title">${i.title}</div><div class="insight-desc">${i.desc}</div><div class="insight-time">${i.time}</div></div>`).join('');
}

function updateShareCard(){if(ST.shareLink)document.getElementById('sc-link-url').textContent=ST.shareLink;}

function navSidebar(el){document.querySelectorAll('.sb-item').forEach(e=>e.classList.remove('active'));el.classList.add('active');}

function setTab(tab,el){
  document.querySelectorAll('.dash-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');
  document.querySelectorAll('[id^="tab-"]').forEach(t=>t.style.display='none');
  const te=document.getElementById('tab-'+tab);
  if(te)te.style.display='block';
}

function cyclePeriod(){
  const ps=[7,14,30,90],ls=['Ultimos 7 dias','Ultimos 14 dias','Ultimos 30 dias','Ultimos 90 dias'];
  const idx=ps.indexOf(ST.period),nx=(idx+1)%ps.length;
  ST.period=ps[nx];
  document.getElementById('tb-period-label').textContent=ls[nx];
  renderDashboard();
}

function setCompare(val,name){
  ST.compare=val;
  document.getElementById('tb-compare-name').textContent=name;
  document.querySelectorAll('#compare-drop .tb-drop-item').forEach(e=>e.classList.remove('active'));
  event.target.classList.add('active');
  closeAllDrops();
}

function setChartGran(gran,btn){
  document.querySelectorAll('.ctrl-grp .ctrl-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  loadPosts().then(p=>renderPerformanceChart(p));
}

function buildClientDrop(){
  const drop=document.getElementById('client-drop');
  drop.innerHTML=ST.clients.map(c=>`<div class="tb-drop-item${c.id===ST.clientId?' active':''}" onclick="selectClient('${c.id}','${c.name}',event)"><div class="item-av">${c.name[0]}</div>${c.name}${c.is_agency?' (agencia)':''}</div>`).join('');
}

function selectClient(id,name,e){
  if(e)e.stopPropagation();
  ST.clientId=id;ST.clientName=name;
  document.getElementById('tb-client-name').textContent=name;
  document.querySelectorAll('#client-drop .tb-drop-item').forEach(e=>e.classList.remove('active'));
  closeAllDrops();
  renderDashboard();
}

function toggleDrop(id,e){
  e.stopPropagation();
  const el=document.getElementById(id),was=el.classList.contains('open');
  closeAllDrops();
  if(!was)el.classList.add('open');
}
function closeAllDrops(){document.querySelectorAll('.tb-drop,.user-menu').forEach(d=>d.classList.remove('open'));}
document.addEventListener('click',closeAllDrops);
function toggleUserMenu(){document.getElementById('user-menu').classList.toggle('open');event.stopPropagation();}

function openShareModal(){
  document.getElementById('share-modal').classList.add('open');
  document.getElementById('modal-link-result').classList.remove('show');
  const c=ST.clients.find(x=>x.id===ST.clientId);
  if(c)document.getElementById('share-client').value=c.name;
}
function closeModal(id){document.getElementById(id).classList.remove('open');}
function closeModalOutside(e,id){if(e.target.id===id)closeModal(id);}
function generateShareLink(){
  const c=ST.clients.find(x=>x.id===ST.clientId);
  if(!c){alert('Selecione um cliente primeiro.');return;}
  const slug=c.slug||c.name.toLowerCase().replace(/[^a-z0-9]/g,'-');
  const link=location.origin+'/cliente/'+slug+'/'+generateToken();
  ST.shareLink=link;
  document.getElementById('sc-link-url').textContent=link;
  document.getElementById('modal-link-url').textContent=link;
  document.getElementById('modal-link-result').classList.add('show');
}
function generateToken(){
  return Array.from({length:16},()=>'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random()*62)]).join('');
}
function copyShareLink(){if(ST.shareLink)navigator.clipboard&&navigator.clipboard.writeText(ST.shareLink).then(()=>toast('Link copiado!'));}
function copyModalLink(){const l=document.getElementById('modal-link-url').textContent;if(l)navigator.clipboard&&navigator.clipboard.writeText(l).then(()=>toast('Link copiado!'));}
function openShareLink(){if(ST.shareLink)window.open(ST.shareLink,'_blank');}
function toast(msg){
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:20px;right:20px;background:#22c55e;color:#fff;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:500;z-index:9999';
  t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2500);
}
function fmt(n){if(!n&&n!==0)return'—';return Math.round(Number(n)).toLocaleString('pt-BR');}
function fmtK(n){if(!n&&n!==0)return'—';n=Number(n);if(n>=1e6)return(n/1e6).toFixed(1)+'M';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return n.toString();}
function spark(base){return Array.from({length:12},(_,i)=>Math.max(0,base*(0.5+Math.random())*(i/11+0.5)));}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.remove('open'));
  if(e.key==='Enter'&&document.getElementById('auth-wrap').style.display!=='none'){
    document.getElementById('forgot-form').style.display!=='none'?doForgot():doLogin();
  }
});
setInterval(async()=>{if(SESSION)await renderDashboard();},5*60*1000);
