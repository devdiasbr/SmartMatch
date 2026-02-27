# Proposta Comercial — Smart Match

**Plataforma de Venda de Fotografia de Eventos com Reconhecimento Facial por IA**

---

**Fornecedor:** Edu Santana Producoes
**Data:** 27 de fevereiro de 2026
**Validade:** 60 dias corridos
**Versao:** 1.0

---

## 1. Resumo Executivo

A **Smart Match** e uma plataforma SaaS completa e pronta para producao, projetada para a venda automatizada de fotografias em eventos de grande volume (tours, shows, parques tematicos, eventos esportivos). O diferencial central e o **reconhecimento facial por inteligencia artificial**, que permite ao visitante encontrar suas proprias fotos entre milhares em segundos — bastando uma selfie.

A plataforma ja opera no **Tour do Palmeiras no Allianz Parque** e esta pronta para ser licenciada, customizada ou vendida como produto white-label para outros locais e operacoes.

---

## 2. Escopo do Produto Entregue

### 2.1 Area Publica (E-commerce)

| Modulo | Descricao |
|--------|-----------|
| Landing Page | Hero animado com parallax, stats em tempo real, secao "Como funciona", CTA customizavel |
| Listagem de Eventos | Grid responsivo com filtros, badges de status, precos dinamicos |
| Galeria do Evento | Fotos com marca d'agua inteligente, zoom, busca por tag |
| Reconhecimento Facial | Busca por selfie — IA client-side (zero custo de servidor) |
| Carrinho de Compras | Drawer lateral + pagina dedicada, cupons de desconto |
| Checkout Online | PIX (QR Code instantaneo) e Cartao de Credito via Mercado Pago |
| Download via QR Code | Pagina publica `/minha-foto` — funciona em qualquer celular sem login |
| Tema Dark/Light | Alternancia suave, persistido no navegador |
| Responsividade Total | Mobile-first, adaptado para todos os dispositivos |

### 2.2 Painel Administrativo

| Modulo | Descricao |
|--------|-----------|
| Dashboard | KPIs em tempo real (receita, pedidos, fotos, eventos), grafico de receita 14 dias |
| Gestao de Eventos | Criar/editar/excluir, upload de fotos em lote com deteccao facial automatica |
| Gestao de Pedidos | Filtros por status, confirmacao manual, cancelamento com reembolso automatico via MP |
| Financeiro | Relatorios, configuracao do Mercado Pago, preco por foto, cupons |
| Configuracoes | Branding completo (logo, favicon, textos, backgrounds, marca d'agua) — tudo sem codigo |

### 2.3 Ponto de Venda Presencial (PDV)

| Funcionalidade | Descricao |
|----------------|-----------|
| Interface dedicada | Otimizada para operacao rapida no local do evento |
| Busca facial presencial | Operador encontra fotos do cliente por reconhecimento facial |
| Carrinho PDV | Nome do cliente, 4 formas de pagamento (dinheiro, debito, credito, PIX) |
| Impressao fotografica | Papel 15x20cm com orientacao automatica (paisagem/retrato) |
| Rodape customizavel | Imagem do rodape + QR Code posicionavel para download digital |
| Comprovante termico | Estilizado para impressora 80mm |

### 2.4 Inteligencia Artificial

| Recurso | Detalhes |
|---------|---------|
| Tecnologia | face-api.js (TinyFaceDetector + FaceRecognitionNet) |
| Processamento | 100% client-side — zero custo de cloud GPU |
| Deteccao | Automatica no upload (admin) — descritores 128D salvos no banco |
| Matching | Comparacao por distancia euclidiana com threshold configuravel |
| Privacidade | Selfie nunca sai do dispositivo do usuario |

### 2.5 Integracao de Pagamentos

| Gateway | Metodos | Recursos |
|---------|---------|----------|
| Mercado Pago | PIX, Cartao (Checkout Pro) | QR Code PIX instantaneo, redirect Checkout Pro, webhook, reembolso automatico, idempotency keys |

### 2.6 E-mails Transacionais

| Recurso | Detalhes |
|---------|---------|
| Provider | Resend API |
| Template | HTML responsivo profissional com cores da marca |
| Conteudo | Resumo do pedido, thumbnails, botoes de download (signed URLs 7 dias) |
| Gatilhos | Confirmacao de pagamento (webhook MP ou admin manual) |

### 2.7 Sistema de Branding White-Label

| Customizacao | Exemplo |
|-------------|---------|
| Nome/identidade | "Smart Match" → "FotoShow" |
| Logo e favicon | Upload via painel |
| Textos de todas as paginas | Hero, subtitulos, CTAs, badges |
| Marca d'agua nas fotos | Texto, produtor, tag, copyright |
| Nome do local/tour | "Allianz Parque" → "Arena Corinthians" |
| Backgrounds | Carousel de imagens na home |

---

## 3. Especificacoes Tecnicas

| Item | Tecnologia |
|------|-----------|
| Frontend | React 18, React Router 7, Tailwind CSS v4, Motion (Framer Motion), TypeScript |
| Backend | Supabase Edge Functions (Deno + Hono) |
| Banco de dados | Supabase KV Store (key-value) |
| Storage | Supabase Storage (bucket privado, signed URLs) |
| Autenticacao | Supabase Auth (JWT com refresh automatico) |
| IA facial | face-api.js (client-side, modelos via CDN) |
| Pagamentos | Mercado Pago API v1 |
| E-mail | Resend API |
| Build | Vite 6 |
| Hospedagem | Supabase (serverless, edge-deployed) |

### Metricas de Codigo

| Metrica | Valor |
|---------|-------|
| Paginas | 12 (7 publicas + 5 admin) |
| Componentes reutilizaveis | 14 |
| Contextos React | 4 (Theme, Auth, Branding, Cart) |
| Endpoints da API | 30+ |
| Linhas de codigo (estimado) | ~8.000+ (frontend + backend) |

---

## 4. Orcamento

### Opcao A — Plataforma Completa (Recomendado)

Ideal para empresas que desejam operar a plataforma com sua propria marca, com tudo configurado e pronto para usar.

| Item | Valor |
|------|-------|
| Licenca de uso do codigo-fonte completo | R$ 6.500,00 |
| Customizacao de branding e identidade visual | R$ 1.500,00 |
| Configuracao do ambiente (Supabase + Resend + MP) | R$ 1.200,00 |
| Treinamento operacional (2 sessoes remotas) | R$ 800,00 |
| Documentacao tecnica e operacional | Incluso |
| **TOTAL** | **R$ 10.000,00** |

**Forma de pagamento:** 50% na assinatura + 50% na entrega

---

### Opcao B — Plataforma Completa + Suporte Estendido

Para quem quer comecar com seguranca e ter acompanhamento nos primeiros meses.

| Item | Valor |
|------|-------|
| Tudo da Opcao A | R$ 10.000,00 |
| Suporte prioritario por 3 meses (WhatsApp + e-mail) | R$ 2.400,00 (R$ 800/mes) |
| Banco de horas para ajustes e evolucoes (20h) | R$ 2.600,00 (R$ 130/h) |
| **TOTAL** | **R$ 15.000,00** |

**Forma de pagamento:** 50% na assinatura + 25% na entrega + 25% em 30 dias

---

### Opcao C — SaaS Mensal (Plataforma como Servico)

Para operadores que preferem um modelo recorrente sem investimento alto inicial.

| Item | Mensal |
|------|--------|
| Plataforma hospedada e gerenciada | R$ 697,00/mes |
| Suporte tecnico (horario comercial) | Incluso |
| Atualizacoes e manutencao | Incluso |
| Limite: ate 5.000 fotos/mes | Incluso |
| Fotos adicionais (acima de 5.000) | R$ 0,05/foto |
| **Setup inicial (unico)** | **R$ 2.500,00** |
| **Mensalidade** | **R$ 697,00/mes** |

**Contrato minimo:** 6 meses
**Forma de pagamento:** Setup na assinatura + mensalidades via boleto/PIX

---

## 5. Custos Operacionais do Cliente

Alem do orcamento do produto, o cliente tera os seguintes custos recorrentes de infraestrutura:

| Servico | Custo Estimado |
|---------|---------------|
| Supabase (Pro Plan) | ~US$ 25/mes (~R$ 130/mes) |
| Resend (e-mails) | Gratis ate 3.000/mes, depois ~US$ 20/mes |
| Mercado Pago | Taxa por transacao (PIX: 0,99% / Cartao: 4,98%) |
| Dominio customizado | ~R$ 40/ano |
| **Total estimado** | **~R$ 200-400/mes** |

---

## 6. Cronograma de Entrega

### Opcao A e B

| Fase | Prazo | Entrega |
|------|-------|---------|
| Kickoff + briefing de marca | Dia 1 | Reuniao + questionario |
| Customizacao visual e branding | Dias 2-5 | Logo, cores, textos aplicados |
| Configuracao de infra | Dias 3-7 | Supabase + Resend + MP |
| Testes em staging | Dias 8-10 | Ambiente de homologacao |
| Go-live | Dia 12 | Deploy em producao |
| Treinamento | Dias 13-15 | 3 sessoes remotas |
| **Prazo total** | **15 dias uteis** | |

### Opcao C

| Fase | Prazo |
|------|-------|
| Setup e customizacao | 10 dias uteis |
| Treinamento | 2 sessoes remotas |
| **Prazo total** | **12 dias uteis** |

---

## 7. Diferenciais Competitivos

| Diferencial | Detalhes |
|-------------|---------|
| **IA sem custo recorrente** | Reconhecimento facial roda no navegador — sem GPU na nuvem, sem API paga |
| **White-label completo** | Todo texto, logo, cor e identidade e customizavel pelo painel admin |
| **PDV integrado** | Venda presencial com impressao fotografica profissional (15x20cm) |
| **Multi-canal** | Online (PIX/cartao) + presencial (dinheiro/debito/credito/PIX) |
| **Serverless** | Infraestrutura Supabase — escala automatica, sem servidor para gerenciar |
| **Pronto para producao** | Ja operando no Allianz Parque — testado com usuarios reais |
| **Baixo custo operacional** | ~R$ 200-400/mes de infraestrutura |
| **Codigo moderno** | React 18, TypeScript, Tailwind v4, Vite — facil de manter e evoluir |

---

## 8. Casos de Uso / Verticais

A Smart Match pode ser adaptada para qualquer operacao que venda fotos de experiencias:

| Vertical | Exemplo |
|----------|---------|
| Tours em estadios | Allianz Parque, Maracana, Neo Quimica Arena |
| Parques tematicos | Beto Carrero, Hopi Hari, Beach Park |
| Shows e festivais | Rock in Rio, Lollapalooza |
| Eventos corporativos | Convencoes, feiras, confraternizacoes |
| Esportes de aventura | Rafting, tirolesa, bungee jump |
| Formaturas | Ensaios e cerimonias |
| Parques aquaticos | Toboaguas, piscinas de ondas |
| Cruzeiros | Fotos embarcadas |

---

## 9. Garantias

| Item | Detalhes |
|------|---------|
| Garantia de funcionamento | 90 dias apos go-live |
| Correcao de bugs | Inclusa na garantia |
| Suporte por e-mail/WhatsApp | Incluso por 30 dias (Opcao A) ou 6 meses (Opcao B) |
| SLA (Opcao C) | 99.5% uptime |

---

## 10. Termos

- O codigo-fonte e entregue completo e documentado (Opcoes A e B)
- A licenca e de uso, nao de revenda (salvo acordo especifico)
- Evolucoes futuras fora do escopo sao orcadas separadamente (R$ 150/hora)
- Dados de usuarios finais pertencem ao cliente
- O fornecedor pode utilizar o projeto como referencia em portfolio

---

## 11. Contato

| | |
|---|---|
| **Empresa** | Edu Santana Producoes |
| **Projeto** | Smart Match |
| **Website** | smartmatch.com.br |

---

*Este documento e confidencial e destinado exclusivamente ao destinatario. A reproducao total ou parcial sem autorizacao e vedada.*