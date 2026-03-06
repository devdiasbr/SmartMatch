[🏠 Home](../../README.md) | [01. Visão Geral](01-visao-geral.md) | [02. Arquitetura](02-arquitetura-stack.md) | [03. Estrutura](03-estrutura-projeto.md) | [04. Funcionalidades](04-funcionalidades.md) | **05. Rotas e API** | [06. Dados e Contextos](06-dados-contextos.md) | [07. Design e Impressão](07-design-impressao.md) | [08. Config e Deploy](08-configuracao-deploy.md) | [09. Segurança](09-seguranca.md) | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)

---

# Rotas e API

Todos os endpoints do backend sao prefixados por `/make-server-68454e9b`.

## Rotas publicas (frontend)

- `/`
- `/eventos`
- `/eventos/:id`
- `/carrinho`
- `/minha-foto/:orderId/:photoId`

## Rotas administrativas (frontend)

- `/admin/login`
- `/admin`
- `/admin/eventos`
- `/admin/pedidos`
- `/admin/financeiro`
- `/admin/pdv`
- `/admin/config`

## Endpoints publicos (backend)

- `GET /health`
- `GET /events`
- `GET /events/:id`
- `GET /events/:id/photos`
- `POST /orders`
- `GET /orders/:id`
- `GET /orders/:orderId/photos/:photoId/download`
- `GET /orders/:orderId/photos/:photoId/signed-url`
- `POST /payments/pix`
- `POST /payments/preference`

## Endpoints administrativos (backend)

- `POST /orders/pos`
- `GET /orders`
- `PUT /orders/:id`
- `POST /orders/:id/cancel`
- `GET /admin/stats`
- `GET /admin/events`
- `POST /admin/sync-storage`
- `POST /admin/clear-embeddings`
- `GET /admin/events/:id/photo-ids`
- `POST /admin/whatsapp-contacts`
- `GET /admin/whatsapp-contacts`
- `POST /admin/whatsapp-contacts/mark-sent`

---

[🏠 Home](../../README.md) | [01. Visão Geral](01-visao-geral.md) | [02. Arquitetura](02-arquitetura-stack.md) | [03. Estrutura](03-estrutura-projeto.md) | [04. Funcionalidades](04-funcionalidades.md) | **05. Rotas e API** | [06. Dados e Contextos](06-dados-contextos.md) | [07. Design e Impressão](07-design-impressao.md) | [08. Config e Deploy](08-configuracao-deploy.md) | [09. Segurança](09-seguranca.md) | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)
