[📚 Sumário](index.md) | [🏠 Home](../../README.md) | [← 04. Funcionalidades](04-funcionalidades.md) | [06. Dados e Contextos →](06-dados-contextos.md)

---

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

---

[📚 Sumário](index.md) | [← 04. Funcionalidades](04-funcionalidades.md) | [06. Dados e Contextos →](06-dados-contextos.md)
