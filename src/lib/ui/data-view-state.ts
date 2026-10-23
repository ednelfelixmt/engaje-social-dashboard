export type DataViewState<T> =
 | {status:'loading'}
 | {status:'empty'}
 | {status:'error';message?:string}
 | {status:'unavailable';reason:string}
 | {status:'ready';data:T};

export function resolveDataView<T>(options:{loading:boolean;error?:unknown;available:boolean;items?:readonly T[]|null}):DataViewState<readonly T[]>{
 if(options.loading)return {status:'loading'};
 if(options.error)return {status:'error'};
 if(!options.available)return {status:'unavailable',reason:'Fonte de dados não disponível'};
 if(options.items==null)return {status:'unavailable',reason:'Dados ainda não sincronizados'};
 if(options.items.length===0)return {status:'empty'};
 return {status:'ready',data:options.items};
}
