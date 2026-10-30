'use client';
import {useState} from 'react';

export function ClientLogo({name,url}:{name:string;url?:string|null}) {
  const [failed,setFailed]=useState(false);
  return <span className="admin-client-logo">{url&&!failed?<img src={url} alt={`Logo de ${name}`} onError={()=>setFailed(true)}/>:<b aria-hidden>{name.trim().split(/\s+/).map(word=>word[0]).slice(0,2).join('')}</b>}</span>;
}
