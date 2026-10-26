# Trabalho conjunto: Codex e Claude Code

O usuário quer que Codex e Claude Code colaborem na criação e revisão deste projeto.
Estas instruções valem para este repositório. Leia também o `README.md` e, conforme
a tarefa, os documentos em `docs/engineering/`.

## Fluxo de trabalho

1. O agente que conduz a tarefa define o objetivo, o escopo e os critérios de aceite.
2. Em funcionalidades novas ou mudanças de arquitetura, consulte o outro agente
   sobre a proposta antes de implementar, quando ele estiver disponível.
3. Defina um único responsável por editar cada arquivo. Por padrão, Codex implementa
   e Claude Code faz uma revisão independente. Os papéis podem ser invertidos.
4. Para mudanças de código, peça ao outro agente uma revisão do diff e do contexto
   relevante. Solicite problemas concretos com arquivo, linha, impacto e evidência.
   Diferencie falhas confirmadas, dúvidas e melhorias opcionais.
5. Confira os achados no código, aplique as correções pertinentes e execute as
   verificações adequadas. O agente principal responde pela entrega e pela validação.
6. Informe o que mudou, quem revisou, quais verificações foram executadas e as
   limitações restantes. Só afirme revisão conjunta quando ela realmente aconteceu.

## Uso do Claude Code pelo Codex

- Use o CLI local `claude`; no Windows, se ele não estiver no PATH, procure
  `%USERPROFILE%\.local\bin\claude.exe`.
- Para consultas e revisões, use execução não interativa (`--print`) e forneça
  objetivo e contexto explícitos. Restrinja as ferramentas ao necessário; para
  revisar texto enviado pela entrada padrão, use `--tools=`.
- Preserve alterações existentes do usuário e não permita edições simultâneas nos
  mesmos arquivos. Não use opções que desativem as verificações de permissão.
- Compartilhe somente o contexto necessário à tarefa, sem credenciais ou arquivos
  de ambiente. A revisão não exige publicar, fazer push ou acessar produção.
- Se o segundo agente estiver indisponível, registre a limitação e prossiga com
  o trabalho autorizado que puder ser validado; não simule uma resposta dele.

## Validação

Os comandos do projeto estão em `package.json`; o gate de CI está em
`.github/workflows/quality.yml`. Escolha as verificações conforme os arquivos e
comportamentos alterados. Documentação isolada não exige executar toda a suíte.
A revisão de outro agente não substitui testes nem comprova homologação em produção.
