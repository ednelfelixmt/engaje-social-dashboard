/** Classifies test API keys only; the backend still verifies signatures and authorization. */
export function isPublicSupabaseKey(value:unknown):value is string{
 if(typeof value!=='string'||value.length<20||value.trim()!==value)return false;
 if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(value))return true;
 const parts=value.split('.');
 if(parts.length!==3||parts.some(part=>!part||/[^A-Za-z0-9_-]/.test(part)))return false;
 try{
  const payload:unknown=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
  return !!payload&&typeof payload==='object'&&!Array.isArray(payload)&&'role' in payload&&payload.role==='anon';
 }catch{return false;}
}
