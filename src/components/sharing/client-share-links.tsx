'use client';
import {useState} from 'react';
import {Check,Copy,ExternalLink,LockKeyhole,ShieldCheck} from 'lucide-react';
const pages=[{path:'overview',label:'Visão geral executiva',detail:'Indicadores, decisões e resultados consolidados'},{path:'paid',label:'Mídia paga',detail:'Campanhas, custos e resultados por plataforma'},{path:'funnel',label:'Funil de conversão',detail:'Etapas, conversões e custos por resultado'}];
export function ClientShareLinks({slug,enabled}:{slug:string;enabled:string[]}){
  const [copied,setCopied]=useState<string|null>(null);
  const rows=pages.filter(p=>enabled.includes(p.path));
  const url=(path:string)=>typeof window==='undefined'?`/login/${slug}?next=%2F${slug}%2F${path}`:`${window.location.origin}/login/${slug}?next=${encodeURIComponent('/'+slug+'/'+path)}`;
  async function copy(path:string){try{await navigator.clipboard.writeText(url(path));setCopied(path);}catch{setCopied(null);}}
  return <div className="space-y-3">{rows.map(p=><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/15 p-4" key={p.path}><div className="min-w-0 flex-1"><strong className="text-sm text-white">{p.label}</strong><p className="mt-1 text-xs text-zinc-500">{p.detail}</p></div><div className="flex items-center gap-2"><a href={url(p.path)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-zinc-200 hover:border-primary/40"><ExternalLink size={14}/>Abrir</a><button type="button" onClick={()=>copy(p.path)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-black">{copied===p.path?<Check size={15}/>:<Copy size={15}/>} {copied===p.path?'Copiado':'Copiar link'}</button></div></div>)}
  {!rows.length?<p className="text-sm text-amber-200">Nenhuma página habilitada para compartilhamento neste cliente.</p>:null}
  <div className="flex items-start gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[.04] p-4 text-xs leading-6 text-zinc-300"><ShieldCheck className="mt-1 shrink-0 text-emerald-300" size={17}/><p><strong className="text-white">Compartilhamento autenticado.</strong> O endereço encaminha para o login do cliente. Só usuários vinculados a esta organização e com acesso ativo conseguem visualizar os dados. Copiar o endereço não cria permissão. Para conceder ou revogar acesso, utilize a gestão de usuários da agência.</p></div>
  <p className="flex items-center gap-2 text-xs text-zinc-500"><LockKeyhole size={13}/>Não publique estes links como se fossem relatórios abertos. Cada destinatário precisa de credenciais próprias.</p>
  </div>;
}
