'use client';
import {useEffect,useState} from 'react';
import {ImageOff,PlayCircle} from 'lucide-react';

export function CreativeMedia({primary,thumbnail,kind,title}:{primary:string|null;thumbnail:string|null;kind:string;title:string}){
 const distinct=[...new Set([primary,thumbnail].filter((v):v is string=>!!v&&/^https:\/\//i.test(v)))];
 const [index,setIndex]=useState(0);
 const [playing,setPlaying]=useState(false);
 useEffect(()=>{setIndex(0);setPlaying(false);},[primary,thumbnail,kind]);
 const current=distinct[index];
 const failed=()=>{setPlaying(false);setIndex(i=>i+1);};
 const video=kind==='video';
 return <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-[#090e17]">
  {current?video&&playing?
    <video src={primary||undefined} poster={thumbnail||undefined} controls autoPlay playsInline preload="metadata" onError={failed} className="h-full w-full object-contain" aria-label={title}/>:
    <>
     {/* Meta CDN thumbnails frequently expire. Fall through to a second URL before showing a neutral placeholder. */}
     <img key={current} src={current} alt={title} loading="lazy" referrerPolicy="no-referrer" onError={failed} className="h-full w-full object-contain"/>
     {video?<button type="button" title="Reproduzir criativo" onClick={()=>{if(primary&&/^https:\/\//i.test(primary))setPlaying(true);else failed();}} className="absolute inset-0 flex items-center justify-center bg-black/20 text-white hover:bg-black/35"><PlayCircle size={46} strokeWidth={1.4}/></button>:null}
    </>:
    <div role="img" aria-label={'Mídia indisponível: '+title} className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-white/[.035] to-black/20 px-5 text-center"><ImageOff size={29} className="text-zinc-500"/><span className="text-xs font-medium text-zinc-300">Prévia indisponível</span><span className="max-w-64 text-[11px] leading-5 text-zinc-500">A mídia original precisa ser atualizada pela plataforma. Os dados e o texto deste anúncio foram preservados.</span></div>}
 </div>;
}
