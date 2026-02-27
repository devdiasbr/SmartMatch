/**
 * faceQueue.ts — Fila global de embedding facial
 *
 * Singleton module-level: persiste entre navegações e remontagens de componentes.
 *
 * Fluxo:
 *   enqueue(items) → adiciona à fila → inicia o consumer se parado
 *   consumer roda 1 foto por vez, cede o main thread entre cada uma (setTimeout 0)
 *   Múltiplos uploads de eventos diferentes se acumulam na mesma fila sem conflito.
 *
 * Estado reativo:
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

const _queue: QueueItem[]  = [];
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

// ── Consumer ──────────────────────────────────────────────────────────────────

async function _run() {
  if (_active) return;               // já tem consumer rodando
  if (_queue.length === 0) return;   // fila vazia

  // Cancela reset automático caso enfileirado logo após conclusão anterior
  if (_resetTimer) { clearTimeout(_resetTimer); _resetTimer = null; }

  _active = true;
  _notify();

  while (_queue.length > 0) {
    const item = _queue.shift()!;
    _current = item.photoId;
    _notify();

    try {
      await faceService.loadModels();          // no-op se já carregados
      await _yield();                          // respira antes da inferência pesada

      const img = await faceService.loadImage(item.photoUrl);
      await _yield();

      const descriptors = await faceService.detectAllFaces(img);
      await _yield();

      if (descriptors.length > 0) {
        await api.saveFaceDescriptors(item.eventId, item.photoId, descriptors, item.token);
      }
    } catch (err) {
      console.warn(`[faceQueue] Falha na foto ${item.photoId}:`, err);
      _errors++;
    }

    _done++;
    _current = null;
    _notify();

    // Cede o thread ANTES de pegar o próximo item — mantém o browser responsivo
    await _yield();
  }

  _active = false;
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
