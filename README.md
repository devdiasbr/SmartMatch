# 📸 SmartMatch — Plataforma de Fotos com Reconhecimento Facial

![Status](https://img.shields.io/badge/status-em_produção-brightgreen)
![Frontend](https://img.shields.io/badge/frontend-React_18-61DAFB?logo=react)
![Backend](https://img.shields.io/badge/backend-Supabase_Edge-3ECF8E?logo=supabase)
![IA](https://img.shields.io/badge/IA-face--api.js-purple)
![Pagamentos](https://img.shields.io/badge/pagamentos-Mercado_Pago-009EE3)
![Licença](https://img.shields.io/badge/licença-proprietária-red)

> Solução completa de fotografia para eventos: o visitante tira uma **selfie**, a IA encontra suas fotos no acervo do evento e ele compra em segundos — online ou num totem presencial.

---

## 📑 Índice

- [Visão Geral](#-visão-geral)
- [Demonstração de Fluxo](#-demonstração-de-fluxo)
- [Arquitetura](#-arquitetura)
- [Stack Tecnológico](#-stack-tecnológico)
- [Funcionalidades](#-funcionalidades)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Como Executar](#-como-executar)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Decisões de Design](#-decisões-de-design)
- [Troubleshooting](#-troubleshooting)
- [Documentação Completa](#-documentação-completa-manual)
- [Licença](#-licença)

---

## 🎯 Visão Geral

O **SmartMatch** resolve um problema real da fotografia de eventos: o visitante não consegue encontrar suas fotos entre milhares de imagens.

### O problema

Eventos de grande porte (maratonas, parques temáticos, feiras, shows) geram **milhares de fotos por hora**. Localizar manualmente as fotos de uma pessoa específica é inviável — e a taxa de conversão de venda cai drasticamente.

### A solução

| Etapa | O que acontece |
|---|---|
| 📸 **Captura** | Fotógrafo profissional registra o evento e envia para o Storage |
| 🔍 **Indexação** | A plataforma processa e indexa as faces detectadas via **pgvector** |
| 🤳 **Busca** | O visitante tira uma selfie; o algoritmo compara com o acervo em < 2 s |
| 🛒 **Compra** | Checkout online (PIX / cartão via Mercado Pago) ou presencial no PDV |
| 📩 **Entrega** | Links de download por e-mail (Resend), QR Code e, via PDV, WhatsApp |

A busca facial roda **no próprio navegador** (face-api.js) para pré-filtragem e **no servidor** (pgvector / ANN) para precisão em escala — sem expor fotos antes da compra.

---

## 🔁 Demonstração de Fluxo

### Visitante (online)

```
Home → Escolhe evento → Tira selfie → Galeria das suas fotos →
Carrinho → Checkout PIX/cartão → Link de download por e-mail + QR
```

### Operador PDV (presencial)

```
/admin/pdv → Seleciona evento → Busca por face ou tag →
Monta carrinho → Registra pagamento (dinheiro/débito/crédito/PIX) →
Imprime foto 15×20 + QR → Opt-in WhatsApp (opcional)
```

### Administrador

```
/admin → Dashboard KPIs → Gestão de eventos/fotos →
Sync/reindexação facial → Pedidos/reembolsos → Configuração de branding
```

---

## 🏗 Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│                    Navegador / Totem PDV                 │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  React 18 + React Router 7 + Tailwind CSS 4         │ │
│  │  face-api.js (detecção e matching client-side)       │ │
│  │  src/app/lib/api.ts  (HTTP client tipado)            │ │
│  └──────────────────────┬──────────────────────────────┘ │
└─────────────────────────┼────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼────────────────────────────────┐
│           Supabase Edge Function  (Deno + Hono)          │
│  supabase/functions/server/index.tsx                     │
│  ├── Auth (Supabase JWT + dual-header admin)             │
│  ├── Eventos, Fotos, Pedidos, Config (KV Store)          │
│  ├── Busca facial ANN (pgvector)                         │
│  ├── Pagamentos (Mercado Pago webhook)                   │
│  ├── E-mail transacional (Resend)                        │
│  └── Opt-in WhatsApp (tabela auxiliar)                   │
├──────────────────────────────────────────────────────────┤
│  Supabase Platform                                       │
│  ├── KV Store (eventos, pedidos, config, branding)       │
│  ├── Storage (fotos em bucket privado + signed URLs)     │
│  ├── Auth (admin)                                        │
│  └── Postgres (pgvector para embeddings faciais)         │
└──────────────────────────────────────────────────────────┘
```

---

## 🛠 Stack Tecnológico

| Camada | Tecnologia | Versão |
|---|---|---|
| UI | React | 18 |
| Roteamento | React Router | 7 |
| Estilos | Tailwind CSS | 4 |
| Animações | Motion (Framer) | — |
| Reconhecimento facial | face-api.js | — |
| Componentes | shadcn/ui + Radix UI | — |
| Ícones | Lucide React | — |
| Gráficos | Recharts | — |
| Backend | Hono (Deno runtime) | — |
| BaaS | Supabase (Auth + Storage + Edge + Postgres) | — |
| Busca vetorial | pgvector | — |
| Pagamentos | Mercado Pago | — |
| E-mail | Resend | — |
| Build | Vite | — |

---

## 📦 Funcionalidades

### Área Pública

- **Home** com branding 100% dinâmico (logo, cores, imagens via painel admin)
- **Listagem de eventos** com filtros por data e categoria
- **Detalhe do evento** com galeria protegida e **busca por selfie**
- **Carrinho** e checkout PIX / cartão via Mercado Pago
- **Página `MinhaFoto`** — download por QR Code ou link único sem login

### Painel Administrativo (`/admin`)

- **Dashboard** com KPIs de vendas, receita, tickets médios e gráficos
- **Gestão de eventos** — criar, editar, ativar/desativar, anexar fotos
- **Gestão de pedidos** — listar, cancelar, processar reembolso
- **Financeiro** — relatórios e configuração de gateway de pagamento
- **Configuração de branding** — logo, paleta de cores, imagens, textos
- **Sync / Reindexação facial** — reprocessa embeddings com detector de alta qualidade para fotos de grupo

### PDV (Ponto de Venda Presencial)

- **Busca por face** ou tag/ID diretamente no balcão
- **Carrinho próprio** do PDV, independente do checkout online
- **4 formas de pagamento** presencial: dinheiro, débito, crédito, PIX
- **Impressão fotográfica 15×20** — orientação automática (paisagem/retrato), rodapé configurável com logo e QR
- **Comprovante térmico** de venda
- **Opt-in WhatsApp** — registro de consentimento do cliente para comunicação futura

### Segurança

- Fotos servidas por **signed URLs** com expiração (nunca expostas diretamente)
- Auth admin via **Supabase JWT** + dual-header para compatibilidade com gateway
- Imagens renderizadas via `ProtectedImage` — previne right-click e download direto
- Rotas admin protegiadas por `ProtectedRoute` no frontend

---

## 📁 Estrutura do Projeto

```
SmartMatch/
├── src/
│   └── app/
│       ├── pages/              # Páginas principais (Home, Eventos, Admin*, PDV, MinhaFoto)
│       ├── components/         # Componentes compartilhados (FaceSearch, CartDrawer, ...)
│       │   └── ui/             # Biblioteca de componentes (shadcn/ui)
│       ├── contexts/           # AuthContext, BrandingContext, CartContext
│       └── lib/
│           ├── api.ts          # HTTP client tipado para a edge function
│           ├── faceService.ts  # Detecção e comparação facial (face-api.js)
│           └── faceQueue.ts    # Fila de processamento de faces (throttle/retry)
├── supabase/
│   └── functions/server/
│       ├── index.tsx           # Edge function principal (Hono router, todos os endpoints)
│       ├── kv_store.tsx        # Abstração KV Store
│       └── faces.ts            # Lógica de indexação e busca vetorial (pgvector)
├── docs/
│   ├── manual/                 # Manual técnico modular (10 capítulos)
│   ├── IMPLEMENTACAO_FINAL.md
│   └── ORCAMENTO_COMERCIAL.md
└── index.html / vite.config.ts / package.json
```

---

## 🚀 Como Executar

### Pré-requisitos

- Node.js 18+
- Conta e projeto no [Supabase](https://supabase.com) configurados
- Variáveis de ambiente preenchidas (veja abaixo)

### Desenvolvimento local

```bash
npm install
npm run dev
```

### Build de produção

```bash
npm run build
```

### Deploy do backend

Sempre que houver mudanças em `supabase/functions/server/`:

```bash
supabase functions deploy server
```

---

## 🔑 Variáveis de Ambiente

Crie um arquivo `.env` na raiz com:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

Segredos do backend são configurados no painel Supabase → Edge Functions → Secrets:

| Segredo | Descrição |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role para operações admin |
| `MP_ACCESS_TOKEN` | Token de produção do Mercado Pago |
| `RESEND_API_KEY` | Chave da API Resend para e-mails |
| `ADMIN_PASSWORD` | Senha de acesso ao painel admin |

---

## 💡 Decisões de Design

| Decisão | Justificativa |
|---|---|
| **Processamento facial client-side** | Reduz custo de infra; pré-filtra candidatos antes de confirmar no servidor |
| **pgvector ANN server-side** | Precisão e escala para acervos de milhares de fotos |
| **KV Store como banco principal** | Latência baixíssima no Edge; simplicidade para dados de evento/config |
| **Signed URLs com expiração** | Fotos nunca expostas antes da compra; proteção de receita |
| **Dual auth header em rotas admin** | Compatibilidade simultânea com gateway e middleware Supabase |
| **Branding 100% pelo painel** | Reuso da plataforma para diferentes clientes/eventos sem tocar código |
| **Opt-in WhatsApp no PDV** | Conformidade LGPD e base para campanhas de remarketing |

---

## 🔧 Troubleshooting

| Problema | Causa provável | Solução |
|---|---|---|
| `HTTP 404` em endpoint admin novo | Backend desatualizado | Re-deploy da edge function |
| Evento aparece com `0 fotos` | `photoCount` desatualizado no KV | Rodar sync ou reindexação no painel admin |
| `Failed to fetch` no sync | Cold start da edge function | Retry automático no cliente; aguardar inicialização |
| Busca facial retorna resultados ruins | Fotos de grupo não reindexadas | Usar "Reindexar (alta qualidade)" no painel admin |
| `npm run dev` falha | Cache/deps inconsistentes | `rm -rf node_modules .vite && npm install` |
| Impressão PDV cortada | Orientação errada configurada | Ajustar orientação na tela de PDV antes de imprimir |

---

## 📚 Documentação Completa (Manual)

| Capítulo | Descrição |
|---|---|
| [01. Visão Geral e Fluxos](docs/manual/01-visao-geral.md) | Contexto de negócio e jornada de usuário/operador |
| [02. Arquitetura e Stack](docs/manual/02-arquitetura-stack.md) | Camadas da solução e tecnologias utilizadas |
| [03. Estrutura do Projeto](docs/manual/03-estrutura-projeto.md) | Organização do código e arquivos principais |
| [04. Funcionalidades](docs/manual/04-funcionalidades.md) | Recursos da área pública, admin e PDV |
| [05. Rotas e API](docs/manual/05-rotas-api.md) | Rotas frontend e endpoints backend |
| [06. Modelo de Dados e Contextos](docs/manual/06-dados-contextos.md) | Chaves KV, tabela WhatsApp e contexts React |
| [07. Design System e Impressão](docs/manual/07-design-impressao.md) | Diretrizes visuais e formato de impressão |
| [08. Configuração e Deploy](docs/manual/08-configuracao-deploy.md) | Setup local, variáveis e publicação |
| [09. Segurança](docs/manual/09-seguranca.md) | Controles de auth, tokens e acesso a mídias |
| [10. PDV WhatsApp (Opt-in)](docs/manual/10-pdv-whatsapp.md) | Captura de consentimento e fluxo de envio assistido |

[📚 Ver Sumário Completo do Manual](docs/manual/index.md)

---

## 📜 Licença

Projeto proprietário. Todos os direitos reservados.
