import type {ReactNode} from 'react';
import {LoginStage} from './login-stage';
import {ZfMark} from './zf-crown';
export function AuthCard({title,children}:{title:string;children:ReactNode}){
  return <main className='zf-login'><LoginStage/><section className='zf-card'><ZfMark className='zf-mark--sm'/><h1>{title}</h1><div className='zf-body'>{children}</div></section></main>;
}
