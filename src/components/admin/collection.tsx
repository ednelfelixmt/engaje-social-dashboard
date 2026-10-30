'use client';

import {useState, type ReactNode} from 'react';
import {Search} from 'lucide-react';

export type CollectionEntry={id:string;name:string;status:string;search?:string;content:ReactNode};
export function AdminCollection({entries,label,statuses}: {entries:CollectionEntry[];label:string;statuses:{value:string;label:string}[]}) {
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('all');
  const [page,setPage]=useState(1);
  const normalize=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const filtered=entries.filter(entry=>(status==='all'||entry.status===status)&&normalize(entry.name+' '+(entry.search??'')).includes(normalize(query.trim())));
  const pages=Math.max(1,Math.ceil(filtered.length/10));
  const current=Math.min(page,pages);
  return <section className="admin-collection" aria-label={label}>
    <div className="admin-collection-toolbar"><label className="admin-search"><Search size={17} aria-hidden/><input aria-label={`Buscar em ${label}`} value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} placeholder="Buscar por nome ou identificação"/></label><select aria-label={`Filtrar ${label} por situação`} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="all">Todas as situações</option>{statuses.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select><span role="status">{filtered.length} de {entries.length}</span></div>
    <div className="admin-collection-rows">{filtered.slice((current-1)*10,current*10).map(entry=><div key={entry.id}>{entry.content}</div>)}{!filtered.length?<p className="admin-empty">Nenhum resultado para os filtros selecionados.</p>:null}</div>
    {pages>1?<footer className="admin-pagination"><span>Página {current} de {pages}</span><button type="button" disabled={current===1} onClick={()=>setPage(current-1)}>Anterior</button><button type="button" disabled={current===pages} onClick={()=>setPage(current+1)}>Próxima</button></footer>:null}
  </section>;
}
