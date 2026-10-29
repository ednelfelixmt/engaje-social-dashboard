import Link from 'next/link';
import {ArrowUpRight,FileBarChart2,Clock3} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {reportCatalog,reportHref,type ReportContext} from '@/lib/reports/report-catalog';
export function ReportCenter({slug,enabled,context}:{slug:string;enabled:string[];context:ReportContext}) {
 return <div className="space-y-5">
  <section aria-label="Relatórios disponíveis" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reportCatalog.map(item=>{
   const available=enabled.includes(item.requires);
   return <Card key={item.path} className="flex flex-col gap-4">
    <div className="flex items-center justify-between gap-3"><FileBarChart2 aria-hidden className="text-primary" size={23}/><span className="text-xs text-zinc-400">{item.formats}</span></div>
    <h2 className="text-lg font-semibold">{item.title}</h2><p className="flex-1 text-sm text-zinc-400">{item.description}</p>
    {available?<Link className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary" href={reportHref(slug,item.path,context)}>Abrir relatório <ArrowUpRight aria-hidden size={17}/><span className="sr-only">: {item.title}</span></Link>:<p className="text-sm text-zinc-500">Desabilitado na configuração deste cliente. Solicite à agência.</p>}
   </Card>;
  })}</section>
  <Card><h2 className="flex items-center gap-2 text-lg font-semibold"><Clock3 aria-hidden size={18}/>Google Analytics · Em preparação</h2><p className="mt-2 text-sm text-zinc-400">O relatório de comportamento no site depende de uma origem GA4 autorizada e ingerida. Cliques de anúncios não são sessões do site.</p></Card>
  <p className="text-xs text-zinc-400">Disponibilidade no menu depende da configuração. A presença de um relatório não comprova conexão, coleta completa ou homologação da origem. Os relatórios sem comparação recebem apenas o período atual.</p>
 </div>;
}
