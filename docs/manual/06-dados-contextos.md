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
