/**
 * FaceSearchPanel — Reconhecimento facial para filtragem de fotos
 * Fluxo: idle → loading (modelos) → camera OR upload-file → processing → results | error
 * Fallback: quando câmera bloqueada mostra opção de upload de selfie do dispositivo
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, Scan, ShoppingCart, CheckCircle2, AlertCircle,
  Loader2, X, RefreshCw, Zap, Lock, Users, ImageIcon, Upload,
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import * as faceService from '../lib/faceService';
import { useCart } from '../contexts/CartContext';
import { api } from '../lib/api';

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
}

/* ── helpers ────────────────────────────────────────────────────────────── */

const GREEN = '#86efac';
const ELECTRIC = '#00FF7F';
const MUTED = 'rgba(255,255,255,0.4)';
const CARD  = 'rgba(255,255,255,0.03)';
const BORD  = 'rgba(255,255,255,0.07)';

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

/* ── componente ─────────────────────────────────────────────────────────── */

export function FaceSearchPanel({ photos, eventId, eventName }: Props) {
  const { addItem, isInCart, openDrawer } = useCart();

  const [stage,        setStage]        = useState<Stage>('idle');
  const [loadStep,     setLoadStep]     = useState('');
  const [error,        setError]        = useState('');
  const [isCamBlocked, setIsCamBlocked] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [matchedIds,   setMatchedIds]   = useState<string[]>([]);
  const [confidence,   setConfidence]   = useState(0);
  const [previewSrc,   setPreviewSrc]   = useState<string | null>(null);

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

  const processCanvas = async (snap: HTMLCanvasElement) => {
    setStage('processing');
    try {
      const det = await faceService.detectSingleFace(snap);
      if (!det) {
        setError('Nenhum rosto reconhecido. Tente em boa iluminação e olhando diretamente para a câmera.');
        setStage('error');
        return;
      }
      const queryDescriptor = Array.from(det.descriptor);

      const { faces } = await api.getEventFaces(eventId);

      if (faces.length === 0) {
        setMatchedIds([]);
        setConfidence(0);
        setStage('results');
        return;
      }

      // Matching rankeado: min-pool por foto + dois passes (strict → relaxed)
      const ranked = faceService.findRankedMatches(queryDescriptor, faces);
      const matched = ranked.map((m) => m.photoId);

      // Confiança baseada na melhor distância encontrada
      const best = ranked.length > 0 ? ranked[0].minDistance : 1;
      const conf = Math.max(0, Math.min(100, Math.round((1 - best / 0.8) * 100)));

      setMatchedIds(matched);
      setConfidence(conf);
      setStage('results');
    } catch (err: any) {
      setError(err.message ?? 'Erro ao processar reconhecimento facial.');
      setStage('error');
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
  };

  /* ── dados de resultado ───────────────────────────────────────────────── */

  const matchedPhotos = photos.filter((p) => matchedIds.includes(String(p.id)));

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

            <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontSize: '1.8rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }} className="mb-3">
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
                style={{ background: 'linear-gradient(135deg,rgba(22,101,52,0.95),rgba(21,128,61,0.9))', border: '1px solid rgba(134,239,172,0.25)', color: '#fff', fontWeight: 800, fontFamily: "'Montserrat',sans-serif" }}
              >
                <Camera className="w-5 h-5" /> Usar câmera
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={startUpload}
                className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-sm flex-1"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORD}`, color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}
              >
                <Upload className="w-4 h-4" /> Enviar selfie
              </motion.button>
            </div>

            <p className="mt-5 text-xs flex items-center justify-center gap-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
              <Lock className="w-3 h-3" /> Sua imagem não é armazenada — processamento 100% local
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
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '1rem', color: '#fff' }} className="mb-2">
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
              <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: '1.1rem', fontWeight: 900, color: '#fff' }} className="mb-1">
                Buscando suas fotos…
              </p>
              <p className="text-xs" style={{ color: MUTED }}>
                Comparando seu rosto com {photos.length} fotos do evento
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
                      style={{ background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.2)', color: GREEN, fontWeight: 700 }}>
                      <Zap className="w-3.5 h-3.5" />
                      {matchedPhotos.length} {matchedPhotos.length === 1 ? 'foto encontrada' : 'fotos encontradas'}
                    </div>
                    {confidence > 0 && (
                      <p className="text-xs" style={{ color: MUTED }}>
                        {confidence}% de confiança · reconhecimento facial IA
                      </p>
                    )}
                  </>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORD}`, color: MUTED, fontWeight: 600 }}>
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
                    style={{ background: 'linear-gradient(135deg,rgba(22,101,52,0.9),rgba(21,128,61,0.85))', border: '1px solid rgba(134,239,172,0.2)', color: '#fff', fontWeight: 700 }}
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

            {matchedPhotos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {matchedPhotos.map((photo, i) => {
                  const inCart = isInCart(photo.id, eventId);
                  return (
                    <motion.div
                      key={String(photo.id)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                      className="relative group overflow-hidden"
                      style={{ borderRadius: 14, aspectRatio: '3/2', border: inCart ? '1px solid rgba(134,239,172,0.35)' : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                    >
                      <img src={photo.src} alt={photo.tag} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" style={{ filter: 'brightness(0.85)' }} />

                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px]"
                        style={{ background: 'rgba(134,239,172,0.1)', border: '1px solid rgba(134,239,172,0.25)', color: GREEN, fontWeight: 800, backdropFilter: 'blur(6px)' }}>
                        IA MATCH
                      </div>

                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />

                      <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                        <span style={{ color: GREEN, fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '1rem' }}>
                          R$ {photo.price}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
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
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="text-center py-14 px-6 rounded-2xl"
                style={{ background: CARD, border: `1px solid ${BORD}` }}
              >
                <Users className="w-10 h-10 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
                <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, color: '#fff', fontSize: '1rem' }} className="mb-2">
                  Nenhuma foto encontrada
                </p>
                <p className="text-sm" style={{ color: MUTED, lineHeight: 1.7 }}>
                  Pode ser que você não apareça nas fotos disponíveis, ou que as fotos ainda não tenham sido processadas pelo administrador.
                </p>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  onClick={reset}
                  className="mt-6 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm mx-auto"
                  style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORD}`, color: '#fff', fontWeight: 700 }}
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
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, color: '#fff', fontSize: '1.1rem' }} className="mb-3">
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
                  style={{ background: 'linear-gradient(135deg,rgba(22,101,52,0.95),rgba(21,128,61,0.9))', border: '1px solid rgba(134,239,172,0.25)', color: '#fff', fontWeight: 800, fontFamily: "'Montserrat',sans-serif" }}
                >
                  <Upload className="w-5 h-5" /> Enviar selfie do dispositivo
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                onClick={reset}
                className="flex items-center justify-center gap-2 px-7 py-3 rounded-2xl text-sm w-full"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORD}`, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}
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