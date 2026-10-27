'use client';

import {useId,useState} from 'react';
import {downloadCsv} from '@/lib/export/download';

/** CSV is authorized and prepared on the server; no browser queries. */
export function CampaignReportExport({content,filename,disabled}:{content:string;filename:string;disabled:boolean}){
 const [error,setError]=useState('');
 const noteId=useId();
 function exportLocal(){
  if(disabled||!content)return;
  setError('');
  try{downloadCsv(content,filename);}
  catch{setError('Não foi possível preparar o CSV da campanha. Tente novamente.');}
 }
 return <div data-print-hide className="space-y-2">
  <button type="button" disabled={disabled} aria-describedby={noteId} onClick={exportLocal} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold disabled:opacity-40">Exportar CSV da campanha</button>
  <p id={noteId} className="text-xs text-zinc-400">Somente a conta, campanha e períodos selecionados. Resumos e dias se sobrepõem: não some as linhas entre si. Campos vazios são indisponíveis. Componentes em todos os dias não comprovam coleta completa da origem.</p>
  {error?<p role="alert" className="text-sm text-rose-300">{error}</p>:null}
 </div>;
}
