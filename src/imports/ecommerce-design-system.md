# Design System E-commerce (base: Modern, Clean SaaS)

## Objetivo
Criar uma linguagem visual moderna, limpa e confiavel para um e-commerce, com foco em conversao, clareza de navegacao e conteudo editorial de marca.

## Principios
- Clareza antes de tudo: hierarquia forte e textos diretos.
- Conversao guiada: CTAs visiveis e jornada sem friccao.
- Visual limpo e premium: espacamento generoso, tipografia marcante.
- Conteudo editorial: blocos explicativos e provas sociais.
- Consistencia e escala: tokens e componentes reutilizaveis.

## Publico-alvo
- Compradores online que valorizam confianca, rapidez e simplicidade.
- Usuarios mobile-first que esperam navegacao intuitiva.

## Tom de marca
- Confiavel, sofisticado, acessivel.
- Moderno, com um toque editorial (layout limpo, tipografia expressiva).

## Arquitetura de informacao (mapa)
- Home
- Categoria / Colecao
- PDP (Produto)
- Busca e resultados
- Carrinho
- Checkout
- Conta / Pedidos
- Conteudo (Blog, Guia, Institucional)

## Sistema visual

### Tipografia (direcao)
- Titulos: serif moderna (ex: Fraunces, Playfair Display).
- Corpo e UI: sans limpa (ex: Inter, Manrope).
- Numeros e precos: sans com boa legibilidade.

### Cores (direcao)
- Primaria: tom solido para CTAs principais.
- Secundaria: tom complementar para destaques e links.
- Neutros: cinzas claros e escuros para fundo e texto.
- Feedback: verde (sucesso), amarelo (alerta), vermelho (erro).
- Modo claro e escuro com contraste consistente.

### Espacamento e grid
- Base: 8px.
- Desktop: grid 12 colunas, margens amplas.
- Tablet: grid 8 colunas.
- Mobile: grid 4 colunas, layout em pilha.

### Bordas e sombra
- Raio: 12px para cards, 8px para inputs, 999px para pills.
- Sombras sutis para elevacao leve (cards e modais).

### Iconografia
- Icones simples e lineares.
- Uso moderado de icones para orientar a navegacao.

### Motion
- Transicoes 180-240ms.
- Entrada suave de cards e listas.
- Skeletons em carregamentos.

## Tokens (exemplo de nomenclatura)
- color.primary / color.secondary / color.surface / color.text
- spacing.2 / spacing.4 / spacing.8 / spacing.12 / spacing.16
- radius.sm / radius.md / radius.lg / radius.pill
- shadow.sm / shadow.md
- font.title / font.body / font.caption

## Componentes

### Header
- Logo, menu principal, busca, conta, carrinho.
- Variantes: transparente (hero) e solido (scroll).
- Estados: foco, hover, ativo.

### Buttons
- Variantes: primary, secondary, ghost, icon.
- Estados: hover, focus, disabled, loading.

### Inputs
- Text, search, select, quantity stepper.
- Estados: focus, erro, preenchido.

### Cards de produto
- Imagem, titulo, preco, badge, CTA rapido.
- Estados: hover com elevacao, out-of-stock.

### Grid de produtos
- Responsivo, com filtros laterais (desktop) e drawer (mobile).

### Filtros
- Checkboxes, sliders de preco, ordenacao.
- Chips de filtros ativos com remover.

### Banners e hero
- Hero editorial com imagem e CTA.
- Banner de promocao com destaque de oferta.

### Breadcrumbs
- Navegacao contextual em categorias e produto.

### PDP (Produto)
- Galeria de imagens.
- Preco, variacoes (cor, tamanho), quantidade.
- CTAs: adicionar ao carrinho / comprar agora.
- Avaliacoes e perguntas.

### Carrinho
- Lista de itens, subtotal, frete, cupons.
- CTA de checkout destacado.

### Checkout
- Etapas (informacoes, entrega, pagamento).
- Progresso claro e seguro.
- Confirmacao com resumo do pedido.

### Prova social
- Avaliacoes, estrelas, depoimentos.
- Selo de seguranca e garantia.

### Estados e feedback
- Loading (skeleton), vazio, erro, sucesso.

## Padrões de pagina

### Home
- Hero editorial + CTA.
- Colecoes em destaque.
- Produtos em carrossel.
- Blocos de valor (frete, troca, garantia).
- Conteudo editorial (blog/guia).

### Categoria
- Hero simples + descricao.
- Filtros + grid.
- Ordenacao.

### Produto
- Galeria + informacoes.
- Variantes.
- Conteudo detalhado + FAQ.
- Produtos relacionados.

### Carrinho e Checkout
- Jornada limpa com passos visiveis.
- Resumo lateral (desktop) e colapsado (mobile).

## Conteudo e microcopy
- Direto, beneficios claros.
- Exemplos:
  - "Entrega rapida em todo o Brasil"
  - "Troca facil e gratuita"
  - "Garantia de 30 dias"

## Acessibilidade
- Contraste AA em textos e CTAs.
- Alvos de toque >= 44px.
- Foco visivel e navegacao por teclado.

## Responsividade
- Mobile-first.
- Menus colapsados em drawer.
- Filtros em painel lateral.
- CTAs sempre visiveis no PDP.

## Notas de implementacao
- Definir tokens no Figma para cores, tipografia, spacing e radius.
- Criar componentes com variantes e estados (hover, focus, disabled).
- Documentar uso correto de cada componente.
