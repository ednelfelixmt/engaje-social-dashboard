import Image from 'next/image';
import {Images} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {SortableCardGrid} from '@/components/dashboard/sortable-card-grid';
import {platformDashboards} from '@/lib/metrics/platforms';
import type {Row} from '@/types/database.types';

const labels:Record<string,string>={likes:'Curtidas',comments:'Comentários',shares:'Compartilhamentos',reactions:'Reações',reach:'Alcance',impressions:'Impressões',views:'Visualizações'};

export function CreativeLibrary({creatives,storageKey,organicInsightsUnavailable}:{creatives:Row<'creatives'>[];storageKey:string;organicInsightsUnavailable:boolean}){
  const items=creatives.map((creative)=>({id:creative.id,content:<article className="group overflow-hidden rounded-xl border border-white/10 bg-black/10 transition hover:-translate-y-0.5 hover:border-primary/30">
    {creative.thumbnail_url||creative.media_url?<Image unoptimized className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.02]" width={640} height={640} src={creative.thumbnail_url||creative.media_url!} alt={creative.caption?.slice(0,100)||'Criativo publicado'}/>:<div className="grid aspect-square place-items-center bg-white/5"><Images className="text-zinc-600"/></div>}
    <div className="p-4"><p className="text-xs font-medium text-primary">{platformDashboards.find((item)=>item.platform===creative.platform)?.label??creative.platform} · {creative.kind}</p><p className="mt-2 line-clamp-2 text-sm leading-6">{creative.caption||'Publicação sem legenda'}</p>
      {creative.platform!=='meta_ads'?organicInsightsUnavailable?<p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/[.06] p-3 text-xs leading-5 text-amber-200">Métricas indisponíveis. Reconecte a Meta com a permissão de Insights.</p>:<div className="mt-4 border-t border-white/10 pt-3 text-xs"><p className="mb-2 text-zinc-500">Acumulado até a sincronização</p>{Object.entries(creative.lifetime_metrics||{}).map(([key,value])=><p key={key} className="flex justify-between py-1"><span>{labels[key]||key}</span><strong>{typeof value==='number'?value.toLocaleString('pt-BR'):'—'}</strong></p>)}<p className="mt-2 text-zinc-600">{new Date(creative.synced_at).toLocaleDateString('pt-BR')}</p></div>:null}
      {creative.permalink?<a target="_blank" rel="noopener noreferrer" className="mt-3 block text-xs text-zinc-400 hover:text-primary" href={creative.permalink}>Abrir publicação ↗</a>:null}
    </div>
  </article>}));
  return <Card><div className="mb-5"><p className="eyebrow">Biblioteca visual</p><h2 className="mt-2 text-lg font-semibold">Conteúdos publicados</h2><p className="muted mt-2 text-xs">Arraste qualquer card para reorganizar. A posição fica salva neste navegador.</p></div>{items.length?<SortableCardGrid items={items} storageKey={storageKey} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"/>:<p className="muted py-10 text-center">Nenhum conteúdo importado no período.</p>}</Card>;
}
