'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight, Building2, CalendarDays, ChartNoAxesCombined, CircleDollarSign, Eye, MessageSquareText, Plug, Search, SlidersHorizontal} from 'lucide-react';
import {money, number} from '@/lib/utils';
import {agencyPortfolioChart, selectAgencyClients, type AgencyClientCard, type AgencyClientFilter, type AgencyChartMetric} from '@/lib/reports/agency-portfolio';
import type {summarizeAgencyAds} from '@/lib/metrics/agency-overview';

export type AgencyOverviewProps = {
  clients: AgencyClientCard[];
  summary: ReturnType<typeof summarizeAgencyAds>;
  currency: string | null;
  from: string; to: string;
};
const dateLabel = (day:string) => day.split('-').reverse().join('/');
function syncLabel(value:string|null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Sem sincronização informada';
  return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Cuiaba'}).format(new Date(value));
}
function biHref(client:AgencyClientCard, from:string, to:string) {
  return '/' + client.slug + '/reports/analytics?' + new URLSearchParams({from,to,currency:client.currency,compare:'previous_period'}).toString();
}

export function AgencyOverview({clients,summary,currency,from,to}:AgencyOverviewProps) {
  const [query,setQuery] = useState('');
  const [filter,setFilter] = useState<AgencyClientFilter>('all');
  const [metric,setMetric] = useState<AgencyChartMetric>('spend');
  const [page,setPage] = useState(0);
  const visible = useMemo(() => selectAgencyClients(clients,query,filter),[clients,query,filter]);
  const chart = useMemo(() => agencyPortfolioChart(visible,metric),[visible,metric]);
  const measured = clients.filter(client => client.hasData).length;
  const connected = clients.filter(client => client.connected).length;
  const pages = Math.max(1,Math.ceil(visible.length/6));
  const currentPage = Math.min(page,pages-1);
  const shown = visible.slice(currentPage*6,(currentPage+1)*6);
  return <div className="agency-overview">
    <header className="agency-heading">
      <div><p className="agency-kicker">Engaje / central de inteligência</p><h1>Visão da agência</h1><p>Operação e desempenho da sua carteira de clientes.</p></div>
      <div className="agency-heading-actions"><Link href="/admin/integrations"><Plug size={16} aria-hidden/>Integrações</Link><Link className="agency-primary-action" href="/admin/organizations"><Building2 size={16} aria-hidden/>Gerenciar clientes<ArrowUpRight size={15} aria-hidden/></Link></div>
    </header>
    <section className="agency-period" aria-label="Período da carteira">
      <div><CalendarDays size={19} aria-hidden/><span><strong>Período de análise</strong><small>{dateLabel(from)} a {dateLabel(to)}</small></span></div>
      <form key={from+to} action="/admin" method="get"><label>Data inicial<input aria-label="Data inicial da agência" type="date" name="from" defaultValue={from} required/></label><label>Data final<input aria-label="Data final da agência" type="date" name="to" defaultValue={to} required/></label><button type="submit">Aplicar período<ArrowUpRight size={15} aria-hidden/></button></form>
    </section>
    <section className="agency-kpis" aria-label="Indicadores de todos os clientes ativos">
      <article><span className="agency-kpi-icon"><Building2 size={19} aria-hidden/></span><p>Clientes ativos</p><strong>{number(clients.length)}</strong><small>{measured} com registros no período</small></article>
      <article><span className="agency-kpi-icon" data-color="blue"><CircleDollarSign size={19} aria-hidden/></span><p>Investimento registrado</p><strong>{currency?money(summary.spend,currency):'—'}</strong><small>{currency?currency+' · carteira ativa':'Total indisponível sem moeda única validada'}</small></article>
      <article><span className="agency-kpi-icon" data-color="violet"><Eye size={19} aria-hidden/></span><p>Alcance único confirmado</p><strong>{number(summary.reach)}</strong><small>{summary.reach===null?'Indisponível sem deduplicação entre registros':'Valor confirmado na origem'}</small></article>
      <article><span className="agency-kpi-icon" data-color="green"><MessageSquareText size={19} aria-hidden/></span><p>Leads registrados</p><strong>{number(summary.leads)}</strong><small>Eventos atribuídos nas fontes</small></article>
    </section>
    <div className="agency-portfolio-heading"><div><p className="agency-kicker">Carteira de clientes</p><h2>Performance em perspectiva</h2></div><span>{dateLabel(from)} — {dateLabel(to)} · todos os indicadores acima usam a carteira ativa</span></div>
    <div className="agency-client-tools"><label><Search size={17} aria-hidden/><input aria-label="Buscar cliente da agência" placeholder="Buscar cliente pelo nome" value={query} onChange={event=>{setQuery(event.target.value);setPage(0);}}/></label><label><SlidersHorizontal size={16} aria-hidden/><select aria-label="Filtrar clientes da agência" value={filter} onChange={event=>{setFilter(event.target.value as AgencyClientFilter);setPage(0);}}><option value="all">Todos os clientes</option><option value="connected">Com integração ativa</option><option value="attention">Integração pendente</option><option value="no_data">Sem registros no período</option></select></label><span role="status">{visible.length} de {clients.length} clientes</span></div>
    <div className="agency-insights">
      <section className="agency-panel agency-distribution" aria-label="Volumes observados por cliente"><header><div><h2>Clientes por {metric==='spend'?'investimento':'leads'}</h2><p>Busca e filtro aplicados a este gráfico e à lista abaixo.</p></div><div className="agency-segment" aria-label="Indicador do gráfico">{(['spend','leads'] as const).map(key=><button key={key} type="button" aria-pressed={metric===key} onClick={()=>setMetric(key)}>{key==='spend'?'Investimento':'Leads'}</button>)}</div></header>
        {chart.rows.length?<div className="agency-bars">{chart.rows.map(({client,value,width})=><Link key={client.id} href={biHref(client,from,to)} className="agency-bar-link"><span><strong>{client.name}</strong><b>{metric==='spend'&&chart.currency?money(value,chart.currency):number(value)}</b><ArrowUpRight size={14} aria-hidden/></span><i aria-hidden><i style={{width:width+'%'}}/></i></Link>)}</div>:<p className="agency-empty">{chart.mixedCurrency?'Investimentos em moedas diferentes não são comparados nesta escala. Selecione Leads ou refine a busca.':'Nenhuma medição válida para este indicador e recorte.'}</p>}
        <p className="agency-footnote">{chart.totalObserved>8?'8 de '+chart.totalObserved+' clientes com valor observado. ':''}{chart.excluded>0?chart.excluded+(chart.excluded===1?' cliente fora da escala por medição indisponível. ':' clientes fora da escala por medição indisponível. '):''}As barras usam o maior valor observado como escala. Volumes não indicam eficiência ou pessoas únicas.</p>
      </section>
      <section className="agency-panel agency-operation"><span className="agency-operation-icon"><Plug size={22} aria-hidden/></span><p className="agency-kicker">Saúde da operação</p><h2>Conexões da carteira</h2><strong>{connected}<small> / {clients.length}</small></strong><p>Clientes ativos com ao menos uma integração habilitada em status conectado.</p><div><span>Sem conexão confirmada</span><b>{clients.length-connected}</b></div><Link href="/admin/integrations">Ver integrações<ArrowUpRight size={15} aria-hidden/></Link></section>
    </div>
    <section aria-label="Dashboards dos clientes"><div className="agency-list-heading"><h2>Dashboards por cliente</h2><span>Ordem alfabética · abra o Marketing BI para explorar funis, períodos e campanhas</span></div>
      <div className="agency-client-grid">{shown.map(client=><article className="agency-client-card" key={client.id}>
        <header>{client.logoUrl?<img src={client.logoUrl} alt={'Logo '+client.name}/>:<span className="agency-client-monogram">{client.name.slice(0,2).toUpperCase()}</span>}<div><h3>{client.name}</h3><span className="agency-connection" data-connected={client.connected}><i aria-hidden/>{client.connected?'Integração ativa':'Integração pendente'}</span></div><Link href={'/'+client.slug+'/overview'} aria-label={'Abrir visão geral de '+client.name}><ArrowUpRight size={18} aria-hidden/></Link></header>
        <dl><div><dt>Investimento</dt><dd>{money(client.summary.spend,client.currency)}</dd></div><div><dt>Leads</dt><dd>{number(client.summary.leads)}</dd></div><div><dt>CPL</dt><dd>{money(client.summary.cpl,client.currency)}</dd></div></dl>
        <p className="agency-client-observation">{client.hasData?syncLabel(client.lastSync):'Sem registros de mídia neste período'}</p>
        <footer><Link className="agency-open-bi" href={biHref(client,from,to)}><ChartNoAxesCombined size={16} aria-hidden/>Abrir Marketing BI<ArrowUpRight size={15} aria-hidden/></Link><Link href={'/'+client.slug+'/paid'}>Mídia paga</Link></footer>
      </article>)}</div>
      {!shown.length?<p className="agency-empty">{clients.length?'Nenhum cliente corresponde à busca e ao filtro.':'Nenhum cliente ativo cadastrado.'}</p>:null}
      <div className="agency-pagination"><span>{visible.length} {visible.length===1?'cliente encontrado':'clientes encontrados'}</span><div><button type="button" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Anterior</button><span>{currentPage+1} de {pages}</span><button type="button" disabled={currentPage+1>=pages} onClick={()=>setPage(currentPage+1)}>Próxima</button></div></div>
    </section>
  </div>;
}
