# ORG-001 — Relatório privado de conteúdos orgânicos

Rota: /[organizationSlug]/reports/organic-content. Data: 27/10/2026. O acesso exige sessão do próprio tenant e a página organic habilitada pela agência; clientes permanecem somente leitura.

## Comportamento

O relatório apresenta publicações de Facebook e Instagram já recebidas em creatives. Datas filtram a publicação em UTC, do início inclusivo ao dia posterior ao fim exclusivo. O fuso cadastral é informado separadamente. O filtro por plataforma é uma allowlist; datas explicitamente inválidas não são substituídas por defaults. Defaults só valem para datas ausentes.

Cada linha identifica origem, conta e ID externo do conteúdo, legenda, tipo recebido, publicação UTC e coleta UTC. Curtidas/reações, comentários e compartilhamentos reproduzem os campos armazenados. No conector Meta atual, likes contém curtidas do Instagram ou reações totais do Facebook; saved contém salvos do Instagram. Salvos Facebook não são inferidos. Outras fontes devem respeitar o mapeamento contratado; este relatório não homologa a ingestão.

Os contadores são acumulados no conteúdo até a coleta armazenada. Não representam atividade gerada no intervalo de publicação. Não se somam contadores, não se deduplicam pessoas e não se calculam engajamento, alcance, seguidores, receita, séries diárias ou comparação temporal. Cada contador exige inteiro seguro não negativo; strings, booleanos, negativos, decimais, valores não finitos e ausências ficam indisponíveis. Zero recebido permanece zero. Timestamp de coleta ausente, inválido, anterior à publicação ou posterior à geração retira os contadores daquela linha, sem inventar data de coleta.

## Limites explícitos

Uma consulta com ordem publicação decrescente + ID crescente lê no máximo 501 registros. O 501º sinaliza que o documento exibirá/exportará somente os primeiros 500. Todas as linhas recebidas, inclusive a sentinela, são validadas antes da projeção. Dados recebidos não comprovam completude da coleta das contas/publicações. Restrições do servidor e fontes parciais continuam sendo limites externos.

Legendas são limitadas a 2.000 unidades UTF-16, sem cortar par de surrogate, com indicação de truncamento na tela e CSV. Não há carregamento de imagens, URLs de mídia ou permalinks externos. O CSV local contém uma linha por conteúdo exibido, datas, origem, filtro, limites, legenda truncada, estado da coleta e os quatro contadores. Campos indisponíveis ficam vazios. serializeCsv neutraliza fórmulas em texto; o nome do arquivo é sanitizado. Download só ocorre por clique e o handler recusa disabled/conteúdo vazio. Erros não expõem diagnósticos privados.

## Segurança e implementação

A rota autentica antes de consultar configuração/fatos, valida organization_id da configuração e organic habilitado e usa somente o cliente de sessão sujeito a RLS. readOrganicContent seleciona campos mínimos de creatives, exige organização e plataformas permitidas, limites de publicação UTC e range(0,500). A documentação Supabase confirma limites inclusivos e respeito à ordem: https://supabase.com/docs/reference/javascript/using-modifiers-range.

O domínio recusa contexto inválido, outro tenant/plataforma, publicação fora do intervalo, IDs ausentes e duplicação de ID/chave natural. Qualquer falha de consulta ou escopo retira o documento/CSV inteiro; não há relatório parcial de origem não validada. Valores inválidos isolados não se transformam em zero. O novo grupo de navegação acompanha a mesma configuração organic e não oferece edição para viewers.

Sem mudanças em schema, RLS, grants, Auth, OAuth, Storage, Edge, tokens, conectores ou credenciais; nenhum dado real foi utilizado como fixture. Os módulos orgânicos antigos continuam com seu comportamento anterior. Este pacote acrescenta leitura auditável de conteúdos sem reativar séries legadas.

## Evidências, revisão e limites

Testes novos exercitam domínio, consulta real com doubles explícitos, rota real com Auth/config simulados, exportação, renderização e navegação. Incluem zero/ausência, limites UTC com offset, coleta inválida, foreign sentinel, duplicação, limites de legenda/Unicode, fórmula CSV, clique/erro, configuração cruzada e datas inválidas sem consulta. A sonda HTTP existente agora cobre a nova rota com GET anônimo/no-store.

Claude Code 2.1.91 recebeu consultas de proposta e diff, mas retornou exit 0 com stdout/stderr vazios; não houve parecer Claude neste ciclo. Não foram acessadas ou alteradas credenciais para contornar o problema. Um segundo agente Codex realizou revisão somente leitura, encontrou a substituição silenciosa de datas explícitas inválidas e confirmou a resolução e sua regressão. Nenhum outro impedimento foi identificado nessa revisão. Codex principal responde pela entrega.

O primeiro lint apontou let desnecessário, corrigido para const. O primeiro build compilou e encontrou EPERM na pasta gerada _not-found do Windows; uma repetição intermediária concluiu após preparar o diretório. O build local da fonte final voltou a encontrar o mesmo erro de ambiente após compilação e tipos, portanto build e 13 GETs da fonte final dependem do CI Linux obrigatório. Resultados finais e gates são registrados no PR. Esses testes não homologam JWT A/B, RLS via HTTP real, coleta de provedor, UX autenticada ou interpretação de métricas externas. SMTP permanece adiado.

Integração exige Quality Gate integral e Vercel READY/success no mesmo head. Confirmar produção separadamente e executar os 13 GETs anônimos. Rollback: reverter somente ORG-001, preservando dados, autorização e integrações existentes.

## Publicação pendente

O PR #209 foi aberto com código revisado e 610 testes aprovados na base combinada 658a264. A Vercel recusou o preview do código 38b7054 por build-rate-limit e não criou deployment para esse SHA. O módulo permanece em branch, sem integração à main; reavaliar Quality Gate e Vercel no head atual após disponibilidade de cota. Não contratar plano, criar projeto alternativo nem ignorar o gate como forma de publicar.
