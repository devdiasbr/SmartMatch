[📚 Sumário](index.md) | [🏠 Home](../../README.md) | [← 09. Segurança](09-seguranca.md)

---

---

# PDV WhatsApp (Opt-in)

## Objetivo

Registrar consentimento do cliente presencial para contato via WhatsApp e habilitar envio assistido das fotos no ato da venda.

## Fluxo implementado

1. Operador ativa o opt-in no carrinho PDV.
2. Informa telefone com DDD.
3. Ao finalizar a venda, o sistema salva o contato em `whatsapp_contacts_68454e9b`.
4. Na tela de sucesso, o sistema gera link `wa.me` com mensagem preformatada e links das fotos.
5. Ao clicar em enviar, o status pode ser marcado como enviado (`message_sent = true`).

## Endpoints envolvidos

- `POST /admin/whatsapp-contacts`
- `GET /admin/whatsapp-contacts`
- `POST /admin/whatsapp-contacts/mark-sent`

## SQL da tabela

```sql
CREATE TABLE IF NOT EXISTS whatsapp_contacts_68454e9b (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         TEXT NOT NULL,
  customer_name TEXT,
  order_id      TEXT,
  event_id      TEXT,
  event_name    TEXT,
  photo_ids     TEXT[],
  photo_urls    TEXT[],
  opt_in_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_sent  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

---

[📚 Sumário](index.md) | [← 09. Segurança](09-seguranca.md)
