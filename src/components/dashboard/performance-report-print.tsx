'use client';

import {useEffect, useId, useState} from 'react';

export function PerformanceReportPrint({disabled = false}: {disabled?: boolean}) {
 const [error, setError] = useState('');
 const description = useId();
 useEffect(() => {
  document.documentElement.classList.add('engaje-performance-print');
  return () => document.documentElement.classList.remove('engaje-performance-print');
 }, []);
 return <div data-print-hide className="space-y-2">
  <button type="button" disabled={disabled} aria-describedby={description} className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold disabled:opacity-40" onClick={() => {
   if (disabled) return;
   setError('');
   try { window.print(); } catch { setError('Não foi possível abrir a impressão. Tente pelo menu do navegador.'); }
  }}>Imprimir / salvar PDF</button>
  <p id={description} className="text-xs text-zinc-400">No diálogo de impressão do navegador, escolha salvar como PDF. O arquivo não é enviado a terceiros.</p>
  {error ? <p role="alert">{error}</p> : null}
 </div>;
}
