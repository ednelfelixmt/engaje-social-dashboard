'use client';
import {useFormState,useFormStatus} from 'react-dom';
import type {ActionState} from '@/components/action-form';
import {Button} from '@/components/ui/button';
function Submit({mode}:{mode:'request'|'update'}){const {pending}=useFormStatus();return <Button className="w-full" disabled={pending}>{pending?'Aguarde…':mode==='request'?'Solicitar link de recuperação':'Salvar nova senha'}</Button>;}
export function PasswordRecoveryForm({action,mode}:{action:(previous:ActionState,data:FormData)=>Promise<ActionState>;mode:'request'|'update'}){
  const [state,form]=useFormState(action,{ok:false,message:''});
  if(state.ok)return <div className="space-y-4"><p role="status" className="text-sm leading-6 text-emerald-300">{state.message}</p></div>;
  return <form action={form} className="space-y-5">
    {mode==='request'?<label>E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="voce@empresa.com.br"/></label>:<>
      <label>Nova senha<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72}/><span className="muted text-xs">Use pelo menos 12 caracteres.</span></label>
      <label>Confirmar nova senha<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={72}/></label></>}
    {state.message?<p role="alert" className="text-sm text-rose-300">{state.message}</p>:null}
    <Submit mode={mode}/>
  </form>;
}
