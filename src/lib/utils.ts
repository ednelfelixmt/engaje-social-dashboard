import {clsx,type ClassValue} from 'clsx'; import {twMerge} from 'tailwind-merge';
export function cn(...inputs:ClassValue[]){return twMerge(clsx(inputs));}
export function number(n:number|null|undefined,digits=0){return n==null?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:digits}).format(n);}
export function money(n:number|null|undefined,currency='BRL'){return n==null?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(n);}
