# Análise 360 — contrato e aceite

A rota privada /[organizationSlug]/reports/analytics reúne mídia paga, funil cadastrado, demografia e resultados comerciais existentes. A central passa a listar dez relatórios. O painel reutiliza tenant, configuração, consultas e contratos existentes; clientes somente consultam e filtram.

## Comportamento

- Datas inicial/final livres, moeda e comparação com período anterior, ano anterior ou sem comparação. Calendário diário completo, ausência null e zero observado preservados. Datas comparativas aparecem no contexto e nas séries.
- Meta, Google e TikTok com cores próprias; filtros de plataforma e identidade canônica de campanha (provedor/conta/campanha) afetam indicadores, série, funil e demografia. Não há união de negócios CRM por semelhança de nome.
- Oito indicadores: investimento, impressões, cliques, leads atribuídos, CTR, CPC, CPM e CPL. Verde indica melhora, vermelho piora; custos menores são favoráveis e investimento é neutro. Direção textual/setas complementam cor. Valores muito pequenos aparecem como <0,1%, sem perder direção.
- Série atual/comparativa com indicador selecionável, tooltip e tabela diária. Donut seleciona plataforma. Tabela de campanhas com busca, ordenação, 50 linhas por página e CSV completo da seleção/busca, nos dois períodos. Serialização protege fórmulas CSV.
- Funil usa etapas cadastradas, medições, cobertura, custos e comparação. Não presume coorte de pessoas nem transforma compras atribuídas em receita financeira. Referências sem vigência continuam identificadas.
- Gênero, idade, estado, cidade e dispositivo conforme fatos recebidos. Cada dimensão é marginal independente; não cruzar idade × gênero × cidade. Barras mostram até dez grupos; tabela mantém todos. País tem estado vazio explícito: o schema/coletor atual ainda não o entrega; não inferir pela cidade.
- Resultados comerciais usam fonte CRM, período/moeda, conciliação e sinais financeiros existentes. Incluem receita, compras, leads, checkouts e série diária; detalhes completos reutilizam relatório de receita. Filtros publicitários não alteram negócios sem vínculo comprovado.

## Segurança e integridade

Antes das fontes: autenticação, tenant, configuração da mesma organização e módulo overview habilitado. Consultas existentes são limitadas por organização, moeda e datas: três sem comparação e seis com comparação. Validar lote inteiro antes de filtrar, inclusive linhas fora do canal selecionado. Recusar tenant/moeda/período/grão/identidade inconsistentes, aliases Meta malformados e duplicatas. Nenhuma chave administrativa chega ao cliente.

Contas/janelas de atribuição precisam ser equivalentes para comparação de leads/CPL. Não misturar margens de demografia como totais de campanhas. Falha de fonte/escopo não gera gráficos ou arquivos parciais. Modelo serializado acima de 2.000.000 bytes UTF-8 retorna orientação para reduzir o período, sem truncar dados. O limite contém o payload ao navegador; não substitui paginação na origem para grandes organizações.

## Modo TV

Entrada solicita Fullscreen API a partir do clique e ativa apresentação mesmo quando a API não for permitida. Navegação manual/teclas e rotação a cada 20 segundos usam somente painéis visíveis; pausa/retomada e atualização a cada cinco minutos. Teclas não capturam edição de campos/links/botões, nem modificadores. Respeitar movimento reduzido e tolerar armazenamento local bloqueado.

Sete painéis do conjunto sintético couberam em viewport 1920×1080 com altura 1032 px. Tabela apresenta até oito campanhas por página em TV; lista completa/CSV permanecem na consulta normal. Conteúdo excepcionalmente longo ou funis com mais etapas exigem validação própria. Datas/cliente permanecem no contexto fixo. Fullscreen nativo não foi confirmado pelo navegador IAB; televisão física, controle remoto real e sessão longa não estão homologados.

## Evidência em 29/10/2026

859 testes passaram após incorporar main #273; oito testes de domínio passaram após proteção adicional da comparação demográfica. Tipos/Edge Auth e lint passaram. 140 verificações SQL descartáveis passaram. Build aprovado antes da atualização de main. EPERM na pasta de prerender repetiu após atualização; pasta criada novamente no workspace, sem alterar proteções do Windows. Resultado final e gates exatos registrados no PR.

Build local: 28 verificações HTTP autenticadas A/B e 19 anônimas aprovadas, incluindo acesso próprio e 404 entre organizações. Visual: componentes reais em fixture separada, identificada sintética, sem autenticação/backend de produção; datas livres, filtro Google, demografia, país ausente, TV, pausa/navegação e viewport 390 px sem overflow horizontal da página. Isso não equivale a UX autenticada completa nem integração externa homologada.

Codex implementou/revisou. Claude CLI foi consultado; proposta encontrou indisponibilidade de rede e revisão retornou 401/OAuth expirado. Revisão independente indisponível, sem simulação de aceite conjunto.

Publicação exige Quality Gate integral e Vercel READY/success no mesmo head; conferir main e produção separadamente. Recibos ficam no PR, evitando commits apenas para status.

## Dependências abertas

RD Station Marketing e CRM reais, ingestão de país, GA4, SEC-010/011 DML/RPC/Storage/sessões, UX autenticada e PDF multipágina continuam pendentes. Ver rd-station-analytics-plan.md e roadmap; não alterar histórico de migrações #211 para mascarar divergência.
