import type {HTMLAttributes} from 'react';
import {cn} from '@/lib/utils';

export function Card({className, ...props}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass-panel rounded-[22px] p-5 sm:p-6', className)} {...props} />;
}
