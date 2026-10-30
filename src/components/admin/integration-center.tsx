'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Activity, Blocks, Database, Facebook, Radio, Webhook, Search, ArrowUpRight} from 'lucide-react';
import {connectorCatalog} from '@/lib/integrations/catalog';
import type {ClientConnectionSummary} from '@/lib/integrations/operational-state';
import {AdminIntegrationStartButton} from '@/components/admin-integration-start-button';

const icons={meta_ads:Facebook,tiktok_ads:Activity,windsor:Database,stract:Database,hubspot:Blocks,rd_station:Radio,generic_crm:Webhook};
const platformKey:Record<string,string>={meta_ads:'meta',rd_station:'rd-station',generic_crm:'crm',tiktok_ads:'tiktok_ads'};
type Workspace={id:string;name:string;slug:string};
const empty=(organizationId:string):ClientConnectionSummary=>({organizationId,connected:0,attention:0,pending:0,inactive:0,lastSyncedAt:null});

export function IntegrationCenter({summary,workspaces}:{summary:ClientConnectionSummary[];workspaces:Workspace[]}) {
  const [client,setClient]=useState('all'), [status,setStatus]=useState('all'), [query,setQuery]=useState('');
  const byClient=new Map(summary.map(row=>[row.organizationId,row]));
  const selection=client==='all'?workspaces:workspaces.filter(row=>row.id===client);
  const scoped=selection.map(row=>({...row,health:byClient.get(row.id)??empty(row.id)}));
  const connected=scoped.reduce((count,row)=>count+row.health.connected,0);
  const attention=scoped.reduce((count,row)=>count+row.health.attention,0);
  const key=status as 'connected'|'attention'|'pending'|'inactive';
  const filtered=scoped.filter(row=>(status==='all'||row.health[key]>0)&&row.name.toLowerCase().includes(query.toLowerCase().trim()));
  return <div className="integration-center">
    <div className="admin-summary-grid"><div><span>Conexões habilitadas</span><strong>{connected}</strong><small>Não comprova coleta completa</small></div><div><span>Precisam de atenção</span><strong>{attention}</strong><small>Erro ou autorização expirada</small></div><div><span>Clientes no recorte</span><strong>{selection.length}</strong><small>Somente clientes ativos</small></div></div>
    <div className="admin-collection-toolbar"><label>Cliente<select aria-label="Cliente das integrações" value={client} onChange={e=>setClient(e.target.value)}><option value="all">Todos os clientes ativos</option>{workspaces.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label>Situação<select aria-label="Situação das integrações" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Todas as situações</option><option value="connected">Conexão habilitada</option><option value="attention">Precisam de atenção</option><option value="pending">Pendentes</option><option value="inactive">Desconectadas</option></select></label><label className="admin-search"><Search size={17}/><input aria-label="Buscar cliente" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cliente"/></label></div>
    <section className="admin-surface"><header className="admin-section-heading"><div><h2>Saúde das conexões por cliente</h2><p>Somente totais operacionais. Contas, ativos, autorizações e sincronizações individuais são consultados dentro de cada cliente.</p></div><span>{filtered.length} cliente(s)</span></header><div className="admin-table-scroll"><table><thead><tr><th>Cliente</th><th>Habilitadas</th><th>Atenção</th><th>Pendentes</th><th>Última sincronização</th><th>Ação</th></tr></thead><tbody>{filtered.map(row=><tr key={row.id}><th scope="row"><strong>{row.name}</strong></th><td>{row.health.connected}</td><td>{row.health.attention}</td><td>{row.health.pending}</td><td>{row.health.lastSyncedAt?new Date(row.health.lastSyncedAt).toLocaleString('pt-BR',{timeZone:'America/Cuiaba'}):'Não realizada'}</td><td><Link className="admin-row-action" href={`/${encodeURIComponent(row.slug)}/settings/integrations`}>Gerenciar no cliente <ArrowUpRight size={14}/></Link></td></tr>)}{!filtered.length?<tr><td colSpan={6} className="admin-empty">Nenhum cliente neste recorte. Selecione um conector abaixo para configurar uma nova integração.</td></tr>:null}</tbody></table></div></section>
    <section><header className="admin-section-heading"><div><h2>Conectar plataformas</h2><p>Selecione o cliente e conclua o fluxo de autorização. Cadastro de base não equivale a conexão.</p></div></header><div className="integration-catalog-grid">{connectorCatalog.map(connector=>{
      const Icon=icons[connector.provider as keyof typeof icons]??Database;
      const live=connector.stage==='live';
      return <article className="integration-catalog-card" key={connector.provider} id={'connector-'+connector.provider}><header><span className={'integration-provider-icon provider-'+connector.provider}><Icon size={24}/></span><span className="admin-status" data-tone={live?'good':'warning'}>{live?'Conector implementado':'Adaptador pendente'}</span></header><div><h3>{connector.provider==='windsor'?'Google Ads · Windsor.ai':connector.provider==='rd_station'?'RD Station Marketing + CRM':connector.name}</h3><p>{connector.provider==='rd_station'?'Os dois produtos ainda precisam de autorização e adaptadores de coleta. O cadastro de base não importa contatos ou negócios.':connector.description}</p></div><div className="integration-capability-list">{connector.capabilities.map(capability=><span key={capability}>{capability}</span>)}</div><p className="integration-card-state">Contas e ativos já vinculados são exibidos somente dentro do cliente.</p><footer><AdminIntegrationStartButton platformKey={platformKey[connector.provider]??connector.provider} available={live} workspaces={selection}/></footer></article>;
    })}</div></section>
  </div>;
}
