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
