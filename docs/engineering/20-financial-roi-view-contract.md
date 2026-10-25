# ANA-011 — ROI financeiro indisponível sem custos completos

Data: 25/10/2026. Ciclo 05 em validação; preserva a entrega administrativa do PR #145.

## Comportamento

A interface já não inferia lucro/ROI de receita menos gasto em mídia. A view pública daily_performance ainda calculava esse indicador sem custo de produto, operação ou tributos. A nova migração retorna NULL::numeric em roi; não troca um valor desconhecido por zero, margem de mídia ou ROAS. Receita, ROAS, CPA, CTR e os demais campos conservam os contratos existentes. Não há nova fonte financeira nem custo inventado.

A auditoria encontrou drift importante: produção já exige revenue_enabled e publica receita conciliada de CRM/planilha, enquanto o bootstrap local ainda possui fallback de receita publicitária. Esta migração não substitui a view pela cópia do bootstrap. Ela inspeciona a definição normalizada no catálogo PostgreSQL, exige exatamente a expressão legada revisada e substitui somente sua linha de ROI. Se a expressão for inesperada, falha antes de qualquer alteração. Se roi já for NULL, a reaplicação é idempotente. SECURITY INVOKER é reafirmado; nenhuma política, coluna, origem, grant ou registro de marketing é removido.

## Validação

Sete regressões em Postgres descartável verificam: ROI ausente com ROAS/ratios válidos; zero observado e divisor zero; mesma receita e mesmos campos antes/depois; grants preservados; contrato conservador de produção com revenue_enabled; reaplicação; expressão inesperada; RLS A/B nos dois sentidos; ausência de alteração nos fatos de mídia/CRM. A fixture da view contém somente a estrutura pg_get_viewdef, sem dados de clientes, identificadores ou credenciais.

A suíte verify:schema passa a exigir ROI NULL, sem excluir esse indicador do gate. Os testes SQL não substituem login JWT/HTTP, Storage, OAuth ou homologação visual. O desvio histórico entre bootstrap e produção permanece catalogado para reconciliação integral de schemas; não alterar a política de receita real em nome desta correção financeira.

## Publicação e rollback

Arquivo criado pela CLI oficial: 20261025232744_withhold_unverified_financial_roi.sql. Ordem: validar localmente, Quality Gate/Vercel do mesmo SHA, integrar código e aplicar migração revisada ao projeto Engaje, conferir definição, SECURITY INVOKER e grants. A migração não executa DML em clientes, métricas, Auth ou integrações. Não executar bootstrap sobre produção.

Não restaurar a fórmula antiga para contornar regressão de interface. Se houver problema, preservar ROI indisponível e corrigir somente o consumidor afetado. Se a view inteira exigir restauração, usar sua definição arquivada e manter roi NULL, RLS e grants originais. A migração administrativa anterior teve seu nome alinhado à versão real 20261025230609 registrada pelo servidor; o conteúdo e SHA-256 permanecem os mesmos, sem reaplicação.

Fontes de contrato: documentação do projeto e [PostgreSQL CREATE VIEW](https://www.postgresql.org/docs/current/sql-createview.html). Evidências de implantação serão registradas após os gates. SEC-010/011, SEC-014 e UX-002 continuam abertos.

Validação local final: 246 testes, 140 verificações SQL, lint, tipos, arquitetura e build aprovados. Quatro sondas HTTP anônimas nas RPCs administrativas retornaram 401 / SQLSTATE 42501, com chave publicável e parâmetros nulos, sem alvo gravável. Isso comprova negação anônima nesse caminho, sem substituir JWT A/B ou autorização positiva de administrador.

## Integração e verificação live

PR #150 integrado como 05d435f2193c0f9482e745a4219fa0c7063ca908, após Quality Gate #219 e Vercel no head a3d2504. Migração aplicada: versão real 20261025232744, SHA-256 7e4185ee04361bf3555fdf0536e2e724b6bff8929ac070d969d870131a7c6681. Arquivo criado pela CLI alinhado ao identificador confirmado no servidor, sem alterar o SQL ou reaplicá-lo.

Comparação integral de pg_get_viewdef antes/depois confirmou exatamente uma alteração: expressão roi substituída por NULL::numeric. SECURITY INVOKER continuou true, anon sem SELECT, authenticated e service_role com SELECT. Advisor permaneceu com os mesmos dois WARN e quatro INFO já registrados. Nenhum fato de marketing foi alterado para testes ou implantação.
