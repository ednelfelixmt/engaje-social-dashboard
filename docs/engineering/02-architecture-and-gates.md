# Engaje Intelligence — Arquitetura-alvo, ADRs e gates
Status: arquitetura **proposta**, ainda não homologada.

## ADR-001: monólito modular como núcleo inicial
Contexto: crescimento por clientes e integrações, porém dados e equipe não justificam microserviços imediatos.
Decisão: Next.js/TypeScript com módulos de domínio explícitos (identity, organizations, integrations, analytics, audiences, funnels, growth, reporting), APIs/BFF autorizados e workers de coleta isolados.
Consequência: limites de domínio e módulos testáveis antes de serviços distribuídos. Reavaliar por SLO, volume e equipes.

## ADR-002: fonte operacional vs. base analítica
PostgreSQL mantém entidades transacionais; fatos de marketing usam grãos declarados e contratos Bronze → Silver → Gold. Não misturar respostas de APIs diretamente em gráficos.
Fatos distintos para desempenho de anúncios, detalhamentos demográficos e métricas comerciais; evitar junções que multipliquem investimento.

## ADR-003: autorização positiva e isolation by default
Identidade independente de permissões. Tenant obrigatório na aplicação e no banco; RLS, autorização da API, cache por escopo, objetos privados, credenciais protegidas. Nunca aceitar organization_id informado no frontend como autorização.
Ferramentas MCP herdam escopo e privilégios; execuções de escrita exigem políticas e aprovação.

## ADR-004: engine semântica independente da interface
Indicador = contrato com ID, versão, formula, fontes, grão, moeda, janela de atribuição, dimensões, agregabilidade e tratamento null.
Gráficos recebem datasets validados, não calculam a definição canônica de negócios.

## ADR-005: design governado por evidências
Design System compartilhado, biblioteca de gráficos, padrões de filtros/drill-down/estados, WCAG 2.2 AA e revisão visual responsiva. Cada tipo de gráfico responde uma pergunta.
No data => indisponível; nunca inventar barras, cidades, sexo×idade, receita ou sessões GA4.

## C4 nível 1 (contexto)
```mermaid
flowchart LR
    U["Executivo, analista ou admin"] --> WEB["Engaje Intelligence"]
    WEB --> ID["Serviço de identidade / autorização"]
    WEB --> DATA["Dados e relatórios do tenant"]
    WEB --> API["APIs de Meta, Google, TikTok, CRM etc."]
    WEB --> OBJ["Storage e filas"]
```

## C4 nível 2 (containers lógicos)
```mermaid
flowchart TD
    Web["Web Next.js"] --> BFF["BFF / Application Use Cases"]
    BFF --> Domain["Domain Services: identity, organizations, metrics, growth"]
    BFF --> Pg["PostgreSQL + RLS"]
    Workers["Workers / Supabase Edge Functions"] --> Connectors["Platform Adapters"]
    Connectors --> Providers["APIs externas"]
    Workers --> Raw["Raw/Storage"]
    Raw --> Models["Silver + Gold models"]
    Models --> Pg
    BFF --> Models
```

## ADR-006: avanço contínuo por riscos e dívida técnica rastreável
Aprovada a política de **gates proporcionais ao risco** (2026-10-22): uma pendência P2/P3 não essencial pode ser adiada para issue com evidência, responsável, dependência, prazo-alvo e teste de aceite. P0/P1 **confirmado** não pode ser ignorado para deploy/ativação da operação afetada. Pendências P0/P1 ainda **não verificadas** exigem contenção da superfície (feature flag, deny-by-default, manter rota restrita ou bloqueio de operação sensível) e validação obrigatória antes de exposição a terceiros.

Estados distintos: `FASE_CONCLUIDA` = todos os itens obrigatórios homologados; `FASE_ENCERRADA_COM_RESSALVAS` = núcleo obrigatório verificado e pendências não bloqueantes rastreadas; `TRILHA_SEGUINTE_INICIADA` = execução paralela autorizada sem afirmar homologação da fase anterior; `BLOQUEADA_POR_RISCO` = falha crítica confirmada na operação afetada.

Uma fase com gate aberto **não paralisa o trabalho de baixo risco** da próxima; separa-se o estado de homologação do andamento da engenharia. Mudança de produção sensível exige seus próprios testes, independentemente do status do roadmap. Nenhuma alteração destrutiva sem backup, reversão e aprovação.

## Checklist de encerramento de fase (gate)
1. Requisitos e rastreabilidade (FR/NFR) implementados e documentados.
2. Revisão de código, segurança de dependências, migrações e segredos.
3. Testes unitários, integração e E2E pertinentes aprovados.
4. Isolamento por empresa, papéis e scope da API comprovados.
5. Fórmulas, datasets e atualidade reconciliados (se aplicável).
6. UX: testes reais com navegação, filtros, compreensão, empty states, teclado e responsividade.
7. Logs, alertas, procedimento rollback, relatório de release e aprovação.
8. Sem P0/P1 **confirmado sem contenção** no fluxo que será exposto. P0/P1 não verificado impede *homologação de segurança*, mas não inicia bloqueio global do desenvolvimento.
9. P2/P3 diferidos têm issue, evidência, responsável, risco, prazo e critério de aceite; o diferimento é documentado, nunca silencioso.
10. Registre separadamente **status da fase**, **risco de produção** e **status da trilha seguinte**. A homologação só é `FASE_CONCLUIDA` com evidência positiva de todos os requisitos aplicáveis.

## Política de migração
- Criar branch por lote coeso, PR pequeno com testes e plano de reversão.
- Não alterar produção por alterações de esquema sem migração/reversão e backup verificado.
- Não copiar segredos ou payloads pessoais para PRs, logs, relatórios de diagnóstico.
- Publicação só após validação de preview + autorização de mudança de risco.
- Próxima trilha de **engenharia não destrutiva** pode começar com gate anterior aberto se houver isolamento de riscos e tarefas rastreáveis; liberar funcionalidades a usuários exige gate próprio e evidência.
- Publicações devem preferir mudanças reversíveis, com monitoramento após release.
