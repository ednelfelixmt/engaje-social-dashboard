'use client';

import {useEffect, useState} from 'react';
import {usePathname} from 'next/navigation';
import {Moon, Sun} from 'lucide-react';

const storageKey = 'engaje:report-studio:appearance:v1';

export function ReportStudioFrame({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const route = pathname.split('/').slice(2).join('/');
  const active = ['reports', 'reports/analytics', 'reports/funnel'].includes(route);
  const [night, setNight] = useState(false);

  useEffect(() => {
    try { setNight(localStorage.getItem(storageKey) === 'night'); }
    catch { /* Appearance remains usable when storage is unavailable. */ }
  }, []);

  function toggle() {
    setNight(current => {
      const next = !current;
      try { localStorage.setItem(storageKey, next ? 'night' : 'day'); }
      catch { /* This browser session still keeps the selected appearance. */ }
      return next;
    });
  }

  return <div className={active ? 'report-studio-frame' : undefined} data-studio-theme={active ? (night ? 'night' : 'day') : undefined}>
    {children}
    {active ? <button type="button" className="studio-theme-toggle tv-hide" onClick={toggle} aria-pressed={night} aria-label={night ? 'Usar tema claro' : 'Usar tema escuro'}>
      {night ? <Sun size={17} aria-hidden/> : <Moon size={17} aria-hidden/>}<span>{night ? 'Tema claro' : 'Tema escuro'}</span>
    </button> : null}
  </div>;
}
