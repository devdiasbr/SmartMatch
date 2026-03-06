[🏠 Home](../../README.md) | [01. Visão Geral](01-visao-geral.md) | [02. Arquitetura](02-arquitetura-stack.md) | [03. Estrutura](03-estrutura-projeto.md) | [04. Funcionalidades](04-funcionalidades.md) | [05. Rotas e API](05-rotas-api.md) | **06. Dados e Contextos** | [07. Design e Impressão](07-design-impressao.md) | [08. Config e Deploy](08-configuracao-deploy.md) | [09. Segurança](09-seguranca.md) | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)

---

# Modelo de Dados e Contextos

## KV principal

Tabela: `kv_store_68454e9b`.

Chaves principais:

- `ef:events:index`
- `ef:event:<id>`
- `ef:photos:event:<eventId>`
- `ef:photo:<photoId>`
- `ef:orders:index`
- `ef:order:<orderId>`
- `ef:branding`
- `ef:config`

## Estruturas de dominio

- `EventRecord`: metadados do evento, `photoCount`, `faceCount`, `price`.
- `PhotoRecord`: metadados da foto, caminho no storage e descritores.
- `OrderRecord`: itens, status, total, canal (`online`/`pos`) e metadados de pagamento.

## Tabela adicional para WhatsApp

- `whatsapp_contacts_68454e9b`
- Finalidade: armazenar opt-in e base de campanhas futuras.
- Campos relevantes: `phone`, `customer_name`, `order_id`, `event_id`, `photo_ids`, `photo_urls`, `message_sent`, `opt_in_at`.

## Contextos React

- `ThemeProvider`: tema dark/light.
- `AuthContext`: autenticacao admin e token.
- `BrandingContext`: configuracoes de marca.
- `CartContext`: estado do carrinho publico.

---

[🏠 Home](../../README.md) | [01. Visão Geral](01-visao-geral.md) | [02. Arquitetura](02-arquitetura-stack.md) | [03. Estrutura](03-estrutura-projeto.md) | [04. Funcionalidades](04-funcionalidades.md) | [05. Rotas e API](05-rotas-api.md) | **06. Dados e Contextos** | [07. Design e Impressão](07-design-impressao.md) | [08. Config e Deploy](08-configuracao-deploy.md) | [09. Segurança](09-seguranca.md) | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)
