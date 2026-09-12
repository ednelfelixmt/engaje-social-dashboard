const SB_URL='https://ityidnsfhgotucgvcifq.supabase.co';
const SB_ANON='sb_publishable_uSek4JLn4bAUje-gnfES4g_XVJB3Why';
const SESSION_KEY='engaje_session_v2';
let SESSION=null,PROFILE=null;

const ST={
  period:30,customStart:null,customEnd:null,compare:'prev_period',clientId:null,clientName:'',clients:[],accounts:[],posts:[],comparePosts:[],charts:{},
  activeTab:'overview',chartGran:'day',seriesVisible:[true,true,true],shareLink:null,platform:'all',module:null,accountsFilter:'all',
  available:{organic:[],paid:[],content:false,audience:false,conversions:false},
  branding:{login_cover_url:'/assets/zf-cover-2026.png?v=2026-2',login_cover_year:2026,platform_name:'Engaje Mídia Hub'}
};

const $=id=>document.getElementById(id);
const qs=(sel,root=document)=>root.querySelector(sel);
const qsa=(sel,root=document)=>[...root.querySelectorAll(sel)];
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const safeUrl=v=>{try{const u=new URL(v,location.origin);return ['http:','https:'].includes(u.protocol)?u.href:'#';}catch{return '#';}};

function authHeaders(useSession=true){
  const token=useSession&&SESSION?.access_token?SESSION.access_token:SB_ANON;
  return {'Content-Type':'application/json','apikey':SB_ANON,'Authorization':'Bearer '+token};
}

async function rest(path,opts={},useSession=true){
  const r=await fetch(SB_URL+'/rest/v1/'+path,{...opts,headers:{...authHeaders(useSession),...(opts.headers||{})}});
  if(!r.ok){
    const e=await r.json().catch(()=>({}));
    const err=new Error(e.message||e.hint||('HTTP '+r.status));
    err.status=r.status;err.code=e.code;err.details=e.details;throw err;
  }
  if(r.status===204)return null;
  const text=await r.text();
  return text?JSON.parse(text):null;
}

function publicAssetUrl(path){return SB_URL+'/storage/v1/object/public/brand-assets/'+path;}
function isSuperAdmin(){return PROFILE?.role==='super_admin';}
async function loadBranding(){
  try{const rows=await rest('app_settings?id=eq.branding&select=value',{},false);if(rows?.[0]?.value)ST.branding={...ST.branding,...rows[0].value};}catch(e){console.warn('branding',e);}
  applyLoginCover();
}
function applyLoginCover(){
  const el=$('auth-cover'),url=ST.branding.login_cover_url||'';if(!el)return;
  if(url&&!url.startsWith('/assets/zf-cover-2026.'))el.src=safeUrl(url);
}
function selectedClient(){return ST.clients.find(c=>String(c.id)===String(ST.clientId));}
function applyClientCover(){
  const el=$('client-cover'),c=selectedClient();if(!el)return;
  const url=c?.cover_url;if(!url){el.style.display='none';el.style.backgroundImage='';return;}
  el.style.display='block';el.style.backgroundImage=`url("${safeUrl(url)}")`;el.style.backgroundPosition=c?.cover_position||'center';
}
async function uploadBrandAsset(file,path){
  if(!file)throw new Error('Selecione uma imagem.');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use JPG, PNG ou WebP.');
  if(file.size>5*1024*1024)throw new Error('A imagem deve ter no máximo 5 MB.');
  const r=await fetch(SB_URL+'/storage/v1/object/brand-assets/'+path,{method:'POST',headers:{apikey:SB_ANON,Authorization:'Bearer '+SESSION.access_token,'Content-Type':file.type,'x-upsert':'true'},body:file});
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.message||'Falha no upload.');}
  return publicAssetUrl(path)+'?v='+Date.now();
}
async function saveGlobalCover(input){
  if(!isSuperAdmin())return toast('Apenas o superadministrador pode alterar capas.','error');
  const file=input?.files?.[0];if(!file)return;try{
    const year=new Date().getFullYear(),ext=file.type.split('/')[1].replace('jpeg','jpg');
    const url=await uploadBrandAsset(file,`global/login-${year}.${ext}`);
    ST.branding={...ST.branding,login_cover_url:url,login_cover_year:year};
    await rest('app_settings?id=eq.branding',{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({value:ST.branding,updated_at:new Date().toISOString(),updated_by:SESSION.user.id})});
    applyLoginCover();toast('Capa anual atualizada.');showSettings();
  }catch(e){toast(e.message,'error');}finally{input.value='';}
}
async function saveClientCover(input){
  if(!isSuperAdmin())return toast('Apenas o superadministrador pode alterar capas.','error');
  const file=input?.files?.[0],c=selectedClient();if(!file||!c)return;try{
    const ext=file.type.split('/')[1].replace('jpeg','jpg'),url=await uploadBrandAsset(file,`clients/${c.id}/cover.${ext}`);
    await rest('clients?id=eq.'+encodeURIComponent(c.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({cover_url:url,updated_at:new Date().toISOString()})});
    c.cover_url=url;applyClientCover();toast('Capa do cliente atualizada.');showSettings();
  }catch(e){toast(e.message,'error');}finally{input.value='';}
}
async function resetClientCover(){
  if(!isSuperAdmin())return toast('Apenas o superadministrador pode alterar capas.','error');const c=selectedClient();if(!c)return;
  try{await rest('clients?id=eq.'+encodeURIComponent(c.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({cover_url:null,updated_at:new Date().toISOString()})});c.cover_url=null;applyClientCover();toast('Capa global restaurada para o cliente.');showSettings();}catch(e){toast(e.message,'error');}
}

async function authRequest(path,opts={}){
  const r=await fetch(SB_URL+'/auth/v1/'+path,{...opts,headers:{'Content-Type':'application/json','apikey':SB_ANON,...(opts.headers||{})}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error_description||d.msg||d.message||'Falha de autenticação');
  return d;
}

function persistSession(s){
  SESSION=s||null;
  if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY);
}

async function restoreSession(){
  try{
    const raw=localStorage.getItem(SESSION_KEY);if(!raw)return null;
    const s=JSON.parse(raw);if(!s?.access_token)return null;
    const now=Math.floor(Date.now()/1000);
    if(s.expires_at&&s.expires_at<now+90&&s.refresh_token){
      const refreshed=await authRequest('token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh_token})});
      if(!refreshed.expires_at&&refreshed.expires_in)refreshed.expires_at=now+refreshed.expires_in;
      persistSession(refreshed);return refreshed;
    }
    SESSION=s;return s;
  }catch(e){console.warn('restoreSession',e);persistSession(null);return null;}
}

function showForgot(){if($('login-form'))$('login-form').style.display='none';if($('forgot-form'))$('forgot-form').style.display='block';}
function showLogin(){if($('forgot-form'))$('forgot-form').style.display='none';if($('login-form'))$('login-form').style.display='block';}

async function doLogin(){
  const email=$('l-email')?.value.trim(),pass=$('l-pass')?.value;
  const errEl=$('l-err'),btn=$('l-btn');
  if(errEl)errEl.style.display='none';
  if(!email||!pass){if(errEl){errEl.textContent='Preencha e-mail e senha.';errEl.style.display='block';}return;}
  if(btn){btn.disabled=true;btn.textContent='Entrando...';}
  try{
    const d=await authRequest('token?grant_type=password',{method:'POST',body:JSON.stringify({email,password:pass})});
    if(!d.expires_at&&d.expires_in)d.expires_at=Math.floor(Date.now()/1000)+d.expires_in;
    persistSession(d);await afterLogin(d.user);
  }catch(e){
    if(errEl){errEl.textContent=e.message==='Invalid login credentials'?'E-mail ou senha incorretos.':e.message;errEl.style.display='block';}
    if(btn){btn.disabled=false;btn.textContent='Entrar';}
  }
}

async function doForgot(){
  const email=$('f-email')?.value.trim(),errEl=$('f-err'),okEl=$('f-ok'),btn=$('f-btn');
  if(errEl)errEl.style.display='none';if(okEl)okEl.style.display='none';
  if(!email){if(errEl){errEl.textContent='Digite seu e-mail.';errEl.style.display='block';}return;}
  if(btn){btn.disabled=true;btn.textContent='Enviando...';}
  try{
    await authRequest('recover',{method:'POST',body:JSON.stringify({email,redirect_to:location.origin})});
    if(okEl){okEl.textContent='Link enviado. Verifique seu e-mail.';okEl.style.display='block';}
  }catch(e){if(errEl){errEl.textContent=e.message;errEl.style.display='block';}}
  finally{if(btn){btn.disabled=false;btn.textContent='Enviar link';}}
}

async function doLogout(){
  try{if(SESSION?.access_token)await fetch(SB_URL+'/auth/v1/logout',{method:'POST',headers:authHeaders()});}catch(e){}
  persistSession(null);PROFILE=null;ST.clientId=null;
  if($('app'))$('app').style.display='none';if($('auth-wrap'))$('auth-wrap').style.display='flex';
}

async function afterLogin(user){
  if(!user&&SESSION?.user)user=SESSION.user;
  if(!user)return doLogout();
  try{const p=await rest('user_profiles?id=eq.'+encodeURIComponent(user.id)+'&select=*');PROFILE=p?.[0]||null;}catch(e){PROFILE=null;}
  const name=PROFILE?.full_name||user.email?.split('@')[0]||'Usuário';
  if($('user-initials'))$('user-initials').textContent=name.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  if($('um-name'))$('um-name').textContent=name;if($('um-email'))$('um-email').textContent=user.email||'';
  if($('auth-wrap'))$('auth-wrap').style.display='none';if($('app'))$('app').style.display='block';
  await loadClients();
  if(ST.clientId)await renderDashboard();
  else renderNoClients();
}

async function loadClients(){
  try{
    ST.clients=await rest('clients?order=name.asc&select=id,name,slug,status,is_agency,cover_url,cover_position')||[];
    buildClientDrop();
    if(ST.clients.length&&!ST.clientId){
      const first=ST.clients.find(c=>!c.is_agency)||ST.clients[0];
      ST.clientId=first.id;ST.clientName=first.name;if($('tb-client-name'))$('tb-client-name').textContent=first.name;
    }
    applyClientCover();
  }catch(e){console.error('loadClients',e);ST.clients=[];buildClientDrop();}
}

function renderNoClients(){
  if($('tb-client-name'))$('tb-client-name').textContent='Nenhum cliente';
  const k=$('kpi-row');if(k)k.innerHTML='<div class="empty-state"><div class="empty-title">Nenhum cliente acessível</div><div class="empty-desc">Cadastre um cliente ou revise as permissões RLS no Supabase.</div></div>';
}

function isoDate(d){return d.toISOString().slice(0,10);}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function startOfToday(){const d=new Date();d.setHours(0,0,0,0);return d;}
function currentRange(){if(ST.customStart&&ST.customEnd)return{start:new Date(ST.customStart+'T00:00:00'),end:addDays(new Date(ST.customEnd+'T00:00:00'),1)};const end=addDays(startOfToday(),1),start=addDays(end,-ST.period);return {start,end};}
function compareRange(){
  const cur=currentRange();
  if(ST.compare==='prev_month'){
    const now=startOfToday();const start=new Date(now.getFullYear(),now.getMonth()-1,1);const end=new Date(now.getFullYear(),now.getMonth(),1);return {start,end};
  }
  if(ST.compare==='same_prev'){
    const start=new Date(cur.start),end=new Date(cur.end);start.setMonth(start.getMonth()-1);end.setMonth(end.getMonth()-1);return {start,end};
  }
  const days=Math.max(1,Math.round((cur.end-cur.start)/86400000));return {start:addDays(cur.start,-days),end:new Date(cur.start)};
}

async function loadPostsRange(range,platform='all'){
  if(!ST.clientId)return[];
  let q='posts?client_id=eq.'+encodeURIComponent(ST.clientId)+'&published_at=gte.'+isoDate(range.start)+'&published_at=lt.'+isoDate(range.end)+'&select=id,account_id,platform,media_type,media_url,thumbnail_url,permalink,caption,published_at&order=published_at.desc&limit=1000';
  if(platform&&platform!=='all')q+='&platform=eq.'+encodeURIComponent(platform);
  const posts=await rest(q)||[];
  if(!posts.length)return posts;
  const ids=posts.map(p=>p.id);
  const mm={};
  for(let i=0;i<ids.length;i+=40){
    const chunk=ids.slice(i,i+40).map(v=>'"'+String(v).replace(/"/g,'\\"')+'"').join(',');
    try{
      const mets=await rest('post_metrics?post_id=in.('+encodeURIComponent(chunk)+')&select=post_id,reach,impressions,engagement,like_count,comment_count,shares,saved,views,synced_at&order=synced_at.desc')||[];
      mets.forEach(m=>{if(!mm[m.post_id])mm[m.post_id]=m;});
    }catch(e){
      try{
        const mets=await rest('post_metrics?post_id=in.('+chunk+')&select=post_id,reach,impressions,engagement,like_count,comment_count,shares,saved,views,synced_at&order=synced_at.desc')||[];
        mets.forEach(m=>{if(!mm[m.post_id])mm[m.post_id]=m;});
      }catch(err){console.warn('post_metrics',err);}
    }
  }
  posts.forEach(p=>p.metrics=mm[p.id]||{});
  return posts;
}

async function loadPosts(){
  ST.platform=$('chart-plat-filter')?.value||ST.platform||'all';
  try{
    const [cur,prev]=await Promise.all([loadPostsRange(currentRange(),ST.platform),loadPostsRange(compareRange(),ST.platform)]);
    ST.posts=cur;ST.comparePosts=prev;return cur;
  }catch(e){console.error('loadPosts',e);ST.posts=[];ST.comparePosts=[];toast('Falha ao carregar dados: '+e.message,'error');return[];}
}

function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function getReach(m){return num(m?.reach);}
function getImpressions(m){return num(m?.impressions);}
function getEng(m){return num(m?.engagement);}
function getLikes(m){return num(m?.like_count);}
function getComments(m){return num(m?.comment_count);}
function getShares(m){return num(m?.shares);}
function getSaved(m){return num(m?.saved);}
function getViews(m){return num(m?.views);}
function summary(posts){
  const s={posts:posts.length,reach:0,impressions:0,engagement:0,likes:0,comments:0,shares:0,saved:0,views:0};
  posts.forEach(p=>{const m=p.metrics||{};s.reach+=getReach(m);s.impressions+=getImpressions(m);s.engagement+=getEng(m);s.likes+=getLikes(m);s.comments+=getComments(m);s.shares+=getShares(m);s.saved+=getSaved(m);s.views+=getViews(m);});
  s.er=s.reach>0?s.engagement/s.reach*100:(s.impressions>0?s.engagement/s.impressions*100:0);return s;
}
function delta(cur,prev){if(prev===0)return cur===0?0:null;return (cur-prev)/prev*100;}
function fmt(n){if(n===null||n===undefined||Number.isNaN(Number(n)))return'—';return Math.round(Number(n)).toLocaleString('pt-BR');}
function fmtK(n){if(n===null||n===undefined||Number.isNaN(Number(n)))return'—';n=Number(n);if(Math.abs(n)>=1e6)return(n/1e6).toFixed(1).replace('.',',')+'M';if(Math.abs(n)>=1e3)return(n/1e3).toFixed(1).replace('.',',')+'K';return Math.round(n).toLocaleString('pt-BR');}
function fmtPct(n,d=1){return Number(n||0).toFixed(d).replace('.',',')+'%';}
function deltaHtml(d){if(d===null)return'<span class="kpi-delta na">sem base</span>';const cls=d>0?'up':d<0?'down':'na';const arrow=d>0?'▲':d<0?'▼':'•';return `<span class="kpi-delta ${cls}">${arrow} ${Math.abs(d).toFixed(1).replace('.',',')}%</span>`;}

function dayKey(date,gran='day'){
  const d=new Date(date);if(gran==='month')return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  if(gran==='week'){const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return isoDate(x);}
  return isoDate(d);
}
function series(posts,metric,gran=ST.chartGran){
  const out={};posts.forEach(p=>{if(!p.published_at)return;const k=dayKey(p.published_at,gran);out[k]=(out[k]||0)+metric(p.metrics||{});});return out;
}
function seriesValues(posts,metric,gran=ST.chartGran){const o=series(posts,metric,gran);return Object.keys(o).sort().map(k=>o[k]);}

async function renderDashboard(){
  if(!ST.clientId)return renderNoClients();
  ST.module=null;restoreDashboardShell();updateClientHeader();await loadPosts();await loadAvailability();applyAvailability();
  renderKPIs(ST.posts,ST.comparePosts);renderPerformanceChart(ST.posts);renderDonut(ST.posts);renderPlatformMetrics(ST.posts);renderTopContent(ST.posts);renderInsights(ST.posts);updateShareCard();
  if(ST.activeTab!=='overview')renderTab(ST.activeTab);
}

async function loadAvailability(){
  const cid=encodeURIComponent(ST.clientId),available={organic:[],paid:[],content:false,audience:false,conversions:false};
  const [history,ads,audience]=await Promise.all([
    rest('posts?client_id=eq.'+cid+'&select=platform&limit=1000').catch(()=>[]),
    rest('meta_ad_metrics?client_id=eq.'+cid+'&select=ad_id&limit=1').catch(()=>[]),
    rest('account_snapshots?client_id=eq.'+cid+'&select=id&limit=1').catch(()=>[])
  ]);
  available.organic=[...new Set((history||[]).map(x=>x.platform).filter(Boolean))];
  if((ads||[]).length)available.paid.push('meta_ads');
  available.content=available.organic.length>0;available.audience=(audience||[]).length>0;
  available.conversions=available.paid.length>0;ST.available=available;
}
function applyAvailability(){
  const iconPlatforms=['instagram','facebook_organic','tiktok','youtube','google_my_business'];
  qsa('.client-accounts .plat-icon').forEach((el,i)=>{const p=iconPlatforms[i];el.style.display=ST.available.organic.includes(p)?'flex':'none';});
  const select=$('chart-plat-filter');
  if(select){const current=ST.available.organic.includes(ST.platform)?ST.platform:'all';select.innerHTML='<option value="all">Todas as plataformas</option>'+ST.available.organic.map(p=>'<option value="'+esc(p)+'">'+esc(platformName(p))+'</option>').join('');select.value=current;ST.platform=current;}
  const tabs=qsa('.dash-tab'),show=[true,ST.available.content,ST.available.paid.length>0,ST.available.audience,ST.available.conversions,false];
  tabs.forEach((tab,i)=>tab.style.display=show[i]?'flex':'none');
  if(!show[['overview','content','paid','audience','conversions','competitors'].indexOf(ST.activeTab)]){ST.activeTab='overview';tabs.forEach((t,i)=>t.classList.toggle('active',i===0));qsa('[id^="tab-"]').forEach(t=>t.style.display=t.id==='tab-overview'?'block':'none');}
  const details=qs('.client-accounts .btn-details');if(details)details.style.display=(ST.available.organic.length||ST.available.paid.length)?'':'none';
  const health=qs('.health-card');if(health)health.style.display='none';
}

function updateClientHeader(){
  const c=ST.clients.find(x=>String(x.id)===String(ST.clientId));if(!c)return;
  const av=$('client-avatar');if(av){av.textContent=c.name?.[0]||'?';av.style.background='linear-gradient(135deg,#1B2B6B,#4361ee)';av.style.color='#fff';}
  if($('client-name'))$('client-name').textContent=c.name;if($('client-meta'))$('client-meta').textContent=c.status||'Ativo';if($('share-client'))$('share-client').value=c.name;
  ST.shareLink=null;if($('sc-link-url'))$('sc-link-url').textContent='Gere um link seguro';
}

function renderKPIs(posts,prevPosts){
  const a=summary(posts),b=summary(prevPosts);
  const defs=[
    ['Posts publicados',a.posts,b.posts,'posts',m=>1],
    ['Alcance',a.reach,b.reach,'reach',getReach],
    ['Impressões',a.impressions,b.impressions,'impressions',getImpressions],
    ['Engajamento',a.engagement,b.engagement,'engagement',getEng],
    ['Salvamentos',a.saved,b.saved,'saved',getSaved],
    ['Taxa de engajamento',a.er,b.er,'er',null]
  ];
  const g=$('kpi-row');if(!g)return;
  g.innerHTML=defs.map((d,i)=>{
    const dv=delta(d[1],d[2]);const value=d[3]==='er'?fmtPct(d[1]):fmtK(d[1]);
    const accent=dv===null?'#6e7681':dv>0?'#22c55e':dv<0?'#ef4444':'#6e7681';
    return `<div class="kpi-card" style="border-top:2px solid ${accent}"><div class="kpi-head"><span class="kpi-name">${d[0]}</span></div><div class="kpi-val">${value}</div><div class="kpi-footer">${deltaHtml(dv)}<span style="font-size:9px;color:var(--text3)">vs. comparação</span><div class="kpi-sparkline"><canvas id="sp-${i}"></canvas></div></div></div>`;
  }).join('');
  defs.forEach((d,i)=>{
    const ctx=$('sp-'+i);if(!ctx)return;if(ST.charts['sp'+i])ST.charts['sp'+i].destroy();
    let vals=d[4]?seriesValues(posts,d[4],'day'):[];
    if(d[3]==='er'){
      const rr=series(posts,getReach,'day'),ee=series(posts,getEng,'day');const keys=[...new Set([...Object.keys(rr),...Object.keys(ee)])].sort();vals=keys.map(k=>rr[k]?ee[k]/rr[k]*100:0);
    }
    if(d[3]==='posts'){const by={};posts.forEach(p=>{const k=dayKey(p.published_at,'day');by[k]=(by[k]||0)+1;});vals=Object.keys(by).sort().map(k=>by[k]);}
    if(!vals.length)vals=[0];
    const dv=delta(d[1],d[2]);const col=dv>0?'#22c55e':dv<0?'#ef4444':'#4361ee';
    ST.charts['sp'+i]=new Chart(ctx,{type:'line',data:{labels:vals.map((_,j)=>j),datasets:[{data:vals,borderColor:col,backgroundColor:col+'18',tension:.35,fill:true,pointRadius:0,borderWidth:1.5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}},animation:{duration:0}}});
  });
}

function renderPerformanceChart(posts){
  const ctx=$('perf-chart');if(!ctx)return;if(ST.charts.perf)ST.charts.perf.destroy();
  const metrics=[['Alcance',getReach,'#4361ee'],['Engajamento',getEng,'#22c55e'],['Impressões',getImpressions,'#8b5cf6']];
  const maps=metrics.map(m=>series(posts,m[1],ST.chartGran));const keys=[...new Set(maps.flatMap(o=>Object.keys(o)))].sort();
  qsa('#chart-legend .legend-item').forEach((el,i)=>{const txt=el.childNodes[1];if(txt)txt.textContent=metrics[i]?.[0]||'';});
  if(!keys.length){ctx.style.display='none';let em=ctx.parentElement.querySelector('.real-empty');if(!em){em=document.createElement('div');em.className='empty-state real-empty';ctx.parentElement.appendChild(em);}em.innerHTML='<div class="empty-title">Sem dados no período</div><div class="empty-desc">Nenhuma publicação com métricas foi encontrada.</div>';return;}
  ctx.style.display='block';ctx.parentElement.querySelector('.real-empty')?.remove();
  ST.charts.perf=new Chart(ctx,{type:'line',data:{labels:keys.map(k=>k.slice(5)),datasets:metrics.map((m,i)=>({label:m[0],data:keys.map(k=>maps[i][k]||0),borderColor:m[2],backgroundColor:m[2]+'12',tension:.35,fill:i===0,pointRadius:0,pointHoverRadius:4,borderWidth:2,hidden:!ST.seriesVisible[i]}))},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(42,51,71,.35)'},ticks:{color:'#6e7681',maxTicksLimit:10}},y:{grid:{color:'rgba(42,51,71,.35)'},ticks:{color:'#6e7681',callback:v=>fmtK(v)}}}}});
}

function updatePerformanceChart(){ST.platform=$('chart-plat-filter')?.value||'all';renderDashboard();}
function toggleSeries(idx,el){ST.seriesVisible[idx]=!ST.seriesVisible[idx];el?.classList.toggle('inactive');if(ST.charts.perf){ST.charts.perf.data.datasets[idx].hidden=!ST.seriesVisible[idx];ST.charts.perf.update();}}
function setChartGran(gran,btn){ST.chartGran=gran;qsa('.ctrl-grp .ctrl-btn').forEach(b=>b.classList.remove('active'));btn?.classList.add('active');renderPerformanceChart(ST.posts);}

function platformName(k){return ({instagram:'Instagram',facebook_organic:'Facebook',facebook:'Facebook',meta_ads:'Meta Ads',google_ads:'Google Ads',tiktok:'TikTok',tiktok_ads:'TikTok Ads',youtube:'YouTube',google_my_business:'Google Business',linkedin:'LinkedIn'}[k]||k||'—');}
function platformColor(k){return ({instagram:'#e1306c',facebook_organic:'#1877f2',facebook:'#1877f2',meta_ads:'#1877f2',google_ads:'#4285f4',tiktok:'#69c9d0',tiktok_ads:'#25f4ee',youtube:'#ff0000',google_my_business:'#4285f4',linkedin:'#0a66c2'}[k]||'#4361ee');}

function renderDonut(posts){
  const by={};posts.forEach(p=>by[p.platform]=(by[p.platform]||0)+getReach(p.metrics));const entries=Object.entries(by).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);const total=entries.reduce((s,[,v])=>s+v,0);
  if($('donut-center-val'))$('donut-center-val').textContent=fmtK(total);const ctx=$('donut-chart');if(ST.charts.donut)ST.charts.donut.destroy();
  if(ctx&&total>0)ST.charts.donut=new Chart(ctx,{type:'doughnut',data:{labels:entries.map(([k])=>platformName(k)),datasets:[{data:entries.map(([,v])=>v),backgroundColor:entries.map(([k])=>platformColor(k)),borderWidth:0}]},options:{responsive:false,plugins:{legend:{display:false}},cutout:'70%'}});
  if($('plat-list'))$('plat-list').innerHTML=entries.length?entries.map(([k,v])=>`<div class="plat-list-item" onclick="openPlatform('${esc(k)}')" style="cursor:pointer"><div class="plat-list-dot" style="background:${platformColor(k)}"></div><span class="plat-list-name">${esc(platformName(k))}</span><span class="plat-list-pct">${total?Math.round(v/total*100):0}%</span><span class="plat-list-abs">${fmtK(v)}</span></div>`).join(''):'<div style="text-align:center;color:var(--text2);font-size:11px;padding:10px">Sem alcance registrado no período</div>';
}

function renderPlatformMetrics(posts){
  const by={};posts.forEach(p=>{const k=p.platform||'desconhecido';if(!by[k])by[k]={posts:0,reach:0,impressions:0,eng:0,views:0,saved:0,shares:0};const d=by[k];d.posts++;d.reach+=getReach(p.metrics);d.impressions+=getImpressions(p.metrics);d.eng+=getEng(p.metrics);d.views+=getViews(p.metrics);d.saved+=getSaved(p.metrics);d.shares+=getShares(p.metrics);});
  const entries=Object.entries(by).sort((a,b)=>b[1].reach-a[1].reach);const section=$('plat-metrics-section'),row=$('plat-metrics-row');if(!row)return;
  if(!entries.length){if(section)section.style.display='none';row.innerHTML='';return;}if(section)section.style.display='';row.style.gridTemplateColumns='repeat('+Math.min(entries.length,5)+',1fr)';
  row.innerHTML=entries.map(([k,d])=>{const er=d.reach?d.eng/d.reach*100:0;return `<div class="plat-metric-card" onclick="openPlatform('${esc(k)}')" style="cursor:pointer"><div class="pmcard-hdr"><div class="pmcard-icon" style="background:${platformColor(k)}"></div><span class="pmcard-name">${esc(platformName(k))}</span><span style="font-size:10px;color:var(--text3);margin-left:auto">${d.posts} posts</span></div><div class="pmcard-metrics"><div class="pmcard-row"><span class="pmcard-lbl">Alcance</span><div class="pmcard-val">${fmtK(d.reach)}</div></div><div class="pmcard-row"><span class="pmcard-lbl">Impressões</span><div class="pmcard-val">${fmtK(d.impressions)}</div></div><div class="pmcard-row"><span class="pmcard-lbl">Engajamento</span><div class="pmcard-val">${fmtPct(er)}</div></div></div><button class="pmcard-btn" style="background:${platformColor(k)}20;color:${platformColor(k)};border:1px solid ${platformColor(k)}30">Ver dados</button></div>`;}).join('');
}
function openPlatform(platform){const sel=$('chart-plat-filter');if(sel){if(![...sel.options].some(o=>o.value===platform)){const o=document.createElement('option');o.value=platform;o.textContent=platformName(platform);sel.appendChild(o);}sel.value=platform;}ST.platform=platform;ST.activeTab='overview';setTab('overview',qsa('.dash-tab')[0]);renderDashboard();}

function renderTopContent(posts){
  const el=$('top-content');if(!el)return;const sorted=[...posts].sort((a,b)=>getEng(b.metrics)-getEng(a.metrics)).slice(0,5);
  if(!sorted.length){el.innerHTML='<div class="empty-state" style="height:120px"><div class="empty-desc">Nenhum conteúdo no período</div></div>';return;}
  el.innerHTML=sorted.map((p,i)=>{const img=p.thumbnail_url||p.media_url,link=safeUrl(p.permalink),er=getReach(p.metrics)?getEng(p.metrics)/getReach(p.metrics)*100:0;return `<div class="tc-card" onclick="${link!=='#'?`window.open('${esc(link)}','_blank')`:''}" style="cursor:${link!=='#'?'pointer':'default'}"><div class="tc-thumb">${img?`<img src="${esc(safeUrl(img))}" alt="" loading="lazy" onerror="this.style.display='none'">`:'<span style="font-size:24px">▧</span>'}<span class="tc-rank">#${i+1}</span><span class="tc-format">${esc(p.media_type||'Post')}</span></div><div class="tc-body"><div class="tc-title">${esc((p.caption||'Sem legenda').slice(0,45))}</div><div class="tc-metric">${fmtK(getReach(p.metrics))} alcance</div><div class="tc-sub">${fmtK(getEng(p.metrics))} interações · ER ${fmtPct(er)}</div></div></div>`;}).join('');
}

function renderInsights(posts){
  const el=$('insight-list');if(!el)return;const s=summary(posts),prev=summary(ST.comparePosts),ins=[];const dr=delta(s.reach,prev.reach),de=delta(s.engagement,prev.engagement);
  if(dr!==null)ins.push({t:dr>=0?'op':'att',tag:dr>=0?'CRESCIMENTO':'ATENÇÃO',title:'Alcance vs. período comparado',desc:`O alcance dos conteúdos ${dr>=0?'cresceu':'caiu'} ${Math.abs(dr).toFixed(1).replace('.',',')}%.`,time:'dados reais'});
  if(de!==null)ins.push({t:de>=0?'op':'att',tag:de>=0?'CRESCIMENTO':'ATENÇÃO',title:'Engajamento vs. período comparado',desc:`As interações ${de>=0?'cresceram':'caíram'} ${Math.abs(de).toFixed(1).replace('.',',')}%.`,time:'dados reais'});
  const groups={};posts.forEach(p=>{const k=p.media_type||'OUTRO';if(!groups[k])groups[k]={n:0,e:0};groups[k].n++;groups[k].e+=getEng(p.metrics);});const best=Object.entries(groups).map(([k,v])=>[k,v.n?v.e/v.n:0,v.n]).sort((a,b)=>b[1]-a[1])[0];
  if(best)ins.push({t:'info',tag:'FORMATO',title:'Formato com maior média de engajamento',desc:`${best[0]}: ${fmt(best[1])} interações médias em ${best[2]} publicação(ões).`,time:'dados reais'});
  if(!ins.length)ins.push({t:'info',tag:'INFORMAÇÃO',title:'Sem base comparável',desc:'Ainda não há dados suficientes para calcular tendência com segurança.',time:'dados reais'});
  el.innerHTML=ins.slice(0,3).map(i=>`<div class="insight-item ${i.t}"><div class="insight-tag ${i.t}">${i.tag}</div><div class="insight-title">${i.title}</div><div class="insight-desc">${i.desc}</div><div class="insight-time">${i.time}</div></div>`).join('');
}

function setTab(tab,el){ST.activeTab=tab;qsa('.dash-tab').forEach(t=>t.classList.remove('active'));el?.classList.add('active');qsa('[id^="tab-"]').forEach(t=>t.style.display='none');const te=$('tab-'+tab);if(te)te.style.display='block';renderTab(tab);}
function renderTab(tab){
  if(tab==='overview')return;
  if(tab==='content')return renderContentTab();
  if(tab==='paid')return renderDataSourceTab('paid');
  if(tab==='audience')return renderDataSourceTab('audience');
  if(tab==='conversions')return renderDataSourceTab('conversions');
  if(tab==='competitors')return renderDataSourceTab('competitors');
}
function renderContentTab(){
  const el=$('tab-content');if(!el)return;const posts=[...ST.posts].sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));
  el.innerHTML=`<div class="section-card"><div class="section-hdr"><span class="section-title">Conteúdos publicados (${posts.length})</span><button class="btn-sm-ghost" onclick="exportCSV()">Exportar CSV</button></div>${posts.length?`<div style="overflow:auto"><table class="real-table"><thead><tr><th>Data</th><th>Plataforma</th><th>Formato</th><th>Conteúdo</th><th>Alcance</th><th>Impressões</th><th>Engajamento</th><th>ER</th></tr></thead><tbody>${posts.map(p=>{const r=getReach(p.metrics),e=getEng(p.metrics);return `<tr onclick="${p.permalink?`window.open('${esc(safeUrl(p.permalink))}','_blank')`:''}" style="cursor:${p.permalink?'pointer':'default'}"><td>${esc(new Date(p.published_at).toLocaleDateString('pt-BR'))}</td><td>${esc(platformName(p.platform))}</td><td>${esc(p.media_type||'—')}</td><td>${esc((p.caption||'Sem legenda').slice(0,80))}</td><td>${fmt(r)}</td><td>${fmt(getImpressions(p.metrics))}</td><td>${fmt(e)}</td><td>${fmtPct(r?e/r*100:0)}</td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty-state"><div class="empty-title">Sem conteúdos</div><div class="empty-desc">Não há registros para o período e plataforma selecionados.</div></div>'}</div>`;
}

async function tryTable(names,query='limit=100'){
  for(const n of names){try{const data=await rest(n+'?'+query);return {name:n,data:data||[]};}catch(e){if(!['42P01','PGRST205'].includes(e.code)&&e.status!==404)console.warn(n,e.message);}}
  return null;
}
async function renderDataSourceTab(kind){
  const map={paid:{id:'tab-paid',names:['campaign_metrics','ad_campaigns','paid_media_metrics'],title:'Mídia Paga'},audience:{id:'tab-audience',names:['account_metrics','audience_metrics'],title:'Audiência'},conversions:{id:'tab-conversions',names:['conversion_metrics','conversions'],title:'Conversões'},competitors:{id:'tab-competitors',names:['competitor_metrics','competitors'],title:'Concorrentes'}};
  const cfg=map[kind],el=$(cfg.id);if(!el)return;el.innerHTML='<div class="empty-state"><div class="empty-title">Carregando dados reais...</div></div>';
  const query='client_id=eq.'+encodeURIComponent(ST.clientId)+'&limit=100';const found=await tryTable(cfg.names,query);
  if(!found||!found.data.length){el.innerHTML=`<div class="section-card"><div class="section-hdr"><span class="section-title">${cfg.title}</span></div><div class="empty-state"><div class="empty-title">Fonte de dados não configurada</div><div class="empty-desc">Nenhum registro real foi localizado nas tabelas esperadas. O dashboard não exibirá dados fictícios.</div></div></div>`;return;}
  el.innerHTML=`<div class="section-card"><div class="section-hdr"><span class="section-title">${cfg.title} · ${esc(found.name)}</span></div>${objectTable(found.data)}</div>`;
}
function objectTable(rows){if(!rows?.length)return'<div class="empty-state">Sem registros</div>';const cols=Object.keys(rows[0]).slice(0,10);return `<div style="overflow:auto"><table class="real-table"><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,100).map(r=>`<tr>${cols.map(c=>`<td>${esc(formatCell(r[c]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function formatCell(v){if(v===null||v===undefined)return'—';if(typeof v==='object')return JSON.stringify(v);return String(v);}

function setPeriod(days,label){ST.period=days;ST.customStart=null;ST.customEnd=null;if($('tb-period-label'))$('tb-period-label').textContent=label;closeAllDrops();renderDashboard();}
function applyCustomRange(){const start=$('date-start')?.value,end=$('date-end')?.value;if(!start||!end)return toast('Informe as duas datas.','error');if(start>end)return toast('A data inicial deve ser anterior à final.','error');const days=Math.round((new Date(end)-new Date(start))/86400000)+1;if(days>365)return toast('O período máximo é de 365 dias.','error');ST.customStart=start;ST.customEnd=end;if($('tb-period-label'))$('tb-period-label').textContent=new Date(start+'T12:00:00').toLocaleDateString('pt-BR')+' – '+new Date(end+'T12:00:00').toLocaleDateString('pt-BR');closeAllDrops();renderDashboard();}
function setCompare(val,name,e){ST.compare=val;if($('tb-compare-name'))$('tb-compare-name').textContent=name;qsa('#compare-drop .tb-drop-item').forEach(x=>x.classList.remove('active'));(e?.target||window.event?.target)?.classList.add('active');closeAllDrops();renderDashboard();}
function buildClientDrop(){const drop=$('client-drop');if(!drop)return;drop.innerHTML=ST.clients.length?ST.clients.map(c=>`<div class="tb-drop-item${String(c.id)===String(ST.clientId)?' active':''}" onclick="selectClient('${esc(c.id)}','${esc(c.name)}',event)"><div class="item-av">${esc(c.name?.[0]||'?')}</div>${esc(c.name)}${c.is_agency?' (agência)':''}</div>`).join(''):'<div class="tb-drop-item">Nenhum cliente</div>';}
function selectClient(id,name,e){e?.stopPropagation();ST.clientId=id;ST.clientName=name;if($('tb-client-name'))$('tb-client-name').textContent=name;closeAllDrops();buildClientDrop();applyClientCover();if(ST.module==='accounts'){ST.accountsFilter=String(id);showAccounts();}else renderDashboard();}
function toggleDrop(id,e){e?.stopPropagation();const el=$(id);if(!el)return;const was=el.classList.contains('open');closeAllDrops();if(!was)el.classList.add('open');}
function closeAllDrops(){qsa('.tb-drop,.user-menu').forEach(d=>d.classList.remove('open'));}
function toggleUserMenu(e){$('user-menu')?.classList.toggle('open');(e||window.event)?.stopPropagation();}

function restoreDashboardShell(){
  $('module-page')?.remove();['client-header'].forEach(id=>{if($(id))$(id).style.display='';});const tabs=qs('.dash-tabs');if(tabs)tabs.style.display='flex';qsa('[id^="tab-"]').forEach(t=>t.style.display=t.id==='tab-'+ST.activeTab?'block':'none');
}
function hideDashboardShell(){if($('client-header'))$('client-header').style.display='none';const tabs=qs('.dash-tabs');if(tabs)tabs.style.display='none';qsa('[id^="tab-"]').forEach(t=>t.style.display='none');}
function showModulePage(title,body,showBack=true){hideDashboardShell();$('module-page')?.remove();const el=document.createElement('div');el.id='module-page';el.className='dash-content';el.innerHTML=`<div class="module-page-header">${showBack?'<button class="btn-sm-ghost module-back" onclick="nav(\'dashboard\')">← Dashboard</button>':''}<h2>${esc(title)}</h2></div>${body}`;$('main-area')?.appendChild(el);}

async function nav(page){
  ST.module=page;closeAllDrops();
  if(page==='dashboard'){ST.module=null;ST.activeTab='overview';restoreDashboardShell();qsa('.dash-tab').forEach((t,i)=>t.classList.toggle('active',i===0));await renderDashboard();return;}
  if(page==='content'){restoreDashboardShell();const tab=qsa('.dash-tab')[1];setTab('content',tab);return;}
  if(page==='reports')return showReports();if(page==='clients')return showClients();if(page==='new-client')return showNewClient();if(page==='accounts'){ST.accountsFilter='all';return showAccounts();}if(page==='settings')return showSettings();
  return showGenericModule(page);
}

function showReports(){const s=summary(ST.posts),b=summary(ST.comparePosts);showModulePage('Relatórios',`<div class="section-card"><div class="section-hdr"><span class="section-title">Resumo do período</span><button class="btn-sm-prim" onclick="exportCSV()">Exportar dados</button></div><div class="real-grid"><div><small>Posts</small><strong>${fmt(s.posts)}</strong></div><div><small>Alcance</small><strong>${fmt(s.reach)}</strong></div><div><small>Impressões</small><strong>${fmt(s.impressions)}</strong></div><div><small>Engajamento</small><strong>${fmt(s.engagement)}</strong></div><div><small>ER</small><strong>${fmtPct(s.er)}</strong></div><div><small>Δ alcance</small><strong>${deltaHtml(delta(s.reach,b.reach))}</strong></div></div></div><div class="section-card"><div class="section-hdr"><span class="section-title">Conteúdo detalhado</span></div>${objectTable(ST.posts.map(p=>({published_at:p.published_at,platform:p.platform,media_type:p.media_type,reach:getReach(p.metrics),impressions:getImpressions(p.metrics),engagement:getEng(p.metrics),likes:getLikes(p.metrics),comments:getComments(p.metrics),shares:getShares(p.metrics),saved:getSaved(p.metrics),views:getViews(p.metrics)})))}</div>`);}
function showClients(){showModulePage('Todos os clientes',`<div class="section-card"><div class="section-hdr"><span class="section-title">${ST.clients.length} cliente(s) acessível(is)</span><button class="btn-sm-prim" onclick="nav('new-client')">Novo cliente</button></div>${ST.clients.length?`<div class="client-list-real">${ST.clients.map(c=>`<button class="client-real-row" onclick="selectClient('${esc(c.id)}','${esc(c.name)}');nav('dashboard')"><span class="item-av">${esc(c.name?.[0]||'?')}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.status||'—')}</small></span><span>${c.is_agency?'Agência':'Cliente'}</span></button>`).join('')}</div>`:'<div class="empty-state">Nenhum cliente retornado pelo Supabase.</div>'}</div>`);}
function showNewClient(){showModulePage('Novo cliente',`<div class="section-card" style="max-width:620px"><div class="f-grp"><label class="f-lbl">Nome</label><input class="f-inp" id="new-client-name" placeholder="Nome do cliente"></div><div class="f-grp"><label class="f-lbl">Slug</label><input class="f-inp" id="new-client-slug" placeholder="nome-do-cliente"></div><button class="btn-prim" onclick="createClient()">Cadastrar cliente</button><div id="new-client-msg" style="margin-top:10px;font-size:12px"></div></div>`);}
async function createClient(){const name=$('new-client-name')?.value.trim(),slug=($('new-client-slug')?.value.trim()||name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));if(!name)return toast('Informe o nome do cliente.','error');try{await rest('clients',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({name,slug,status:'active',is_agency:false})});await loadClients();toast('Cliente cadastrado.');showClients();}catch(e){if($('new-client-msg'))$('new-client-msg').textContent='Não foi possível cadastrar: '+e.message;}}
function setAccountsFilter(value){ST.accountsFilter=value;showAccounts();}
async function showAccounts(syncResult=null){
  showModulePage('Contas conectadas','<div class="section-card"><div class="empty-state"><div class="empty-title">Carregando...</div></div></div>',false);
  const [found,metaAssets]=await Promise.all([tryTable(['accounts'],'select=*&limit=500'),rest('meta_assets?select=*&order=asset_type,name').catch(()=>[])]),accounts=found?.data||[],all=ST.accountsFilter==='all';
  const result=syncResult?`<div class="sync-result success" role="status"><strong>✓ Sincronização concluída com sucesso</strong><span>${fmt(syncResult.posts||0)} publicações processadas · ${fmt(syncResult.metrics||0)} métricas atualizadas · ${fmt(syncResult.images||0)} imagens armazenadas</span><small>Dados recebidos do Windsor e gravados no Supabase.</small></div>`:'';
  const options=['<option value="all">Todos os clientes</option>',...ST.clients.map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(ST.accountsFilter)?'selected':''}>${esc(c.name)}</option>`)].join('');
  let rows;
  if(all){rows=ST.clients.map(c=>{const linked=accounts.filter(a=>String(a.client_id)===String(c.id)),platforms=[...new Set(linked.map(a=>platformName(a.platform)))];return{cliente:c.name,situacao:linked.length?'Sincronizado':'Não sincronizado',contas_vinculadas:linked.length,plataformas:platforms.join(', ')||'—',ultima_atualizacao:linked.length?linked.map(a=>a.updated_at).filter(Boolean).sort().at(-1)||'—':'—'};});}
  else rows=accounts.filter(a=>String(a.client_id)===String(ST.accountsFilter));
  const connected=ST.clients.filter(c=>accounts.some(a=>String(a.client_id)===String(c.id))).length,pending=ST.clients.length-connected;
  const summary=all?`<div class="accounts-summary"><div><strong>${ST.clients.length}</strong><span>Clientes</span></div><div class="ok"><strong>${connected}</strong><span>Sincronizados</span></div><div class="pending"><strong>${pending}</strong><span>Pendentes</span></div></div>`:'';
  const empty='<div class="empty-state"><div class="empty-title">Nenhuma conta vinculada a este cliente</div><div class="empty-desc">O Windsor ainda não retornou uma conta correspondente para este cliente.</div></div>';
  const metaRows=(metaAssets||[]).map(a=>`<div class="meta-asset-row"><span class="meta-badge">${esc(a.asset_type==='ad_account'?'Meta Ads':a.asset_type==='instagram'?'Instagram':'Facebook')}</span><span><strong>${esc(a.name)}</strong><small>${esc(a.username?'@'+a.username:(a.ad_account_id||a.page_id||a.id))}</small></span><select onchange="assignMetaAsset('${esc(a.id)}',this.value)"><option value="">Não vinculado</option>${ST.clients.map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(a.client_id)?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>`).join('');
  const meta=`<div class="section-card"><div class="section-hdr"><div><span class="section-title">Integração direta com a Meta</span><small class="section-subtitle">Facebook, Instagram e Meta Ads</small></div>${isSuperAdmin()?'<button class="btn-sm-prim sync-action" id="connect-meta-btn" onclick="connectMeta()">Conectar conta Meta</button>':''}</div><div id="meta-progress" class="sync-progress" aria-live="polite"></div>${metaRows?`<div class="meta-assets">${metaRows}</div>`:'<div class="empty-state"><div class="empty-title">Nenhuma conta Meta autorizada</div><div class="empty-desc">Conecte a conta empresarial para descobrir páginas, Instagrams e contas de anúncios.</div></div>'}</div>`;
  showModulePage('Contas conectadas',`${result}${meta}<div class="section-card"><div class="section-hdr accounts-header"><div><span class="section-title">Visão das contas sincronizadas</span><select class="accounts-filter" onchange="setAccountsFilter(this.value)">${options}</select></div>${isSuperAdmin()?'<button class="btn-sm-ghost sync-action" id="sync-windsor-btn" onclick="syncWindsor()">Windsor (legado)</button>':''}</div><div id="sync-progress" class="sync-progress" aria-live="polite"></div>${summary}${rows.length?objectTable(rows):empty}</div>`,false);
}
async function connectMeta(){
  if(!isSuperAdmin())return toast('Apenas o superadministrador pode conectar a Meta.','error');
  const btn=$('connect-meta-btn'),progress=$('meta-progress');if(btn){btn.disabled=true;btn.textContent='Abrindo Meta…';}
  if(progress){progress.className='sync-progress running';progress.innerHTML='<strong>Preparando autorização segura</strong><span>Você será direcionado para a Meta.</span>';}
  try{const r=await fetch(SB_URL+'/functions/v1/meta-auth',{method:'POST',headers:authHeaders()});const d=await r.json();if(!r.ok||!d.url)throw new Error(d.error||'Não foi possível iniciar a conexão');location.href=d.url;}catch(e){if(btn){btn.disabled=false;btn.textContent='Conectar conta Meta';}if(progress){progress.className='sync-result error';progress.innerHTML=`<strong>Falha ao conectar</strong><span>${esc(e.message)}</span>`;}}
}
async function assignMetaAsset(id,clientId){
  try{await rest('meta_assets?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({client_id:clientId||null,status:clientId?'connected':'discovered',updated_at:new Date().toISOString()})});toast(clientId?'Conta vinculada ao cliente.':'Vínculo removido.');}
  catch(e){toast('Não foi possível salvar o vínculo: '+e.message,'error');showAccounts();}
}
async function syncWindsor(){
  if(!isSuperAdmin())return toast('Apenas o superadministrador pode sincronizar.','error');
  const btn=$('sync-windsor-btn'),progress=$('sync-progress');if(btn){btn.disabled=true;btn.textContent='Sincronizando…';}if(progress){progress.className='sync-progress running';progress.innerHTML='<strong>Sincronização em andamento</strong><span>Buscando publicações e métricas no Windsor e salvando no Supabase. Aguarde; isso pode levar cerca de um minuto.</span>';}
  try{
    const r=await fetch(SB_URL+'/functions/v1/windsor-sync',{method:'POST',headers:authHeaders(),body:JSON.stringify({days:30})});
    const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{};}catch{d={};}if(!r.ok)throw new Error(d.error||d.message||`Falha na sincronização (HTTP ${r.status})`);
    toast(`Sincronização concluída: ${d.posts||0} publicações, ${d.images||0} imagens.`);await showAccounts(d);
  }catch(e){if(progress){progress.className='sync-result error';progress.innerHTML=`<strong>✕ Não foi possível sincronizar</strong><span>${esc(e.message)}</span><small>Nenhuma confirmação de importação foi recebida. Tente novamente.</small>`;}toast(e.message,'error');}finally{const current=$('sync-windsor-btn');if(current){current.disabled=false;current.textContent='Sincronizar Windsor agora';}}
}
function showSettings(){
  const c=selectedClient(),admin=isSuperAdmin();
  const branding=admin?`<div class="section-card"><div class="section-hdr"><span class="section-title">Identidade visual e capas</span></div><div class="brand-settings">
    <div class="brand-panel"><h3>Capa anual do login</h3><p>Imagem institucional global. Atualize quando a ZF lançar a identidade do novo ano.</p><div class="cover-preview" style="background-image:url('${esc(safeUrl(ST.branding.login_cover_url))}')"></div><div class="cover-actions"><label class="cover-label" for="global-cover-file">Trocar capa anual</label><input class="cover-file" id="global-cover-file" type="file" accept="image/png,image/jpeg,image/webp" onchange="saveGlobalCover(this)"></div><div class="cover-note">JPG, PNG ou WebP · máximo 5 MB · recomendado 1920 × 1080 px</div></div>
    <div class="brand-panel"><h3>Capa do cliente: ${esc(c?.name||'—')}</h3><p>Personaliza o dashboard selecionado. Sem imagem própria, utiliza automaticamente a capa global.</p><div class="cover-preview" style="background-image:url('${esc(safeUrl(c?.cover_url||ST.branding.login_cover_url))}')"></div><div class="cover-actions"><label class="cover-label" for="client-cover-file">Trocar capa do cliente</label><input class="cover-file" id="client-cover-file" type="file" accept="image/png,image/jpeg,image/webp" onchange="saveClientCover(this)"><button class="btn-sm-ghost" onclick="resetClientCover()">Usar capa global</button></div><div class="cover-note">A personalização acompanha o cliente em qualquer acesso ou link compartilhado.</div></div>
  </div></div>`:'';
  showModulePage('Configurações',`<div class="section-card"><div class="section-hdr"><span class="section-title">Usuário</span></div>${objectTable([{nome:PROFILE?.full_name||SESSION?.user?.email?.split('@')[0]||'—',email:SESSION?.user?.email||'—',perfil:PROFILE?.role||'—'}])}</div>${branding}`);
}
function showGenericModule(page){const labels={knowledge:'Base de conhecimento',diagnostic:'Diagnóstico',market:'Mercado',competitors:'Concorrentes',trends:'Trends',benchmark:'Benchmark',swot:'SWOT',icp:'ICP',personas:'Personas',journey:'Jornada de compra',pains:'Dores, desejos e objeções',objectives:'Objetivos',cbva:'Matriz CBVA',offers:'Matriz de Ofertas',positioning:'Posicionamento',value:'Proposta de Valor',funnel:'Funil',channels:'Canais',strategy:'Plano Estratégico'};showModulePage(labels[page]||page,`<div class="section-card"><div class="empty-state"><div class="empty-title">Módulo acessível, sem fonte de dados conectada</div><div class="empty-desc">Esta área está disponível para implementação, mas não exibirá conteúdo inventado. Conecte a fonte/tabela correspondente no Supabase para habilitar dados reais.</div></div></div>`);}

function exportCSV(){
  const rows=ST.posts.map(p=>({data:p.published_at,plataforma:p.platform,formato:p.media_type,legenda:p.caption||'',alcance:getReach(p.metrics),impressoes:getImpressions(p.metrics),engajamento:getEng(p.metrics),curtidas:getLikes(p.metrics),comentarios:getComments(p.metrics),compartilhamentos:getShares(p.metrics),salvamentos:getSaved(p.metrics),visualizacoes:getViews(p.metrics),link:p.permalink||''}));
  if(!rows.length)return toast('Sem dados para exportar.','error');const cols=Object.keys(rows[0]);const csv=[cols.join(';'),...rows.map(r=>cols.map(c=>'"'+String(r[c]??'').replace(/"/g,'""')+'"').join(';'))].join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`engaje-${ST.clientName||'cliente'}-${isoDate(new Date())}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function openShareModal(){if($('share-modal'))$('share-modal').classList.add('open');if($('modal-link-result'))$('modal-link-result').classList.remove('show');const c=ST.clients.find(x=>String(x.id)===String(ST.clientId));if(c&&$('share-client'))$('share-client').value=c.name;}
function closeModal(id){$(id)?.classList.remove('open');}
function closeModalOutside(e,id){if(e.target?.id===id)closeModal(id);}
function togglePerm(el){el?.classList.toggle('on');}
function currentPermissions(){const p={};qsa('.perm-toggle').forEach(x=>p[x.dataset.perm]=x.classList.contains('on'));return p;}
async function generateShareLink(){
  if(!ST.clientId)return toast('Selecione um cliente.','error');
  const btn=qs('.btn-gen');if(btn){btn.disabled=true;btn.textContent='Gerando...';}
  try{
    const out=await rest('rpc/create_share_link',{method:'POST',body:JSON.stringify({p_client_id:ST.clientId,p_permissions:currentPermissions()})});
    const token=typeof out==='string'?out:(Array.isArray(out)?out[0]?.token:out?.token);if(!token)throw new Error('A função não retornou token.');
    const c=ST.clients.find(x=>String(x.id)===String(ST.clientId));const slug=c?.slug||'cliente';ST.shareLink=location.origin+'/cliente/'+encodeURIComponent(slug)+'/'+encodeURIComponent(token);if($('sc-link-url'))$('sc-link-url').textContent=ST.shareLink;if($('modal-link-url'))$('modal-link-url').textContent=ST.shareLink;if($('modal-link-result'))$('modal-link-result').classList.add('show');
  }catch(e){toast('Compartilhamento seguro não configurado no Supabase: '+e.message,'error');if($('modal-link-result')){$('modal-link-result').classList.add('show');$('modal-link-result').innerHTML='<div style="font-size:11px;color:#ef4444">Não foi gerado link fictício. Configure a função <b>create_share_link</b> no Supabase.</div>';}}
  finally{if(btn){btn.disabled=false;btn.textContent='Gerar link de acesso';}}
}
function updateShareCard(){if($('sc-link-url'))$('sc-link-url').textContent=ST.shareLink||'Gere um link seguro';}
function copyShareLink(){if(ST.shareLink)navigator.clipboard?.writeText(ST.shareLink).then(()=>toast('Link copiado.'));else toast('Gere um link primeiro.','error');}
function copyModalLink(){const l=$('modal-link-url')?.textContent;if(l)navigator.clipboard?.writeText(l).then(()=>toast('Link copiado.'));}
function openShareLink(){if(ST.shareLink)window.open(ST.shareLink,'_blank','noopener');else toast('Gere um link seguro primeiro.','error');}

function toast(msg,type='ok'){const t=document.createElement('div');t.style.cssText=`position:fixed;bottom:20px;right:20px;background:${type==='error'?'#b91c1c':'#15803d'};color:#fff;padding:10px 14px;border-radius:7px;font-size:12px;font-weight:600;z-index:99999;max-width:420px;box-shadow:0 8px 30px rgba(0,0,0,.25)`;t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),4000);}

function wireSidebar(){
  const map={'Base de conhecimento':'knowledge','Diagnóstico':'diagnostic','Mercado':'market','Concorrentes':'competitors','Trends':'trends','Benchmark':'benchmark','SWOT':'swot','ICP':'icp','Personas':'personas','Jornada de compra':'journey','Dores, desejos e objeções':'pains','Objetivos':'objectives','Matriz CBVA':'cbva','Matriz de Ofertas':'offers','Posicionamento':'positioning','Proposta de Valor':'value','Funil':'funnel','Canais':'channels','Plano Estratégico':'strategy'};
  qsa('.sb-item').forEach(el=>{const label=el.textContent.trim().replace(/\s+/g,' ');if(!el.getAttribute('onclick')&&map[label])el.addEventListener('click',()=>nav(map[label]));el.addEventListener('click',()=>{qsa('.sb-item').forEach(x=>x.classList.remove('active'));el.classList.add('active');});});
  const exp=qs('.btn-export');if(exp)exp.addEventListener('click',exportCSV);
}
function injectStyles(){const s=document.createElement('style');s.textContent=`
.real-table{width:100%;border-collapse:collapse;font-size:11px}.real-table th,.real-table td{padding:9px 10px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top;white-space:nowrap}.real-table th{color:var(--text2);font-weight:600;position:sticky;top:0;background:var(--surface)}.real-table td{color:var(--text)}.real-table tr:hover td{background:rgba(67,97,238,.05)}
.real-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}.real-grid>div{padding:14px;border:1px solid var(--border);border-radius:8px;background:var(--surface2)}.real-grid small{display:block;color:var(--text2);margin-bottom:6px}.real-grid strong{font-size:18px}.client-list-real{display:flex;flex-direction:column;gap:6px}.client-real-row{display:grid;grid-template-columns:32px 1fr auto;gap:10px;align-items:center;width:100%;border:1px solid var(--border);background:var(--surface2);color:var(--text);padding:10px;border-radius:8px;text-align:left;cursor:pointer}.client-real-row:hover{border-color:var(--blue)}.client-real-row span:nth-child(2){display:flex;flex-direction:column;gap:2px}.client-real-row small{color:var(--text2)}
`;document.head.appendChild(s);}

async function boot(){
  injectStyles();wireSidebar();document.addEventListener('click',closeAllDrops);await loadBranding();
  try{const s=await restoreSession();if(s?.user)await afterLogin(s.user);else{if($('app'))$('app').style.display='none';if($('auth-wrap'))$('auth-wrap').style.display='flex';}}catch(e){console.error('boot',e);doLogout();}
}

document.addEventListener('keydown',e=>{if(e.key==='Escape')qsa('.modal-overlay').forEach(m=>m.classList.remove('open'));if(e.key==='Enter'&&$('auth-wrap')?.style.display!=='none')$('forgot-form')?.style.display!=='none'?doForgot():doLogin();});
document.addEventListener('DOMContentLoaded',boot);
setInterval(async()=>{if(SESSION&&ST.clientId&&!document.hidden)await renderDashboard();},5*60*1000);
