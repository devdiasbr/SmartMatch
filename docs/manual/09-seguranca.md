[📚 Sumário](index.md) | [🏠 Home](../../README.md) | [← 08. Config e Deploy](08-configuracao-deploy.md) | [10. PDV WhatsApp →](10-pdv-whatsapp.md)

---

---

# Seguranca

## Controles principais

- Autenticacao admin via Supabase Auth (JWT).
- Dupla validacao em chamadas admin:
  - `Authorization: Bearer <anonKey>` para gateway
  - `X-Admin-Token: <userJWT>` para middleware interno
- Bucket de fotos privado com signed URLs temporarias.
- Validacao de ownership no download publico (`orderId` + `photoId`).
- Segredos de pagamento/e-mail mantidos no backend.

## Boas praticas operacionais

- Evitar expor tokens em logs.
- Revisar periodicamente permissao das tabelas auxiliares.
- Monitorar volume de chamadas de sync/reindex.

---

---

[📚 Sumário](index.md) | [← 08. Config e Deploy](08-configuracao-deploy.md) | [10. PDV WhatsApp →](10-pdv-whatsapp.md)
