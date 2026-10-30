'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Activity, Blocks, Database, Facebook, Radio, Webhook, Search, ArrowUpRight} from 'lucide-react';
import {connectorCatalog} from '@/lib/integrations/catalog';
import {integrationHealth} from '@/lib/integrations/operational-state';
import {AdminIntegrationStartButton} from '@/components/admin-integration-start-button';

export type IntegrationConnection={id:string;organizationId:string;organizationName:string;slug:string;provider:string;accountName:string;status:string;is_enabled:boolean;lastSyncedAt:string|null};
const icons={meta_ads:Facebook,tiktok_ads:Activity,windsor:Database,stract:Database,hubspot:Blocks,rd_station:Radio,generic_crm:Webhook};
const platformKey:Record<string,string>={meta_ads:'meta',rd_station:'rd-station',generic_crm:'crm',tiktok_ads:'tiktok_ads'};

export function IntegrationCenter({connections,workspaces}:{connections:IntegrationConnection[];workspaces:{id:string;name:string;slug:string}[]}) {
  const [client,setClient]=useState('all'), [status,setStatus]=useState('all'), [query,setQuery]=useState('');
  const scoped=connections.filter(row=>client==='all'||row.organizationId===client);
  const filtered=scoped.filter(row=>(status==='all'||integrationHealth(row).key===status)&&(row.organizationName+' '+row.accountName+' '+row.provider).toLowerCase().includes(query.toLowerCase().trim()));
  const connected=scoped.filter(row=>integrationHealth(row).key==='connected').length;
  const attention=scoped.filter(row=>integrationHealth(row).key==='attention').length;
  const selection=client==='all'?workspaces:workspaces.filter(row=>row.id===client);
  return <div className="integration-center">
    <div className="admin-summary-grid"><div><span>Conexões habilitadas</span><strong>{connected}</strong><small>Não comprova coleta completa</small></div><div><span>Precisam de atenção</span><strong>{attention}</strong><small>Erro ou autorização expirada</small></div><div><span>Clientes no recorte</span><strong>{selection.length}</strong><small>Somente clientes ativos</small></div></div>
    <div className="admin-collection-toolbar"><label>Cliente<select aria-label="Cliente das integrações" value={client} onChange={e=>setClient(e.target.value)}><option value="all">Todos os clientes ativos</option>{workspaces.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label>Situação<select aria-label="Situação das integrações" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Todas as situações</option><option value="connected">Conexão habilitada</option><option value="attention">Precisam de atenção</option><option value="pending">Pendentes</option><option value="inactive">Desconectadas</option></select></label><label className="admin-search"><Search size={17}/><input aria-label="Buscar conexão" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cliente ou conta"/></label></div>
    <section className="admin-surface"><header className="admin-section-heading"><div><h2>Contas e sincronizações</h2><p>Estado recebido do servidor. Reconexões e seleção de ativos acontecem dentro do cliente.</p></div><span>{filtered.length} conta(s)</span></header><div className="admin-table-scroll"><table><thead><tr><th>Cliente / conta</th><th>Plataforma</th><th>Conexão</th><th>Última sincronização</th><th>Ação</th></tr></thead><tbody>{filtered.map(row=>{const health=integrationHealth(row);return <tr key={row.id}><th scope="row"><strong>{row.organizationName}</strong><small>{row.accountName}</small></th><td>{row.provider==='facebook_organic'?'Facebook orgânico':row.provider==='instagram_organic'?'Instagram orgânico':connectorCatalog.find(c=>c.provider===row.provider)?.name??row.provider}</td><td><span className="admin-status" data-tone={health.tone}>{health.label}</span></td><td>{row.lastSyncedAt?new Date(row.lastSyncedAt).toLocaleString('pt-BR',{timeZone:'America/Cuiaba'}):'Não realizada'}</td><td><Link className="admin-row-action" href={`/${encodeURIComponent(row.slug)}/settings/integrations#${row.provider}`}>{health.key==='attention'?'Revisar e reconectar':'Gerenciar conta'} <ArrowUpRight size={14}/></Link></td></tr>;})}{!filtered.length?<tr><td colSpan={5} className="admin-empty">Nenhuma conexão neste recorte. Selecione um conector abaixo para configurar o cliente.</td></tr>:null}</tbody></table></div></section>
    <section><header className="admin-section-heading"><div><h2>Conectar plataformas</h2><p>Selecione o cliente e conclua o fluxo de autorização. Cadastro de base não equivale a conexão.</p></div></header><div className="integration-catalog-grid">{connectorCatalog.map(connector=>{
      const Icon=icons[connector.provider as keyof typeof icons]??Database;
      const live=connector.stage==='live';
      const names=scoped.filter(row=>row.provider===connector.provider&&integrationHealth(row).key==='connected');
      return <article className="integration-catalog-card" key={connector.provider} id={'connector-'+connector.provider}><header><span className={'integration-provider-icon provider-'+connector.provider}><Icon size={24}/></span><span className="admin-status" data-tone={live?'good':'warning'}>{live?'Conector implementado':'Adaptador pendente'}</span></header><div><h3>{connector.provider==='windsor'?'Google Ads · Windsor.ai':connector.provider==='rd_station'?'RD Station Marketing + CRM':connector.name}</h3><p>{connector.provider==='rd_station'?'Os dois produtos ainda precisam de autorização e adaptadores de coleta. O cadastro de base não importa contatos ou negócios.':connector.description}</p></div><div className="integration-capability-list">{connector.capabilities.map(capability=><span key={capability}>{capability}</span>)}</div><p className="integration-card-state">{names.length?names.length+' conexão(ões) habilitada(s) no recorte':'Nenhuma conexão habilitada no recorte'}</p><footer><AdminIntegrationStartButton platformKey={platformKey[connector.provider]??connector.provider} available={live} workspaces={selection}/></footer></article>;
    })}</div></section>
  </div>;
}
