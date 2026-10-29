# UX-FILTER-001 — Sincronização dos filtros e moeda em celular

Registro de 29/10/2026 sobre a base `05c2ac457547cdab2f18488c078b00218f594ed9`. Nenhum incidente com dados de clientes foi alegado.

## Problemas reproduzidos

O formulário usava campos não controlados com `defaultValue`. Depois de editar e aplicar datas/comparação/moeda, voltar pelo histórico atualizava os filtros recebidos e o texto de comparação, mas os campos mantinham os valores editados. Isso permitia reaplicar um período diferente daquele indicado pela URL. O campo Moeda também tinha `hidden xl:flex` e não podia ser usado nas larguras menores.

Foi servido apenas em `127.0.0.1:3219` um fixture isolado que empacota o componente real `Filters`, React e os estilos reais do projeto. O adapter de `next/navigation` usa History API e rerender por popstate. Os valores e as organizações A/B são inteiramente sintéticos. Não há backend, autenticação, cookies, métricas ou autorização simulada; não se removeu nenhuma guarda do aplicativo.

Antes da correção, a sequência observada no navegador foi:

1. Filtros aplicados: 01–07/10/2026, período anterior, BRL.
2. Editar para 02–08/10/2026, ano anterior, USD e aplicar.
3. Voltar: URL e filtros aplicados retornaram ao passo 1; campos continuaram em 02–08/10, ano anterior e USD.
4. Em viewport 390 × 844, Moeda não estava visível.

## Correção

O formulário recebe uma identidade React estável composta por pathname, slug, datas, comparação, moeda e disponibilidade de comparação. Ao mudar o contexto aplicado, o React remonta somente o formulário e inicializa os campos com os valores atuais. Com o mesmo contexto aplicado, a identidade permanece estável, preservando edições pendentes. Não foi acrescentado efeito ou estado duplicado.

A label Moeda permanece visível em todas as larguras. O flex-wrap existente acomoda o controle; pattern ISO de três letras, required, limites e submissão permanecem. Não há conversão monetária implícita: continua sendo filtro da moeda de origem. Queries, cálculo de datas/KPIs, seleção de tenant e autorizações não foram modificados.

## Validação observada no navegador

- Repetida a mesma sequência: voltar restaurou os quatro campos para 01–07/10, período anterior e BRL; avançar restaurou 02–08/10, ano anterior e USD.
- Editar sem aplicar e trocar para a organização sintética B descartou o rascunho, preservando somente os filtros efetivamente aplicados na URL.
- Em 390 × 844, Moeda ficou visível e `scrollWidth=clientWidth=390`; sem rolagem horizontal.
- Selecionar Sem comparação, editar moeda para EUR, Tab até Aplicar e Enter atualizou a URL e os campos; o texto de comparação deixou de aparecer.
- A inspeção separada da página pública de login também encontrou largura DOM de 390 px sem overflow horizontal. Não houve login pelo navegador.

`browser-evidence.json` e `filters-after.jpg`, guardados localmente fora do repositório, registram somente valores sintéticos. O fixture e seu servidor são temporários, não fazem parte do produto ou do deploy. A verificação é de interação/renderização do componente real com navegação isolada; não equivale a homologação autenticada do Next.js ou fluxo completo de usuário. A prova SSR HTTP de #265 permanece separada.

## Revisão e aceite

Foi solicitada revisão independente ao Claude Code com o componente e o relato da reprodução, sem ferramentas ou segredos. A execução retornou HTTP401 OAuth access token expired. Não houve parecer; a limitação é registrada conforme AGENTS.md, com continuidade e validação pelo Codex.

Executar a suíte existente, tipos, lint, build e os gates do PR. A alteração pequena e reversível usa a verificação de navegador acima e os testes existentes de comparação/calendário; não introduz testes que apenas espelhem a expressão da key. Merge somente com Quality Gate e Vercel aprovados no mesmo head; main/produção exigem conferência separada. Rollback restrito ao formulário e documentação.

Continuam pendentes login/interações na aplicação autenticada, visual da agência, PDFs, OAuth/fontes reais, os demais testes de escrita/sessão e #211. Nenhuma credencial foi criada, alterada, revogada ou exposta neste ciclo.

Validação local concluída:806 testes da suíte completa,15 casos direcionados de comparação/calendário, TypeScript, ESLint e arquitetura aprovados. O gate remoto do head final deve comprovar build e HTTP antes de integrar.
