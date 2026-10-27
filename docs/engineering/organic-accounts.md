# Dados orgânicos recebidos por conta (ORG-002)

A rota privada `/[organizationSlug]/reports/organic-accounts` apresenta registros já existentes de Facebook/Instagram em `metrics_organic_accounts`. Exige sessão do tenant, configuração da própria organização e página organic habilitada. Clientes navegam, filtram e exportam somente seus dados; não há escrita, nova permissão, migração ou publicação de Edge neste ciclo.

## Contrato e limites

- Filtros GET por data registrada inclusiva e plataforma. A data do registro é um rótulo de calendário da fonte/ingestão, sem conversão para o fuso cadastral.
- **Janela original de medição não confirmada.** O produtor atual pode atribuir `total_value` sem pontos temporais à data de sincronização, embora grave `source_period=day`. O rótulo armazenado não comprova atividade diária nem uma série homogênea.
- Linhas individuais de impressões/visualizações, alcance, interações, seguidores e ações em links recebidas. Nenhuma soma, taxa, evolução ou crescimento é calculado. Seguidores são estoque recebido na coleta; alcance pode se sobrepor. `follows/unfollows` são excluídos; `website_clicks` é apresentado de forma neutra porque o mapeamento Instagram de cliques no site não está comprovado.
- Números inteiros seguros não negativos são aceitos; zero permanece zero. Ausência, coerção de texto, fração, negativo, infinito ou overflow ficam indisponíveis. Timestamp da coleta inválido/futuro torna todos os valores da linha indisponíveis; não se presume alinhamento entre data registrada e meia-noite UTC.
- Presença de registros por conta conta datas e campos aceitos apenas nas linhas exibidas. Não identifica contas esperadas, completude da coleta, dias sem atividade ou disponibilidade do provedor.
- Query de sessão/RLS com tenant explícito, campos mínimos, plataformas permitidas, período armazenado day, intervalo inclusivo e ordenação estável. Até 501 registros são lidos para detectar o corte de 500. Todos são validados antes do corte; sentinela não entra na presença por conta nem no CSV. IDs/natural keys duplicados e discrepâncias de tenant/plataforma/período/data falham fechados.
- CSV local traz contexto, janela desconhecida, regras de não agregação, datas registradas/coletas, números ou células vazias e limites. Usa o serializador existente que neutraliza fórmulas e sanitiza o nome do arquivo. Nenhum link público, carregamento de mídia externa ou solicitação adicional de dados no navegador.
- Navegação entre conteúdo e contas conserva datas/plataforma, mas em conteúdo elas selecionam publicação UTC; em contas, data registrada. Os títulos e filtros explicitam cada significado.

## Pendência DATA-ORG-PERIOD-001

Corrigir o contrato de ingestão em ciclo separado: preservar início/fim/fuso/janela de origem e distinguir total_value de pontos temporais. Definir o significado de follows_and_unfollows e profile_links_taps antes de oferecer crescimento ou cliques no site. Validar payloads sintéticos dos provedores e homologar com conta autorizada. Não reconstruir janelas históricas por inferência, não transformar registros existentes em medições diárias e não somar alcance/estoque. O aviso de janela desconhecida permanece até evidência verificável por registro.

## Validação e implantação

Testes sintéticos de domínio, CSV, página com sessão/query explícitas, componentes, navegação e proteção HTTP. A extração de `organic-scope` preserva o contrato e regressões ORG-001. Revisão React: cálculo/consulta no servidor, client apenas download por clique, hooks locais e feedback acessível; sem estado compartilhado entre requests.

Claude CLI recebeu proposta e diff mas devolveu saída vazia (exit 0); não há revisão Claude comprovada. Revisão independente Codex e gates são registrados no PR #209. Não substituem JWT real A/B, UX autenticada, semântica/completude dos provedores ou homologação geral. SMTP continua adiado.

ORG-001/002 compõem o mesmo PR. Não integrar sem Quality Gate integral e Vercel success/READY no mesmo SHA. OPS-ORG-001 registra bloqueio de cota de builds, sem alterar plano nem contornar a proteção. ENV-BUILD-001 registra EPERM Windows no diretório gerado _not-found; CI Linux deve concluir build e os 14 GETs anônimos antes do merge. Produção deve ser verificada separadamente após integração; rollback isolado destas rotas/helpers preserva dados e autorização.
