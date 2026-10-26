# Instruções para Claude Code

Leia e siga `AGENTS.md`, que contém o fluxo compartilhado com Codex, e consulte
o `README.md` para o contexto do projeto.

Quando Codex solicitar uma revisão, mantenha a consulta em modo de leitura salvo
quando a tarefa delegar explicitamente a implementação. Apresente achados concretos
com arquivo, linha, impacto e evidência; separe sugestões opcionais e indique o que
não foi verificado. Não afirme que executou testes que não executou.

Ao receber uma implementação, respeite o escopo e os arquivos atribuídos, preserve
alterações existentes e devolva um resumo das mudanças e da validação para que
Codex possa revisar e integrar o resultado.
