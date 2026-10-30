'use client';

import {useEffect, useRef, type ReactNode} from 'react';
import {X} from 'lucide-react';

/** Native top layer escapes transformed/filtered cards and supplies focus trapping. */
export function Modal({titleId, onClose, children, busy=false}: {titleId:string; onClose:()=>void; children:ReactNode; busy?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const dialog=ref.current;
    if(!dialog)return;
    dialog.showModal();
    return ()=>dialog.close();
  },[]);
  return <dialog ref={ref} className="app-dialog" aria-labelledby={titleId} aria-modal="true"
    onCancel={event=>{event.preventDefault();if(!busy)onClose();}}
    onClick={event=>{
      if(event.target!==event.currentTarget||busy)return;
      const bounds=event.currentTarget.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)onClose();
    }}>
    <button type="button" className="app-dialog-close" aria-label="Fechar janela" disabled={busy} onClick={onClose}><X size={20}/></button>
    {children}
  </dialog>;
}
