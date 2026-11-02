# Biblioteca de gráficos (`src/components/charts`)

Uma única camada para todos os gráficos do produto: mesmas cores, mesmos eixos, mesma regra para dado ausente.
A lógica pura fica em `src/lib/charts` (testada em `tests/chart-models.test.ts`); os componentes só desenham.

## Regras que valem para todo modelo

- **Ausência nunca vira zero.** `null` é lacuna ou `—`; zero observado é zero e aparece (marcador na base das colunas).
- **Nada é cortado.** Larguras de eixo vêm do maior rótulo (`numericAxisWidth`, `categoryAxisWidth`); nomes longos quebram em até duas linhas com o texto completo no tooltip nativo; nomes de colunas que não cabem ficam inclinados (`planHorizontalTicks`).
- **Séries são filhos diretos do gráfico** (nunca dentro de `Fragment`); o Recharts não as descobre de outra forma.
- **Cor tem significado fixo.** `primary` = período selecionado; `compare` = histórico (preenchimento claro + contorno); verde/vermelho (`good`/`bad`) só indicam variação favorável/desfavorável, nunca identidade de série; plataformas usam `platformColor`.
- **Quadro com altura explícita.** `ChartFrame` dá altura ao corpo (ou `height="auto"` para rosca/calendário/bullet), estado vazio honesto, legenda real, tabela de dados acessível e título só para leitor de tela quando embutido (`bare hideTitle`).
- **Tema.** Variáveis `--chart-*` em `src/app/chart-kit.css`: escuro por padrão (como o app), claro dentro de `data-studio-theme="day"`.

## Modelos

| Modelo | Componente | Quando usar |
|---|---|---|
| Colunas · linhas · área · degraus | `TimeSeriesChart` (+ `ChartModeSwitch`, `timeSeriesModes`) | evolução no tempo, comparativo, eixo secundário, meta; razões (CPL, CTR) em linha |
| Ranking horizontal | `RankingBarChart` | entidades ordenadas, nomes longos |
| Rosca com total | `DonutChart` | participação (até 8 fatias; o resto vira "Outros") |
| Empilhado · agrupado · 100% | `StackedBarChart` | composição por categoria |
| Pareto | `ParetoChart` | concentração (onde cruza 80%) |
| Dispersão com bolhas | `ScatterBubbleChart` | relação entre duas medidas, medianas em quadrantes |
| Radar | `RadarCompareChart` | perfil de poucas entidades (índice relativo) |
| Medidor | `GaugeChart` | atingimento de meta real |
| Bullet | `BulletChart` | valor contra meta por entidade |
| Calendário de calor | `CalendarHeatmap` | intensidade por dia; sem registro hachurado |
| Cascata | `WaterfallChart` | o que mudou entre dois períodos |
| Inclinação | `SlopeChart` | antes → depois por entidade |
| Histograma | `HistogramChart` | distribuição de uma medida entre entidades |
| Treemap | `TreemapChart` | concentração de orçamento |
| Funil em barras | `FunnelBarsChart` | etapas de eventos (não pessoas) |
| Miniaturas | `Sparkline`, `SmallMultiples` | tendência em pouco espaço |

## Telas já migradas

Visão geral (`executive-overview-v2`), páginas de plataforma (`platform-analytics-v3`), Inteligência (`business-analytics-workbench`), Público (`audience-overview-v3`), Linha do tempo (`charts.tsx`), treemap e cascata (`analytics-chart-library`).

Ainda no código anterior: Análise 360 (`analytics-charts`, `marketing-bi-charts`), Agência (`agency-intelligence-*`) e o cone do funil.
