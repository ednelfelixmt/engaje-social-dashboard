'use client';
import {useId,useState} from 'react';
import {downloadCsv} from '@/lib/export/download';
export function OrganicAccountExport({content,filename,disabled}:{content:string;filename:string;disabled:boolean}){
 const [error,setError]=useState('');const note=useId();
 return <div className="space-y-2"><button type="button" disabled={disabled} aria-describedby={note}
  className="rounded-xl border border-primary/30 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
  onClick={()=>{if(disabled||!content)return;setError('');try{downloadCsv(content,filename);}catch{setError('Não foi possível preparar o arquivo. Tente novamente.');}}}>Exportar contas CSV</button>
  <p id={note} className="text-xs text-zinc-400">Uma linha por registro exibido. Janela original não confirmada; não some alcance ou seguidores. Campos vazios são indisponíveis. O CSV preserva limites e ressalvas da tela.</p>
  {error?<p role="alert">{error}</p>:null}
 </div>;
}
