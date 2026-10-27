# DATAQUAL-001 — Diagnóstico administrativo de dados

A rota existente /[organizationSlug]/settings/data-quality continua restrita a administradores da agência por agencyTenant antes de qualquer leitura. Usa cliente de sessão/RLS e filtros explícitos de organização nas quatro fontes: integrations, metrics_ads, metrics_ads_breakdowns e sync_jobs. Não há escrita, nova permissão, dado real como fixture ou mudança de banco/Auth/Edge.

## Integridade e calendário

O domínio exige UUID de organização e contexto válido, confere organization_id e IDs únicos em todas as fontes antes de qualquer projeção e recusa o documento inteiro em erro/null de consulta, duplicação ou tenant divergente. As leituras históricas paginam de mil em mil com ordem estável e escopo reaplicado; isso preserva a consulta anterior de histórico integral. O volume e a memória dessas leituras seguem como risco operacional a medir antes de ampliar a escala; não há truncamento silencioso introduzido.

As datas de métricas precisam existir no calendário e não ultrapassar a data local do tenant. Entradas futuras/inválidas não comprovam atualidade; são contadas separadamente. Existir registro sem data histórica válida difere de ausência de registros. A última data válida é classificada com paidDataFreshness (até dois dias), sem afirmar coleta completa. O timestamp de coleta é validado com timezone, normalizado e comparado por instante, inclusive offsets; inválido/futuro fica desconhecido. Nenhuma data é inventada ou corrigida no banco.

Campanhas são contadas por plataforma/conta/ID, evitando colisão de IDs entre contas. As contagens da página são diagnósticos de registros e identidades, sem recalcular marketing. Plataformas não reconhecidas não são atribuídas a um canal conhecido. Conexões connected e is_enabled são estado cadastral, sem promessa de credencial válida ou coleta; erros/expiração são rótulos registrados. Mensagens last_error/error_summary, tokens e credenciais não são selecionados.

## Histórico de sincronização

Exibe no máximo os 12 registros mais recentes por created_at decrescente e ID decrescente. A ordem considera criação, preservando trabalhos ainda na fila. Horários são UTC. queued, running, completed e failed correspondem ao schema; outro estado é desconhecido e não implica sucesso.

rows_processed tem default 0 no banco e não é atualizado pelo handler de falha. Por isso queued/running/failed não apresentam o default como quantidade final processada. Apenas completed, com cronologia validada e inteiro seguro não negativo, expõe um contador final registrado; zero coerente permanece zero. O contador não prova operações persistidas, completude ou correspondência com o provedor. A duração só é mostrada em estado terminal com created <= started <= completed <= geração. Ausência/data inválida/futura/ordem incoerente retira duração e contador final. Não se infere prazo ou travamento de trabalhos em execução.

## Evidência e limites

Testes sintéticos de domínio/página/histórico cobrem fronteiras de tenant nas quatro fontes, paginação, erro/null, datas impossíveis/futuras, offsets, contas com IDs coincidentes, estados desconhecidos, default 0, quantidade inválida, duração subsegundo/zero, mensagens privadas ausentes e agencyTenant antes da consulta. O smoke anônimo inclui o diagnóstico, totalizando 15 GETs. Nenhum teste modifica cliente real ou chama sincronização.

Revisão independente Codex da proposta/diff sem impedimento restante. Claude CLI recebeu proposta e diff, mas retornou saída vazia/exit 0; sem parecer Claude. Suite/tipos/lint/SQL/arquitetura/build e gates remotos devem ser registrados no PR final. JWT A/B, RLS via HTTP real, provedores e UX autenticada não são inferidos desses testes; SMTP adiado.

Integração exige PR revisado/mergeável, Quality Gate integral e Vercel success/READY no mesmo SHA. Produção deve ser confirmada separadamente por SHA/alias e 15 GETs. Reverter isoladamente DATAQUAL-001 se houver regressão, sem afrouxar autorização ou converter ausências em zero.
