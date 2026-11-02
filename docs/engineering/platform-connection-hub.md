# Central de conexões por plataforma

Implementação de autorização separada da seleção de conta e da coleta. Este documento não certifica homologação com provedores reais.

## Produtos e métodos

| Produto | Papel | Acesso | Configuração privada do servidor |
| --- | --- | --- | --- |
| Google Ads | Origem nativa | OAuth 2.0 Google | GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET; GOOGLE_ADS_API_VERSION opcional (padrão v24) |
| Windsor.ai | Extrator | Chave da Connectors API | Chave por autorização no campo mascarado; fluxo existente da agência preservado separadamente |
| RD Station CRM | CRM comercial | OAuth 2.0 ou token de acesso CRM v2 | RD_CRM_CLIENT_ID, RD_CRM_CLIENT_SECRET |
| RD Station Marketing | Automação | OAuth 2.0 ou token de acesso Marketing | RD_MARKETING_CLIENT_ID, RD_MARKETING_CLIENT_SECRET |
| HubSpot | CRM | OAuth 2.0 ou token de aplicativo privado | HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET |
| Meta | Mídia e orgânico | OAuth existente | Fluxo Edge existente preservado |
| CRM personalizado / Stract | Entrada de dados | API / webhook existente | Chave de ingestão restrita ao cliente |
| TikTok | Mídia | Em preparação | Adaptador e OAuth operacional ainda pendentes |

Google Ads não usa a chave da Windsor. Os produtos RD usam aplicações e credenciais próprias. O campo manual RD espera um bearer access token da API do produto, não uma chave de conversão. Um token manual poderá expirar e exigir nova autorização. Somente métodos suportados pelo provedor são oferecidos.

## Aplicativos OAuth

Cadastrar em cada aplicativo a URL exata de retorno:

https://mediahub.engajeperformance.com.br/api/integrations/oauth/callback

As credenciais de aplicativo pertencem ao servidor e nunca são solicitadas no chat ou retornadas ao navegador. Configurar os nomes acima como segredos no ambiente desejado antes de homologar; credencial ausente interrompe o início sem criar autorização pendente. Preview isolado exige política explícita de callback/ambiente, pois o callback atual é fixado no domínio canônico de produção. Não habilitar callback arbitrário via parâmetro do usuário.

## Autorização e isolamento

POST /api/integrations/connect exige mesma origem, sessão autenticada e super_admin; o serviço confirma associação ativa à agência e cliente ativo antes/depois da chamada externa. O retorno OAuth usa estado HMAC com propósito, cliente, ator, produto, nonce e validade de dez minutos. A transição pending → syncing é atômica e impede reutilização do retorno. O ator é revalidado antes de guardar a credencial.

A credencial vai somente para o RPC privado existente store_integration_token/Vault. A configuração pública guarda metadados e estado, sem access/refresh token. Google/RD/HubSpot usam bearer em cabeçalho e endpoints oficiais fixos, com timeout, sem cache e sem seguir redirects. A Connectors API da Windsor exige api_key na query; a URL nunca é registrada nem refletida em erro.

As autorizações são novas linhas desabilitadas, marcadas connection_hub e selection_pending. Permanecem fora do seletor legado de contas e das integrações operacionais. Não atualizam nem transferem conexões/ativos existentes. Renovação tem transporte testado e preserva o refresh token rotacionado do RD CRM; agendamento, lock de renovação e persistência automática ainda não foram implementados.

## Estados e limites

1. Plataforma e cliente escolhidos.
2. Acesso autorizado e verificado por consulta de leitura na API oficial.
3. Conta externa escolhida e pertencimento/exclusividade confirmados — pendente para os novos fluxos.
4. Coleta validada e dados conciliados com a fonte — pendente para Google Ads nativo, RD e HubSpot.

Uma resposta válida de acesso não ativa sincronização nem comprova pertencimento de conta. Os conectores novos não alimentam métricas até implementar seleção, persistência do vínculo e coleta. Os fluxos Meta/Windsor/Stract existentes continuam disponíveis. Separação completa de produto/conta e histórico dos funis CRM dependem da reconciliação de migrações da issue #211; não executar repair/reset/push para contornar esse trabalho.

## Contratos oficiais consultados

- [Google Ads OAuth](https://developers.google.com/google-ads/api/docs/oauth/overview) e [listAccessibleCustomers](https://developers.google.com/google-ads/api/samples/list-accessible-customers).
- [Windsor Connectors API](https://windsor.ai/api-documentation/): autenticação por api_key.
- [RD CRM v2](https://developers.rdstation.com/reference/crm-v2-authentication) e [token OAuth](https://developers.rdstation.com/reference/crm-v2-authentication-step-3).
- [RD Marketing: autorização](https://developers.rdstation.com/reference/gerar-code) e [tokens](https://developers.rdstation.com/reference/obter-tokens-acesso).
- [HubSpot: endpoints OAuth 2026-03](https://developers.hubspot.com/changelog/app-listing-and-app-certification-requirement-updates-for-may-2026).

## Aceite pendente em ambiente real

Registrar aplicativos, configurar segredos, autorizar contas sintéticas no ambiente aprovado, validar recusa/expiração/reutilização e testar agência versus viewer/cliente A versus B. Não usar dados reais como fixtures. Quality Gate e Vercel precisam aprovar o mesmo HEAD antes de integrar à main. A prévia de componentes com respostas sintéticas verifica interação e layout; não substitui homologação externa, validação de Vault/RLS real ou coleta.

## Ordem de implantação

O handler Edge engaje-integrations deve receber os guardas connection_hub antes de habilitar as novas rotas em produção. Eles impedem que a seleção legada altere/apague rascunhos ou que coleta manual/agendada tente usá-los. Esta PR inclui esses guardas; a proteção de identidade Meta da PR #358 deve ser preservada na integração. Implantar somente após gates e merge, verificando o conjunto completo do código publicado.
