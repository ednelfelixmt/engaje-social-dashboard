# Ciclo 07 — Funil configurável com cobertura verificável

Data: 25/10/2026. Correção de código em validação; homologação autenticada pendente.

## Problema e comportamento entregue

O funil filtrava campanhas sem valor antes de somar, apresentando subconjuntos como totais e calculando custos somente sobre o investimento desse subconjunto. Etapas sem dataKey, como vídeo, conteúdo e carrinho, ignoravam primitivas já disponíveis em metricValues. O filtro de movimento também eliminava campanhas com zeros observados.

O módulo puro funnel-performance exige contagens numéricas finitas e não negativas em todas as campanhas com medições. Zero explícito e atribuição fracionária permanecem válidos; ausência, valor inválido e overflow tornam o total e o custo dependente indisponíveis. Catálogo sem fatos não cria zero e não entra no denominador de cobertura. Linhas de outra organização invalidam a agregação, inclusive no período de comparação.

As etapas com dataKey preservam o valor já conciliado, principalmente compras CRM. Outras etapas consultam a primitiva de mesmo nome; campos de qualificação comercial sem fonte continuam desconhecidos. Não se inventam MQL, SQL, reuniões ou vendas.

O custo usa investimento de todo o mesmo recorte, exige investimento finito não negativo e a mesma moeda exibida. CPM mantém multiplicador 1000. Denominador zero e razões que excedem o limite numérico permanecem indisponíveis. Nenhuma conversão cambial implícita.

A página conecta o helper ao conjunto atual/anterior, antes do filtro de movimento usado por outros componentes. A interface mantém desenho, cores, ícones, metas e navegação existentes. A cobertura aparece em seção própria para não sobrepor as camadas nos funis de 12 etapas. Percentuais e progresso usam razões finitas; eventos acima da etapa anterior não são rotulados como perda negativa.

## Limites explícitos

Cobertura é por campanhas com medições no recorte; não certifica sincronização completa, todas as datas, deduplicação de pessoas ou reconciliação real com o provedor. Alcance/frequência e outras medidas únicas ainda exigem contrato de deduplicação na origem (ANA-004). O pacote não altera essas fontes nem declara esse risco resolvido. Comparações são eventos agregados, não coortes individuais.

## Evidência e segurança

16 regressões sintéticas: soma/custo, CPM, cobertura parcial, primitivas, compras conciliadas, catálogo, zero, negativos/NaN/infinito/coerção, overflow, moeda exibida, escopo de organização e comparação incompleta; renderização do componente real cobre cobertura acessível, progressos e variações finitas e perdas. Testes usam IDs e nomes sintéticos.

Sem migração, alterações em Auth, RLS, Edge, OAuth, Storage, credenciais, cadastros ou fatos reais. React: helper puro sem estado entre requisições, imports diretos, nenhum novo fetch/hook/client boundary; listas estáveis e explicações em texto acessível. Revisão visual autenticada desktop/mobile continua UX-002.

Aceite: testes, 140 checks SQL, lint, tipos, arquitetura, build e Quality Gate + Vercel no mesmo head antes do merge. Rollback restrito ao PR; preservar a distinção entre zero e ausência. Não restaurar soma parcial como total sem solução equivalente.

Validação local: 281 testes, 140 checks SQL, lint, tipos e arquitetura passaram. O build compilou e tipou, mas falhou ao criar diretório _not-found em .next (EPERM Windows); repetição confirmou o problema local. Uma tentativa por outro runtime encontrou falha de processo do Turbopack. O aceite do build continua pendente até execução completa, local ou CI; não é tratado como aprovado pela compilação parcial.

CI do head inicial e6e328676e9c4f3c2ed272378e1b2546e9ddbd2f: Quality Gate #223 aprovado, inclusive build Linux. Vercel recusou preview por build-rate-limit; não integrado. Calendário complementar descrito em [23-calendar-comparison.md](23-calendar-comparison.md); o head final deve repetir ambos os gates.

## Integração confirmada — 25/10/2026

PR #152 integrado como dfea7ccfc9c489ba8af9c56ff28924192d5819fd após Quality Gate #226 e Vercel success no head a0d5869fa8035cbb735d951c66ab03d10936d40a (preview dpl_2NAqZNv9ezCRB9rXYgQxg1YRDYZf READY). Publicação produtiva recusada por cota diária Vercel, não por falha do código. Produção permanece 5d3a180e; não classificar a correção de funil como publicada. Ver [24-release-and-auth-operations.md](24-release-and-auth-operations.md).
