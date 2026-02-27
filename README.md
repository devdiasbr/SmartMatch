# Smart Match

**Plataforma de venda de fotografia de eventos com reconhecimento facial**

Desenvolvida para o **Tour do Palmeiras no Allianz Parque**, a Smart Match permite que visitantes encontrem suas fotos automaticamente usando inteligencia artificial de reconhecimento facial, comprem online ou presencialmente, e recebam por e-mail ou download direto via QR Code.

---

## Sumario

- [Visao Geral](#visao-geral)
- [Arquitetura](#arquitetura)
- [Stack Tecnologica](#stack-tecnologica)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Funcionalidades](#funcionalidades)
  - [Area Publica](#area-publica)
  - [Painel Administrativo](#painel-administrativo)
  - [Ponto de Venda (PDV)](#ponto-de-venda-pdv)
  - [Pagamentos](#pagamentos)
  - [Reconhecimento Facial](#reconhecimento-facial)
  - [Sistema de Branding](#sistema-de-branding)
  - [E-mails Transacionais](#e-mails-transacionais)
- [Rotas da Aplicacao](#rotas-da-aplicacao)
- [API - Endpoints do Servidor](#api---endpoints-do-servidor)
- [Modelo de Dados (KV Store)](#modelo-de-dados-kv-store)
- [Contextos React](#contextos-react)
- [Design System](#design-system)
- [Configuracao e Deploy](#configuracao-e-deploy)
- [Variaveis de Ambiente](#variaveis-de-ambiente)
- [Seguranca](#seguranca)

---

## Visao Geral

A Smart Match resolve um problema real do mercado de fotografia de eventos: **como o visitante encontra suas fotos entre milhares?**

### Fluxo do usuario final

1. O visitante acessa o site e navega ate o evento do dia/horario do seu tour
2. Tira uma selfie no celular
3. A IA de reconhecimento facial compara o rosto com todas as fotos do evento
4. As fotos correspondentes sao exibidas em destaque
5. O visitante adiciona ao carrinho e paga via PIX ou cartao (Mercado Pago)
6. Recebe as fotos em alta resolucao por e-mail e pode baixar via QR Code

### Fluxo do operador presencial (PDV)

1. O fotografo/operador acessa o painel PDV
2. Seleciona o evento e usa reconhecimento facial para encontrar as fotos do cliente
3. Adiciona ao carrinho, registra o pagamento (dinheiro, debito, credito ou PIX)
4. Imprime as fotos em papel fotografico 15x20cm com rodape personalizado e QR Code
5. O cliente escaneia o QR e baixa a versao digital no celular

---

## Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│          React + React Router + Tailwind             │
│                                                      │
│  Contexts: Auth | Branding | Cart | Theme            │
│  Pages:    Home | Events | EventDetail | Cart        │
│            MinhaFoto | Admin (6 paginas)             │
│  Libs:     api.ts | faceService.ts (face-api.js)     │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS (fetch)
                     │ Authorization: Bearer <anonKey>
                     │ X-Admin-Token: <userJWT>
                     ▼
┌─────────────────────────────────────────────────────┐
│                    BACKEND                           │
│        Supabase Edge Function (Deno + Hono)          │
│        /supabase/functions/server/index.tsx           │
│                                                      │
│  Middlewares: CORS | Logger | adminAuth              │
│  Integ.: Mercado Pago | Resend (e-mail)              │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ KV Store │ │ Storage  │ │   Auth   │
  │ (dados)  │ │ (fotos)  │ │ (admin)  │
  └──────────┘ └──────────┘ └──────────┘
      Supabase         Supabase
```

### Camadas

| Camada | Tecnologia | Responsabilidade |
|--------|-----------|-----------------|
| Frontend | React 18 + Vite + Tailwind v4 | UI, face detection client-side, state management |
| API Client | `api.ts` | Abstrai todas as chamadas HTTP com tipagem TypeScript |
| Backend | Hono (Deno) | Logica de negocios, auth, pagamentos, e-mail |
| Banco | Supabase KV (`kv_store_68454e9b`) | Persistencia key-value flexivel |
| Storage | Supabase Storage (bucket privado) | Armazenamento de fotos e assets de branding |
| Auth | Supabase Auth | Autenticacao de administradores |
| Pagamento | Mercado Pago API v1 | PIX e Checkout Pro (cartao) |
| E-mail | Resend API | Confirmacao de pedido com links de download |

---

## Stack Tecnologica

### Frontend

| Pacote | Versao | Uso |
|--------|--------|-----|
| React | 18.3.1 | Framework UI |
| React Router | 7.13.0 | Roteamento SPA (Data mode) |
| Tailwind CSS | 4.1.12 | Estilizacao utility-first |
| Motion (Framer Motion) | 12.23.24 | Animacoes e transicoes |
| Lucide React | 0.487.0 | Icones SVG |
| face-api.js | 0.22.2 | Reconhecimento facial client-side |
| Recharts | 2.15.2 | Graficos no dashboard admin |
| Supabase JS | 2.98.0 | Cliente Supabase (auth) |
| qrcode.react | 4.2.0 | Geracao de QR codes |
| Radix UI | Varios | Componentes UI acessiveis |
| Sonner | 2.0.3 | Toasts/notificacoes |

### Backend

| Tecnologia | Uso |
|-----------|-----|
| Deno | Runtime do edge function |
| Hono | Framework web minimalista |
| Supabase Edge Functions | Hospedagem serverless |
| Mercado Pago API | Processamento de pagamentos |
| Resend | Envio de e-mails transacionais |

---

## Estrutura do Projeto

```
/
├── src/
│   ├── app/
│   │   ├── App.tsx                    # Entry point — provider tree + RouterProvider
│   │   ├── routes.ts                  # Definicao de rotas (createBrowserRouter)
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.tsx               # Landing page publica
│   │   │   ├── Events.tsx             # Listagem de eventos
│   │   │   ├── EventDetail.tsx        # Detalhes do evento + busca facial + carrinho
│   │   │   ├── Cart.tsx               # Carrinho + checkout (PIX / cartao)
│   │   │   ├── MinhaFoto.tsx          # Download publico via QR Code
│   │   │   ├── AdminLogin.tsx         # Login do administrador
│   │   │   ├── AdminDashboard.tsx     # Dashboard com KPIs e graficos
│   │   │   ├── AdminEvents.tsx        # CRUD de eventos + upload de fotos
│   │   │   ├── AdminPedidos.tsx       # Gestao de pedidos
│   │   │   ├── AdminFinanceiro.tsx    # Relatorios financeiros + config MP
│   │   │   ├── AdminPDV.tsx           # Ponto de venda presencial
│   │   │   └── AdminConfig.tsx        # Config: Marca, Home, Eventos, Marca d'agua
│   │   │
│   │   ├── components/
│   │   │   ├── Root.tsx               # Layout root (Header + Outlet + Footer)
│   │   │   ├── Header.tsx             # Navbar responsivo com carrinho
│   │   │   ├── Footer.tsx             # Rodape do site
│   │   │   ├── ThemeProvider.tsx       # Dark/light mode toggle
│   │   │   ├── TabNav.tsx             # Navegacao por abas (admin)
│   │   │   ├── CartDrawer.tsx         # Drawer lateral do carrinho
│   │   │   ├── FaceSearchPanel.tsx    # Painel de busca facial (publico)
│   │   │   ├── FacePDVSearch.tsx      # Busca facial otimizada para PDV
│   │   │   ├── FaceGroupingPanel.tsx  # Agrupamento facial
│   │   │   ├── ProtectedImage.tsx     # Imagem com marca d'agua
│   │   │   ├── PhotoFooter.tsx        # Rodape de impressao
│   │   │   ├── TourFooterSVG.tsx      # SVG do rodape do tour
│   │   │   └── figma/
│   │   │       └── ImageWithFallback.tsx  # Img tag com fallback
│   │   │
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx        # Autenticacao (Supabase Auth)
│   │   │   ├── BrandingContext.tsx    # Configuracoes de marca (propagado de ponta a ponta)
│   │   │   └── CartContext.tsx        # Estado do carrinho + sync de precos
│   │   │
│   │   └── lib/
│   │       ├── api.ts                 # Cliente HTTP tipado (public + admin requests)
│   │       └── faceService.ts         # Wrapper face-api.js (modelos via CDN)
│   │
│   └── styles/
│       ├── theme.css                  # Tokens do design system (Tailwind v4)
│       └── fonts.css                  # Imports de fontes
│
├── supabase/
│   └── functions/
│       └── server/
│           ├── index.tsx              # Servidor Hono (50+ endpoints)
│           └── kv_store.tsx           # Utilitario KV Store (protegido)
│
└── package.json
```

---

## Funcionalidades

### Area Publica

| Feature | Descricao |
|---------|-----------|
| **Landing Page** | Hero animado com parallax, stats em tempo real, secao "Como funciona", CTA com background customizavel |
| **Listagem de Eventos** | Grid responsivo com filtro, badges de status, contagem de fotos, preco dinamico |
| **Detalhe do Evento** | Galeria de fotos com marca d'agua, busca facial por selfie, adicionar ao carrinho, pacotes de compra |
| **Carrinho** | Drawer lateral + pagina dedicada, resumo, cupons, checkout PIX/cartao |
| **Download (MinhaFoto)** | Pagina publica para download via QR Code — sem autenticacao, funciona em qualquer celular |
| **Tema Dark/Light** | Toggle no header, persistido em localStorage, transicoes suaves |
| **Responsividade** | Layout adaptavel de mobile a desktop em todas as paginas |

### Painel Administrativo

| Pagina | Funcionalidades |
|--------|----------------|
| **Dashboard** | KPIs (receita, pedidos, fotos, eventos), grafico de receita 14 dias (Recharts), pedidos recentes |
| **Eventos** | Criar/editar/excluir eventos, upload de fotos em lote, deteccao facial automatica no upload, tags |
| **Pedidos** | Lista completa, filtros por status, marcar como pago/entregue, cancelar com reembolso automatico via MP |
| **Financeiro** | Relatorios, configuracao do token Mercado Pago (KV), preco por foto, cupons |
| **PDV** | Venda presencial completa (detalhado abaixo) |
| **Configuracao** | 4 sub-abas: Marca, Home, Eventos, Marca d'agua — branding end-to-end |

### Ponto de Venda (PDV)

O PDV e uma interface completa para venda presencial no local do evento:

- **Selecao de evento** com contagem de fotos
- **Busca por tag/ID** e **reconhecimento facial** do cliente
- **Carrinho PDV** com nome do cliente e forma de pagamento (dinheiro/debito/credito/PIX)
- **Checkout instantaneo** — registra como `paid` automaticamente
- **Impressao de fotos** em papel fotografico **15x20cm** com:
  - Deteccao automatica de orientacao (paisagem/retrato) via `naturalWidth`/`naturalHeight`
  - CSS Named Pages (`@page landscape-page: 200x150mm`, `@page portrait-page: 150x200mm`)
  - Rodape customizavel com imagem + QR Code posicionavel (slider horizontal)
  - Cada foto na orientacao correta em folhas separadas
- **Comprovante termico** estilizado para impressora 80mm
- **QR Code** na foto impressa aponta para `/minha-foto/:orderId/:photoId` — download funciona em qualquer celular

### Pagamentos

| Metodo | Integracao | Fluxo |
|--------|-----------|-------|
| **PIX** | Mercado Pago API v1 `/payments` | Gera QR code PIX → cliente paga → webhook confirma → e-mail enviado |
| **Cartao** | Mercado Pago Checkout Pro `/preferences` | Redireciona para checkout MP → auto_return → status atualizado |
| **Presencial** | PDV interno | Registrado diretamente como `paid` (dinheiro, debito, credito, PIX) |

Recursos de pagamento:
- Token MP configuravel via painel admin (armazenado no KV, nunca exposto)
- Deteccao automatica de ambiente sandbox/producao
- Reembolso automatico via API ao cancelar pedido pago
- Idempotency keys para evitar duplicidade

### Reconhecimento Facial

A busca por reconhecimento facial opera **inteiramente no client-side** usando `face-api.js`:

1. **Upload de fotos (admin):** ao fazer upload, o sistema detecta rostos e salva os descritores (vetores 128D) no KV via API
2. **Busca pelo cliente:** o visitante tira uma selfie, o browser extrai o descritor facial e compara com todos os descritores do evento
3. **Matching:** fotos com distancia euclidiana abaixo do threshold sao exibidas em destaque
4. **Modelos usados:** TinyFaceDetector + FaceLandmark68TinyNet + FaceRecognitionNet (carregados via CDN jsDelivr)

Vantagens dessa abordagem:
- Zero custo de servidor para processamento de IA
- Privacidade: a selfie nunca sai do dispositivo do usuario
- Funciona offline apos carregamento dos modelos

### Sistema de Branding

O branding e **end-to-end configuravel** pelo admin, sem alteracao de codigo:

| Campo | Propagacao |
|-------|-----------|
| Nome do app, titulo da pagina | Header, Footer, SEO |
| Logo, favicon | Header, emails, impressoes |
| Textos da Home (hero, CTA, badge) | Landing page |
| Textos da pagina Eventos | Pagina de listagem |
| Nome do local, localizacao, label do tour | Todas as paginas publicas |
| Marca d'agua (texto, produtor, tag, tour) | ProtectedImage (fotos na galeria) |
| Backgrounds (carousel) | Home hero |
| Background CTA | Banner CTA da home |

Fluxo: `AdminConfig.tsx` → `api.ts` → Servidor Hono → KV Store → `BrandingContext.tsx` → componentes

### E-mails Transacionais

Enviados via **Resend API** com template HTML inline responsivo:

- **Gatilho:** quando o status do pedido muda para `paid` (via webhook MP ou admin manual)
- **Conteudo:** resumo do pedido, thumbnail de cada foto, botao "Baixar foto" com signed URL (valida por 7 dias)
- **Design:** template profissional com cores da marca (#006B2B), logo, tipografia Montserrat

---

## Rotas da Aplicacao

### Publicas

| Rota | Componente | Descricao |
|------|-----------|-----------|
| `/` | `Home` | Landing page |
| `/eventos` | `Events` | Listagem de eventos |
| `/eventos/:id` | `EventDetail` | Fotos do evento + busca facial |
| `/carrinho` | `Cart` | Carrinho + checkout |
| `/minha-foto/:orderId/:photoId` | `MinhaFoto` | Download publico (QR Code) |

### Administrativas (protegidas por auth)

| Rota | Componente | Descricao |
|------|-----------|-----------|
| `/admin/login` | `AdminLogin` | Tela de login |
| `/admin` | `AdminDashboard` | Dashboard com KPIs |
| `/admin/eventos` | `AdminEvents` | Gestao de eventos e fotos |
| `/admin/pedidos` | `AdminPedidos` | Gestao de pedidos |
| `/admin/financeiro` | `AdminFinanceiro` | Financeiro + config MP |
| `/admin/pdv` | `AdminPDV` | Ponto de venda presencial |
| `/admin/config` | `AdminConfig` | Branding e configuracoes |

---

## API - Endpoints do Servidor

Todos os endpoints sao prefixados com `/make-server-68454e9b`.

### Publicos (Authorization: Bearer anonKey)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/health` | Health check |
| GET | `/stats/public` | Total de eventos e fotos |
| GET | `/branding/public` | Configuracoes de branding |
| GET | `/config/price` | Preco atual da foto |
| GET | `/events` | Listar eventos |
| GET | `/events/:id` | Detalhes de um evento |
| GET | `/events/:id/photos` | Fotos de um evento (com signed URLs) |
| GET | `/events/:id/faces` | Descritores faciais do evento |
| POST | `/orders` | Criar pedido (checkout online) |
| GET | `/orders/:id` | Consultar pedido |
| GET | `/orders/:oid/photos/:pid/download` | Download via redirect 302 |
| GET | `/orders/:oid/photos/:pid/signed-url` | Signed URLs (JSON) para MinhaFoto |
| POST | `/payments/pix` | Criar pagamento PIX |
| POST | `/payments/preference` | Criar preferencia Checkout Pro |
| POST | `/auth/register` | Registrar admin |

### Administrativos (X-Admin-Token: userJWT)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/events` | Criar evento (find-or-create by slug) |
| PUT | `/events/:id` | Atualizar evento |
| DELETE | `/events/:id` | Excluir evento + fotos |
| POST | `/events/:id/photos` | Upload de foto (base64) |
| DELETE | `/events/:eid/photos/:pid` | Excluir foto |
| POST | `/events/:eid/photos/:pid/faces` | Salvar descritores faciais |
| GET | `/orders` | Listar todos os pedidos |
| PUT | `/orders/:id` | Atualizar pedido |
| POST | `/orders/:id/cancel` | Cancelar + reembolso MP |
| POST | `/orders/pos` | Criar pedido PDV |
| GET | `/admin/stats` | Estatisticas do dashboard |
| GET | `/admin/branding` | Config de branding |
| PUT | `/admin/branding` | Atualizar textos de branding |
| POST | `/admin/branding/upload` | Upload de asset (logo/favicon/bg) |
| DELETE | `/admin/branding/asset/:asset` | Remover logo/favicon |
| DELETE | `/admin/branding/backgrounds/:idx` | Remover background |
| GET | `/admin/config` | Config geral (preco, cupons, MP) |
| PUT | `/admin/config` | Atualizar config |
| POST | `/admin/orders/:id/send-email` | Reenviar e-mail de confirmacao |

---

## Modelo de Dados (KV Store)

Toda a persistencia usa a tabela `kv_store_68454e9b` com chaves prefixadas por `ef:`.

| Chave | Tipo | Descricao |
|-------|------|-----------|
| `ef:events:index` | `string[]` | Lista de IDs de eventos |
| `ef:event:<id>` | `EventRecord` | Dados do evento |
| `ef:photos:event:<eventId>` | `string[]` | Lista de IDs de fotos do evento |
| `ef:photo:<photoId>` | `PhotoRecord` | Dados da foto (inclui descritores faciais) |
| `ef:orders:index` | `string[]` | Lista de IDs de pedidos |
| `ef:order:<orderId>` | `OrderRecord` | Dados do pedido |
| `ef:config` | `AdminConfig` | Configuracoes globais (preco, cupons, mpToken) |
| `ef:branding` | `BrandingConfig` | Textos e paths de assets de branding |
| `ef:daily:revenue:<YYYY-MM-DD>` | `number` | Receita diaria |
| `ef:daily:count:<YYYY-MM-DD>` | `number` | Fotos vendidas no dia |

### Estrutura do EventRecord

```typescript
{
  id: string;           // Slug DDMMYYYYHHMM
  name: string;         // "Tour DD/MM/YYYY, HH:MM"
  slug: string;
  date: string;         // ISO 8601
  endTime: string;
  location: string;
  status: 'disponivel' | 'encerrado';
  photoCount: number;
  faceCount: number;
  price: number;
  dayOfWeek: string;    // "segunda-feira", etc.
  createdAt: string;
  updatedAt: string;
}
```

### Estrutura do OrderRecord

```typescript
{
  id: string;                      // "ord-<timestamp>-<random>" ou "pos-<timestamp>-<random>"
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  paymentMethod: 'pix' | 'card' | 'dinheiro' | 'debito' | 'credito';
  status: 'pending' | 'paid' | 'delivered' | 'cancelled';
  channel?: 'online' | 'pos';
  operatorId?: string;
  mpPaymentId?: number;
  mpPreferenceId?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Contextos React

### Provider Tree (App.tsx)

```
ThemeProvider → AuthProvider → BrandingProvider → CartProvider → RouterProvider
```

| Contexto | Responsabilidade | Dados expostos |
|----------|-----------------|----------------|
| **ThemeProvider** | Dark/light mode | `theme`, `toggleTheme` |
| **AuthContext** | Login/logout admin, token JWT | `user`, `session`, `isAdmin`, `getToken()`, `signIn()`, `signOut()` |
| **BrandingContext** | Config de marca (carregada do servidor) | Todos os campos de `BrandingConfig`, `loading`, `refresh()` |
| **CartContext** | Carrinho de compras | `items`, `addItem()`, `removeItem()`, `clearCart()`, `totalPrice`, `syncPrices()` |

---

## Design System

### Paleta de Cores

#### Dark Mode (padrao)

| Token | Cor | Uso |
|-------|-----|-----|
| Background | `#08080E` | Fundo principal |
| Card | `rgba(255,255,255,0.03)` | Surfaces |
| Verde eletrico | `#00FF7F` | Acentos primarios |
| Ciano | `#00D4FF` | Acentos secundarios |
| Ambar | `#FFB800` | Avisos / destaques |
| Verde claro | `#86efac` | Textos de destaque |
| Verde escuro | `#166534` | Botoes primarios |

#### Light Mode

| Token | Cor | Uso |
|-------|-----|-----|
| Background | `#F2F8F4` | Fundo principal |
| Card | `rgba(255,255,255,0.85)` | Surfaces |
| Verde Palmeiras | `#006B2B` | Cor primaria |
| Verde medio | `#00843D` | Gradientes |
| Texto | `#0D2818` | Texto principal |

### Tipografia

- **Montserrat** — Titulos e branding (weight: 800-900)
- **System UI** — Corpo de texto

### Impressao

- **Papel:** 15x20cm fotografico
- **Paisagem:** `@page landscape-page { size: 200mm 150mm }` — rodape 20cm
- **Retrato:** `@page portrait-page { size: 150mm 200mm }` — rodape 15cm
- **Comprovante:** 80mm termico com fonte Montserrat

---

## Configuracao e Deploy

### Pre-requisitos

- Node.js 18+
- Conta Supabase (projeto ja configurado)
- Conta Mercado Pago (para pagamentos)
- Conta Resend (para e-mails)

### Instalacao

```bash
pnpm install
pnpm run build
```

### Configuracao do Mercado Pago

1. Acesse o painel admin → **Financeiro**
2. Cole o Access Token do Mercado Pago no campo dedicado
3. O token e armazenado de forma segura no KV Store (nunca exposto ao frontend)
4. Para ambiente de testes, use tokens que comecam com `TEST-`

### Configuracao do Branding

1. Acesse o painel admin → **Config** → aba **Marca**
2. Configure: nome do app, local, logo, favicon, backgrounds
3. Na aba **Home**, edite textos do hero e CTA
4. Na aba **Eventos**, edite textos da pagina de listagem
5. Na aba **Marca d'agua**, configure os textos sobrepostos nas fotos

---

## Variaveis de Ambiente

### Servidor (Supabase Edge Function)

| Variavel | Descricao |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase (automatico) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (automatico) |
| `RESEND_API_KEY` | API key do Resend para envio de e-mails |

### Frontend (via Supabase info)

| Variavel | Descricao |
|----------|-----------|
| `projectId` | ID do projeto Supabase |
| `publicAnonKey` | Chave publica anonima do Supabase |

### Configuradas via Admin UI (KV Store)

| Config | Descricao |
|--------|-----------|
| `mpToken` | Access Token do Mercado Pago |
| `photoPrice` | Preco unitario da foto (default: R$ 30) |
| `coupons` | Cupons de desconto |

---

## Seguranca

| Aspecto | Implementacao |
|---------|--------------|
| **Autenticacao** | Supabase Auth com JWT — refresh automatico |
| **Dual-header auth** | `Authorization: Bearer <anonKey>` (gateway) + `X-Admin-Token: <userJWT>` (middleware) |
| **Token MP** | Armazenado apenas no KV server-side, nunca exposto ao frontend (apenas preview mascarado) |
| **Fotos** | Bucket privado com signed URLs temporarias (1h para preview, 7d para download) |
| **CORS** | Headers abertos para o frontend, mas rotas admin protegidas por middleware |
| **XSS** | React escapa outputs por padrao |
| **Download publico** | Validacao: orderId + photoId devem corresponder (foto pertence ao pedido) |

---

## Licenca

Projeto proprietario. Todos os direitos reservados.

**Smart Match** — Edu Santana Producoes
