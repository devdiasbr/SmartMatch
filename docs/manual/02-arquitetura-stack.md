[🏠 Home](../../README.md) | [01. Visão Geral](01-visao-geral.md) | **02. Arquitetura** | [03. Estrutura](03-estrutura-projeto.md) | [04. Funcionalidades](04-funcionalidades.md) | [05. Rotas e API](05-rotas-api.md) | [06. Dados e Contextos](06-dados-contextos.md) | [07. Design e Impressão](07-design-impressao.md) | [08. Config e Deploy](08-configuracao-deploy.md) | [09. Segurança](09-seguranca.md) | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)

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

[🏠 Home](../../README.md) | [01. Visão Geral](01-visao-geral.md) | **02. Arquitetura** | [03. Estrutura](03-estrutura-projeto.md) | [04. Funcionalidades](04-funcionalidades.md) | [05. Rotas e API](05-rotas-api.md) | [06. Dados e Contextos](06-dados-contextos.md) | [07. Design e Impressão](07-design-impressao.md) | [08. Config e Deploy](08-configuracao-deploy.md) | [09. Segurança](09-seguranca.md) | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)
