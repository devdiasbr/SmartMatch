[🏠 Home](../../README.md) | [01. Visão Geral](01-visao-geral.md) | [02. Arquitetura](02-arquitetura-stack.md) | [03. Estrutura](03-estrutura-projeto.md) | [04. Funcionalidades](04-funcionalidades.md) | [05. Rotas e API](05-rotas-api.md) | [06. Dados e Contextos](06-dados-contextos.md) | [07. Design e Impressão](07-design-impressao.md) | **08. Config e Deploy** | [09. Segurança](09-seguranca.md) | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)

---

# Configuracao e Deploy

## Pre-requisitos

- Node.js 18+
- Projeto Supabase configurado
- Credenciais de Mercado Pago e Resend (quando aplicavel)

## Setup local

```bash
npm install
npm run build
```

## Variaveis e segredos

No servidor (Edge Function):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`

No frontend:

- `projectId`
- `publicAnonKey`

## Operacao recomendada

1. Publicar atualizacoes de `supabase/functions/server/index.tsx`.
2. Validar endpoints admin com token.
3. Validar fluxo PDV fim a fim (checkout, impressao, WhatsApp opt-in).

---

[🏠 Home](../../README.md) | [01. Visão Geral](01-visao-geral.md) | [02. Arquitetura](02-arquitetura-stack.md) | [03. Estrutura](03-estrutura-projeto.md) | [04. Funcionalidades](04-funcionalidades.md) | [05. Rotas e API](05-rotas-api.md) | [06. Dados e Contextos](06-dados-contextos.md) | [07. Design e Impressão](07-design-impressao.md) | **08. Config e Deploy** | [09. Segurança](09-seguranca.md) | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)
