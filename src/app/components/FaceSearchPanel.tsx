/**
 * FaceSearchPanel — Reconhecimento facial para filtragem de fotos
 * Fluxo: idle → loading (modelos) → camera OR upload-file → processing → results | error
 * Fallback: quando câmera bloqueada mostra opção de upload de selfie do dispositivo
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, Scan, ShoppingCart, CheckCircle2, AlertCircle,
  Loader2, X, RefreshCw, Zap, Lock, Users, ImageIcon, Upload,
  ChevronLeft, ChevronRight, Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import * as faceService from '../lib/faceService';
import { useCart } from '../contexts/CartContext';
import { api } from '../lib/api';
import { useTheme } from './ThemeProvider';

/* ── tipos ──────────────────────────────────────────────────────────────── */

type Stage = 'idle' | 'loading' | 'camera' | 'processing' | 'results' | 'error';

export interface FacePhoto {
  id: string | number;
  src: string;
  price: number;
  tag: string;
}

interface Props {
  photos: FacePhoto[];
  eventId: string;
  eventName: string;
  org?: string;
}

/* ── helpers ────────────────────────────────────────────────────────────── */

const GREEN = '#86efac';
const ELECTRIC = '#00FF7F';

/* ── AnimatedCounter ─────────────────────────────────────────────────────── */
function AnimatedCounter({ from, to, duration = 1.8 }: { from: number; to: number; duration?: number }) {
  const count = useMotionValue(from);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(from);

  useEffect(() => {
    const controls = animate(count, to, { duration, ease: 'easeOut' });
    const unsub = rounded.on('change', setDisplay);
    return () => { controls.stop(); unsub(); };
  }, [to]);

  return <span>{display}</span>;
}

/* ── ScanRect ─────────────────────────────────────────────────────────────── */
function ScanRect() {
  const size = 140;
  const corner = 20;
  const stroke = 2.5;
  const color = ELECTRIC;

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
    >
      {/* top-left */}
      <motion.path d={`M ${corner} 0 L 0 0 L 0 ${corner}`} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} />
      {/* top-right */}
      <motion.path d={`M ${size - corner} 0 L ${size} 0 L ${size} ${corner}`} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }} />
      {/* bottom-right */}
      <motion.path d={`M ${size} ${size - corner} L ${size} ${size} L ${size - corner} ${size}`} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }} />
      {/* bottom-left */}
      <motion.path d={`M ${corner} ${size} L 0 ${size} L 0 ${size - corner}`} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 1.05 }} />

      {/* horizontal scan line */}
      <motion.line x1="6" x2={size - 6} stroke={color} strokeWidth={1}
        animate={{ y1: [18, size - 18, 18], y2: [18, size - 18, 18], opacity: [0.8, 0.8, 0.8] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

/* ── PhotoCarouselModal ─────────────────────────────────────────────────── */

function PhotoCarouselModal({
  photos, initialIndex, eventId, eventName, onClose,
}: {
  photos: FacePhoto[]; initialIndex: number;
  eventId: string; eventName: string; onClose: () => void;
}) {
  const { addItem, isInCart, openDrawer } = useCart();
  const { theme } = useTheme();
  const d = theme === 'dark';
  const [idx, setIdx] = useState(initialIndex);

  const prev = useCallback(() => setIdx(i => (i - 1 + photos.length) % photos.length), [photos.length]);
  const next = useCallback(() => setIdx(i => (i + 1) % photos.length), [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, onClose]);

  const photo = photos[idx];
  const inCart = isInCart(photo.id, eventId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={e => e.stopPropagation()}
          className="relative flex flex-col"
          style={{ width: '100%', maxWidth: 720, maxHeight: '90vh', background: d ? '#0d0d12' : '#fff', borderRadius: 20, overflow: 'hidden', border: d ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(9,9,11,0.12)' }}
        >
          {/* close */}
          <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-xl"
            style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
            <X className="w-4 h-4" />
          </button>

          {/* counter */}
          <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-xs"
            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontWeight: 700 }}>
            {idx + 1} / {photos.length}
          </div>

          {/* main image */}
          <div className="relative flex-1 flex items-center justify-center" style={{ minHeight: 0, overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
              <motion.img
                key={idx}
                src={photo.src}
                alt={photo.tag}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.18 }}
                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', display: 'block' }}
              />
            </AnimatePresence>

            {/* prev / next */}
            {photos.length > 1 && (
              <>
                <button onClick={prev} className="absolute left-2 p-2 rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={next} className="absolute right-2 p-2 rounded-xl"
                  style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* thumbnail strip */}
          {photos.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto px-4 py-2" style={{ scrollbarWidth: 'none' }}>
              {photos.map((p, i) => (
                <button key={String(p.id)} onClick={() => setIdx(i)}
                  className="flex-shrink-0 overflow-hidden rounded-lg transition-all"
                  style={{
                    width: 52, height: 36, border: i === idx ? '2px solid #86efac' : '2px solid transparent',
                    opacity: i === idx ? 1 : 0.5, transition: 'all 0.15s',
                  }}>
                  <img src={p.src} alt={p.tag} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}

          {/* buy button */}
          <div className="px-5 pb-4 pt-1">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => { if (!inCart) addItem({ photoId: photo.id, src: photo.src, tag: photo.tag, eventName, eventId, price: photo.price }); openDrawer(); }}
              className="w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2"
              style={{
                background: inCart ? 'rgba(134,239,172,0.12)' : 'linear-gradient(135deg,rgba(22,101,52,0.95),rgba(21,128,61,0.9))',
                border: `1px solid ${inCart ? 'rgba(134,239,172,0.4)' : 'rgba(134,239,172,0.25)'}`,
                color: inCart ? '#86efac' : '#fff', fontWeight: 700,
              }}>
              {inCart ? <CheckCircle2 className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
              {inCart ? 'No carrinho' : `Adicionar ao carrinho · R$ ${photo.price}`}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── componente ─────────────────────────────────────────────────────────── */

export function FaceSearchPanel({ photos, eventId, eventName, org }: Props) {
  const { addItem, isInCart, openDrawer } = useCart();
  const { theme } = useTheme();
  const d = theme === 'dark';

  /* ── theme tokens ── */
  const MUTED = d ? 'rgba(255,255,255,0.4)'  : 'rgba(9,9,11,0.45)';
  const CARD  = d ? 'rgba(255,255,255,0.03)' : 'rgba(9,9,11,0.02)';
  const BORD  = d ? 'rgba(255,255,255,0.07)' : 'rgba(9,9,11,0.09)';
  const TEXT  = d ? '#fff' : '#09090B';
  const IDLE_CAM_BG = d ? 'linear-gradient(135deg,rgba(22,101,52,0.95),rgba(21,128,61,0.9))' : 'linear-gradient(135deg,#166534,#15803d)';
  const BUY_BG = d ? 'linear-gradient(135deg,rgba(22,101,52,0.9),rgba(21,128,61,0.85))' : 'linear-gradient(135deg,#166534,#15803d)';
  const UPLOAD_BG = d ? 'rgba(255,255,255,0.05)' : 'rgba(9,9,11,0.04)';
  const UPLOAD_TEXT = d ? 'rgba(255,255,255,0.75)' : 'rgba(9,9,11,0.6)';

  const [stage,        setStage]        = useState<Stage>('idle');
  const [loadStep,     setLoadStep]     = useState('');
  const [processStep,  setProcessStep]  = useState('');
  const [error,        setError]        = useState('');
  const [isCamBlocked, setIsCamBlocked] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [matchedIds,   setMatchedIds]   = useState<string[]>([]);
  const [confidence,   setConfidence]   = useState(0);
  const [previewSrc,   setPreviewSrc]   = useState<string | null>(null);
  // Guarda o queryDescriptor para permitir "Ampliar busca" sem nova selfie
  const lastDescriptor = useRef<number[] | null>(null);
  const [expandedSearch, setExpandedSearch] = useState(false);
  const [modalIdx, setModalIdx] = useState<number | null>(null);
  const [resultsPage, setResultsPage] = useState(1);
  const RESULTS_PER_PAGE = 12;

  // ── Claude verification state ──
  type ClaudeStatus = 'idle' | 'verifying' | 'done' | 'failed';
  const [claudeStatus, setClaudeStatus] = useState<ClaudeStatus>('idle');
  const [claudeMap, setClaudeMap] = useState<Map<string, { verified: boolean; confidence: number }>>(new Map());
  const selfieRef = useRef<{ base64: string; mimeType: string } | null>(null);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);

  /* ── parar câmera ─────────────────────────────────────────────────────── */

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (canvasRef.current) faceService.clearCanvas(canvasRef.current);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ── Callback ref: attach pending stream when video element mounts ────── */
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && pendingStreamRef.current) {
      node.srcObject = pendingStreamRef.current;
      node.play().catch(() => {});
      pendingStreamRef.current = null;
    }
  }, []);

  /* ── processar canvas (comum entre câmera e upload) ───────────────────── */

  const processCanvas = async (snap: HTMLCanvasElement, expandThreshold = false) => {
    setStage('processing');
    setProcessStep('Detectando rosto…');
    try {
      // ── Passo 1: detecta rosto na selfie (local, face-api.js) ─────────────
      const det = await faceService.detectSingleFace(snap);
      if (!det) {
        setError('Nenhum rosto reconhecido. Tente em boa iluminação e olhando diretamente para a câmera.');
        setStage('error');
        return;
      }
      const queryDescriptor = Array.from(det.descriptor);
      lastDescriptor.current = queryDescriptor;

      // ── Passo 2: busca no pgvector via servidor (ANN O(log n)) ────────────
      // Threshold primário: 0.82 (cos_sim) ≈ euclidean 0.60 — limiar padrão do face-api.js ResNet-34 para mesma pessoa.
      // Modo expandido: 0.72 (cos_sim) ≈ euclidean 0.75 — mais recall, mais falsos positivos.
      setProcessStep('Buscando suas fotos…');
      const primaryThreshold = expandThreshold ? 0.72 : 0.82;
      let matched: string[] = [];
      let conf = 0;

      try {
        const { matches } = await api.searchFacesByEmbedding(eventId, queryDescriptor, primaryThreshold, org);
        matched = matches.map((m) => m.photoId);
        // Confiança baseada na melhor similaridade coseno (0..1 → 0..100%)
        const best = matches.length > 0 ? matches[0].similarity : 0;
        conf = Math.max(0, Math.min(100, Math.round(best * 100)));
      } catch (_pgErr) {
        // ── Fallback: busca local caso o servidor falhe ───────────────────
        console.warn('[FaceSearch] pgvector falhou, usando fallback local:', _pgErr);
        setProcessStep('Comparando rostos (modo offline)…');
        const { faces: allFaces } = await api.getEventFaces(eventId, org);
        const ranked = faceService.findRankedMatches(queryDescriptor, allFaces);
        matched = ranked.map((m) => m.photoId);
        const bestDist = ranked.length > 0 ? ranked[0].minDistance : 1;
        conf = Math.max(0, Math.min(100, Math.round((1 - bestDist / 0.7) * 100)));
      }

      setMatchedIds(matched);
      setConfidence(conf);
      setExpandedSearch(expandThreshold);
      setResultsPage(1);
      setStage('results');
      if (matched.length > 0 && previewSrc) {
        const photoList = photos.filter(p => matched.includes(String(p.id)));
        runClaudeVerification(photoList, previewSrc);
      }
    } catch (err: any) {
      setError(err.message ?? 'Erro ao processar reconhecimento facial.');
      setStage('error');
    }
  };

  /* ── ampliar busca com threshold menor (sem nova selfie) ─────────────── */

  const expandSearch = async () => {
    if (!lastDescriptor.current) return;
    setStage('processing');
    setProcessStep('Ampliando busca com maior sensibilidade…');
    try {
      const { matches } = await api.searchFacesByEmbedding(eventId, lastDescriptor.current, 0.72, org);
      const matched = matches.map((m: any) => m.photoId);
      const best = matches.length > 0 ? matches[0].similarity : 0;
      const conf = Math.max(0, Math.min(100, Math.round(best * 100)));
      setMatchedIds(matched);
      setConfidence(conf);
      setExpandedSearch(true);
      setStage('results');
      if (matched.length > 0 && previewSrc) {
        const photoList = photos.filter(p => matched.includes(String(p.id)));
        runClaudeVerification(photoList, previewSrc);
      }
    } catch (err: any) {
      // Fallback local com threshold relaxado
      try {
        const { faces: allFaces } = await api.getEventFaces(eventId, org);
        const ranked = faceService.findRankedMatches(lastDescriptor.current, allFaces, 0.55, 0.65);
        const rankedMatched = ranked.map((m) => m.photoId);
        setMatchedIds(rankedMatched);
        setConfidence(ranked.length > 0 ? Math.round((1 - ranked[0].minDistance / 0.8) * 100) : 0);
        setExpandedSearch(true);
        setStage('results');
        if (rankedMatched.length > 0 && previewSrc) {
          const photoList = photos.filter(p => rankedMatched.includes(String(p.id)));
          runClaudeVerification(photoList, previewSrc);
        }
      } catch {
        setError('Erro ao ampliar busca. Tente tirar uma nova selfie.');
        setStage('error');
      }
    }
  };

  /* ── iniciar câmera ───────────────────────────────────────────────────── */

  const startCamera = async () => {
    setStage('loading');
    setError('');
    setFaceDetected(false);
    setIsCamBlocked(false);
    setPreviewSrc(null);

    // ─── STEP 1: Pedir câmera PRIMEIRO → dialog de permissão aparece imediatamente ───
    setLoadStep('Aguardando permissão da câmera…');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
    } catch (err: any) {
      const isBlocked = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const msg = isBlocked
        ? 'Câmera bloqueada pelo navegador. Use a opção de upload abaixo para enviar uma selfie.'
        : err.name === 'NotFoundError'
          ? 'Nenhuma câmera encontrada. Use a opção de upload para enviar uma selfie.'
          : err.message ?? 'Erro ao acessar câmera.';
      setError(msg);
      setIsCamBlocked(isBlocked || err.name === 'NotFoundError');
      setStage('error');
      return;
    }

    // ─── STEP 2: Câmera OK → mostrar preview enquanto modelos carregam ──────────
    streamRef.current = stream;
    pendingStreamRef.current = stream;
    // Video element may not be rendered yet (stage is still 'loading'),
    // so we set srcObject via useEffect after stage changes to 'camera'.
    setStage('camera');
    setLoadStep('Carregando modelos de IA…');

    // ─── STEP 3: Carregar modelos em background ──────────────────────────────────
    try {
      await faceService.loadModels();
    } catch (err: any) {
      stopCamera();
      setError('Falha ao carregar os modelos de IA. Verifique sua conexão e tente novamente.');
      setStage('error');
      return;
    }

    // ─── STEP 4: Iniciar loop de detecção ────────────────────────────────────────
    intervalRef.current = setInterval(async () => {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      canvas.width  = video.videoWidth  || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;

      const det = await faceService.detectSingleFace(video);
      if (det) {
        const scaleX = canvas.width  / (video.videoWidth  || canvas.width);
        const scaleY = canvas.height / (video.videoHeight || canvas.height);
        faceService.drawFaceBox(canvas, det.box, GREEN, scaleX, scaleY);
        setFaceDetected(true);
      } else {
        faceService.clearCanvas(canvas);
        setFaceDetected(false);
      }
    }, 300);
  };

  /* ── upload de selfie (fallback sem câmera) ───────────────────────────── */

  const startUpload = async () => {
    setStage('loading');
    setError('');
    setIsCamBlocked(false);
    setPreviewSrc(null);

    try {
      setLoadStep('Carregando modelos de IA…');
      await faceService.loadModels();
      setLoadStep('Modelos prontos. Selecione sua selfie…');
      // trigger file picker after models are loaded
      setTimeout(() => {
        fileRef.current?.click();
      }, 300);
      // Stay in loading briefly; handleFile will advance stage
    } catch (err: any) {
      setError(err.message ?? 'Erro ao carregar modelos de IA.');
      setStage('error');
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setStage('idle'); return; }

    // Show preview
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewSrc(dataUrl);

      const img = new Image();
      img.onload = async () => {
        const snap = document.createElement('canvas');
        snap.width  = img.naturalWidth;
        snap.height = img.naturalHeight;
        snap.getContext('2d')!.drawImage(img, 0, 0);
        await processCanvas(snap);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  /* ── capturar da câmera ────────────────────────────────────────────────── */

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !faceDetected) return;

    stopCamera();

    const snap = document.createElement('canvas');
    snap.width  = video.videoWidth;
    snap.height = video.videoHeight;
    snap.getContext('2d')!.drawImage(video, 0, 0);

    await processCanvas(snap);
  };

  /* ── reset ────────────────────────────────────────────────────────────── */

  const reset = () => {
    stopCamera();
    setStage('idle');
    setFaceDetected(false);
    setMatchedIds([]);
    setError('');
    setConfidence(0);
    setPreviewSrc(null);
    setIsCamBlocked(false);
    setClaudeStatus('idle');
    setClaudeMap(new Map());
    setResultsPage(1);
    selfieRef.current = null;
  };

  /* ── dados de resultado ───────────────────────────────────────────────── */

  const matchedPhotos = photos.filter((p) => matchedIds.includes(String(p.id)));
  // Quando Claude termina, coloca fotos verificadas primeiro
  const sortedPhotos = claudeStatus === 'done' && claudeMap.size > 0
    ? [...matchedPhotos].sort((a, b) => {
        const va = claudeMap.get(String(a.id))?.verified ? 1 : 0;
        const vb = claudeMap.get(String(b.id))?.verified ? 1 : 0;
        return vb - va;
      })
    : matchedPhotos;
  const totalResultPages = Math.ceil(sortedPhotos.length / RESULTS_PER_PAGE);
  const displayPhotos = sortedPhotos.slice((resultsPage - 1) * RESULTS_PER_PAGE, resultsPage * RESULTS_PER_PAGE);

  /* ── Claude verification ───────────────────────────────────────────────── */

  /**
   * Comprime a selfie para max 640px antes de enviar ao servidor,
   * evitando payloads excessivos.
   */
  function compressSelfieForClaude(dataUrl: string): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 640;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve({
          base64: compressed.replace(/^data:[^;]+;base64,/, ''),
          mimeType: 'image/jpeg',
        });
      };
      img.onerror = () => {
        // fallback: use original
        resolve({
          base64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
          mimeType: dataUrl.match(/^data:([^;]+);base64,/)?.[1] ?? 'image/jpeg',
        });
      };
      img.src = dataUrl;
    });
  }

  const runClaudeVerification = async (matchedPhotoList: FacePhoto[], selfieDataUrl: string) => {
    if (matchedPhotoList.length === 0) return;
    setClaudeStatus('verifying');
    setClaudeMap(new Map());
    try {
      const { base64, mimeType } = selfieRef.current
        ? selfieRef.current
        : await compressSelfieForClaude(selfieDataUrl);
      selfieRef.current = { base64, mimeType };

      const CHUNK = 12;
      const allResults: Array<{ id: string; verified: boolean; confidence: number }> = [];
      for (let i = 0; i < matchedPhotoList.length; i += CHUNK) {
        const chunk = matchedPhotoList.slice(i, i + CHUNK).map(p => ({ id: String(p.id), url: p.src }));
        const res = await api.verifyFacesWithClaude(base64, mimeType, chunk);
        if (res.unavailable) { setClaudeStatus('idle'); return; } // chave não configurada
        allResults.push(...(res.results ?? []));
      }
      setClaudeMap(new Map(allResults.map(r => [r.id, { verified: r.verified, confidence: r.confidence }])));
      setClaudeStatus('done');
    } catch (e: any) {
      console.warn('[Claude] Verificação falhou:', e?.message);
      setClaudeStatus('failed');
    }
  };
  /* ── render ───────────────────────────────────────────────────────────── */

  return (
    <div className="py-6">
      {/* hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFile}
      />

      <AnimatePresence mode="wait">

        {/* ── IDLE ─────────────────────────────────────────────────────── */}
        {stage === 'idle' && (
          <motion.div key="idle"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="max-w-lg mx-auto text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(134,239,172,0.07)', border: '1px solid rgba(134,239,172,0.18)' }}
            >
              <Scan className="w-10 h-10" style={{ color: GREEN }} />
            </motion.div>

            <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontSize: '1.8rem', fontWeight: 900, color: TEXT, letterSpacing: '-0.02em' }} className="mb-3">
              Encontre suas fotos
            </h3>
            <p className="mb-8 text-sm leading-relaxed" style={{ color: MUTED }}>
              Nossa IA analisa seu rosto e localiza todas as fotos em que você aparece neste evento — em segundos.
            </p>

            {/* dois botões: câmera e upload */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={startCamera}
                className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-sm flex-1"
                style={{ background: IDLE_CAM_BG, border: '1px solid rgba(134,239,172,0.25)', color: '#fff', fontWeight: 800, fontFamily: "'Montserrat',sans-serif" }}
              >
                <Camera className="w-5 h-5" /> Usar câmera
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={startUpload}
                className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-sm flex-1"
                style={{ background: UPLOAD_BG, border: `1px solid ${BORD}`, color: UPLOAD_TEXT, fontWeight: 700 }}
              >
                <Upload className="w-4 h-4" /> Enviar selfie
              </motion.button>
            </div>

            <p className="mt-5 text-xs flex items-center justify-center gap-1.5" style={{ color: d ? 'rgba(255,255,255,0.2)' : 'rgba(9,9,11,0.25)' }}>
              <Lock className="w-3 h-3" /> Sua imagem não é armazenada — apenas o vetor biométrico é enviado
            </p>
          </motion.div>
        )}

        {/* ── LOADING ──────────────────────────────────────────────────── */}
        {stage === 'loading' && (
          <motion.div key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center py-16 max-w-sm mx-auto"
          >
            <div className="relative w-20 h-20 mx-auto mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-2 border-transparent"
                style={{ borderTopColor: GREEN, borderRightColor: 'rgba(134,239,172,0.2)' }}
              />
              <div className="absolute inset-2 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(134,239,172,0.07)' }}>
                <Scan className="w-7 h-7" style={{ color: GREEN }} />
              </div>
            </div>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '1rem', color: TEXT }} className="mb-2">
              Preparando…
            </p>
            <p className="text-xs" style={{ color: MUTED, lineHeight: 1.7 }}>{loadStep}</p>
          </motion.div>
        )}

        {/* ── CAMERA ───────────────────────────────────────────────────── */}
        {stage === 'camera' && (
          <motion.div key="camera"
            initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-5"
          >
            <div className="relative" style={{ width: '100%', maxWidth: 420 }}>
              <motion.div
                animate={faceDetected
                  ? { boxShadow: ['0 0 0 0 rgba(134,239,172,0)', '0 0 0 8px rgba(134,239,172,0.15)', '0 0 0 0 rgba(134,239,172,0)'] }
                  : { boxShadow: '0 0 0 0 rgba(134,239,172,0)' }
                }
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ borderRadius: 20, overflow: 'hidden', border: `2px solid ${faceDetected ? 'rgba(134,239,172,0.5)' : 'rgba(255,255,255,0.08)'}`, transition: 'border-color 0.3s', background: '#000' }}
              >
                <video
                  ref={videoCallbackRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }}
                />
                <canvas
                  ref={canvasRef}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)', pointerEvents: 'none' }}
                />
              </motion.div>

              <AnimatePresence>
                {faceDetected && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs"
                    style={{ background: 'rgba(134,239,172,0.12)', border: '1px solid rgba(134,239,172,0.35)', color: GREEN, fontWeight: 700, backdropFilter: 'blur(10px)', whiteSpace: 'nowrap' }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Rosto detectado
                  </motion.div>
                )}
                {!faceDetected && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs"
                    style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: MUTED, backdropFilter: 'blur(10px)', whiteSpace: 'nowrap' }}
                  >
                    Posicione seu rosto no centro
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="text-xs text-center" style={{ color: MUTED }}>
              Olhe diretamente para a câmera em um ambiente bem iluminado
            </p>

            <div className="flex gap-3 w-full max-w-xs">
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={reset}
                className="flex-1 py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORD}`, color: MUTED, fontWeight: 600 }}
              >
                <X className="w-4 h-4" /> Cancelar
              </motion.button>
              <motion.button
                whileHover={faceDetected ? { scale: 1.04 } : {}}
                whileTap={faceDetected ? { scale: 0.97 } : {}}
                onClick={capture}
                disabled={!faceDetected}
                className="flex-[2] py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-opacity"
                style={{
                  background: faceDetected ? 'linear-gradient(135deg,rgba(22,101,52,0.95),rgba(21,128,61,0.9))' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${faceDetected ? 'rgba(134,239,172,0.25)' : BORD}`,
                  color: faceDetected ? '#fff' : 'rgba(255,255,255,0.25)',
                  fontWeight: 800,
                  fontFamily: "'Montserrat',sans-serif",
                  opacity: faceDetected ? 1 : 0.6,
                }}
              >
                <Camera className="w-4 h-4" />
                {faceDetected ? 'Capturar e buscar' : 'Aguardando rosto…'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── PROCESSING ───────────────────────────────────────────────── */}
        {stage === 'processing' && (
          <motion.div key="processing"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-6 max-w-sm mx-auto"
          >
            {/* ── card visual ── */}
            <div className="relative w-72 h-72 rounded-3xl overflow-hidden"
              style={{ background: 'linear-gradient(145deg,rgba(0,20,12,0.95),rgba(0,40,24,0.85))', border: '1px solid rgba(0,255,127,0.12)' }}>

              {/* background glow */}
              <div className="absolute inset-0" style={{
                background: 'radial-gradient(ellipse at 40% 60%, rgba(0,180,90,0.18) 0%, transparent 65%), radial-gradient(ellipse at 65% 35%, rgba(0,200,200,0.10) 0%, transparent 60%)',
              }} />

              {/* circular face frame */}
              <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-52%)', width: 180, height: 180 }}>
                {/* outer glow ring */}
                <motion.div
                  animate={{ boxShadow: ['0 0 0 0 rgba(0,255,127,0)', '0 0 0 10px rgba(0,255,127,0.12)', '0 0 0 0 rgba(0,255,127,0)'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ borderRadius: '50%', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                />

                {/* photo or placeholder */}
                <div className="rounded-full overflow-hidden" style={{ width: '100%', height: '100%', border: '2px solid rgba(0,255,127,0.25)' }}>
                  {previewSrc ? (
                    <img src={previewSrc} alt="selfie" className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: 'rgba(0,255,127,0.05)' }}>
                      <Scan className="w-12 h-12" style={{ color: 'rgba(0,255,127,0.3)' }} />
                    </div>
                  )}
                </div>

                {/* scanning rectangle overlay */}
                <ScanRect />
              </div>

              {/* ANALISANDO badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(0,20,12,0.75)', border: '1px solid rgba(0,255,127,0.35)', backdropFilter: 'blur(10px)' }}>
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: ELECTRIC, boxShadow: `0 0 6px ${ELECTRIC}` }}
                />
                <span style={{ color: ELECTRIC, fontSize: '0.65rem', fontWeight: 800, fontFamily: "'Montserrat',sans-serif", letterSpacing: '0.08em' }}>
                  ANALISANDO
                </span>
              </div>

              {/* bottom stats row */}
              <div className="absolute bottom-4 inset-x-3 flex items-end justify-between gap-2">
                {/* confidence */}
                <div className="flex-1 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(0,10,6,0.75)', border: '1px solid rgba(0,255,127,0.2)', backdropFilter: 'blur(8px)' }}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <motion.span
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                      style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: ELECTRIC }}
                    />
                    <span style={{ color: ELECTRIC, fontSize: '0.6rem', fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>
                      Confiança: <AnimatedCounter from={0} to={98} duration={2} />.<AnimatedCounter from={0} to={7} duration={2.2} />%
                    </span>
                  </div>
                  {/* progress bar */}
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${ELECTRIC}, #00D4FF)`, boxShadow: `0 0 8px ${ELECTRIC}` }}
                      animate={{ width: ['0%', '98.7%'] }}
                      transition={{ duration: 2, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* photo count */}
                <div className="px-3 py-2 rounded-xl flex items-center gap-1.5"
                  style={{ background: 'rgba(0,10,6,0.75)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.6rem', fontWeight: 600 }}>Fotos encontradas:</span>
                  <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 900, fontFamily: "'Montserrat',sans-serif" }}>
                    <AnimatedCounter from={0} to={photos.length} duration={2} />
                  </span>
                </div>
              </div>
            </div>

            {/* ── texto abaixo ── */}
            <div className="text-center">
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: '1.1rem', fontWeight: 900, color: TEXT }} className="mb-1">
                {processStep || 'Buscando suas fotos…'}
              </p>
              <p className="text-xs" style={{ color: MUTED }}>
                {processStep.includes('offline') 
                  ? 'Processamento local em andamento'
                  : `Comparando seu rosto com ${photos.length} fotos do evento`}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── RESULTS ──────────────────────────────────────────────────── */}
        {stage === 'results' && (
          <motion.div key="results"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                {matchedPhotos.length > 0 ? (
                  <>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm mb-1.5"
                      style={{ background: d ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.08)', border: d ? '1px solid rgba(134,239,172,0.2)' : '1px solid rgba(22,101,52,0.2)', color: d ? GREEN : '#166534', fontWeight: 700 }}>
                      <Zap className="w-3.5 h-3.5" />
                      {matchedPhotos.length} {matchedPhotos.length === 1 ? 'foto encontrada' : 'fotos encontradas'}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {confidence > 0 && (
                        <p className="text-xs" style={{ color: MUTED }}>
                          {confidence}% de confiança · reconhecimento facial IA
                        </p>
                      )}
                      {/* Claude status badge */}
                      {claudeStatus === 'verifying' && (
                        <motion.div
                          animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px]"
                          style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa' }}>
                          <Sparkles className="w-3 h-3" /> Verificando com Claude…
                        </motion.div>
                      )}
                      {claudeStatus === 'done' && claudeMap.size > 0 && (() => {
                        const verified = [...claudeMap.values()].filter(r => r.verified).length;
                        return (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px]"
                            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa', fontWeight: 700 }}>
                            <Sparkles className="w-3 h-3" /> {verified} confirmada{verified !== 1 ? 's' : ''} pelo Claude
                          </div>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                    style={{ background: CARD, border: `1px solid ${BORD}`, color: MUTED, fontWeight: 600 }}>
                    <Users className="w-3.5 h-3.5" />
                    Nenhuma foto encontrada
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {matchedPhotos.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      matchedPhotos.forEach((p) => {
                        if (!isInCart(p.id, eventId))
                          addItem({ photoId: p.id, src: p.src, tag: p.tag, eventName, eventId, price: p.price });
                      });
                      openDrawer();
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
                    style={{ background: BUY_BG, border: '1px solid rgba(134,239,172,0.2)', color: '#fff', fontWeight: 700 }}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Comprar tudo
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={reset}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm"
                  style={{ background: CARD, border: `1px solid ${BORD}`, color: MUTED, fontWeight: 600 }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Nova busca
                </motion.button>
              </div>
            </div>

            {modalIdx !== null && (
              <PhotoCarouselModal
                photos={displayPhotos}
                initialIndex={modalIdx}
                eventId={eventId}
                eventName={eventName}
                onClose={() => setModalIdx(null)}
              />
            )}

            {displayPhotos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayPhotos.map((photo, i) => {
                  const inCart = isInCart(photo.id, eventId);
                  return (
                    <motion.div
                      key={String(photo.id)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => setModalIdx(i)}
                      className="relative group overflow-hidden"
                      style={{ borderRadius: 14, aspectRatio: '3/2', border: inCart ? `1px solid ${d ? 'rgba(134,239,172,0.35)' : 'rgba(22,101,52,0.35)'}` : `1px solid ${BORD}`, cursor: 'pointer' }}
                    >
                      {(() => {
                        const gResult = claudeMap.get(String(photo.id));
                        const dimmed = claudeStatus === 'done' && gResult && !gResult.verified;
                        return (
                          <img src={photo.src} alt={photo.tag}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                            style={{ filter: dimmed ? 'brightness(0.55)' : 'brightness(0.85)', transition: 'filter 0.4s' }}
                          />
                        );
                      })()}

                      {(() => {
                        const gResult = claudeMap.get(String(photo.id));
                        const isVerified = gResult?.verified;
                        const isClaudeDone = claudeStatus === 'done';
                        return (
                          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded text-[9px]"
                            style={{
                              background: isVerified ? 'rgba(139,92,246,0.18)' : 'rgba(134,239,172,0.1)',
                              border: `1px solid ${isVerified ? 'rgba(139,92,246,0.4)' : 'rgba(134,239,172,0.25)'}`,
                              color: isVerified ? '#c084fc' : GREEN,
                              fontWeight: 800, backdropFilter: 'blur(6px)',
                              opacity: isClaudeDone && gResult && !isVerified ? 0.6 : 1,
                            }}>
                            {isVerified
                              ? <><Sparkles className="w-2.5 h-2.5" /> CLAUDE ✓</>
                              : 'IA MATCH'}
                          </div>
                        );
                      })()}

                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />

                      <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                        <span style={{ color: GREEN, fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '1rem' }}>
                          R$ {photo.price}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={e => {
                            e.stopPropagation();
                            if (!inCart) addItem({ photoId: photo.id, src: photo.src, tag: photo.tag, eventName, eventId, price: photo.price });
                            openDrawer();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                          style={{ background: inCart ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.85)', border: `1px solid ${inCart ? 'rgba(134,239,172,0.4)' : 'rgba(134,239,172,0.25)'}`, color: inCart ? GREEN : '#fff', fontWeight: 700, backdropFilter: 'blur(10px)' }}
                        >
                          {inCart ? <><CheckCircle2 className="w-3 h-3" /> No carrinho</> : <><ShoppingCart className="w-3 h-3" /> Adicionar</>}
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : null}

            {/* ── Pagination ── */}
            {totalResultPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-8 flex-wrap">
                <button
                  onClick={() => setResultsPage(p => Math.max(1, p - 1))}
                  disabled={resultsPage <= 1}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: resultsPage > 1 ? CARD : 'transparent', border: `1px solid ${resultsPage > 1 ? BORD : 'transparent'}`, color: resultsPage > 1 ? TEXT : MUTED, opacity: resultsPage <= 1 ? 0.3 : 1, cursor: resultsPage <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalResultPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setResultsPage(p)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all"
                    style={{
                      background: p === resultsPage ? (d ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.12)') : CARD,
                      border: `1px solid ${p === resultsPage ? (d ? 'rgba(134,239,172,0.4)' : 'rgba(22,101,52,0.35)') : BORD}`,
                      color: p === resultsPage ? (d ? GREEN : '#166534') : TEXT,
                      fontWeight: p === resultsPage ? 800 : 500,
                    }}
                  >{p}</button>
                ))}
                <button
                  onClick={() => setResultsPage(p => Math.min(totalResultPages, p + 1))}
                  disabled={resultsPage >= totalResultPages}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: resultsPage < totalResultPages ? CARD : 'transparent', border: `1px solid ${resultsPage < totalResultPages ? BORD : 'transparent'}`, color: resultsPage < totalResultPages ? TEXT : MUTED, opacity: resultsPage >= totalResultPages ? 0.3 : 1, cursor: resultsPage >= totalResultPages ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {displayPhotos.length === 0 && sortedPhotos.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="text-center py-14 px-6 rounded-2xl"
                style={{ background: CARD, border: `1px solid ${BORD}` }}
              >
                <Users className="w-10 h-10 mx-auto mb-4" style={{ color: d ? 'rgba(255,255,255,0.15)' : 'rgba(9,9,11,0.2)' }} />
                <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, color: TEXT, fontSize: '1rem' }} className="mb-2">
                  Nenhuma foto encontrada
                </p>
                <p className="text-sm mb-4" style={{ color: MUTED, lineHeight: 1.7 }}>
                  {expandedSearch
                    ? 'Mesmo com a busca ampliada, nenhuma foto foi localizada. As fotos deste evento podem ainda não ter sido indexadas.'
                    : 'Pode ser que você não apareça nas fotos disponíveis, ou que as fotos ainda não tenham sido processadas.'}
                </p>

                {/* Botão "Ampliar busca" — só aparece na primeira tentativa sem resultado */}
                {!expandedSearch && lastDescriptor.current && (
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={expandSearch}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm mx-auto mb-3"
                    style={{ background: d ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.08)', border: d ? '1px solid rgba(134,239,172,0.2)' : '1px solid rgba(22,101,52,0.2)', color: d ? GREEN : '#166534', fontWeight: 700 }}
                  >
                    <Scan className="w-4 h-4" /> Ampliar busca (maior sensibilidade)
                  </motion.button>
                )}

                {/* Aviso de reindexação */}
                <div className="mb-4 p-3 rounded-xl text-left" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
                  <p className="text-xs font-bold mb-1.5" style={{ color: '#06b6d4' }}>
                    💡 Dica para administradores
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(6,182,212,0.9)' }}>
                    Se você é admin, acesse <strong>Admin &gt; Sistema &gt; Reindexar Faces</strong> para processar as fotos deste evento.
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={reset}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm mx-auto"
                  style={{ background: UPLOAD_BG, border: `1px solid ${BORD}`, color: TEXT, fontWeight: 700 }}
                >
                  <RefreshCw className="w-4 h-4" /> Tentar novamente
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── ERROR ────────────────────────────────────────────────────── */}
        {stage === 'error' && (
          <motion.div key="error"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-center py-10 max-w-sm mx-auto"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(252,165,165,0.07)', border: '1px solid rgba(252,165,165,0.15)' }}>
              <AlertCircle className="w-8 h-8" style={{ color: '#fca5a5' }} />
            </div>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, color: TEXT, fontSize: '1.1rem' }} className="mb-3">
              {isCamBlocked ? 'Câmera não disponível' : 'Algo deu errado'}
            </p>
            <p className="text-sm mb-8" style={{ color: MUTED, lineHeight: 1.7 }}>{error}</p>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              {/* Quando câmera bloqueada: destaca upload */}
              {isCamBlocked && (
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={startUpload}
                  className="flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-sm w-full"
                  style={{ background: IDLE_CAM_BG, border: '1px solid rgba(134,239,172,0.25)', color: '#fff', fontWeight: 800, fontFamily: "'Montserrat',sans-serif" }}
                >
                  <Upload className="w-5 h-5" /> Enviar selfie do dispositivo
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={reset}
                className="flex items-center justify-center gap-2 px-7 py-3 rounded-2xl text-sm w-full"
                style={{ background: UPLOAD_BG, border: `1px solid ${BORD}`, color: UPLOAD_TEXT, fontWeight: 700 }}
              >
                <RefreshCw className="w-4 h-4" /> Voltar
              </motion.button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}