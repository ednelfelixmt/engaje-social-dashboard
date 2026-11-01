/** The legacy wire status describes stored setup/history, never live provider health. */
export type DiagnosticStatus='receiving'|'ready'|'credentials_ready'|'blocked';
export type DiagnosticItem={key:string;label:string;configured:boolean;account_count:number;row_count:number;status:DiagnosticStatus;next:string};
export const diagnosticCopy:Record<DiagnosticStatus,{label:string;detail:string}>={
 receiving:{label:'Registros armazenados',detail:'Registros históricos não comprovam coleta atual. Confira a autorização e a última sincronização da conta.'},
 ready:{label:'Conta cadastrada',detail:'Há conta e configuração cadastradas; a conexão com o provedor ainda precisa ser validada.'},
 credentials_ready:{label:'Configuração detectada',detail:'A configuração existe no servidor; isso não comprova validade da credencial nem conta vinculada.'},
 blocked:{label:'Configuração necessária',detail:'Conclua os requisitos indicados para esta plataforma.'},
};
export function parseDiagnosticItems(payload:unknown):DiagnosticItem[]{
 const fail=()=>{throw new Error('Invalid diagnostic response');};
 if(!payload||typeof payload!=='object'||Array.isArray(payload))return fail();
 const source=(payload as Record<string,unknown>).items;
 if(!Array.isArray(source)||source.length===0||source.length>20)return fail();
 const keys=new Set<string>();
 return source.map(value=>{
  if(!value||typeof value!=='object'||Array.isArray(value))return fail();
  const item=value as Record<string,unknown>;
  if(typeof item.key!=='string'||!/^[a-z][a-z0-9_]{0,63}$/.test(item.key)||keys.has(item.key))return fail();
  if(typeof item.label!=='string'||!item.label.trim()||item.label.length>160||typeof item.next!=='string'||!item.next.trim()||item.next.length>1000)return fail();
  if(typeof item.configured!=='boolean'||typeof item.status!=='string'||!Object.hasOwn(diagnosticCopy,item.status))return fail();
  if(typeof item.account_count!=='number'||!Number.isSafeInteger(item.account_count)||item.account_count<0||typeof item.row_count!=='number'||!Number.isSafeInteger(item.row_count)||item.row_count<0)return fail();
  keys.add(item.key);
  return {key:item.key,label:item.label,configured:item.configured,account_count:item.account_count,row_count:item.row_count,status:item.status as DiagnosticStatus,next:item.next};
 });
}
