'use client';

import {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight, Maximize2, MonitorUp, Pause, Play, X} from 'lucide-react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';

const ROTATION_INTERVAL_MS = 20_000;
const REFRESH_INTERVAL_MS = 5 * 60_000;

function movePanel(direction: -1 | 1) {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-tv-panel]')).filter(panel=>panel.getClientRects().length>0);
  if (!panels.length) return;
  const current = panels.reduce((nearest, panel, index) => Math.abs(panel.getBoundingClientRect().top) < Math.abs(panels[nearest].getBoundingClientRect().top) ? index : nearest, 0);
  panels[(current + direction + panels.length) % panels.length]?.scrollIntoView({behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth', block: 'start'});
}

export function DisplayModeController() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get('display') === 'tv';
  const [rotating, setRotating] = useState(true);
  const [persistentMode, setPersistentMode] = useState(false);
  const [fullscreenError,setFullscreenError]=useState('');
  const active = requested || persistentMode;

  useEffect(() => {try{setPersistentMode(localStorage.getItem('engaje:tv-mode') === 'true');}catch{/* TV mode still works when storage is unavailable. */}}, []);
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
    const rotate = window.setInterval(() => movePanel(1), ROTATION_INTERVAL_MS);
    return () => window.clearInterval(rotate);
  }, [active, rotating]);
  useEffect(() => {
    if (!active) return;
    const handleRemote = (event: KeyboardEvent) => {
      const target=event.target;
      if(target instanceof Element&&target.closest('input,select,textarea,button,a,[contenteditable="true"]'))return;
      if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
      if(['ArrowRight','ArrowLeft','PageDown','PageUp',' '].includes(event.key))event.preventDefault();
      if (event.key === 'ArrowRight' || event.key === 'PageDown') movePanel(1);
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') movePanel(-1);
      if (event.key === ' ') setRotating((current) => !current);
    };
    window.addEventListener('keydown', handleRemote);
    return () => window.removeEventListener('keydown', handleRemote);
  }, [active]);

  const changeMode = (enabled: boolean) => {
    try{localStorage.setItem('engaje:tv-mode', String(enabled));}catch{/* URL and in-memory state remain available. */}
    if(!enabled&&document.fullscreenElement===document.documentElement)void document.exitFullscreen().catch(()=>{});
    setPersistentMode(enabled);
    const next = new URLSearchParams(searchParams.toString());
    if (enabled) next.set('display', 'tv'); else next.delete('display');
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ''}`, {scroll: false});
  };
  const requestFullscreen = async () => {
    setFullscreenError('');
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen();
    } catch {setFullscreenError('Este navegador não autorizou a tela cheia. O modo TV continua ativo.');}
  };

  if (!active) return <button type="button" className="tv-mode-entry" onClick={() => {changeMode(true);void requestFullscreen();}}><MonitorUp size={17}/>Modo TV</button>;
  return <div className="tv-controls" aria-label="Controles do modo TV">
    {fullscreenError?<p className="tv-fullscreen-status" role="status">{fullscreenError}</p>:null}
    <button type="button" onClick={() => movePanel(-1)} title="Painel anterior"><ChevronLeft size={20}/><span>Anterior</span></button>
    <button type="button" onClick={() => setRotating((current) => !current)} title={rotating ? 'Pausar rotação' : 'Retomar rotação'}>{rotating ? <Pause size={18}/> : <Play size={18}/>}<span>{rotating ? 'Pausar' : 'Retomar'}</span></button>
    <button type="button" onClick={() => movePanel(1)} title="Próximo painel"><ChevronRight size={20}/><span>Próximo</span></button>
    <button type="button" onClick={requestFullscreen} title="Alternar tela cheia"><Maximize2 size={18}/><span>Tela cheia</span></button>
    <button type="button" onClick={() => changeMode(false)} title="Sair do modo TV"><X size={18}/><span>Sair</span></button>
  </div>;
}
