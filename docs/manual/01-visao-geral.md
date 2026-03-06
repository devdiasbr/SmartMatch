[🏠 Home](../../README.md) | **01. Visão Geral** | [02. Arquitetura](02-arquitetura-stack.md) | [03. Estrutura](03-estrutura-projeto.md) | [04. Funcionalidades](04-funcionalidades.md) | [05. Rotas e API](05-rotas-api.md) | [06. Dados e Contextos](06-dados-contextos.md) | [07. Design e Impressão](07-design-impressao.md) | [08. Config e Deploy](08-configuracao-deploy.md) | [09. Segurança](09-seguranca.md) | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)

---

# Visao Geral e Fluxos

A Smart Match resolve um problema real da fotografia de eventos: como o visitante encontra suas fotos entre milhares de imagens.

## Fluxo do usuario final

1. O visitante acessa o site e escolhe o evento/horario.
2. Tira uma selfie no celular.
3. A IA compara o rosto com as fotos do evento.
4. As fotos correspondentes sao destacadas.
5. O visitante compra online (PIX/cartao) ou presencialmente no PDV.
6. Recebe links para download por e-mail, QR Code e, no PDV, opcionalmente WhatsApp.

## Fluxo do operador PDV

1. Seleciona o evento no painel `/admin/pdv`.
2. Busca fotos por tag/ID ou reconhecimento facial.
3. Monta carrinho e registra forma de pagamento.
4. Finaliza venda, imprime fotos 15x20 com rodape e QR.
5. Opcionalmente coleta opt-in de WhatsApp para envio e campanhas futuras.

---

[🏠 Home](../../README.md) | **01. Visão Geral** | [02. Arquitetura](02-arquitetura-stack.md) | [03. Estrutura](03-estrutura-projeto.md) | [04. Funcionalidades](04-funcionalidades.md) | [05. Rotas e API](05-rotas-api.md) | [06. Dados e Contextos](06-dados-contextos.md) | [07. Design e Impressão](07-design-impressao.md) | [08. Config e Deploy](08-configuracao-deploy.md) | [09. Segurança](09-seguranca.md) | [10. PDV WhatsApp](10-pdv-whatsapp.md) | [📚 Sumário](index.md)
