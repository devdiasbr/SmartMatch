/**
 * faces.ts — pgvector helpers para armazenamento e busca de embeddings faciais
 *
 * Usa a tabela face_embeddings_68454e9b com índice HNSW.
 * Embeddings são vetores 128-dim gerados pelo face-api.js (ResNet-34).
 *
 * Operações:
 *   indexFaces         — salva embeddings de uma foto (idempotente)
 *   searchFaces        — busca ANN via RPC search_faces_68454e9b
 *   deleteFacesByPhoto — limpa embeddings de uma foto deletada
 *   deleteFacesByEvent — limpa embeddings de um evento deletado
 *
 * NOTA sobre serialização:
 *   face-api.js retorna Float32Array para cada descritor. Ao ser salvo no KV
 *   via JSON.stringify, Float32Array é serializado como plain object:
 *     { "0": 0.1, "1": 0.2, … }   ← NÃO é um array!
 *   normalizeDescriptor() trata ambos os formatos (array real ou plain object).
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const TABLE = "face_embeddings_68454e9b";

// ── Singleton client — evita criar N conexões ao processar N fotos ────────────
let _client: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!_client) {
    _client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _client;
}

export interface SearchResult {
  photoId: string;
  similarity: number; // 0..1, maior = melhor match
}

/**
 * Normaliza um descritor facial para number[128].
 *
 * Aceita:
 *   - number[]          — array JavaScript normal
 *   - Float32Array      — array tipado (improvável após round-trip JSON, mas ok)
 *   - plain object      — Float32Array serializado: { "0": 0.1, "1": 0.2, … }
 *
 * Retorna [] se o valor for nulo/inválido.
 */
function normalizeDescriptor(raw: any): number[] {
  if (!raw) return [];

  // Já é um array (incluindo Float32Array — tem .length e índices numéricos)
  if (Array.isArray(raw) || ArrayBuffer.isView(raw)) {
    return Array.from(raw as any).map(Number);
  }

  // Plain object com chaves numéricas: { "0": 0.1, "1": 0.2, … }
  if (typeof raw === "object") {
    const keys = Object.keys(raw)
      .filter((k) => !isNaN(Number(k)))
      .sort((a, b) => Number(a) - Number(b));
    return keys.map((k) => Number(raw[k]));
  }

  return [];
}

/**
 * Normaliza a lista de descritores de uma foto.
 * O campo faceDescriptors pode ser:
 *   - Array normal de arrays:          [ [0.1, …], [0.3, …] ]
 *   - Array de plain objects:          [ {"0": 0.1, …}, {"0": 0.3, …} ]
 *   - Plain object de arrays/objetos:  { "0": [0.1, …], "1": [0.3, …] }
 */
function normalizeDescriptors(raw: any): number[][] {
  if (!raw) return [];

  // Converte a coleção raiz para array
  const list: any[] = Array.isArray(raw) ? raw : Object.values(raw);

  // Normaliza cada descritor individualmente
  return list
    .map(normalizeDescriptor)
    .filter((d) => d.length > 0);
}

/** Converte number[] para o formato literal do pgvector: "[0.1,0.2,…]" */
function toVec(nums: number[]): string {
  return `[${nums.join(",")}]`;
}

/**
 * Indexa os descritores faciais de uma foto no pgvector.
 * Idempotente: deleta os embeddings antigos da foto antes de inserir.
 * Robusto: trata Float32Array serializado como plain object.
 */
export async function indexFaces(
  photoId: string,
  eventId: string,
  rawDescriptors: any,
): Promise<void> {
  const client = sb();

  // ── Normalizar ────────────────────────────────────────────────────────────
  const descriptors = normalizeDescriptors(rawDescriptors);

  // ── Deleta embeddings existentes (re-indexação idempotente) ───────────────
  const { error: delErr } = await client
    .from(TABLE)
    .delete()
    .eq("photo_id", photoId);
  if (delErr) {
    console.log(`[faces] delete before reindex error: ${delErr.message}`);
  }

  if (descriptors.length === 0) return;

  // ── Validar dimensão ──────────────────────────────────────────────────────
  const invalidDims = descriptors.filter((d) => d.length !== 128);
  if (invalidDims.length > 0) {
    throw new Error(
      `Descritor com dimensão inválida: esperado 128, obtido [${invalidDims.map((d) => d.length).join(", ")}] — foto ${photoId}`,
    );
  }

  // ── Inserir no pgvector ───────────────────────────────────────────────────
  const rows = descriptors.map((desc, i) => ({
    photo_id: photoId,
    event_id: eventId,
    face_index: i,
    embedding: toVec(desc),
  }));

  const { error } = await client.from(TABLE).insert(rows);
  if (error) {
    throw new Error(
      `pgvector indexFaces error [foto=${photoId}, faces=${descriptors.length}]: ${error.message}`,
    );
  }
}

/**
 * Busca fotos com faces similares ao embedding de consulta.
 * Usa a função RPC search_faces_68454e9b (HNSW ANN — O(log n)).
 * Retorna resultados ordenados por similaridade decrescente.
 */
export async function searchFaces(
  queryEmbedding: number[],
  eventId: string,
  threshold = 0.55,  // Ajustado para SsdMobilenetv1 + faceLandmark68Net (embeddings mais precisos) → melhor recall para matches em condições variadas
  maxResults = 100,  // Aumentado de 50 → retorna mais candidatos para o cliente filtrar
): Promise<SearchResult[]> {
  console.log(
    `[pgvector searchFaces] evento=${eventId}, threshold=${threshold}, maxResults=${maxResults}`,
  );

  const normalizedQuery = normalizeDescriptor(queryEmbedding);
  if (normalizedQuery.length !== 128) {
    throw new Error(
      `Query embedding deve ter 128 dimensões, obtido ${normalizedQuery.length}`,
    );
  }

  const { data, error } = await sb().rpc("search_faces_68454e9b", {
    query_embedding: toVec(normalizedQuery),
    target_event_id: eventId,
    similarity_threshold: threshold,
    max_results: maxResults,
  });

  if (error) {
    console.log(`[pgvector searchFaces] ERRO: ${error.message}`);
    throw new Error(`pgvector searchFaces error: ${error.message}`);
  }

  console.log(
    `[pgvector searchFaces] ✓ RPC retornou ${data?.length ?? 0} resultados`,
  );

  return (data ?? []).map((row: any) => ({
    photoId: row.photo_id,
    similarity: Number(row.similarity),
  }));
}

/** Remove todos os embeddings de uma foto (chamado ao deletar foto). */
export async function deleteFacesByPhoto(photoId: string): Promise<void> {
  const { error } = await sb().from(TABLE).delete().eq("photo_id", photoId);
  if (error) {
    console.log(`pgvector deleteFacesByPhoto error: ${error.message}`);
  }
}

/** Remove todos os embeddings de um evento (chamado ao deletar evento). */
export async function deleteFacesByEvent(eventId: string): Promise<void> {
  const { error } = await sb().from(TABLE).delete().eq("event_id", eventId);
  if (error) {
    console.log(`pgvector deleteFacesByEvent error: ${error.message}`);
  }
}