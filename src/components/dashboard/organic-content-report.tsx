import {Card} from '@/components/ui/card';
import {OrganicContentExport} from './organic-content-export';
import {organicContentCsv,organicContentFilename} from '@/lib/export/organic-content';
import type {OrganicContentReport} from '@/lib/reports/organic-content';
const platform=(value:string)=>value==='facebook_organic'?'Facebook':'Instagram';
const kindLabels:Record<string,string>={image:'Imagem',video:'Vídeo',carousel:'Carrossel',text:'Texto'};
const value=(number:number|null)=>number===null?'—':new Intl.NumberFormat('pt-BR').format(number);
export function OrganicContentReportView({report}:{report:OrganicContentReport}){
 const {scope}=report;
 return <article aria-label="Relatório privado de conteúdos orgânicos" className="space-y-4">
  <Card><h2 className="text-xl font-semibold">{scope.organizationName}</h2>
   <p className="mt-3 text-sm text-zinc-400">Publicações de {scope.from} a {scope.to}, por data UTC. Fuso cadastral: {scope.timezone}.</p>
   <p className="mt-3 text-sm text-zinc-400">Os valores são contadores acumulados no conteúdo até a última coleta armazenada. Não representam atividade gerada no período de publicação, pessoas únicas ou uma série diária. Não são somados nem comparados entre períodos.</p>
   <p className="mt-3 text-sm text-zinc-400">A primeira coluna reproduz curtidas/reações recebidas. No conector Meta, são curtidas do Instagram e reações totais do Facebook. Salvos são apresentados somente quando informados pelo Instagram. Zero informado é zero; ausência ou valor inválido permanece indisponível.</p>
   <p className="mt-3 text-sm text-zinc-400">{report.rows.length} conteúdo(s) exibido(s). Origem: publicações de Facebook e Instagram recebidas pela integração. Isso não comprova coleta completa das contas e publicações.</p>
   <p className="mt-3 text-xs text-zinc-500">Geração UTC: {scope.generatedAt}. Legendas limitadas a 2.000 caracteres, com indicação de corte.</p>
  </Card>
  {report.truncated?<Card><p role="status">Relatório limitado aos {report.limit} conteúdos mais recentes do recorte. Existem mais registros; reduza o período ou selecione uma plataforma. O CSV contém somente as linhas exibidas.</p></Card>:null}
  <OrganicContentExport content={report.rows.length?organicContentCsv(report):''} filename={organicContentFilename(report)} disabled={!report.rows.length}/>
  {!report.rows.length?<Card><p role="status">Nenhum conteúdo orgânico recebido com publicação neste recorte. Isso não significa ausência de atividade ou contadores iguais a zero.</p></Card>:<Card>
   <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm">
    <caption className="pb-4 text-left text-zinc-400">Última coleta por conteúdo. Datas de publicação e coleta em UTC; contadores não medem somente o período filtrado.</caption>
    <thead><tr>{['Conteúdo / origem','Publicação UTC','Última coleta UTC','Curtidas / reações','Comentários','Compartilhamentos','Salvos'].map(label=><th scope="col" className="p-2" key={label}>{label}</th>)}</tr></thead>
    <tbody>{report.rows.map(row=><tr key={row.id} className="border-t border-white/10 align-top">
     <th scope="row" className="max-w-md whitespace-pre-wrap break-words p-2 font-normal"><span className="font-semibold">{platform(row.platform)} · {kindLabels[row.kind]??row.kind}</span>
      <span className="mt-2 block">{row.caption??'Sem legenda recebida.'}</span>{row.captionTruncated?<small className="block">Legenda truncada.</small>:null}
      <small className="mt-2 block break-all text-zinc-400">Conta {row.account} · Conteúdo {row.externalId}</small></th>
     <td className="p-2"><time dateTime={row.publishedAt}>{row.publishedAt}</time></td>
     <td className="p-2">{row.snapshotValid?<time dateTime={row.collectedAt!}>{row.collectedAt}</time>:<span>Coleta inválida ou não informada; contadores indisponíveis.</span>}</td>
     {[row.likes,row.comments,row.shares,row.saves].map((number,index)=><td key={index} className="p-2 tabular-nums">{value(number)}</td>)}
    </tr>)}</tbody>
   </table></div>
  </Card>}
 </article>;
}
