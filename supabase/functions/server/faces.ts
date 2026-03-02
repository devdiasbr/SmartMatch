/**
 * faces.ts — pgvector helpers para armazenamento e busca de embeddings faciais
 *
 * Usa a tabela face_embeddings_68454e9b com índice HNSW.
 * Embeddings são vetores 128-dim gerados pelo face-api.js (ResNet-34).
 *
 * Operações:
 *   indexFaces      — salva embeddings de uma foto (idempotente)
 *   searchFaces     — busca ANN via RPC search_faces_68454e9b
 *   deleteFacesByPhoto — limpa embeddings de uma foto deletada
 *   deleteFacesByEvent — limpa embeddings de um evento deletado
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const TABLE = "face_embeddings_68454e9b";

function sb() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export interface SearchResult {
  photoId: string;
  similarity: number; // 0..1, maior = melhor match
}

/** Converte number[] para o formato literal do pgvector: "[0.1,0.2,...]" */
function toVec(arr: number[]): string {
  return `[${arr.join(",")}]`;
}

/**
 * Indexa os descritores faciais de uma foto no pgvector.
 * Idempotente: deleta os embeddings antigos da foto antes de inserir.
 */
export async function indexFaces(
  photoId: string,
  eventId: string,
  descriptors: number[][],
): Promise<void> {
  const client = sb();

  // Deleta embeddings existentes (re-indexação idempotente)
  const { error: delErr } = await client
    .from(TABLE)
    .delete()
    .eq("photo_id", photoId);
  if (delErr) {
    console.log(`pgvector delete before reindex error: ${delErr.message}`);
  }

  if (descriptors.length === 0) return;

  const rows = descriptors.map((desc, i) => ({
    photo_id: photoId,
    event_id: eventId,
    face_index: i,
    embedding: toVec(desc),
  }));

  const { error } = await client.from(TABLE).insert(rows);
  if (error) throw new Error(`pgvector indexFaces error: ${error.message}`);
}

/**
 * Busca fotos com faces similares ao embedding de consulta.
 * Usa a função RPC search_faces_68454e9b (HNSW ANN — O(log n)).
 * Retorna resultados ordenados por similaridade decrescente.
 */
export async function searchFaces(
  queryEmbedding: number[],
  eventId: string,
  threshold = 0.55,
  maxResults = 50,
): Promise<SearchResult[]> {
  const { data, error } = await sb().rpc("search_faces_68454e9b", {
    query_embedding: toVec(queryEmbedding),
    target_event_id: eventId,
    similarity_threshold: threshold,
    max_results: maxResults,
  });

  if (error) throw new Error(`pgvector searchFaces error: ${error.message}`);

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
