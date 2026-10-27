import {Card} from '@/components/ui/card';
import type {TargetReference, TargetReferenceReport, TargetStatus} from '@/lib/reports/target-references';
const statusLabels: Record<TargetStatus, string> = {not_configured:'Sem referência',invalid_target:'Cadastro inválido',unsupported:'Aguardando base compatível',currency_mismatch:'Moeda não comparável',insufficient_data:'Dados insuficientes',below:'Abaixo da referência',equal:'Igual à referência',above:'Acima da referência'};
function numeric(value: number) {
 return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:6,notation:value !== 0 && Math.abs(value) < 0.000001 ? 'scientific' : 'standard'}).format(value);
}
function format(value: number | null, row: TargetReference, currency: string) {
 if (value === null) return '—';
 if (row.unit === 'money') return new Intl.NumberFormat('pt-BR',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:6,notation:value !== 0 && Math.abs(value) < 0.000001 ? 'scientific' : 'standard'}).format(value);
 return numeric(value) + (row.unit === 'percent' ? '%' : row.unit === 'ratio' ? 'x' : '');
}
export function TargetReferences({report}: {report: TargetReferenceReport}) {
 const {scope} = report;
 return <article className="space-y-4" aria-label="Referências de desempenho cadastradas">
  <Card><h2 className="text-lg font-semibold">Comparação numérica no recorte selecionado</h2><p className="mt-3 text-sm text-zinc-400">As referências cadastradas não possuem vigência definida. Esta tela não presume meta mensal, ritmo esperado, projeção ou cumprimento de objetivo. Investimento maior ou menor, por si só, não classifica desempenho.</p>
   <p className="mt-3 text-sm text-zinc-400">{report.configured} de 10 referências cadastradas. Período: {scope.from} a {scope.to}. Moeda filtrada: {scope.currency}. Moeda cadastral das referências: {scope.referenceCurrency}. Sem conversão cambial.</p>
  </Card>
  {report.configured === 0 ? <Card><p role="status">A agência ainda não cadastrou referências para este cliente.</p></Card> : null}
  <section className="grid gap-4 md:grid-cols-2" aria-label="Valores e referências">{report.rows.map(row => <Card key={row.field}>
   <h2 className="text-lg font-semibold">{row.label}</h2><p className="mt-2 text-sm text-cyan-200">{statusLabels[row.status]}</p>
   <dl className="mt-4 grid grid-cols-2 gap-4"><div><dt className="text-xs text-zinc-400">Observado no período · {row.unit === 'money' ? scope.currency : 'fonte de anúncios'}</dt><dd className="mt-1 break-words text-xl font-semibold">{format(row.actual,row,scope.currency)}</dd></div><div><dt className="text-xs text-zinc-400">Referência cadastrada · {row.unit === 'money' ? scope.referenceCurrency : row.unit === 'percent' ? '%' : row.unit === 'ratio' ? 'x' : 'contagem'}</dt><dd className="mt-1 break-words text-xl font-semibold">{format(row.target,row,scope.referenceCurrency)}</dd></div></dl>
   {row.difference !== null ? <p className="mt-3 text-sm text-zinc-300">Diferença observada − referência: {row.unit === 'percent' ? numeric(row.difference)+' p.p.' : format(row.difference,row,scope.currency)}</p> : null}
   <p className="mt-3 text-sm text-zinc-400">{row.reason}</p>
   {['target_spend','target_leads','target_cpl','target_ctr'].includes(row.field) ? <p className="mt-2 text-xs text-zinc-500">{row.knownDays} de {report.expectedDays} dias com os componentes informados. Razões usam totais do período; componentes diários iguais a zero não são dados ausentes.</p> : null}
  </Card>)}</section>
  <Card><h2 className="font-semibold">Origem e cobertura</h2><p className="mt-3 text-sm text-zinc-400">{report.sourceRecords} registros de anúncios em {report.receivedDays} de {report.expectedDays} dias. Dias com registros não comprovam que todas as contas e anúncios foram coletados. Ausência, valor inválido, denominador zero ou overflow deixam indicadores indisponíveis. Zero só aparece quando informado.</p>
   <p className="mt-3 text-sm text-zinc-400">Leads são atribuições reportadas pelas plataformas e podem se sobrepor; não são pessoas únicas ou vendas. Leads e CPL exigem janela conhecida e única por conta neste recorte.</p>
   <ul className="mt-3 space-y-1 text-xs text-zinc-500">{report.attribution.map(item => <li key={JSON.stringify([item.platform,item.account])}>{item.platform} · Conta {item.account} · Janela: {item.windows.map(value => value || 'não informada').join(' / ')}</li>)}</ul>
   <p className="mt-3 text-xs text-zinc-500">Datas diárias conforme a fonte, sem conversão. Fuso cadastral: {scope.timezone}. Geração UTC: {scope.generatedAt}.</p>
  </Card>
 </article>;
}
