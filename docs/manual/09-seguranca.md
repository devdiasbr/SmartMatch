[🏠 Home](../../README.md) | [01. Visão Geral](01-visao-geral.md) | [02. Arquitetura](02-arquitetura-stack.md) | [03. Estrutura](03-estrutura-projeto.md) | [04. Funcionalidades](04-funcionalidades.md) | [05. Rotas e API](05-rotas-api.md) | [06. Dados e Contextos](06-dados-contextos.md) | [07. Design e Impressão](07-design-impressao.md) | [08. Config e Deploy](08-configuracao-deploy.md) | **09. Segurança** | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)

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

[🏠 Home](../../README.md) | [01. Visão Geral](01-visao-geral.md) | [02. Arquitetura](02-arquitetura-stack.md) | [03. Estrutura](03-estrutura-projeto.md) | [04. Funcionalidades](04-funcionalidades.md) | [05. Rotas e API](05-rotas-api.md) | [06. Dados e Contextos](06-dados-contextos.md) | [07. Design e Impressão](07-design-impressao.md) | [08. Config e Deploy](08-configuracao-deploy.md) | **09. Segurança** | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)
