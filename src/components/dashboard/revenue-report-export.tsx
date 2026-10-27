'use client';

import {useId, useState} from 'react';
import {downloadCsv} from '@/lib/export/download';

/** Download on user action only; the caller supplies already authorized CSV. */
export function RevenueReportExport({content, filename, disabled}: {content: string; filename: string; disabled: boolean}) {
 const [error, setError] = useState('');
 const noteId = useId();
 function exportLocal() {
  if (disabled || !content) return;
  setError('');
  try { downloadCsv(content, filename); }
  catch { setError('Não foi possível preparar o CSV de receita. Tente novamente.'); }
 }
 return <div data-print-hide className="space-y-2">
  <button type="button" disabled={disabled} aria-describedby={noteId} onClick={exportLocal} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold disabled:opacity-40">Exportar CSV de receita</button>
  <p id={noteId} className="text-xs text-zinc-400">Somente a fonte e os períodos selecionados. Totais e dias são níveis sobrepostos: não some as linhas entre si. Campos vazios significam dados indisponíveis, não zero. Conciliação declarada não é auditoria financeira.</p>
  {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
 </div>;
}
