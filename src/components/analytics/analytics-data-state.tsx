import type {ReactNode} from 'react';
import type {DataViewState} from '@/lib/ui/data-view-state';

type Props<T> = {state:DataViewState<T>;children:(data:T)=>ReactNode;emptyLabel?:string};

export function AnalyticsDataState<T>({state,children,emptyLabel='Nenhum dado encontrado para os filtros selecionados.'}:Props<T>){
 switch(state.status){
 case 'loading':return <div role="status" aria-live="polite" className="rounded-lg border p-5 text-sm text-slate-600">Carregando dados…</div>;
 case 'error':return <div role="alert" className="rounded-lg border border-red-200 p-5 text-sm text-red-700">Não foi possível carregar os dados. Tente novamente.</div>;
 case 'unavailable':return <div role="status" className="rounded-lg border p-5 text-sm text-slate-600">{state.reason}</div>;
 case 'empty':return <div role="status" className="rounded-lg border p-5 text-sm text-slate-600">{emptyLabel}</div>;
 case 'ready':return <>{children(state.data)}</>;
 }
}
