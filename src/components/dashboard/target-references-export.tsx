'use client';

import {useId, useState} from 'react';
import {downloadCsv} from '@/lib/export/download';

/** Receives only the precomputed CSV of the server-authorized tenant report. */
export function TargetReferencesExport({content, filename, disabled}: {content: string; filename: string; disabled: boolean}) {
 const [error, setError] = useState('');
 const noteId = useId();
 function download() {
  if (disabled || !content) return;
  setError('');
  try { downloadCsv(content, filename); }
  catch { setError('Não foi possível preparar o arquivo CSV. Tente novamente.'); }
 }
 return <div data-print-hide className="space-y-2">
  <button type="button" disabled={disabled} aria-describedby={noteId} onClick={download} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold disabled:opacity-40">Exportar referências CSV</button>
  <p id={noteId} className="text-xs text-zinc-400">Uma linha por referência cadastrável, com status, cobertura e moedas separadas. Comparação numérica sem vigência da referência; não representa meta mensal ou projeção. Campos vazios indicam valores indisponíveis.</p>
  {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
 </div>;
}
