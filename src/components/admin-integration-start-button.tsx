'use client';

import {useState} from 'react';
import {ArrowRight, Plug, X} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';

type ClientWorkspace={id:string;name:string;slug:string};

export function AdminIntegrationStartButton({platformKey,available,workspaces}:{platformKey:string;available:boolean;workspaces:ClientWorkspace[]}) {
  const router=useRouter();
  const [open,setOpen]=useState(false);
  const [organizationId,setOrganizationId]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const selected=workspaces.find((item)=>item.id===organizationId);

  async function start(){
    if(!selected)return;
    setBusy(true);setMessage('');
    try{
      if(platformKey==='meta'){
        const {data,error}=await browserClient().functions.invoke('engaje-integrations',{body:{action:'connect',organizationId:selected.id,provider:'meta_ads'}});
        if(error){const context=(error as {context?:Response}).context;const payload=context?await context.json().catch(()=>null):null;throw new Error(payload?.message||error.message);}
        if(!data?.url)throw new Error(data?.message||'A Meta não retornou o endereço de autorização.');
        window.location.assign(data.url);
        return;
      }
      setOpen(false);
      router.push(`/${selected.slug}/settings/integrations`);
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível iniciar a integração.');setBusy(false);}
  }

  if(!available)return <Button className="w-full" variant="outline" disabled>Disponível em breve</Button>;
  return <>
    <Button className="w-full" onClick={()=>setOpen(true)}><Plug size={16} /> Iniciar integração <ArrowRight size={16} /></Button>
    {open?<div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby={`start-${platformKey}`}>
      <div className="w-full max-w-lg rounded-3xl border border-primary/30 bg-[#141419] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow mb-2">Iniciar integração</p><h2 className="text-xl font-semibold" id={`start-${platformKey}`}>Escolha o workspace de destino</h2><p className="muted mt-2 text-sm">As contas e ativos descobertos ficarão visíveis somente dentro do workspace selecionado.</p></div><button type="button" className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white" onClick={()=>setOpen(false)} aria-label="Fechar"><X size={18} /></button></div>
        <label className="mt-5 block text-sm font-medium">Workspace<select className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f1015] px-4 py-3 text-sm" value={organizationId} onChange={(event)=>setOrganizationId(event.target.value)}><option value="">Selecione um workspace</option>{workspaces.map((workspace)=><option value={workspace.id} key={workspace.id}>{workspace.name}</option>)}</select></label>
        {message?<p className="mt-3 text-sm text-red-300" role="alert">{message}</p>:null}
        {!workspaces.length?<p className="mt-3 text-sm text-amber-300">Cadastre um cliente antes de iniciar uma integração.</p>:null}
        <div className="mt-6 flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</Button><Button disabled={busy||!selected} onClick={start}>{busy?'Conectando…':'Continuar'}</Button></div>
      </div>
    </div>:null}
  </>;
}
