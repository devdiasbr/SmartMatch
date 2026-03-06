# Smart Match - Plataforma de Fotos com Reconhecimento Facial

![Status](https://img.shields.io/badge/status-em_producao-brightgreen)
![Frontend](https://img.shields.io/badge/frontend-react_18-blue)
![Backend](https://img.shields.io/badge/backend-supabase_edge-orange)
![IA](https://img.shields.io/badge/face_recognition-face--api.js-purple)

Plataforma para venda de fotos de eventos com busca facial por selfie, checkout online e operacao presencial via PDV.

---

## Indice

- [Documentacao Completa (Manual)](#documentacao-completa-manual)
- [Arquitetura e Fluxo](#arquitetura-e-fluxo)
- [Funcionalidades e Diferenciais](#funcionalidades-e-diferenciais)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Como Executar](#como-executar)
- [Decisoes de Design](#decisoes-de-design)
- [Troubleshooting](#troubleshooting)

---

## Documentacao Completa (Manual)

Para detalhes aprofundados, acesse o manual central:

- [MANUAL](docs/manual/index.md)

Resumo das secoes tecnicas:

| Secao | Descricao |
|---|---|
| [01. Visao Geral e Fluxos](docs/manual/01-visao-geral.md) | Contexto de negocio e jornada de usuario/operador. |
| [02. Arquitetura e Stack](docs/manual/02-arquitetura-stack.md) | Camadas da solucao e tecnologias utilizadas. |
| [03. Estrutura do Projeto](docs/manual/03-estrutura-projeto.md) | Organizacao do codigo e arquivos principais. |
| [04. Funcionalidades](docs/manual/04-funcionalidades.md) | Recursos da area publica, admin e PDV. |
| [05. Rotas e API](docs/manual/05-rotas-api.md) | Rotas frontend e endpoints backend. |
| [06. Modelo de Dados e Contextos](docs/manual/06-dados-contextos.md) | Chaves KV, tabela WhatsApp e contexts React. |
| [07. Design System e Impressao](docs/manual/07-design-impressao.md) | Diretrizes visuais e formato de impressao. |
| [08. Configuracao e Deploy](docs/manual/08-configuracao-deploy.md) | Setup local, variaveis e publicacao. |
| [09. Seguranca](docs/manual/09-seguranca.md) | Controles de auth, tokens e acesso a midias. |
| [10. PDV WhatsApp (Opt-in)](docs/manual/10-pdv-whatsapp.md) | Captura de consentimento e fluxo de envio assistido. |

Documentos complementares:

- [Indice Geral de Docs](docs/index.md)
- [Implementacao Final](docs/IMPLEMENTACAO_FINAL.md)
- [Orcamento Comercial](docs/ORCAMENTO_COMERCIAL.md)

---

## Arquitetura e Fluxo

A solucao combina frontend React, backend em Supabase Edge Functions e processamento facial client-side.

```text
Usuario/Operador
	-> Frontend (React)
	-> API Client (src/app/lib/api.ts)
	-> Edge Function (supabase/functions/server/index.tsx)
	-> KV Store + Storage + Auth + pgvector
```

Fluxo operacional:

1. Fotos sao sincronizadas/importadas para Storage/KV.
2. Faces sao detectadas e indexadas (pgvector) para busca rapida.
3. Usuario encontra fotos por selfie, compra e recebe links de download.
4. No PDV, operador finaliza venda, imprime e pode coletar opt-in WhatsApp.

---

## Funcionalidades e Diferenciais

- Busca facial por selfie com fallback local quando necessario.
- Reindexacao com detector de alta qualidade para fotos de grupo.
- Checkout online (PIX/cartao) e presencial (dinheiro/debito/credito/PIX).
- Impressao 15x20 com orientacao automatica e QR de download.
- Branding configuravel sem alterar codigo.
- Opt-in de WhatsApp no PDV para relacionamento/campanhas futuras.

---

## Estrutura do Projeto

```text
/
├── src/
│   ├── app/pages/                 # Home, Eventos, Admin, PDV, Config
│   ├── app/components/            # Componentes compartilhados
│   ├── app/contexts/              # Auth, Branding, Cart
│   └── app/lib/                   # API client e servicos faciais
├── supabase/functions/server/     # Edge Function e regras de negocio
└── docs/                          # Documentacao tecnica e comercial
```

---

## Como Executar

Pre-requisitos:

- Node.js 18+
- Projeto Supabase configurado

Passos:

1. `npm install`
2. `npm run dev`
3. Para build: `npm run build`

Se houver mudanca de endpoints no backend, publicar `supabase/functions/server/index.tsx` no Supabase.

---

## Decisoes de Design

- Processamento facial no cliente para reduzir custo de infraestrutura.
- Busca ANN server-side com pgvector para performance em escala.
- Dual auth header em rotas admin para compatibilidade com gateway + middleware.
- Estrategia de documentacao modular em `docs/manual` para manutencao continua.

---

## Troubleshooting

| Problema | Causa provavel | Solucao |
|---|---|---|
| `HTTP 404` em endpoint admin novo | Backend nao publicado | Deploy atualizado da edge function. |
| Evento aparece com `0 fotos` | `photoCount` desatualizado no KV | Rodar sync ou abrir endpoints que auto-corrigem count. |
| `Failed to fetch` no sync | Cold start da edge function | Retry no cliente e aguardar inicializacao. |
| `npm run dev` falha local | Cache/deps locais inconsistentes | Reinstalar deps e limpar cache Vite. |

---

## Licenca

Projeto proprietario. Todos os direitos reservados.
