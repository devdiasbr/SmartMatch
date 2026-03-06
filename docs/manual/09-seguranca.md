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
