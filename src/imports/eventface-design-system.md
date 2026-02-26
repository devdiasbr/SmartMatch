# EventFace — Design System e Documento para Layout (Figma)

## Objetivo do produto
- Permitir que participantes de eventos encontrem rapidamente suas fotos usando reconhecimento facial.
- Oferecer uma experiencia fluida e segura para o publico e uma central de gestao para a equipe.
- Comunicar confianca, tecnologia e rapidez no contexto de eventos esportivos.

## Escopo do projeto
- Interface publica para descoberta de eventos, busca por selfies e visualizacao de fotos.
- Interface administrativa para criacao de eventos, upload de fotos, reindexacao e indicadores.
- Fluxos de autenticacao simples para acesso admin.
- Estados de carregamento, vazios, erros e sucesso.

## Principios de design
- Prioridade para velocidade percebida e clareza de acao.
- Feedback imediato em qualquer operacao demorada.
- Linguagem visual premium e esportiva, sem perder a legibilidade.
- Escalabilidade: componentes reaproveitaveis e consistentes.
- Acessibilidade: contraste, foco visivel e alvos de toque confortaveis.

## Arquitetura de informacao (mapa de telas)
- Publico
  - Home (Landing)
  - Eventos (Lista)
  - Evento (Detalhe com Tabs)
  - Lightbox (Foto)
  - Modal de Camera
- Admin
  - Login
  - Dashboard
  - Controle de Eventos

## Etapas (macrofluxo)
1. Entrada e descoberta
   - Landing com proposta de valor e CTA para eventos.
   - Acesso por slug direto.
2. Selecao de evento
   - Lista com cards e paginacao.
   - Detalhe do evento com estatisticas basicas.
3. Explorar fotos
   - Aba com todas as fotos do evento.
   - Lightbox com navegacao, download e impressao.
4. Buscar minhas fotos
   - Abrir camera, capturar selfie.
   - Processamento e exibicao de resultados.
5. Pessoas (clusters)
   - IA agrupa pessoas e exibe grupos.
   - Filtros por alta confianca.
6. Admin
   - Login.
   - Dashboard com metricas, filtros e graficos.
   - Controle de eventos: criar, listar, filtrar, upload, reindexar.

## Sistema visual

### Tipografia (sugestao)
- Titulos: serif moderna com personalidade (ex: Fraunces ou equivalente).
- Texto e UI: sans limpa para leitura rapida (ex: Inter ou equivalente).
- Numeros e dados: mesma sans, com peso intermediario.

### Cores (direcao, nao paleta final)
- Primaria: verde esportivo saturado para CTAs.
- Secundaria: turquesa/teal para destaques e status positivos.
- Neutros: cinzas frios com bom contraste para fundos e bordas.
- Feedback: sucesso (verde), alerta (amarelo), erro (vermelho).
- Modo claro e escuro com contraste consistente.

### Espacamento e grid
- Base: 8px como unidade.
- Layout desktop: grid de 12 colunas, gutters generosos.
- Layout mobile: 4 colunas, foco em blocos empilhados.

### Iconografia e ilustra
- Icones simples e reconheciveis (camera, rosto, pessoas).
- Ilustracoes discretas para login e estados vazios.

### Motion
- Transicoes de 180-240ms.
- Entradas suaves para cards e resultados.
- Skeletons para carregamento de listas.

## Componentes (comportamento e variacoes)

### Header
- Conteudo: logo, menu, status pill, acoes (login/sair), toggle de tema.
- Variantes: publico, admin.
- Estados: ativo no menu, tema claro/escuro.

### Buttons
- Variantes: primaria, secundaria, ghost, icone.
- Tamanhos: sm, md, lg.
- Estados: default, hover, focus, disabled, loading.

### Cards
- Tipos: evento, metricas, cluster, beneficio.
- Elementos: titulo, subtitulo, meta, CTA opcional.
- Estados: normal, hover, skeleton.

### Tabs
- Usadas no detalhe do evento e no admin.
- Estados: ativo, inativo, hover, focus.

### Grids
- Grid de fotos responsivo com proporcao consistente.
- Grid de eventos com cards padronizados.

### Form inputs
- Tipos: texto, senha, date, select, search.
- Estados: focus, erro, disabled, preenchido.

### Modal de camera
- Conteudo: video, frame de foco, preview, aviso de privacidade.
- Estados: camera inativa, ativa, capturada, processando.

### Lightbox
- Navegacao anterior/proxima.
- Metadados e acoes (download, imprimir).
- Estados: loading, imagem pronta.

### Status e banners
- Loading, vazio, erro, sucesso.
- Copy direta e instrucoes curtas.

### Paginacao
- Controles anterior/proxima e indicador de pagina.
- Estados: desativado, ativo.

## Telas e funcionalidades

### 1) Home (Landing)
- Objetivo: apresentar o produto e direcionar para eventos.
- Layout:
  - Hero com titulo forte, subtitulo e CTA "Ver Eventos".
  - Bloco de beneficios em cards.
  - Bloco de acesso por slug.
- Elementos:
  - Header com menu e toggle de tema.
  - CTA primario e secundario.
- Estados:
  - Tema claro/escuro.
  - Validacao do slug vazio (nao navegar).

### 2) Eventos (Lista)
- Objetivo: listar eventos disponiveis e permitir selecao.
- Layout:
  - Hero contextual.
  - Grid de cards.
  - Paginacao abaixo.
- Estados:
  - Skeleton loading.
  - Vazio (sem eventos).
  - Erro ao carregar.

### 3) Evento (Detalhe)
- Objetivo: concentrar todas as interacoes do evento.
- Layout:
  - Header com botao "voltar" e titulo.
  - KPIs do evento.
  - Tabs: Todas as fotos, Minhas fotos, Pessoas.
- Estados:
  - Sem evento selecionado.
  - Evento selecionado com dados completos.

### 4) Aba "Todas as fotos"
- Objetivo: navegar pelo acervo.
- Elementos:
  - Contagem de fotos + paginacao.
  - Grid de imagens responsivo.
- Estados:
  - Loading.
  - Vazio (sem fotos no evento).

### 5) Aba "Minhas fotos"
- Objetivo: iniciar busca facial e mostrar resultados.
- Layout:
  - CTA inicial com passos (Abrir camera > Tirar selfie > Ver fotos).
  - Modal de camera com preview, instrucoes e botao de captura.
  - Area de resultados com contador e cards.
- Estados:
  - Nenhuma busca realizada.
  - Processando (spinner e feedback de progresso).
  - Resultados encontrados.
  - Nenhum resultado.
  - Permissao de camera negada.

### 6) Aba "Pessoas" (Clusters)
- Objetivo: agrupar pessoas automaticamente.
- Elementos:
  - Cards de metricas (grupos, estrategia, qualidade, cache).
  - Banner de recomendacao da IA.
  - Filtro de alta confianca.
  - Grid de clusters.
- Estados:
  - Loading IA.
  - Vazio (nenhum cluster).
  - Com dados.

### 7) Lightbox (Foto)
- Objetivo: visualizar foto em tela cheia.
- Elementos:
  - Imagem principal.
  - Navegacao anterior/proxima.
  - Metadados: nome e indice.
  - Acoes: baixar e imprimir.
- Estados:
  - Loading da imagem.

### 8) Admin Login
- Objetivo: acesso restrito.
- Layout:
  - Split screen (ilustracao + formulario).
  - Mensagem de boas-vindas e contexto do estadio.
- Estados:
  - Erro de senha.
  - Loading no submit.

### 9) Admin Dashboard
- Objetivo: visao geral de eventos e fotos.
- Layout:
  - Cards de metricas no topo.
  - Filtros de periodo e ordenacao.
  - Graficos (distribuicao e timeline).
- Estados:
  - Loading dos graficos.
  - Sem dados.

### 10) Admin Controle de Eventos
- Objetivo: criar e gerenciar eventos.
- Layout:
  - Lista de eventos com filtros e busca.
  - Detalhes do evento selecionado.
  - Upload de fotos (dropzone, preview, progresso).
  - Reindexacao.
  - Criacao de evento (data e horario).
- Estados:
  - Upload em progresso.
  - Upload concluido.
  - Reindexando.
  - Erro no upload ou reindex.

## Conteudo e microcopy (tom e exemplos)
- Tom: confiavel, direto e positivo.
- Evitar tecnicismo excessivo; explicar a acao e o beneficio.
- Exemplos:
  - "Encontre suas fotos em segundos."
  - "Sua imagem nao e armazenada."
  - "Processando reconhecimento facial..."
  - "Nenhum resultado encontrado. Tente novamente."
  - "Evento criado com sucesso."

## Acessibilidade e usabilidade
- Contraste minimo AA em textos e CTAs.
- Foco visivel em todos os componentes interativos.
- Alvos de toque >= 44px no mobile.
- Mensagens de erro claras e proximas ao campo.

## Observacoes tecnicas (para consistencia visual)
- Existem 4 paginas principais: Home, Eventos, Admin Login, Admin.
- A pagina de Eventos contem o detalhe e as tabs dentro da mesma tela.
- O lightbox e compartilhado entre Eventos e Admin.
- O tema claro/escuro precisa ser consistente em todas as telas.
