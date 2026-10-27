import {Card} from '@/components/ui/card';
/** Date recovery is an explicit navigation; only known non-date filters survive. */
export function InvalidReportFilters({search}:{search:Record<string,unknown>}){
 const query=new URLSearchParams();
 for(const key of ['platform','account','campaign','source','currency','compare']){
  const value=search[key];if(typeof value==='string'&&value.length<=512)query.set(key,value);
 }
 return <Card><div role="alert"><h1 className="text-xl font-semibold">Não foi possível validar o período</h1>
  <p className="mt-3 text-sm text-zinc-400">Informe datas válidas no formato AAAA-MM-DD, com início até o fim e intervalo de até dois anos. Nenhum relatório de outro período foi gerado.</p></div>
  <a className="mt-4 inline-flex rounded-xl border border-primary/30 px-4 py-2 text-sm font-semibold text-primary" href={'?'+query.toString()}>Restaurar período padrão</a>
 </Card>;
}
