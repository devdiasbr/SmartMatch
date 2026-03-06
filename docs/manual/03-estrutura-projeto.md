[🏠 Home](../../README.md) | [01. Visão Geral](01-visao-geral.md) | [02. Arquitetura](02-arquitetura-stack.md) | **03. Estrutura** | [04. Funcionalidades](04-funcionalidades.md) | [05. Rotas e API](05-rotas-api.md) | [06. Dados e Contextos](06-dados-contextos.md) | [07. Design e Impressão](07-design-impressao.md) | [08. Config e Deploy](08-configuracao-deploy.md) | [09. Segurança](09-seguranca.md) | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)

---

# Estrutura do Projeto

## Pastas principais

- `src/`: frontend React.
- `src/app/pages/`: paginas publicas e admin.
- `src/app/components/`: componentes reutilizaveis.
- `src/app/contexts/`: `AuthContext`, `BrandingContext`, `CartContext`.
- `src/app/lib/`: `api.ts`, `faceService.ts` e utilitarios de dominio.
- `supabase/functions/server/`: backend Hono (Edge Function).
- `docs/`: documentacao tecnica e comercial.

## Arquivos chave

- `src/app/pages/AdminPDV.tsx`: fluxo presencial, impressao e envio WhatsApp assistido.
- `src/app/pages/AdminConfig.tsx`: sync, reindex, branding e operacoes administrativas.
- `src/app/lib/api.ts`: contratos de API e chamadas admin/public.
- `supabase/functions/server/index.tsx`: endpoints HTTP e regras de negocio.
- `supabase/functions/server/faces.ts`: indexacao e busca de embeddings no pgvector.

---

[🏠 Home](../../README.md) | [01. Visão Geral](01-visao-geral.md) | [02. Arquitetura](02-arquitetura-stack.md) | **03. Estrutura** | [04. Funcionalidades](04-funcionalidades.md) | [05. Rotas e API](05-rotas-api.md) | [06. Dados e Contextos](06-dados-contextos.md) | [07. Design e Impressão](07-design-impressao.md) | [08. Config e Deploy](08-configuracao-deploy.md) | [09. Segurança](09-seguranca.md) | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)
