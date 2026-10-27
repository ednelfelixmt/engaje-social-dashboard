# ORG-003 — Impressão privada dos relatórios orgânicos

As rotas reports/organic-content e reports/organic-accounts oferecem Imprimir / salvar PDF pelo diálogo local do navegador, reutilizando PerformanceReportPrint. Não há geração no servidor, link público, endpoint, nova consulta ou envio do documento a terceiros pelo aplicativo.

O botão existe apenas quando o relatório autorizado foi construído e fica desabilitado se não há registros. Uma linha recebida com valores indisponíveis pode ser impressa para registrar essa ausência. Falha de sessão/configuração/filtro/consulta/escopo não monta documento nem botão. A proteção permanece na rota e no domínio, sem depender da ocultação da interface.

O próprio artigo contém título, cliente, plataforma selecionada, período com seu significado, fuso cadastral, geração UTC e avisos das fontes. Conteúdos preservam contadores acumulados, coleta inválida, legenda truncada e corte de500 linhas; contas preservam janela original desconhecida, alcance não aditivo, seguidores como estoque, links neutros, presença restrita aos registros exibidos e campos indisponíveis. Não há soma ou comparação nova.

Filtros, cabeçalho de navegação, atalhos orgânicos, CSV e controle de impressão ficam fora do documento. CSS restrito a engaje-performance-print .organic-report remove o scroll horizontal dos wrappers, ajusta tabelas para a largura disponível, quebra identidades/timestamps, repete cabeçalhos e permite dividir linhas de legendas longas. A presença por conta passa a uma coluna. Nenhum @page global ou alteração do componente de impressão compartilhado.

Testes sintéticos verificam contexto/escaping, avisos, valores indisponíveis, cap/legenda, impressão habilitada com registro e desabilitada no vazio, e ausência dos controles em falhas de rota. O teste existente de PerformanceReportPrint cobre clique explícito, negação disabled, erro sanitizado e remoção da classe ao desmontar. Revisão React mantém os dados no servidor e transmite apenas disabled ao controle client; sem estado de request compartilhado.

VIS-ORG-003: renderização/paginação e salvar um PDF real continuam pendentes de homologação visual em navegador autorizado. Markup, CSS revisado e testes de handler não provam diagramação ou jornada autenticada. O executor Windows já apresentou falha de navegador no ciclo GOAL-003; não desativar proteções nem inferir homologação visual. SEC-010/011, fontes reais, DATA-ORG-PERIOD-001 e SMTP adiado permanecem independentes.

Riscos/rollback: impressão pode variar com navegador, tamanho do papel e legendas longas. Validar com registros sintéticos em várias páginas antes do aceite visual. Em regressão, reverter somente ORG-003 preservando relatórios, CSV e autorização. Integração exige revisão, Quality Gate completo e Vercel success/READY no mesmo head; produção deve ser verificada separadamente.
