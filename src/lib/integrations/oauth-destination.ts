const authorizationHosts=new Set(['www.facebook.com','accounts.google.com','business-api.tiktok.com','www.tiktok.com','accounts.rdstation.com','api.rd.services','app.hubspot.com']);

export function oauthDestination(value:unknown):string {
  if(typeof value!=='string')throw new Error('Endereço de autorização ausente.');
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.port||!authorizationHosts.has(url.hostname))throw new Error('Destino de autorização inválido.');
  if((url.hostname==='api.rd.services'&&url.pathname!=='/auth/dialog')||(url.hostname==='accounts.rdstation.com'&&url.pathname!=='/oauth/authorize')||(url.hostname==='app.hubspot.com'&&url.pathname!=='/oauth/authorize'))throw new Error('Destino de autorização inválido.');
  return url.href;
}
