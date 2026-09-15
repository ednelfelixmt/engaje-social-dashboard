# Contrato de ingestão — versão 1

O endpoint é criado dentro do cliente em **Configurações → Integradores**. Envie `POST` com `Content-Type: application/json` e a chave recebida no header `x-engaje-key`.

Regras gerais:

- máximo de 1.000 linhas e 2 MB por requisição;
- datas diárias em `YYYY-MM-DD`;
- moeda ISO 4217 com três letras, como `BRL`;
- IDs externos sempre como texto;
- reenvios são idempotentes pelas chaves naturais de cada tabela;
- a chave é exibida uma única vez e somente seu SHA-256 fica no Supabase.

## Anúncios

```json
{
  "dataset": "ads",
  "rows": [{
    "metric_date": "2026-09-15",
    "platform": "google_ads",
    "account_id": "1234567890",
    "campaign_id": "campanha-1",
    "campaign_name": "Pesquisa institucional",
    "ad_id": "anuncio-1",
    "currency": "BRL",
    "spend": 150.25,
    "revenue": 900,
    "impressions": 12000,
    "clicks": 420,
    "page_views": 300,
    "leads": 20,
    "checkouts": 8,
    "purchases": 5,
    "attribution_window": "source_default"
  }]
}
```

Plataformas aceitas: `meta_ads`, `google_ads` e `tiktok_ads`.

## CRM

```json
{
  "dataset": "crm",
  "rows": [{
    "metric_date": "2026-09-15",
    "currency": "BRL",
    "channel": "google_ads",
    "account_id": "1234567890",
    "campaign_id": "campanha-1",
    "revenue": 1200,
    "purchases": 6,
    "leads": 20,
    "checkouts": 8,
    "is_complete": true
  }]
}
```

`is_complete=true` só deve ser usado quando a receita do dia estiver integralmente conciliada. Receita pode ser zero ou negativa em caso de estornos.

## Criativos

```json
{
  "dataset": "creatives",
  "rows": [{
    "platform": "instagram_organic",
    "account_id": "conta-1",
    "external_id": "post-1",
    "kind": "image",
    "caption": "Legenda publicada",
    "media_url": "https://exemplo.com/imagem.jpg",
    "thumbnail_url": "https://exemplo.com/miniatura.jpg",
    "permalink": "https://exemplo.com/post-1",
    "published_at": "2026-09-15T12:00:00Z",
    "lifetime_metrics": {"likes": 40, "comments": 5}
  }]
}
```

Tipos aceitos: `image`, `video`, `carousel` e `text`.

## Métricas orgânicas

Importe o criativo primeiro. Depois use o mesmo `account_id` e `external_id` como `creative_external_id`.

```json
{
  "dataset": "organic",
  "rows": [{
    "metric_date": "2026-09-15",
    "platform": "instagram_organic",
    "account_id": "conta-1",
    "creative_external_id": "post-1",
    "impressions": 3000,
    "reach": 2200,
    "clicks": 80,
    "likes": 40,
    "comments": 5,
    "shares": 3,
    "saves": 12,
    "video_views": 0
  }]
}
```

Resposta de sucesso:

```json
{"status":"success","dataset":"ads","rows_received":1,"integration_id":"...","synced_at":"..."}
```

Qualquer falha retorna `status=error`, não grava o lote rejeitado e registra a mensagem na integração para aparecer no painel.
