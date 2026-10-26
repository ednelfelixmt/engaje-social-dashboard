# REP-001 — Relatórios privados de público e dispositivos

Data: 26/10/2026. Ciclo 09. Implementação em validação, sem homologação autenticada presumida.

## Entrega

As rotas existentes reports/meta-audience e reports/google-audience mantêm os gráficos e passam a oferecer CSV do período selecionado, com fonte, moeda, fuso cadastral da organização, janela de atribuição, cobertura por indicador e IDs dos registros utilizados em cada grupo. Datas continuam conforme metric_date da fonte; este relatório não converte o fuso de coleta nem presume que ele tenha sido validado.

O download é local, iniciado por clique, sem requisição de escrita, novo endpoint, link público, armazenamento de arquivo ou envio a terceiros. As permissões existentes de leitura do tenant continuam obrigatórias no servidor. O CSV usa o serializador comum com proteção de fórmulas em texto, aspas, delimitador e BOM; números são mantidos como números e valores indisponíveis ficam vazios.

O relatório é do intervalo atual: o seletor de comparação é ocultado somente nessas rotas e o modo efetivo é none. Antes havia um seletor sem leitura de comparação. A navegação de cliente, datas e moeda é preservada; demais dashboards continuam com comparação. A consulta publicitária redundante, não utilizada pelo relatório, foi removida.

## Contrato e segurança

- tenant() e configuração de páginas são validados antes de ler fatos. Query mantém organização, plataforma, moeda e datas. Helper verifica novamente o escopo de toda a entrada antes de agregar.
- Grão: conta, campanha, dimensão, valor, data, dentro do tenant/plataforma/moeda definidos. Alias act_ é normalizado exclusivamente para Meta. ID ou grão repetido bloqueia o relatório; contas Google permanecem literais.
- Janelas de atribuição incompatíveis bloqueiam consolidação e exportação. Janela não informada permanece explicitamente não informada, sem modelo inventado.
- Investimento e contagens precisam ser números finitos não negativos. Zero e atribuição fracionária são preservados. Um componente ausente/inválido torna seu total e razões dependentes indisponíveis; overflow não vira zero.
- Sexo, idade, estado, cidade e dispositivo são recortes independentes. Não há total geral entre dimensões, alcance único, matriz idade×sexo inferida, receita/ROI ou GA4 deduzidos de Ads. Recortes de creative/audience não entram na exportação demográfica.
- Erros de escopo/grão/janela mostram mensagem segura e nenhum arquivo; não vazam linhas ou identificadores de outro cliente. Sem dados desabilita a exportação. Fontes GA4 continuam indisponíveis e o atalho de gerenciamento aparece apenas para a agência.
- Object URLs são revogadas após o download, inclusive em falhas do clique/âncora. O exportador informa falha sem afirmar que o arquivo foi salvo.

## Interface

Cobertura de grupos recebidos aparece nos cartões. Donuts não exibem subconjunto como se fosse distribuição completa; ausência de cliques no gráfico etário permanece null e zero explícito continua zero. Razões e larguras de barras são finitas. Gráficos e seletores existentes são reutilizados, sem nova biblioteca.

React: componentes puros para consolidação, nenhum cliente privilegiado no browser, eventos de download em handler, estado local apenas para erro, labels/descrições e role=alert. A página privada é force-dynamic. Lint cobre os arquivos alterados e corrige três alvos já declarados no script que estavam ignorados pela configuração incremental.

## Validação e limitações

29 regressões novas: agregação e provenance; zeros/frações/nulos/negativos/coerção/overflow; escopo, grão Meta/Google, janela; CSV e injeção; download/cleanup; renderização dos gráficos/cartões/exportador; página real com Auth e banco explicitamente simulados; GA4, configuração desativada, negação anterior às consultas e erro seguro. Smoke HTTP inclui as duas rotas privadas e exige redirecionamento de anônimos ao login com no-store.

O baseline atual da main passou com 355 testes. O primeiro build do pacote passou com 383 testes, tipos e build; um teste de cobertura visual foi acrescentado depois e exige a validação final. SQL descartável: 140 checks aprovados, sem migração. Nenhuma fixture usa cliente real. Nenhum e-mail, Auth real, Storage ou dado de cliente foi alterado.

AGENTS.md foi seguido: proposta enviada ao CLI local Claude Code sem ferramentas/credenciais; interrompida após mais de três minutos sem resposta. A revisão do diff, também sem ferramentas, terminou no timeout de 90 segundos sem saída. Não houve revisão independente concluída ou revisão conjunta. O agente principal fez a revisão e responde pelos testes; repetir revisão externa quando o CLI estiver disponível.

Aceite de código exige lint, testes, tipos, arquitetura, build, SQL, smoke HTTP, Quality Gate e Vercel aprovados no mesmo head antes do merge. Renderização com doubles e HTTP anônimo não equivalem a navegação autenticada desktop/mobile, download em todas as planilhas, reconciliação com provedores ou prova JWT A/B. SEC-010/011, SEC-014 runtime e UX-002 seguem abertos. CSV não é uma cópia assinada do banco nem prova de completude da ingestão.

Rollback: reverter este pacote se houver regressão; não substituir ausência por zero nem remover isolamento/proteção de fórmulas. Não há esquema ou dados persistidos a desfazer.

## Continuidade e SMTP

SMTP foi expressamente adiado pelo responsável em 26/10. Não foi reaberto cadastro, gerada credencial ou tentada ativação de provedor. O registro operacional anterior do PR #154 foi trazido para esta base com atualização: produção está READY em 9db86da, incluindo #152. O bloqueio de cota observado em 25/10 foi superado posteriormente; não é tratado como estado atual. A documentação anterior permanece histórica.

Validação local final: **384 testes**, lint sem erros/avisos ignorados, tipos da aplicação e helper Edge, arquitetura e build Next aprovados. **140 checks SQL** aprovados. Servidor do build iniciado isoladamente em loopback: os **8 GETs HTTP** passaram, incluindo negação de acesso anônimo aos dois relatórios e no-store. Nenhuma sessão, e-mail, arquivo privado ou cliente real foi usado. Revisão externa continuou indisponível, sem parecer simulado. CI/Vercel do head final ainda são obrigatórios.
