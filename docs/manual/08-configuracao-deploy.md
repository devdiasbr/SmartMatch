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
