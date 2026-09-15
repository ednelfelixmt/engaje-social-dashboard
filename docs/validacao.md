# Validação da etapa 1

Schema executado em PostgreSQL via PGlite, com stubs SQL de Auth e Storage. Nenhum banco remoto foi alterado.

```text
OK 1: Exatamente 11 tabelas públicas
OK 2: RLS habilitada nas 11 tabelas
OK 3: JOIN não multiplica Ads nem soma CRM com planilha
OK 4: ROAS, ROI e CPA reais
OK 5: Moedas separadas e fallback Ads
OK 6: Receita real zero não vira receita da plataforma
OK 7: Sem compras: CPA null
OK 8: Sem investimento: ROAS null
OK 9: Dia só de CRM incluído
OK 10: Preferência por planilha respeitada
OK 11: Importações incompletas não substituem receita
OK 12: Viewer só vê sua organização
OK 13: View respeita RLS de outro cliente
OK 14: Viewer não é super admin
OK 15: profiles: sem leitura cross-tenant
OK 16: organization_members: sem leitura cross-tenant
OK 17: branding: sem leitura cross-tenant
OK 18: dashboard_configs: sem leitura cross-tenant
OK 19: metrics_ads: sem leitura cross-tenant
OK 20: metrics_crm: sem leitura cross-tenant
OK 21: metrics_organic: sem leitura cross-tenant
OK 22: creatives: sem leitura cross-tenant
OK 23: spreadsheet_uploads: sem leitura cross-tenant
OK 24: integrations: sem leitura cross-tenant
OK 25: Referência de segredo não exposta
OK 26: Autopromoção bloqueada
OK 27: Autoinclusão em outro cliente bloqueada por RLS
OK 28: Alteração de role por viewer bloqueada
OK 29: Viewer não edita branding
OK 30: Browser não apaga métricas
OK 31: Browser não falsifica métricas
OK 32: Editor edita branding próprio
OK 33: Editor não edita outro cliente
OK 34: Movimentação de tenant bloqueada
OK 35: Upload de branding próprio
OK 36: Storage bloqueia upload em outro tenant
OK 37: Storage rejeita prefixo inválido
OK 38: Storage permite substituição própria
OK 39: Storage permite remoção própria
OK 40: Organização pausada perde acesso imediatamente
OK 41: Super admin da agência reconhecido
OK 42: Super admin vê todos, inclusive pausados
OK 43: FK composta bloqueia integração de outro tenant
OK 44: Chave natural impede duplicação na ressincronização
OK 45: Anon não enumera organizações
OK 46: Anon não lê performance
OK 47: Anon não executa helper

47 verificações aprovadas. Auth HTTP, Storage HTTP e deploy não fazem parte deste teste.
```

Tipos gerados pela introspecção do mesmo schema. Serviços HTTP e aplicação web ainda serão implementados e testados na etapa seguinte.
