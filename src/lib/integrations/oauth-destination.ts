const authorizationHosts=new Set(['www.facebook.com','accounts.google.com','business-api.tiktok.com','www.tiktok.com']);

export function oauthDestination(value:unknown):string {
  if(typeof value!=='string')throw new Error('Endereço de autorização ausente.');
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port||!authorizationHosts.has(url.hostname))throw new Error('Destino de autorização inválido.');
  return url.href;
}
