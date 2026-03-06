/**
 * FacePDVSearch — Reconhecimento facial adaptado para o PDV.
 * Espelha o fluxo do FaceSearchPanel online:
 *   1. Busca rápida via pgvector (server-side ANN — O(log n))
 *   2. Fallback local caso pgvector falhe
 *   3. Animação de scanner idêntica ao online
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Upload, X, Loader2, Scan, AlertCircle, CheckCircle2, RefreshCw, Zap, Users, Lock,
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import * as faceService from '../lib/faceService';
import { api } from '../lib/api';

type Stage = 'idle' | 'loading' | 'camera' | 'processing' | 'results' | 'error';

interface Props {
  eventId: string;
  eventName: string;
  isDark: boolean;
  onMatches: (photoIds: string[]) => void;
  onClose: () => void;
}

/* ── AnimatedCounter ───────────────────────────────────────────────── */
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

/* ── ScanRect — animação de scanner ──────────────────────────────── */
function ScanRect() {
  const size = 140;
  const corner = 20;
  const stroke = 2.5;
  const color = '#00FF7F';

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
    >
      <motion.path d={`M ${corner} 0 L 0 0 L 0 ${corner}`} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.path d={`M ${size - corner} 0 L ${size} 0 L ${size} ${corner}`} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }} />
      <motion.path d={`M ${size} ${size - corner} L ${size} ${size} L ${size - corner} ${size}`} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }} />
      <motion.path d={`M ${corner} ${size} L 0 ${size} L 0 ${size - corner}`} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: 1.05 }} />
      <motion.line x1="6" x2={size - 6} stroke={color} strokeWidth={1}
        animate={{ y1: [18, size - 18, 18], y2: [18, size - 18, 18], opacity: [0.8, 0.8, 0.8] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

/* ── Componente principal ────────────────────────────────────────── */

export function FacePDVSearch({ eventId, eventName, isDark, onMatches, onClose }: Props) {
  const [stage,        setStage]        = useState<Stage>('idle');
  const [loadStep,     setLoadStep]     = useState('');
  const [processStep,  setProcessStep]  = useState('');
  const [error,        setError]        = useState('');
  const [isCamBlocked, setIsCamBlocked] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [confidence,   setConfidence]   = useState(0);
  const [matchCount,   setMatchCount]   = useState(0);
  const [previewSrc,   setPreviewSrc]   = useState<string | null>(null);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);

  const GREEN    = '#86efac';
  const ELECTRIC = '#00FF7F';
  const MUTED    = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(9,9,11,0.45)';
  const BORDER   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.09)';
  const TEXT     = isDark ? '#fff' : '#09090B';

  const stopCamera = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (canvasRef.current) faceService.clearCanvas(canvasRef.current);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && pendingStreamRef.current) {
      node.srcObject = pendingStreamRef.current;
      node.play().catch(() => {});
      pendingStreamRef.current = null;
    }
  }, []);

  /* ── buscar por descriptor (compartilhado) ──────────────────────────── */
  const _searchByDescriptor = async (queryDesc: number[]) => {
    setProcessStep('Buscando fotos do cliente…');
    let matched: string[] = [];
    let conf = 0;

    try {
      const { matches } = await api.searchFacesByEmbedding(eventId, queryDesc, 0.88);
      matched = matches.map(m => m.photoId);
      const best = matches.length > 0 ? matches[0].similarity : 0;
      conf = Math.max(0, Math.min(100, Math.round(best * 100)));
    } catch (_pgErr) {
      console.warn('[FacePDVSearch] pgvector falhou, usando fallback local:', _pgErr);
      setProcessStep('Comparando rostos (modo offline)…');
      const { faces } = await api.getEventFaces(eventId);
      if (faces.length === 0) {
        setMatchCount(0);
        setConfidence(0);
        setStage('results');
        onMatches([]);
        return;
      }
      const ranked = faceService.findRankedMatches(queryDesc, faces, 0.45, 0.52);
      matched = ranked.map(m => m.photoId);
      const bestDist = ranked.length > 0 ? ranked[0].minDistance : 1;
      conf = Math.max(0, Math.min(100, Math.round((1 - bestDist / 0.75) * 100)));
    }

    setMatchCount(matched.length);
    setConfidence(conf);
    setStage('results');
    onMatches(matched.map(String));

    if (matched.length > 0) {
      setTimeout(() => { stopCamera(); onClose(); }, 1500);
    }
  };

  /* ── processar canvas (upload de selfie) ──────────────────────────── */
  const processCanvas = async (snap: HTMLCanvasElement) => {
    setStage('processing');
    setProcessStep('Detectando rosto…');
    try {
      const det = await faceService.detectSingleFace(snap);
      if (!det) {
        setError('Nenhum rosto detectado. Tente com boa iluminação e olhando para a câmera.');
        setStage('error');
        return;
      }
      await _searchByDescriptor(Array.from(det.descriptor));
    } catch (err: any) {
      setError(err.message ?? 'Erro no reconhecimento facial.');
      setStage('error');
    }
  };

  /* ── iniciar câmera + detecção contínua ── */
  const startCamera = async () => {
    setStage('loading');
    setError('');
    setFaceDetected(false);
    setIsCamBlocked(false);
    setPreviewSrc(null);

    // Pedir câmera PRIMEIRO — dialog aparece imediato
    setLoadStep('Aguardando permissão da câmera…');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
    } catch (err: any) {
      const isBlocked = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      setError(isBlocked
        ? 'Câmera bloqueada. Use a opção "Enviar Selfie".'
        : err.name === 'NotFoundError'
          ? 'Nenhuma câmera encontrada. Use a opção de upload.'
          : err.message ?? 'Erro ao acessar câmera.');
      setIsCamBlocked(isBlocked || err.name === 'NotFoundError');
      setStage('error');
      return;
    }

    // Câmera OK → mostrar preview enquanto modelos carregam
    streamRef.current = stream;
    pendingStreamRef.current = stream;
    setStage('camera');
    setLoadStep('Carregando modelos de IA…');

    try {
      await faceService.loadModels();
    } catch (err: any) {
      stopCamera();
      setError('Falha ao carregar modelos de IA.');
      setStage('error');
      return;
    }

    // Loop de detecção
    intervalRef.current = setInterval(async () => {
      const vid = videoRef.current;
      const cvs = canvasRef.current;
      if (!vid || !cvs || vid.readyState < 2) return;
      cvs.width = vid.videoWidth || vid.clientWidth;
      cvs.height = vid.videoHeight || vid.clientHeight;
      const det = await faceService.detectSingleFace(vid);
      if (det) {
        const scaleX = cvs.width / (vid.videoWidth || cvs.width);
        const scaleY = cvs.height / (vid.videoHeight || cvs.height);
        faceService.drawFaceBox(cvs, det.box, GREEN, scaleX, scaleY);
        setFaceDetected(true);
      } else {
        faceService.clearCanvas(cvs);
        setFaceDetected(false);
      }
    }, 300);
  };

  const captureFromCamera = async () => {
    const vid = videoRef.current;
    if (!vid || !faceDetected) return;

    setStage('processing');
    setProcessStep('Capturando rosto…');

    try {
      const det = await faceService.detectSingleFaceMultiFrame(vid, 3, 150);
      stopCamera();
      if (!det) {
        setError('Nenhum rosto detectado. Tente com boa iluminação e olhando para a câmera.');
        setStage('error');
        return;
      }
      if (vid) {
        const snap = document.createElement('canvas');
        snap.width = vid.videoWidth || 640;
        snap.height = vid.videoHeight || 480;
        setPreviewSrc(snap.toDataURL('image/jpeg', 0.85));
      }
      await _searchByDescriptor(Array.from(det.descriptor));
    } catch (err: any) {
      stopCamera();
      setError(err.message ?? 'Erro no reconhecimento facial.');
      setStage('error');
    }
  };

  /* ── upload de selfie ── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStage('loading');
    setLoadStep('Carregando modelos de IA…');
    try {
      await faceService.loadModels();
    } catch (err: any) {
      setError(err.message ?? 'Erro ao carregar modelos.');
      setStage('error');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewSrc(dataUrl);
      const img = new Image();
      img.onload = async () => {
        const cvs = document.createElement('canvas');
        cvs.width = img.naturalWidth;
        cvs.height = img.naturalHeight;
        cvs.getContext('2d')?.drawImage(img, 0, 0);
        await processCanvas(cvs);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const reset = () => {
    stopCamera();
    setStage('idle');
    setError('');
    setFaceDetected(false);
    setPreviewSrc(null);
    setMatchCount(0);
    setConfidence(0);
    onMatches([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  /* Fecha o modal SEM limpar os matches — mantém o filtro ativo na grade */
  const closeKeepingMatches = () => {
    stopCamera();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) closeKeepingMatches(); }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: isDark ? '#0F1A0F' : '#FFFFFF', border: `1px solid ${BORDER}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.07)' }}>
              <Scan className="w-4 h-4" style={{ color: GREEN }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: TEXT, fontFamily: "'Montserrat',sans-serif" }}>
                Busca por Rosto
              </p>
              <p className="text-[10px]" style={{ color: MUTED }}>{eventName}</p>
            </div>
          </div>
          <button onClick={closeKeepingMatches}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <AnimatePresence mode="wait">

            {/* IDLE */}
            {stage === 'idle' && (
              <motion.div key="idle"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="space-y-3"
              >
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'rgba(134,239,172,0.07)', border: '1px solid rgba(134,239,172,0.18)' }}
                >
                  <Scan className="w-7 h-7" style={{ color: GREEN }} />
                </motion.div>

                <p className="text-xs text-center" style={{ color: MUTED }}>
                  Tire uma selfie ou envie uma foto para encontrar automaticamente as fotos do cliente neste evento
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                    onClick={startCamera}
                    className="flex flex-col items-center gap-2 py-5 rounded-xl font-bold text-xs"
                    style={{
                      background: isDark ? 'rgba(22,101,52,0.3)' : 'rgba(22,101,52,0.07)',
                      border: `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.2)'}`,
                      color: GREEN,
                      fontFamily: "'Montserrat',sans-serif",
                    }}>
                    <Camera className="w-6 h-6" />
                    Usar Câmera
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                    onClick={() => fileRef.current?.click()}
                    className="flex flex-col items-center gap-2 py-5 rounded-xl font-bold text-xs"
                    style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${BORDER}`, color: TEXT }}>
                    <Upload className="w-6 h-6" style={{ color: MUTED }} />
                    Enviar Selfie
                  </motion.button>
                </div>
                {isCamBlocked && (
                  <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                    style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#d97706' }}>
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    Câmera bloqueada. Use a opção "Enviar Selfie".
                  </div>
                )}
                <p className="text-[10px] text-center flex items-center justify-center gap-1" style={{ color: 'rgba(255,255,255,0.18)' }}>
                  <Lock className="w-2.5 h-2.5" /> Imagem não armazenada — apenas o vetor biométrico é usado
                </p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </motion.div>
            )}

            {/* LOADING */}
            {stage === 'loading' && (
              <motion.div key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-10"
              >
                <div className="relative w-16 h-16">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-2 border-transparent"
                    style={{ borderTopColor: GREEN, borderRightColor: 'rgba(134,239,172,0.2)' }}
                  />
                  <div className="absolute inset-2 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(134,239,172,0.07)' }}>
                    <Scan className="w-6 h-6" style={{ color: GREEN }} />
                  </div>
                </div>
                <p className="text-sm font-bold" style={{ color: TEXT, fontFamily: "'Montserrat',sans-serif" }}>Preparando…</p>
                <p className="text-xs" style={{ color: MUTED }}>{loadStep}</p>
              </motion.div>
            )}

            {/* CAMERA */}
            {stage === 'camera' && (
              <motion.div key="camera"
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="relative rounded-xl overflow-hidden bg-black"
                  style={{ border: `2px solid ${faceDetected ? 'rgba(134,239,172,0.5)' : BORDER}`, transition: 'border-color 0.3s' }}>
                  <motion.div
                    animate={faceDetected
                      ? { boxShadow: ['0 0 0 0 rgba(134,239,172,0)', '0 0 0 8px rgba(134,239,172,0.15)', '0 0 0 0 rgba(134,239,172,0)'] }
                      : { boxShadow: '0 0 0 0 rgba(134,239,172,0)' }
                    }
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    <video ref={videoCallbackRef} autoPlay muted playsInline
                      className="w-full block"
                      style={{ maxHeight: 280, objectFit: 'cover', transform: 'scaleX(-1)' }} />
                    <canvas ref={canvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ transform: 'scaleX(-1)' }} />
                  </motion.div>

                  <AnimatePresence>
                    {faceDetected && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(134,239,172,0.12)', border: '1px solid rgba(134,239,172,0.35)', color: GREEN, backdropFilter: 'blur(10px)', whiteSpace: 'nowrap' }}>
                        <CheckCircle2 className="w-3 h-3" /> Rosto detectado
                      </motion.div>
                    )}
                    {!faceDetected && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px]"
                        style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: MUTED, backdropFilter: 'blur(10px)', whiteSpace: 'nowrap' }}>
                        Posicione o rosto no centro
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={captureFromCamera}
                    disabled={!faceDetected}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-opacity"
                    style={{
                      background: faceDetected
                        ? (isDark ? 'linear-gradient(135deg,rgba(22,101,52,0.95),rgba(21,128,61,0.9))' : 'linear-gradient(135deg,#166534,#15803d)')
                        : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(9,9,11,0.03)'),
                      border: faceDetected ? '1px solid rgba(134,239,172,0.25)' : `1px solid ${BORDER}`,
                      color: faceDetected ? '#fff' : MUTED,
                      fontFamily: "'Montserrat',sans-serif",
                      opacity: faceDetected ? 1 : 0.6,
                    }}>
                    <Camera className="w-4 h-4" />
                    {faceDetected ? 'Capturar e buscar' : 'Aguardando rosto…'}
                  </motion.button>
                  <button onClick={reset}
                    className="px-3 py-3 rounded-xl" style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* PROCESSING — com animação de scanner igual ao online */}
            {stage === 'processing' && (
              <motion.div key="processing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-4"
              >
                {/* Card visual com scanner */}
                <div className="relative w-64 h-64 rounded-2xl overflow-hidden"
                  style={{ background: 'linear-gradient(145deg,rgba(0,20,12,0.95),rgba(0,40,24,0.85))', border: '1px solid rgba(0,255,127,0.12)' }}>

                  {/* background glow */}
                  <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse at 40% 60%, rgba(0,180,90,0.18) 0%, transparent 65%), radial-gradient(ellipse at 65% 35%, rgba(0,200,200,0.10) 0%, transparent 60%)',
                  }} />

                  {/* circular face frame */}
                  <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-52%)', width: 160, height: 160 }}>
                    <motion.div
                      animate={{ boxShadow: ['0 0 0 0 rgba(0,255,127,0)', '0 0 0 10px rgba(0,255,127,0.12)', '0 0 0 0 rgba(0,255,127,0)'] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{ borderRadius: '50%', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
                    />
                    <div className="rounded-full overflow-hidden" style={{ width: '100%', height: '100%', border: '2px solid rgba(0,255,127,0.25)' }}>
                      {previewSrc ? (
                        <img src={previewSrc} alt="selfie" className="w-full h-full object-cover object-top" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: 'rgba(0,255,127,0.05)' }}>
                          <Scan className="w-10 h-10" style={{ color: 'rgba(0,255,127,0.3)' }} />
                        </div>
                      )}
                    </div>
                    <ScanRect />
                  </div>

                  {/* ANALISANDO badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(0,20,12,0.75)', border: '1px solid rgba(0,255,127,0.35)', backdropFilter: 'blur(10px)' }}>
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: ELECTRIC, boxShadow: `0 0 6px ${ELECTRIC}` }}
                    />
                    <span style={{ color: ELECTRIC, fontSize: '0.6rem', fontWeight: 800, fontFamily: "'Montserrat',sans-serif", letterSpacing: '0.08em' }}>
                      ANALISANDO
                    </span>
                  </div>

                  {/* bottom stats */}
                  <div className="absolute bottom-3 inset-x-3 flex items-end justify-between gap-2">
                    <div className="flex-1 px-2.5 py-1.5 rounded-lg"
                      style={{ background: 'rgba(0,10,6,0.75)', border: '1px solid rgba(0,255,127,0.2)', backdropFilter: 'blur(8px)' }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <motion.span
                          animate={{ opacity: [1, 0.4, 1] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                          style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: ELECTRIC }}
                        />
                        <span style={{ color: ELECTRIC, fontSize: '0.55rem', fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>
                          Confiança: <AnimatedCounter from={0} to={98} duration={2} />.<AnimatedCounter from={0} to={7} duration={2.2} />%
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${ELECTRIC}, #00D4FF)`, boxShadow: `0 0 8px ${ELECTRIC}` }}
                          animate={{ width: ['0%', '98.7%'] }}
                          transition={{ duration: 2, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* texto abaixo do card */}
                <div className="text-center">
                  <p className="text-sm font-bold mb-1" style={{ color: TEXT, fontFamily: "'Montserrat',sans-serif" }}>
                    {processStep || 'Buscando fotos…'}
                  </p>
                  <p className="text-[10px]" style={{ color: MUTED }}>
                    {processStep.includes('offline')
                      ? 'Processamento local em andamento'
                      : 'Comparando vetor facial via IA'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* RESULTS */}
            {stage === 'results' && (
              <motion.div key="results"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                {previewSrc && (
                  <div className="flex justify-center">
                    <div className="relative">
                      <img src={previewSrc} alt="Selfie" className="w-16 h-16 rounded-full object-cover"
                        style={{ border: `3px solid ${matchCount > 0 ? '#22c55e' : 'rgba(255,255,255,0.1)'}` }} />
                      {matchCount > 0 && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: '#22c55e', border: '2px solid #0F1A0F' }}>
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex flex-col items-center gap-2 py-4 rounded-xl"
                  style={{ background: matchCount > 0 ? (isDark ? 'rgba(134,239,172,0.06)' : 'rgba(22,101,52,0.05)') : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(9,9,11,0.02)'), border: `1px solid ${BORDER}` }}>
                  {matchCount > 0 ? (
                    <>
                      <CheckCircle2 className="w-8 h-8" style={{ color: '#22c55e' }} />
                      <p className="text-base font-bold" style={{ color: TEXT, fontFamily: "'Montserrat',sans-serif" }}>
                        {matchCount} foto{matchCount !== 1 ? 's' : ''} encontrada{matchCount !== 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                          <motion.div
                            className="h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${confidence}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            style={{ background: '#22c55e' }}
                          />
                        </div>
                        <span className="text-xs font-bold" style={{ color: '#22c55e' }}>{confidence}% conf.</span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: MUTED }}>As fotos foram destacadas na grade</p>
                    </>
                  ) : (
                    <>
                      <Users className="w-8 h-8" style={{ color: MUTED }} />
                      <p className="text-sm font-semibold" style={{ color: TEXT }}>Nenhuma foto encontrada</p>
                      <p className="text-xs" style={{ color: MUTED }}>Tente com outra foto ou busque manualmente</p>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={reset}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: TEXT }}>
                    <RefreshCw className="w-3.5 h-3.5" /> Nova busca
                  </button>
                  {matchCount > 0 && (
                    <button onClick={closeKeepingMatches}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                      style={{ background: isDark ? 'linear-gradient(135deg,rgba(22,101,52,0.95),rgba(21,128,61,0.9))' : 'linear-gradient(135deg,#166534,#15803d)', color: '#fff', border: '1px solid rgba(134,239,172,0.25)' }}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ver fotos
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ERROR */}
            {stage === 'error' && (
              <motion.div key="error"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                {previewSrc && (
                  <div className="flex justify-center">
                    <img src={previewSrc} alt="Selfie" className="w-16 h-16 rounded-full object-cover opacity-60" />
                  </div>
                )}
                <div className="flex items-start gap-3 p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                {(isCamBlocked) && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => { setStage('idle'); setError(''); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(9,9,11,0.03)', border: `1px solid ${BORDER}`, color: TEXT }}>
                    <Upload className="w-4 h-4" /> Enviar selfie em vez disso
                  </motion.button>
                )}
                <button onClick={reset}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: TEXT }}>
                  <RefreshCw className="w-4 h-4" /> Tentar novamente
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}