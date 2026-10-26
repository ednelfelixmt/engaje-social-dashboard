'use client';
import {useId, useState} from 'react';
import type {AudienceReport} from '@/lib/reports/audience-report';
import {audienceReportCsv, audienceReportFilename} from '@/lib/export/audience-report';
import {downloadCsv} from '@/lib/export/download';
export function AudienceReportExport({report}: {report: AudienceReport}) {
 const [error, setError] = useState(''); const noteId = useId();
 function download() {
  setError('');
  try {downloadCsv(audienceReportCsv(report), audienceReportFilename(report));}
  catch {setError('Não foi possível preparar o arquivo. Tente novamente.');}
 }
 return <div className="space-y-2"><button type="button" disabled={!report.sourceRecords} aria-describedby={noteId} onClick={download} className="rounded-xl border border-primary/30 px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50">Exportar relatório CSV</button><p id={noteId} className="text-xs text-zinc-400">CSV com período, moeda, fonte e cobertura por indicador. Campos vazios representam dados indisponíveis. Não some dimensões entre si.</p>{error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}</div>;
}
