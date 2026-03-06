[📚 Sumário](index.md) | [🏠 Home](../../README.md) | [← 01. Visão Geral](01-visao-geral.md) | [03. Estrutura →](03-estrutura-projeto.md)

---

---

# Arquitetura e Stack

## Arquitetura (alto nivel)

- Frontend: React + React Router + Tailwind + face-api.js.
- Backend: Supabase Edge Function (Hono/Deno).
- Persistencia principal: KV Store (`kv_store_68454e9b`).
- Midias: Supabase Storage (bucket privado).
- Auth: Supabase Auth (admin).
- Pagamentos: Mercado Pago.
- E-mail: Resend.

## Camadas

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind | UI, busca facial client-side, estado global |
| API Client | `src/app/lib/api.ts` | Abstracao das chamadas HTTP tipadas |
| Backend | Hono (Deno) | Regras de negocio, auth, pagamentos, envio |
| Banco | KV Store + tabelas auxiliares | Persistencia de eventos/pedidos/config |
| Storage | Supabase Storage | Fotos e assets de branding |

## Stack principal

- React 18
- React Router 7
- Tailwind CSS 4
- Motion
- face-api.js
- Supabase JS
- Recharts
- Lucide React

---

---

[📚 Sumário](index.md) | [← 01. Visão Geral](01-visao-geral.md) | [03. Estrutura →](03-estrutura-projeto.md)
