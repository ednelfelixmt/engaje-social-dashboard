'use client';

import {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight, Maximize2, MonitorUp, Pause, Play, X} from 'lucide-react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';

const ROTATION_INTERVAL_MS = 20_000;
const REFRESH_INTERVAL_MS = 5 * 60_000;

function movePanel(direction: -1 | 1) {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-tv-panel]'));
  if (!panels.length) return;
  const current = panels.reduce((nearest, panel, index) => Math.abs(panel.getBoundingClientRect().top) < Math.abs(panels[nearest].getBoundingClientRect().top) ? index : nearest, 0);
  panels[(current + direction + panels.length) % panels.length]?.scrollIntoView({behavior: 'smooth', block: 'start'});
}

export function DisplayModeController() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get('display') === 'tv';
  const [rotating, setRotating] = useState(true);
  const [persistentMode, setPersistentMode] = useState(false);
  const active = requested || persistentMode;

  useEffect(() => setPersistentMode(localStorage.getItem('engaje:tv-mode') === 'true'), []);
  useEffect(() => {
    document.documentElement.classList.toggle('tv-mode', active);
    return () => document.documentElement.classList.remove('tv-mode');
  }, [active]);
  useEffect(() => {
    if (!active) return;
    const refresh = window.setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(refresh);
  }, [active, router]);
  useEffect(() => {
    if (!active || !rotating) return;
    let index = 0;
    const rotate = window.setInterval(() => {
      const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-tv-panel]'));
      if (!panels.length) return;
      index = (index + 1) % panels.length;
      panels[index]?.scrollIntoView({behavior: 'smooth', block: 'start'});
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(rotate);
  }, [active, rotating]);
  useEffect(() => {
    if (!active) return;
    const handleRemote = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown') movePanel(1);
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') movePanel(-1);
      if (event.key === ' ') setRotating((current) => !current);
    };
    window.addEventListener('keydown', handleRemote);
    return () => window.removeEventListener('keydown', handleRemote);
  }, [active]);

  const changeMode = (enabled: boolean) => {
    localStorage.setItem('engaje:tv-mode', String(enabled));
    setPersistentMode(enabled);
    const next = new URLSearchParams(searchParams.toString());
    if (enabled) next.set('display', 'tv'); else next.delete('display');
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ''}`, {scroll: false});
  };
  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen();
    } catch { /* O layout continua ajustado quando o navegador da TV bloqueia tela cheia. */ }
  };

  if (!active) return <button type="button" className="tv-mode-entry" onClick={() => changeMode(true)}><MonitorUp size={17}/>Modo TV</button>;
  return <div className="tv-controls" aria-label="Controles do modo TV">
    <button type="button" onClick={() => movePanel(-1)} title="Painel anterior"><ChevronLeft size={20}/><span>Anterior</span></button>
    <button type="button" onClick={() => setRotating((current) => !current)} title={rotating ? 'Pausar rotação' : 'Retomar rotação'}>{rotating ? <Pause size={18}/> : <Play size={18}/>}<span>{rotating ? 'Pausar' : 'Retomar'}</span></button>
    <button type="button" onClick={() => movePanel(1)} title="Próximo painel"><ChevronRight size={20}/><span>Próximo</span></button>
    <button type="button" onClick={requestFullscreen} title="Alternar tela cheia"><Maximize2 size={18}/><span>Tela cheia</span></button>
    <button type="button" onClick={() => changeMode(false)} title="Sair do modo TV"><X size={18}/><span>Sair</span></button>
  </div>;
}
