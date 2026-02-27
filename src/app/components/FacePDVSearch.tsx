/**
 * FacePDVSearch — Reconhecimento facial adaptado para o PDV.
 * Em vez de adicionar ao carrinho do e-commerce, chama onMatches(photoIds).
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Upload, X, Loader2, Scan, AlertCircle, CheckCircle2, RefreshCw, Zap, Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as faceService from '../lib/faceService';
import { api } from '../lib/api';

type Stage = 'idle' | 'loading' | 'camera' | 'upload-preview' | 'processing' | 'results' | 'error';

interface Props {
  eventId: string;
  eventName: string;
  isDark: boolean;
  onMatches: (photoIds: string[]) => void;
  onClose: () => void;
}

export function FacePDVSearch({ eventId, eventName, isDark, onMatches, onClose }: Props) {
  const [stage,        setStage]        = useState<Stage>('idle');
  const [loadStep,     setLoadStep]     = useState('');
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

  const GREEN  = isDark ? '#86efac' : '#006B2B';
  const MUTED  = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,40,20,0.42)';
  const CARD   = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)';
  const BORDER = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,107,43,0.12)';
  const TEXT   = isDark ? '#fff' : '#0D2818';

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

  /* ── processar canvas (câmera ou upload) ── */
  const processCanvas = async (snap: HTMLCanvasElement) => {
    setStage('processing');
    try {
      const det = await faceService.detectSingleFace(snap);
      if (!det) {
        setError('Nenhum rosto detectado. Tente com boa iluminação e olhando para a câmera.');
        setStage('error');
        return;
      }
      const queryDesc = Array.from(det.descriptor);
      const { faces } = await api.getEventFaces(eventId);

      if (faces.length === 0) {
        setMatchCount(0);
        setConfidence(0);
        setStage('results');
        onMatches([]);
        return;
      }

      const matched = faceService.findMatches(queryDesc, faces);
      const distances: number[] = [];
      for (const { descriptors } of faces) {
        for (const d of descriptors) distances.push(faceService.euclideanDistance(queryDesc, d));
      }
      const best = Math.min(...distances);
      const conf = Math.max(0, Math.min(100, Math.round((1 - best / 0.8) * 100)));

      setMatchCount(matched.length);
      setConfidence(conf);
      setStage('results');
      onMatches(matched.map(String));
    } catch (err: any) {
      setError(err.message ?? 'Erro no reconhecimento facial.');
      setStage('error');
    }
  };

  /* ── iniciar câmera + detecção contínua ── */
  const startCamera = async () => {
    setStage('loading');
    setLoadStep('Carregando modelos…');
    setIsCamBlocked(false);
    try {
      await faceService.loadModels(setLoadStep);
      setLoadStep('Acessando câmera…');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });
      } catch {
        setIsCamBlocked(true);
        setStage('idle');
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      } else {
        pendingStreamRef.current = stream;
      }
      setStage('camera');
      await new Promise(r => setTimeout(r, 600));
      intervalRef.current = setInterval(async () => {
        const vid = videoRef.current;
        const cvs = canvasRef.current;
        if (!vid || !cvs || vid.readyState < 2) return;
        cvs.width = vid.videoWidth;
        cvs.height = vid.videoHeight;
        cvs.getContext('2d')?.drawImage(vid, 0, 0);
        const det = await faceService.detectSingleFace(cvs);
        setFaceDetected(!!det);
        if (det) faceService.drawFaceBox(cvs, det.box, '#86efac');
      }, 300);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao iniciar câmera.');
      setStage('error');
    }
  };

  const captureFromCamera = async () => {
    const vid = videoRef.current;
    const cvs = canvasRef.current;
    if (!vid || !cvs) return;
    stopCamera();
    cvs.width = vid.videoWidth;
    cvs.height = vid.videoHeight;
    cvs.getContext('2d')?.drawImage(vid, 0, 0);
    setPreviewSrc(cvs.toDataURL('image/jpeg', 0.85));
    await processCanvas(cvs);
  };

  /* ── upload de selfie ── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStage('loading');
    setLoadStep('Carregando modelos…');
    try {
      await faceService.loadModels(setLoadStep);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao carregar modelos.');
      setStage('error');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewSrc(url);
    const img = new Image();
    img.onload = async () => {
      const cvs = document.createElement('canvas');
      cvs.width = img.width;
      cvs.height = img.height;
      cvs.getContext('2d')?.drawImage(img, 0, 0);
      setStage('upload-preview');
      await processCanvas(cvs);
      URL.revokeObjectURL(url);
    };
    img.src = url;
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) { reset(); onClose(); } }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16 }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: isDark ? '#0F1A0F' : '#fff', border: `1px solid ${BORDER}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(0,107,43,0.08)' }}>
              <Scan className="w-4 h-4" style={{ color: GREEN }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: TEXT, fontFamily: "'Montserrat',sans-serif" }}>
                Busca por Rosto
              </p>
              <p className="text-[10px]" style={{ color: MUTED }}>{eventName}</p>
            </div>
          </div>
          <button onClick={() => { reset(); onClose(); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">

          {/* IDLE */}
          {stage === 'idle' && (
            <div className="space-y-3">
              <p className="text-xs text-center" style={{ color: MUTED }}>
                Tire uma selfie ou envie uma foto para encontrar automaticamente as fotos do cliente neste evento
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={startCamera}
                  className="flex flex-col items-center gap-2 py-5 rounded-xl font-bold text-xs"
                  style={{ background: isDark ? 'rgba(134,239,172,0.06)' : 'rgba(0,107,43,0.06)', border: `1px solid ${BORDER}`, color: GREEN }}>
                  <Camera className="w-6 h-6" />
                  Usar Câmera
                </button>
                <button onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-2 py-5 rounded-xl font-bold text-xs"
                  style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${BORDER}`, color: TEXT }}>
                  <Upload className="w-6 h-6" style={{ color: MUTED }} />
                  Enviar Selfie
                </button>
              </div>
              {isCamBlocked && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#d97706' }}>
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Câmera bloqueada. Use a opção "Enviar Selfie".
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>
          )}

          {/* LOADING */}
          {stage === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: GREEN }} />
              <p className="text-sm font-semibold" style={{ color: TEXT }}>{loadStep}</p>
            </div>
          )}

          {/* CAMERA */}
          {stage === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black"
                style={{ border: `2px solid ${faceDetected ? '#22c55e' : BORDER}` }}>
                <video ref={videoCallbackRef} autoPlay muted playsInline className="w-full block" style={{ maxHeight: 280, objectFit: 'cover' }} />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                {faceDetected && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                    style={{ background: 'rgba(34,197,94,0.9)', color: '#fff' }}>
                    <Zap className="w-3 h-3" /> Rosto detectado
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={captureFromCamera}
                  disabled={!faceDetected}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                  style={{
                    background: faceDetected ? (isDark ? 'rgba(22,101,52,0.85)' : 'linear-gradient(135deg,#006B2B,#00843D)') : 'rgba(255,255,255,0.05)',
                    color: faceDetected ? '#fff' : MUTED,
                    border: faceDetected ? 'none' : `1px solid ${BORDER}`,
                  }}>
                  <Camera className="w-4 h-4" />
                  {faceDetected ? 'Capturar' : 'Aguardando rosto…'}
                </motion.button>
                <button onClick={reset}
                  className="px-3 py-3 rounded-xl" style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PROCESSING */}
          {(stage === 'processing' || stage === 'upload-preview') && (
            <div className="flex flex-col items-center gap-4 py-8">
              {previewSrc && (
                <img src={previewSrc} alt="Selfie" className="w-24 h-24 rounded-full object-cover"
                  style={{ border: `3px solid ${GREEN}` }} />
              )}
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: GREEN }} />
              <p className="text-sm font-semibold" style={{ color: TEXT }}>Buscando correspondências…</p>
            </div>
          )}

          {/* RESULTS */}
          {stage === 'results' && (
            <div className="space-y-4">
              {previewSrc && (
                <div className="flex justify-center">
                  <img src={previewSrc} alt="Selfie" className="w-16 h-16 rounded-full object-cover"
                    style={{ border: `3px solid ${GREEN}` }} />
                </div>
              )}
              <div className={`flex flex-col items-center gap-2 py-4 rounded-xl`}
                style={{ background: matchCount > 0 ? (isDark ? 'rgba(134,239,172,0.06)' : 'rgba(0,107,43,0.05)') : 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}` }}>
                {matchCount > 0 ? (
                  <>
                    <CheckCircle2 className="w-8 h-8" style={{ color: '#22c55e' }} />
                    <p className="text-base font-bold" style={{ color: TEXT, fontFamily: "'Montserrat',sans-serif" }}>
                      {matchCount} foto{matchCount !== 1 ? 's' : ''} encontrada{matchCount !== 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${confidence}%`, background: '#22c55e' }} />
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
                  <button onClick={() => { reset(); onClose(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: isDark ? 'rgba(22,101,52,0.85)' : 'linear-gradient(135deg,#006B2B,#00843D)', color: '#fff' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ver fotos
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ERROR */}
          {stage === 'error' && (
            <div className="space-y-4">
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
              <button onClick={reset}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: TEXT }}>
                <RefreshCw className="w-4 h-4" /> Tentar novamente
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
