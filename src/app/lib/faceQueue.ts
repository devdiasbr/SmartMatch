/**
 * faceQueue.ts — Fila global de embedding facial com image prefetching
 *
 * Singleton module-level: persiste entre navegações e remontagens de componentes.
 *
 * ── Fluxo ──────────────────────────────────────────────────────────────────────
 *   enqueue(items) → adiciona à fila → inicia o consumer se parado
 *   consumer processa 1 foto por vez; cede o main thread entre cada uma
 *
 * ── Prefetching (novo) ─────────────────────────────────────────────────────────
 *   Enquanto detectAllFaces(N) roda (CPU-bound, ~500-2000ms), o consumer
 *   inicia simultaneamente o carregamento da imagem N+1 via network.
 *   Quando o consumer termina N e passa para N+1, a imagem já está em memória.
 *
 *   Antes (serial):
 *     [loadImg N] → [detect N] → [save N] → [loadImg N+1] → [detect N+1] → …
 *
 *   Depois (pipeline):
 *     [loadImg N] → [detect N + prefetch N+1] → [save N] → [detect N+1 + prefetch N+2] → …
 *                                └── overlap ──┘
 *
 *   Resultado: latência de rede do N+1 é completamente escondida pelo tempo de
 *   inferência do N — throughput pode dobrar em uploads grandes.
 *
 * ── Estado reativo ────��───────────────────────────────────────────────────────
 *   subscribe(fn) → recebe QueueState a cada mudança
 *   useFaceQueue() hook → estado reativo em React
 */

import * as faceService from './faceService';
import { api } from './api';
import { useState, useEffect } from 'react';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface QueueItem {
  photoId: string;
  eventId: string;
  photoUrl: string;
  token: string;
}

export interface QueueState {
  /** Fotos aguardando na fila */
  pending: number;
  /** Está processando agora? */
  active: boolean;
  /** Fotos concluídas nesta sessão */
  done: number;
  /** Total enfileirado nesta sessão */
  total: number;
  /** Fotos com erro nesta sessão */
  errors: number;
  /** Foto atualmente em processamento */
  currentPhotoId: string | null;
}

type Listener = (s: QueueState) => void;

// ── Estado interno (module-level) ─────────────────────────────────────────────

const _queue: QueueItem[] = [];
let _active    = false;
let _done      = 0;
let _total     = 0;
let _errors    = 0;
let _current: string | null = null;

const _listeners = new Set<Listener>();

// Timer para reset automático após conclusão
let _resetTimer: ReturnType<typeof setTimeout> | null = null;

// ── Helpers internos ──────────────────────────────────────────────────────────

function _snapshot(): QueueState {
  return {
    pending: _queue.length,
    active: _active,
    done: _done,
    total: _total,
    errors: _errors,
    currentPhotoId: _current,
  };
}

function _notify() {
  const s = _snapshot();
  for (const fn of _listeners) fn(s);
}

/** Cede o main thread ao navegador (permite eventos de clique, repaint, etc.) */
const _yield = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/**
 * Carrega uma imagem e captura erros silenciosamente.
 * Retorna null em caso de falha — o consumer usa loadImage() direto como fallback.
 */
function _prefetch(url: string): Promise<HTMLImageElement | null> {
  return faceService.loadImage(url).catch(() => null);
}

// ── Consumer com prefetching ───────────────────────────────────────────────────

async function _run() {
  if (_active) return;               // já tem consumer rodando
  if (_queue.length === 0) return;   // fila vazia

  // Cancela reset automático caso enfileirado logo após conclusão anterior
  if (_resetTimer) { clearTimeout(_resetTimer); _resetTimer = null; }

  _active = true;
  _notify();

  // ── Prefetch da primeira imagem antes do loop ──────────────────────────────
  // Inicia o carregamento de rede enquanto os modelos de face ainda carregam.
  let nextImgPromise: Promise<HTMLImageElement | null> =
    _queue.length > 0 ? _prefetch(_queue[0].photoUrl) : Promise.resolve(null);

  while (_queue.length > 0) {
    const item = _queue.shift()!;
    _current = item.photoId;
    _notify();

    // ── Inicia prefetch do PRÓXIMO item imediatamente ────────────────────────
    // Este fetch roda concorrentemente com tudo abaixo (detectAllFaces em especial).
    // Quando o loop avançar para o próximo item, a imagem já estará em memória.
    const prefetchingNext: Promise<HTMLImageElement | null> =
      _queue.length > 0 ? _prefetch(_queue[0].photoUrl) : Promise.resolve(null);

    try {
      await faceService.loadModels();  // no-op se já carregados
      await _yield();                  // respira antes da inferência pesada

      // ── Usa a imagem pré-carregada (ou faz load síncrono se ainda não pronta) ──
      const img = (await nextImgPromise) ?? (await faceService.loadImage(item.photoUrl));
      await _yield();

      // Redimensiona imagem para acelerar detecção
      const resized = faceService.resizeImage(img, 1600);
      await _yield();

      // detectAllFacesMultiScale é CPU-bound (~2-5s com multi-escala) — prefetchingNext roda em paralelo.
      // Usa inputSize 512 (máxima qualidade) com multi-pass automático em faceService.
      // O prefetch esconde a latência de rede do próximo item durante esse tempo.
      // Pré-processamento: equalização de histograma para melhorar detecção em luz ruim
            const enhanced = faceService.enhanceImage(resized, 0.4);
            await _yield();
      
            // Detecção multi-escala com SsdMobilenetv1: imagem inteira + quadrantes (2x zoom)
            const descriptors = await faceService.detectAllFacesMultiScale(enhanced);
      await _yield();

      if (descriptors.length > 0) {
        await api.saveFaceDescriptors(item.eventId, item.photoId, descriptors, item.token);
      }
    } catch (err) {
      console.warn(`[faceQueue] Falha na foto ${item.photoId}:`, err);
      _errors++;
    }

    // O prefetch do próximo vira o "nextImgPromise" para a próxima iteração
    nextImgPromise = prefetchingNext;

    _done++;
    _current = null;
    _notify();

    // Cede o thread ANTES de pegar o próximo item — mantém o browser responsivo
    await _yield();
  }

  _active = false;
  nextImgPromise = Promise.resolve(null); // permite GC das imagens em cache
  _notify();

  // Zera contadores 10 s após terminar (mantém o toast visível por um tempo)
  _resetTimer = setTimeout(() => {
    _done   = 0;
    _total  = 0;
    _errors = 0;
    _current = null;
    _resetTimer = null;
    _notify();
  }, 10_000);
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Adiciona fotos à fila de processamento.
 * Pode ser chamado várias vezes (de uploads diferentes) sem conflito.
 */
export function enqueue(items: QueueItem[]): void {
  if (items.length === 0) return;
  _queue.push(...items);
  _total += items.length;
  _notify();
  _run(); // garante consumer ativo
}

/**
 * Inscreve um listener no estado da fila.
 * Emite o estado atual imediatamente.
 * @returns unsubscribe function
 */
export function subscribe(fn: Listener): () => void {
  _listeners.add(fn);
  fn(_snapshot());
  return () => _listeners.delete(fn);
}

// ── React hook ────────────────────────────────────────────────────────────────

const _INITIAL: QueueState = {
  pending: 0, active: false, done: 0, total: 0, errors: 0, currentPhotoId: null,
};

export function useFaceQueue(): QueueState {
  const [state, setState] = useState<QueueState>(_INITIAL);

  useEffect(() => {
    return subscribe(setState);
  }, []);

  return state;
}