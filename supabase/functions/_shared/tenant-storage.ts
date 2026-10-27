/** Enumerate a tenant prefix fully before allowing irreversible database deletion. */
type StorageEntry={name:string;id:string|null};
type StorageBucket={
 list(prefix:string,options:{limit:number;offset:number;sortBy:{column:string;order:'asc'}}):
  PromiseLike<{data:StorageEntry[]|null;error:unknown}>;
 remove(paths:string[]):PromiseLike<{error:unknown}>;
};
const pageSize=100;
export async function listTenantStorage(bucket:StorageBucket,organizationId:string):Promise<string[]>{
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId))
  throw new Error('Prefixo de cliente inválido.');
 const pending=[organizationId];
 const paths:string[]=[];
 for(let index=0;index<pending.length;index++){
  const prefix=pending[index];
  for(let offset=0;;offset+=pageSize){
   const {data,error}=await bucket.list(prefix,{limit:pageSize,offset,sortBy:{column:'name',order:'asc'}});
   if(error||!Array.isArray(data))throw new Error('Não foi possível conferir os arquivos do cliente. Tente novamente antes de excluir.');
   for(const item of data){
    if(!item||typeof item.name!=='string'||!item.name||item.name==='.'||item.name==='..'||/[\\/]/.test(item.name))
     throw new Error('Nome de arquivo inválido na conferência do cliente.');
    const path=prefix+'/'+item.name;
    if(item.id===null)pending.push(path);
    else if(typeof item.id==='string'&&item.id)paths.push(path);
    else throw new Error('Arquivo sem identificação na conferência do cliente.');
   }
   if(data.length<pageSize)break;
  }
 }
 return paths;
}
/** Supabase limits remove requests to 1000 keys; keep individual batches small. */
export async function removeTenantStorage(bucket:StorageBucket,paths:string[]):Promise<void>{
 for(let index=0;index<paths.length;index+=pageSize){
  const {error}=await bucket.remove(paths.slice(index,index+pageSize));
  if(error)throw new Error('Alguns arquivos do cliente exigem limpeza técnica.');
 }
}
