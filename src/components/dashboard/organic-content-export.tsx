'use client';
import {useId,useState} from 'react';
import {downloadCsv} from '@/lib/export/download';
export function OrganicContentExport({content,filename,disabled}:{content:string;filename:string;disabled:boolean}){
 const [error,setError]=useState('');
 const note=useId();
 return <div className="space-y-2"><button type="button" disabled={disabled} aria-describedby={note}
  className="rounded-xl border border-primary/30 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
  onClick={()=>{if(disabled||!content)return;setError('');try{downloadCsv(content,filename);}catch{setError('Não foi possível preparar o arquivo. Tente novamente.');}}}>Exportar conteúdos CSV</button>
  <p id={note} className="text-xs text-zinc-400">Uma linha por conteúdo exibido. Contadores acumulados até a coleta; campos vazios são indisponíveis. O CSV preserva o limite do relatório e a indicação de legendas truncadas.</p>
  {error?<p role="alert">{error}</p>:null}
 </div>;
}
