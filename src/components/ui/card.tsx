import type {HTMLAttributes} from 'react';import {cn} from '@/lib/utils';
export function Card({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn('rounded-2xl border border-white/10 bg-[#17171E]/95 p-6 shadow-[0_18px_50px_rgba(0,0,0,.16)]',className)} {...props}/>;}
