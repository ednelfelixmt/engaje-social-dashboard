# HOM-RUN-001 — Evidência real no executor de homologação

Registro de 28/10/2026. Código de teste operacional, sem mudança de autorização do aplicativo. Não representa homologação comercial.

## Revisão Claude e conferência do Codex

A consulta foi concluída com a instalação oficial existente Claude Code 2.1.302 (WinGet), usando a sessão renovada. A instalação legada 2.1.91 falhava na renovação/retorno. Parecer e revisões incrementais foram produzidos pelo modelo efetivamente retornado pela API, claude-sonnet-5-5. Não houve instalação nova, troca de modelo solicitada ao executor ou exposição de credenciais. Os códigos temporários do fluxo foram removidos e não integram o repositório.

Claude analisou fontes enviadas; não executou testes, banco, navegador ou homologações. Codex conferiu os achados, implementou as correções e executou verificações. O parecer preliminar não é evidência automática: ativos A/B já existentes foram confirmados, a alternativa de upload opcional não foi apagada, e os workflows compatíveis mantiveram seus nomes/secrets.

A inspeção anterior consultou apenas privilégios de tabela e concluiu incorretamente que integrations inteira deveria negar SELECT. A execução JWT real de 28/10 revelou os grants por coluna: authenticated pode ler metadados seguros sob RLS tenant_read; credential_secret_id é excluída. Isso coincide com supabase/schema.sql e com as consultas do produto. A correção abaixo não altera grants, políticas ou schema.

## Contrato do executor

- O modo existing exige o ACK, usuários e organizações exatamente autorizados nas constantes do runner. IDs diferentes ou modo desconhecido não caem silenciosamente no modo .test. O modo .test independente continua disponível. Os três entrypoints classificam a chave antes de criar clientes: aceitam publishable ou anon legado e recusam também service_role codificado em JWT. Essa inspeção de formato não valida assinatura nem concede acesso; o backend continua responsável por autenticá-la.
- O mapa fixa as 12 tabelas, seu campo de organização e o contrato scoped. Não inclui tabelas globais, compartilhadas ou views.
- Nas 12 superfícies scoped, cada identidade precisa de ownCount exato, inteiro seguro e maior que zero. Sem linha sintética, erro, grant negado ou count ausente, o resultado é NOT PROVEN com saída diferente de zero.
- Sondas HEAD de contagem não retornam linhas. A consulta neq ao tenant próprio precisa contar zero linhas; valor positivo é violação observada. A contagem sem filtro precisa concordar com a própria; divergência é NOT PROVEN, pois requisições separadas não formam snapshot transacional e alterações simultâneas podem mudar totais.
- integrations exige os mesmos positivos e negativos de escopo das outras tabelas para organization_id. Separadamente, três GETs limit=0 de credential_secret_id (own/neq/sem filtro) devem retornar HTTP 403, SQLSTATE 42501, data null e count ausente. Uma consulta aceita nessa coluna é FAIL; erro diverso é NOT PROVEN. HEAD não preserva SQLSTATE. Nenhum valor protegido é solicitado no corpo de sucesso.
- Seleções cruzadas continuam nos dois sentidos. Erro de serviço/fixture ausente é diferente de linha estrangeira ou URL alheia efetivamente retornada.
- Signed URL própria precisa ter HTTPS, origem Supabase exata, caminho do objeto configurado, token e ausência de credenciais embutidas. A comparação considera codificação equivalente de nomes válidos. O fetch tem timeout e redirects manuais: somente 200, primeiro chunk não vazio e cancelamento do stream. URL, token e corpo não são impressos.
- Os três executores usam signOut com scope local. Staging também limpa sessão criada por login parcial; erros de serviço são sanitizados e falhas de cleanup não substituem o resultado original.

## O que os testes provam

Produção e staging compartilham o controle de leitura positiva. Atribuições ativas de ativos precisam de lista completa (count exato, limite 101 para detectar excesso sobre 100) e IDs disjuntos; compartilhamento ambíguo é NOT PROVEN.

Os testes executam os módulos reais com doubles explícitos do SDK, process e fetch. Não substituem stdout global nem usam rede/credenciais reais. Cobrem controles positivos, contagens vazias/invalidas, falta de grant inesperada, negação esperada da coluna protegida, vazamento observado, inconsistência de contagens, identidades/organizações, canários de segredo, URL fora de escopo, redirect/timeout/corpo vazio e cleanup após falhas. Uma regressão adicional usa o SDK PostgREST efetivamente instalado com transporte HTTP sintético para comprovar a diferença HEAD/GET.

A validação do runner não altera dados, schema, SQL/migrações, RLS, Auth, Storage, Edge, OAuth, billing, segredos ou dependências. Nenhum cliente real serve de fixture. O arquivo de teste e o helper não são código de autenticação do produto.

## Pré-requisitos que continuam operacionais

O último levantamento confirmou os dois viewers sintéticos e um ativo atribuído por tenant; os dois arquivos privados e os secrets ainda não estavam preparados. O ambiente phase02-homologation foi criado e conferido no GitHub em 28/10: revisor obrigatório ednelfelixmt, bypass administrativo desabilitado e somente a branch main (nenhuma tag). Não há secrets ou variáveis nesse ambiente; nenhuma execução autenticada foi disparada. Agora também são necessários fatos sintéticos positivos nas 12 superfícies scoped, respeitando FKs e contratos. As duas organizações, memberships e ativos existentes não são prova de dados nas demais tabelas. Preparar um plano de fixtures/remoção separado, sem usar registros de clientes ou inserir Auth/Storage por SQL.

O workflow final usa cinco PHASE02 secrets no ambiente phase02-homologation, restrito à main e com aprovação; o caminho manual de arquivos usa provision_private_fixtures=false e dispensa service role no GitHub. O workflow alternativo MEDIAHUB permanece compatível. Ver 26-final-homologation-execution.md.

Mesmo após um PASS real de leitura, continuam separados: escrita negativa DML/RPC/Storage, expiração/refresh/revogação de sessão, UX autenticada A/B e agência, OAuth e fontes reais, janela orgânica, PDFs visuais, SMTP adiado e reconciliação #211. Não fechar SEC-010/011 nem o app inteiro por testes com doubles.

## Liberação e rollback

Integrar somente após revisão, Quality Gate completo e Vercel success/READY no mesmo head. Confirmar main e produção separadamente. As alterações são dos scripts de aceitação: um rollback isolado não autoriza mudar grants/policies ou usar um runner menos rigoroso como prova equivalente. Resultados finais e identificadores dos gates serão registrados no PR e no recibo do ciclo.


## Validação do pacote em 28/10/2026

Base main 5f974513a4426a9c5e4525facff038679072ac25, preservando PRs 228, 229 e 230. Codex executou a suíte completa: 720 testes aprovados, 140 verificações SQL sintéticas, lint, TypeScript, arquitetura e guarda local de migrações aprovados. Os 29 testes direcionados de configuração/runtime também passaram antes da combinação. Nenhum deles usa credenciais reais. Build e sondas HTTP devem passar no Quality Gate Linux do head final; não há novo resultado de build local Windows neste ciclo (limitação ENV-BUILD-003 já registrada).

O parecer conclusivo do Claude não identificou bloqueador concreto no contrato principal após as correções. A dúvida de sua revisão parcial sobre o teste staging de chave foi conferida no helper: MEDIAHUB_PUBLISHABLE_KEY é mapeada a STAGING_SUPABASE_PUBLISHABLE_KEY antes da chamada; as regressões exigem a mensagem específica da guarda, zero clientes e zero consultas. Não havia defeito nesse mapeamento. Isso é revisão estática conferida, não homologação autenticada. CI, Vercel e produção exigem recibos independentes no PR.


## Execução autenticada real em 28/10/2026

Este registro substitui o levantamento operacional anterior: senhas das duas identidades sintéticas existentes foram aplicadas pela API oficial Auth Admin, após conferir ambas as identidades e seus vínculos viewer únicos. Os dois logins reais passaram. Senhas permanecem protegidas por DPAPI CurrentUser fora do repositório; a chave administrativa existente foi transportada cifrada e usada apenas no processo local. Nenhuma API key foi criada ou revogada, conforme decisão do usuário. Nenhuma senha ou chave privada integra os recibos versionados.

Foram inseridos 20 registros de teste exclusivamente nas duas organizações autorizadas, após ensaio com ROLLBACK. Integrações permanecem disconnected/desabilitadas, sem credencial, nenhum job queued/running e nenhum provedor chamado. Rótulos são sintéticos, data 2000-01-01, medidas NULL e spend 0 apenas onde obrigatório. Os 2 PNGs canônicos foram criados via Storage SDK em bucket privado com upsert:false, sem substituir objetos. Não houve Auth/Storage por SQL nem alterações em clientes reais, migrações ou permissões.

Gate executado localmente contra ityidnsfhgotucgvcifq, 2026-10-28T19:24:13Z: **PASS** de leitura autenticada nas 12 tabelas com positivos próprios, contagem estrangeira zero e total visível igual ao próprio, coluna protegida 403/42501 em seis sondas, ativos atribuídos disjuntos, conexões/ativos estrangeiros não visíveis, URL assinada estrangeira negada e arquivo próprio HTTP 200 com corpo não vazio nos dois sentidos. O caminho de aceitação usa somente publishable key e JWTs reais dos viewers. Read-only significa sem escrita em dados da aplicação pelo gate; login/logout alteram sessões Auth. Preparar fixtures foi uma operação separada de escrita autorizada.

Verificação adicional local às 19:25:56Z: 48 INSERTs de PK sintética já existente negados com 403/42501; 48 UPDATEs de PK para o mesmo valor bloqueados (36 por privilégio, 12 com retorno vazio sob RLS). Ambos incluem escopos próprio e oposto nas 12 tabelas. DELETE usou predicado contraditório para preservar registros: 40/48 negaram por privilégio; 8 sondas em organization_members/dashboard_configs retornaram sucesso vazio e **não comprovam a política DELETE para linha existente**. Não classificá-las como PASS de isolamento de exclusão. Nas duas contas, refresh real passou e o refresh token atual foi recusado após logout local. Não foi testado vencimento natural de JWT ou revogação imediata de access token ainda válido.

Recibos locais sanitizados: authenticated-read-results.json (full_gate PASS), write-session-results.json (PASS_WITH_DELETE_ROW_POLICY_PENDING), operation-status.json (etapas de senha/login confirmadas antes da falha inicial de Storage), private-fixtures-result.json (pass true). São evidências locais, **não execução do workflow protegido GitHub**. Os cinco secrets e a aprovação humana do ambiente continuam separados; a credencial administrativa não foi publicada no GitHub.

Permanecem abertos testes DELETE por linha em ambiente descartável, RPCs/Storage de escrita, UX A/B e agência, expiração de JWT, OAuth/fontes reais, PDFs visuais, SMTP adiado e reconciliação #211. Não encerrar SEC-010/011 nem homologação comercial por esse subconjunto.

Validação local do pacote:739 testes e140 verificações SQL sintéticas, TypeScript, lint ampliado, arquitetura e guarda de migrações aprovados. Build Windows Next16.4.3 concluído e16 sondas HTTP anônimas sobre esse build aprovadas. A revisão final Claude não encontrou defeito que invalide o gate real; suas observações de staging/escopo de sessão e limitações restantes estão registradas acima. Nenhuma dessas verificações substitui Quality Gate/Vercel do head remoto.
