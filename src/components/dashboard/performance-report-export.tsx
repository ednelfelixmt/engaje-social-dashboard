'use client';

import {useId, useState} from 'react';
import {downloadCsv} from '@/lib/export/download';

/** Receives precomputed CSV from the authorized report. No queries, writes or network calls. */
export function PerformanceReportExport({content, filename, disabled}: {content: string; filename: string; disabled: boolean}) {
 const [error, setError] = useState('');
 const noteId = useId();
 function exportLocal() {
  if (disabled || !content) return;
  setError('');
  try { downloadCsv(content, filename); }
  catch { setError('Não foi possível preparar o CSV. Tente novamente.'); }
 }
 return <div data-print-hide className="space-y-2">
  <button type="button" disabled={disabled} aria-describedby={noteId} onClick={exportLocal} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold disabled:opacity-40">Exportar CSV</button>
  <p id={noteId} className="text-xs text-zinc-400">Exportação local dos mesmos dados do relatório: cada plataforma, campanha e período em linha separada. Campos vazios indicam métricas indisponíveis; atribuições de leads não equivalem a pessoas únicas.</p>
  {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
 </div>;
}
