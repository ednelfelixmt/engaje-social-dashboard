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

/** Aggregate only authorized tenant health on the server, never account identifiers. */
export type OperationalConnectionRecord=OperationalIntegration&{organization_id:string;last_synced_at:string|null};
export type ClientConnectionSummary={organizationId:string;connected:number;attention:number;pending:number;inactive:number;lastSyncedAt:string|null};

export function summarizeClientConnectionHealth(allowedOrganizationIds:readonly string[],rows:readonly OperationalConnectionRecord[]):ClientConnectionSummary[] {
  const summaries=new Map<string,ClientConnectionSummary>();
  for(const organizationId of allowedOrganizationIds){
    if(!summaries.has(organizationId))summaries.set(organizationId,{organizationId,connected:0,attention:0,pending:0,inactive:0,lastSyncedAt:null});
  }
  for(const row of rows){
    const current=summaries.get(row.organization_id);
    if(!current||!visibleOperationalIntegration(row))continue;
    const key=integrationHealth(row).key;
    current[key]+=1;
    const timestamp=row.last_synced_at;
    if(timestamp&&Number.isFinite(Date.parse(timestamp))&&(!current.lastSyncedAt||Date.parse(timestamp)>Date.parse(current.lastSyncedAt)))current.lastSyncedAt=timestamp;
  }
  return [...summaries.values()];
}
