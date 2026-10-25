/** Runtime-independent authorization boundary shared by HTTP actions and OAuth. */
export class AgencyAuthorizationError extends Error {
 constructor(message:string,readonly status:401|403){super(message);this.name='AgencyAuthorizationError';}
}

export type AgencyAuthClient={
 auth:{getUser():PromiseLike<{data:{user:{id:string}|null};error:unknown}>};
 rpc(name:'is_super_admin'):PromiseLike<{data:unknown;error:unknown}>;
};

/** Verify the token with Auth, then require a positive database authorization. */
export async function requireAgencyAdministrator<T extends AgencyAuthClient>(
 authorization:string|null,
 createClient:(authorization:string)=>T,
):Promise<{client:T;user:{id:string}}>{
 if(!authorization||!/^Bearer [^\s]+$/i.test(authorization))
  throw new AgencyAuthorizationError('Sessão necessária.',401);
 const client=createClient(authorization);
 const {data,error}=await client.auth.getUser();
 if(error||!data.user)throw new AgencyAuthorizationError('Sessão expirada.',401);
 const {data:authorized,error:roleError}=await client.rpc('is_super_admin');
 if(roleError||authorized!==true)
  throw new AgencyAuthorizationError('Somente administradores da agência podem gerenciar integrações.',403);
 return {client,user:data.user};
}

/** Revalidate the initiating actor at callback time, after signed state validation. */
export function isActiveAgencyAdministrator(value:unknown):boolean{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const membership=value as Record<string,unknown>;
 const organization=membership.organizations;
 if(!organization||typeof organization!=='object'||Array.isArray(organization))return false;
 const agency=organization as Record<string,unknown>;
 return membership.is_active===true&&membership.role==='super_admin'
  &&agency.is_agency===true&&agency.status==='active';
}
