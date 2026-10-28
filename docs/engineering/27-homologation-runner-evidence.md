# HOM-RUN-001 — Evidência real no executor de homologação

Registro de 28/10/2026. Código de teste operacional, sem mudança de autorização do aplicativo. Não representa homologação comercial.

## Revisão Claude e conferência do Codex

A consulta foi concluída com a instalação oficial existente Claude Code 2.1.302 (WinGet), usando a sessão renovada. A instalação legada 2.1.91 falhava na renovação/retorno. Parecer e revisões incrementais foram produzidos pelo modelo efetivamente retornado pela API, claude-sonnet-5-5. Não houve instalação nova, troca de modelo solicitada ao executor ou exposição de credenciais. Os códigos temporários do fluxo foram removidos e não integram o repositório.

Claude analisou fontes enviadas; não executou testes, banco, navegador ou homologações. Codex conferiu os achados, implementou as correções e executou verificações. O parecer preliminar não é evidência automática: ativos A/B já existentes foram confirmados, a alternativa de upload opcional não foi apagada, e os workflows compatíveis mantiveram seus nomes/secrets.

Inspeção live apenas de metadados no projeto Engaje confirmou as 12 superfícies como tabelas, RLS habilitado e o campo de escopo esperado. Onze têm grant SELECT para authenticated; integrations não tem esse grant. Isso é evidência estrutural, não prova JWT/HTTP. Não conceder SELECT em integrations para fazer o teste passar.

## Contrato do executor

- O modo existing exige o ACK, usuários e organizações exatamente autorizados nas constantes do runner. IDs diferentes ou modo desconhecido não caem silenciosamente no modo .test. O modo .test independente continua disponível. Os três entrypoints classificam a chave antes de criar clientes: aceitam publishable ou anon legado e recusam também service_role codificado em JWT. Essa inspeção de formato não valida assinatura nem concede acesso; o backend continua responsável por autenticá-la.
- O mapa fixa as 12 tabelas, seu campo de organização e o contrato scoped/denied. Não inclui tabelas globais, compartilhadas ou views.
- Nas 11 superfícies scoped, cada identidade precisa de ownCount exato, inteiro seguro e maior que zero. Sem linha sintética, erro, grant negado ou count ausente, o resultado é NOT PROVEN com saída diferente de zero.
- Sondas HEAD de contagem não retornam linhas. A consulta neq ao tenant próprio precisa contar zero linhas; valor positivo é violação observada. A contagem sem filtro precisa concordar com a própria; divergência é NOT PROVEN, pois requisições separadas não formam snapshot transacional e alterações simultâneas podem mudar totais.
- Para integrations, own/neq/sem filtro e a seleção cruzada precisam ser negadas com SQLSTATE 42501, data null e count sem dados. Usa GET com limit=0 para manter o corpo do erro sem retornar linhas; HEAD real não preserva SQLSTATE. Uma consulta aceita viola o contrato administrativo; outro erro não prova isolamento. Não exige inventar fatos nem ampliar privilégio de viewer.
- Seleções cruzadas continuam nos dois sentidos. Erro de serviço/fixture ausente é diferente de linha estrangeira ou URL alheia efetivamente retornada.
- Signed URL própria precisa ter HTTPS, origem Supabase exata, caminho do objeto configurado, token e ausência de credenciais embutidas. A comparação considera codificação equivalente de nomes válidos. O fetch tem timeout e redirects manuais: somente 200, primeiro chunk não vazio e cancelamento do stream. URL, token e corpo não são impressos.
- Os três executores usam signOut com scope local. Staging também limpa sessão criada por login parcial; erros de serviço são sanitizados e falhas de cleanup não substituem o resultado original.

## O que os testes provam

Produção e staging compartilham o controle de leitura positiva. Atribuições ativas de ativos precisam de lista completa (count exato, limite 101 para detectar excesso sobre 100) e IDs disjuntos; compartilhamento ambíguo é NOT PROVEN.

Os testes executam os módulos reais com doubles explícitos do SDK, process e fetch. Não substituem stdout global nem usam rede/credenciais reais. Cobrem controles positivos, contagens vazias/invalidas, falta de grant inesperada, negação administrativa esperada, vazamento observado, inconsistência de contagens, identidades/organizações, canários de segredo, URL fora de escopo, redirect/timeout/corpo vazio e cleanup após falhas. Uma regressão adicional usa o SDK PostgREST efetivamente instalado com transporte HTTP sintético para comprovar a diferença HEAD/GET.

A validação do runner não altera dados, schema, SQL/migrações, RLS, Auth, Storage, Edge, OAuth, billing, segredos ou dependências. Nenhum cliente real serve de fixture. O arquivo de teste e o helper não são código de autenticação do produto.

## Pré-requisitos que continuam operacionais

O último levantamento confirmou os dois viewers sintéticos e um ativo atribuído por tenant; os dois arquivos privados e os secrets ainda não estavam preparados. O ambiente phase02-homologation foi criado e conferido no GitHub em 28/10: revisor obrigatório ednelfelixmt, bypass administrativo desabilitado e somente a branch main (nenhuma tag). Não há secrets ou variáveis nesse ambiente; nenhuma execução autenticada foi disparada. Agora também são necessários fatos sintéticos positivos nas 11 superfícies scoped, respeitando FKs e contratos. As duas organizações, memberships e ativos existentes não são prova de dados nas demais tabelas. Preparar um plano de fixtures/remoção separado, sem usar registros de clientes ou inserir Auth/Storage por SQL.

O workflow final usa cinco PHASE02 secrets no ambiente phase02-homologation, restrito à main e com aprovação; o caminho manual de arquivos usa provision_private_fixtures=false e dispensa service role no GitHub. O workflow alternativo MEDIAHUB permanece compatível. Ver 26-final-homologation-execution.md.

Mesmo após um PASS real de leitura, continuam separados: escrita negativa DML/RPC/Storage, expiração/refresh/revogação de sessão, UX autenticada A/B e agência, OAuth e fontes reais, janela orgânica, PDFs visuais, SMTP adiado e reconciliação #211. Não fechar SEC-010/011 nem o app inteiro por testes com doubles.

## Liberação e rollback

Integrar somente após revisão, Quality Gate completo e Vercel success/READY no mesmo head. Confirmar main e produção separadamente. As alterações são dos scripts de aceitação: um rollback isolado não autoriza mudar grants/policies ou usar um runner menos rigoroso como prova equivalente. Resultados finais e identificadores dos gates serão registrados no PR e no recibo do ciclo.


## Validação do pacote em 28/10/2026

Base main 5f974513a4426a9c5e4525facff038679072ac25, preservando PRs 228, 229 e 230. Codex executou a suíte completa: 720 testes aprovados, 140 verificações SQL sintéticas, lint, TypeScript, arquitetura e guarda local de migrações aprovados. Os 29 testes direcionados de configuração/runtime também passaram antes da combinação. Nenhum deles usa credenciais reais. Build e sondas HTTP devem passar no Quality Gate Linux do head final; não há novo resultado de build local Windows neste ciclo (limitação ENV-BUILD-003 já registrada).

O parecer conclusivo do Claude não identificou bloqueador concreto no contrato principal após as correções. A dúvida de sua revisão parcial sobre o teste staging de chave foi conferida no helper: MEDIAHUB_PUBLISHABLE_KEY é mapeada a STAGING_SUPABASE_PUBLISHABLE_KEY antes da chamada; as regressões exigem a mensagem específica da guarda, zero clientes e zero consultas. Não havia defeito nesse mapeamento. Isso é revisão estática conferida, não homologação autenticada. CI, Vercel e produção exigem recibos independentes no PR.
