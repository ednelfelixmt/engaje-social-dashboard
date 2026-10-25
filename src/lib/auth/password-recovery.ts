import {z} from 'zod';

export const recoveryRequestedMessage='Se este e-mail estiver cadastrado e a solicitação for aceita, você receberá um link para redefinir a senha. Confira também a pasta de spam.';
export const recoveryEmailSchema=z.string().trim().toLowerCase().email().max(254);
const passwordInput=z.object({password:z.string().min(12).refine(value=>new TextEncoder().encode(value).length<=72),confirm:z.string()}).refine(value=>value.password===value.confirm);
export function validateRecoveryPassword(password:unknown,confirm:unknown):{ok:true}|{ok:false;message:string}{
  if(typeof password!=='string'||typeof confirm!=='string')return {ok:false,message:'Informe a nova senha e a confirmação.'};
  if(password!==confirm)return {ok:false,message:'As senhas não coincidem.'};
  if(!password.trim())return {ok:false,message:'Use uma senha com letras, números ou símbolos.'};
  if([...password].length<12)return {ok:false,message:'Use pelo menos 12 caracteres.'};
  if(!passwordInput.safeParse({password,confirm}).success)return {ok:false,message:'A senha excede o tamanho aceito. Reduza o comprimento.'};
  return {ok:true};
}
/** Only trusted server configuration supplies this origin, never request headers or a next parameter. */
export function passwordRecoveryOrigin(value?:string):string{
  const url=new URL(value??'https://mediahub.engajeperformance.com.br');
  if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||
    (url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))throw new Error('Invalid application origin');
  return url.origin;
}
