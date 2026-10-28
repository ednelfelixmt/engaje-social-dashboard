# METRIC-GUIDE-001 — Guia privado de métricas

Versão do contrato: 2026-10-27.1. A rota reports/methodology oferece busca literal por nome, chave e definição, filtros por categoria, contexto e estado do contrato, e leitura das condições de cálculo. É evolução do catálogo existente: 79 definições, com as mesmas chaves, grupos, scopes, platforms, availability, opções e presets. A quantidade exibida conta definições, não medições recebidas.

## Autorização e dados

A rota força execução dinâmica, valida tenant e configuração da própria organização e exige overview habilitado. Administradores e viewers autorizados podem consultar; não há edição, fato financeiro, segredo, exportação pública ou leitura de medições/Storage. Configuração estrangeira ou página desabilitada interrompe antes da seleção. O formulário GET aceita somente q (texto de até120 caracteres) e allowlists de grupo/contexto/estado; arrays, null, valores vazios explícitos de seleção e desconhecidos falham com mensagem genérica. Texto é normalizado por acento/caixa e pesquisado literalmente, sem regex construída do usuário. HTML é escapado pelo React. Nenhuma falha reflete diagnóstico privado.

## Contrato por contexto

A implementação utiliza o catálogo como fonte de identidade e descreve cada contexto separadamente. As oito métricas básicas de mídia paga documentam somas de valores recebidos e razões de totais (CTR, CPC, CPM, CPL), em coerência com paidTotals; zero observado é preservado e divisor zero/ausência/valor inválido permanece indisponível. Janela, moeda, atribuição e completude precisam ser compatíveis. Leads não significam pessoas únicas nem soma automática de tipos de conversão.

Chaves iguais em orgânico/CRM não herdam as fórmulas pagas. O estado exige contrato da fonte é um requisito de interpretação, não uma sondagem do estado real do conector. Receita e ROAS exigem conciliação compatível; lucro/ROI não têm fórmula operacional sem custos financeiros completos. Alcance, frequência e únicos exigem deduplicação e janela compatível; não somar estoques/públicos sobrepostos. Seguidores são estoque, sem crescimento presumido.

Os contadores orgânicos documentados de Facebook/Instagram são snapshots recebidos por conteúdo; não representam atividade do período nem garantem que todo campo existe em toda plataforma. Curtidas/reactions não são tratadas como equivalentes; salvamentos não são inferidos no Facebook. Taxa de engajamento e crescimento ficam sem fórmula operacional até janela/denominador confirmados. Ações em links mantêm o aviso de mapeamento Instagram pendente.

## Catálogo e configuração

O seletor continua com seus handlers, opções, chaves persistidas e presets; textos agora distinguem seleção de recebimento e homologação. Availability continua sendo configuração do catálogo. Descrições de lucro/ROI, leads, únicos e orgânico foram esclarecidas, sem mudança de enumeração ou cálculo existente. O hash sintético do contrato de configuração anterior/posterior (79chaves) é87679248d0e71414224ed019a6041e3da9fa35445d1bdd0f9dd0ab66ff2411be.

## Verificação e limites

Testes sintéticos cobrem identidade de catálogo, fórmulas pagas ponderadas/ausência, limites financeiros/não aditivos/orgânicos, pesquisa e parâmetros inválidos, seleção preservada, renderização escapada, autorização/configuração e ausência de leitura de fatos. Navegação segue overview para viewer; sonda HTTP anônima da nova rota amplia a verificação para16 caminhos. Revisão independente Codex sem impedimento concreto. Não confundir doubles/testes sintéticos com homologação autenticada de fontes ou experiência visual.

Não há alteração de SQL, migração, Supabase config/Auth/RLS/Storage/Edge/OAuth, dependências/lockfile, privilégios ou dado real como fixture. O guia não resolve DATA-ORG-PERIOD-001, SEC-010/011, UX-002, OAuth real, PDFs visuais, SMTP adiado ou divergência #211. Rollback isolado de guia/navegação/textos se houver regressão comprovada, preservando guardas e correções já integradas. Publicação exige Quality Gate e Vercel READY/success no mesmo head e verificação separada de produção.

Evidência local final:681 testes,140 SQL sintéticos, tipos, lint, arquitetura e guard aprovados. Build interrompido por EPERM mkdir no prerender interno do Next no Windows, após compilação/tipos;16 GETs locais não executados sem build completo. CI Linux/Vercel obrigatórios. Claude diff sem resposta verificável, limitação registrada.
