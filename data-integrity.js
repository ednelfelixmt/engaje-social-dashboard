/* Engaje Mídia Hub — integridade de métricas */
(function(){
  function wait(fn,tries=50){if(fn())return;if(tries>0)setTimeout(()=>wait(fn,tries-1),100)}
  function patchMetrics(){
    if(typeof renderKPIs==='function'&&!renderKPIs.__integrity){
      const old=renderKPIs;
      renderKPIs=function(...a){old(...a);document.querySelectorAll('#kpi-row .kpi-name').forEach(el=>{if(el.textContent==='Alcance')el.textContent='Alcance dos conteúdos';if(el.textContent==='Impressões')el.textContent='Impressões dos conteúdos';});};
      renderKPIs.__integrity=true;
    }
    if(typeof renderPaidTab==='function'&&!renderPaidTab.__integrity){
      const old=renderPaidTab;
      renderPaidTab=async function(...a){await old(...a);document.querySelectorAll('.paid-kpi').forEach(card=>{const label=card.querySelector('.paid-kpi-label')?.textContent?.trim();if(label==='Alcance')card.remove();});const funnel=[...document.querySelectorAll('.paid-side h4')].find(x=>x.textContent==='Funil de entrega');if(funnel&&!funnel.parentElement.querySelector('.integrity-note')){const note=document.createElement('div');note.className='integrity-note';note.style.cssText='font-size:9px;color:#718096;margin:-6px 0 12px';note.textContent='O alcance único não é somado entre anúncios; o consolidado usa impressões, cliques e resultados.';funnel.insertAdjacentElement('afterend',note);}};
      renderPaidTab.__integrity=true;
    }
  }
  wait(()=>{patchMetrics();return typeof renderKPIs==='function'});
})();
