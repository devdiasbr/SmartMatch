1
Sincronizar Storage → KV
Importa eventos e fotos do S3/Storage para o KV Store

O que essa sincronização faz

Varre as pastas do bucket S3 (Supabase Storage)

Cria eventos automaticamente a partir das pastas (evento-YYYY-MM-DD-HH-MM)

Importa fotos que existem no Storage mas não estão no KV

Idempotente: pode ser rodada várias vezes com segurança


Pular eventos com 100% de sincronização
Iniciar sincronização
Diagnóstico do KV Store
Inspeciona as chaves reais na tabela kv_store para depurar a migração

Analisar KV Store
2
Migrar Faces para pgvector
Indexa os embeddings faciais do KV no banco vetorial

O que essa migração faz

Lê todos os descritores faciais armazenados no KV Store

Insere cada embedding 128-dim na tabela face_embeddings_68454e9b

A busca passa a usar HNSW ANN — O(log n) ao invés de O(n)

Idempotente: pode ser rodada várias vezes com segurança

Fotos novas já são indexadas automaticamente. Esta migração é necessária apenas para fotos que foram processadas antes da atualização pgvector.

Iniciar migração pgvector
3
Reindexar Faces de Evento
Processa novamente todas as fotos de um evento e detecta faces

Use esta ferramenta se:

Fotos foram importadas do Storage sem detectar faces
A migração pgvector retornou 0 faces
Você precisa reprocessar um evento específico
Selecione um evento
-- Escolha um evento --
Iniciar reindexação
🔧 Ferramentas Avançadas

