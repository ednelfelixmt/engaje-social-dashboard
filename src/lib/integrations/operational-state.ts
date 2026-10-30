export type OperationalIntegration={status:string;is_enabled:boolean;external_account_id:string;config:unknown};

export function visibleOperationalIntegration(item:OperationalIntegration) {
  const config=item.config&&typeof item.config==='object'&&!Array.isArray(item.config)?item.config as Record<string,unknown>:{};
  return config.hidden!==true&&config.selection_pending!==true&&!/^(foundation|pending):/.test(item.external_account_id);
}

export function integrationHealth(item:Pick<OperationalIntegration,'status'|'is_enabled'>) {
  if(item.status==='expired')return {key:'attention',label:'Reconectar autorização',tone:'warning'};
  if(item.status==='error')return {key:'attention',label:'Falha na integração',tone:'danger'};
  if(item.status==='connected'&&item.is_enabled)return {key:'connected',label:'Conexão habilitada',tone:'good'};
  if(item.status==='syncing')return {key:'pending',label:'Sincronizando',tone:'neutral'};
  if(item.status==='pending')return {key:'pending',label:'Configuração pendente',tone:'neutral'};
  return {key:'inactive',label:item.status==='disconnected'?'Desconectada':'Desabilitada',tone:'neutral'};
}
