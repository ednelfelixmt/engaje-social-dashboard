'use client';

import {useState} from 'react';
import {Trash2, Unplug, X} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {browserClient} from '@/lib/supabase/browser';
import {Button} from '@/components/ui/button';

type Mode = 'disconnect' | 'delete';

export function ClientLifecycleControls({organizationId, organizationName}:{organizationId:string;organizationName:string}) {
  const router=useRouter();
  const [mode,setMode]=useState<Mode|null>(null);
  const [confirmation,setConfirmation]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const expected=mode==='delete'?organizationName:'DESCONECTAR';
  const valid=confirmation===expected;

  function close(){if(busy)return;setMode(null);setConfirmation('');setMessage('');}

  async function submit(){
    if(!mode||!valid)return;
    setBusy(true);setMessage('');
    try{
      const action=mode==='delete'?'delete_client':'disconnect_client';
      const {data,error}=await browserClient().functions.invoke('engaje-integrations',{body:{action,organizationId,confirmation}});
      if(error){
        const context=(error as {context?:Response}).context;
        const payload=context?await context.json().catch(()=>null):null;
        throw new Error(payload?.message||error.message);
      }
      if(mode==='delete'){
        setMode(null);
        setConfirmation('');
        setMessage('');
        router.refresh();
        return;
      }
      setMessage(data?.message||'Integrações desconectadas.');
      setConfirmation('');
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível concluir a operação.');}
    finally{setBusy(false);}
  }

  return <>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={()=>setMode('disconnect')}><Unplug size={16}/> Desconectar integrações</Button>
      <Button className="border-red-500/30 text-red-300 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-200" variant="outline" onClick={()=>setMode('delete')}><Trash2 size={16}/> Excluir cliente</Button>
    </div>
    {mode?<div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="client-lifecycle-title">
      <form className="w-full max-w-lg rounded-3xl border border-red-500/30 bg-[#141419] p-6 shadow-2xl" onSubmit={(event)=>{event.preventDefault();void submit();}}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="eyebrow mb-2">Ação administrativa</p><h2 className="text-xl font-semibold" id="client-lifecycle-title">{mode==='delete'?'Excluir cliente permanentemente':'Desconectar todas as integrações'}</h2></div>
          <button type="button" className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white" onClick={close} aria-label="Fechar"><X size={18}/></button>
        </div>
        <p className="mt-4 text-sm leading-6 text-zinc-300">{mode==='delete'?<>Esta ação excluirá <strong>{organizationName}</strong>, seus dashboards, usuários vinculados, métricas e configurações. Não pode ser desfeita.</>:<>O cliente será preservado, mas contas, ativos e dados importados pelas integrações serão removidos. Conexões globais da agência continuarão disponíveis.</>}</p>
        <label className="mt-5 block text-sm font-medium">Digite <strong className="text-white">{expected}</strong> para confirmar<input className="mt-2" autoComplete="off" autoFocus value={confirmation} onChange={(event)=>setConfirmation(event.target.value)}/></label>
        {message?<p className={`mt-3 text-sm ${message.includes('desconectadas')?'text-emerald-300':'text-red-300'}`} role="status">{message}</p>:null}
        <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" disabled={busy} onClick={close}>Cancelar</Button><Button type="submit" className={mode==='delete'?'bg-red-500 text-white hover:bg-red-400':''} disabled={busy||!valid}>{busy?'Processando…':mode==='delete'?'Excluir definitivamente':'Desconectar integrações'}</Button></div>
      </form>
    </div>:null}
  </>;
}
