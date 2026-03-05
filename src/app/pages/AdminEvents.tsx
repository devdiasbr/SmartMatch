import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  CalendarDays,
  Camera,
  Upload,
  Clock,
  Search,
  BarChart3,
  X,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Loader2,
  AlertCircle,
  ImageIcon,
  Copy,
  DollarSign,
  Store,
  ClipboardList,
  Settings,
  RefreshCw,
  HardDriveDownload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { TabNav } from '../components/TabNav';
import { useAuth } from '../contexts/AuthContext';
import { api, type EventRecord, type PhotoRecord, type AdminConfig } from '../lib/api';
import { useBranding } from '../contexts/BrandingContext';
import * as faceService from '../lib/faceService'; // import estático → pré-carrega modelos em background
import { enqueue as faceQueueEnqueue } from '../lib/faceQueue';

/* ─── helpers ─── */

/**
 * Comprime a imagem para um Blob JPEG binário — sem base64.
 *
 * Fast path: OffscreenCanvas + createImageBitmap
 *   • Não bloqueia o main thread (sem FileReader, sem Image element)
 *   • convertToBlob() retorna Blob binário diretamente — zero encoding overhead
 *   • bitmap.close() libera memória GPU imediatamente
 *
 * Fallback: HTMLCanvasElement.toBlob() (Safari antigo / ambientes sem OffscreenCanvas)
 *
 * Ambos os caminhos usam qualidade progressiva até atingir ~440 KB.
 */
async function compressToBlob(
  file: File,
  maxDim = 1600,
  targetKB = 440,
): Promise<{ blob: Blob; fileName: string }> {
  const mimeType = 'image/jpeg';
  const fileName = (file.name || 'photo.jpg').replace(/\.[^.]+$/, '.jpg');
  const targetBytes = targetKB * 1024;

  // ── Fast path: OffscreenCanvas (non-blocking) ─────────────────────────────
  if (typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;
      if (width > maxDim || height > maxDim) {
        const r = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const oc = new OffscreenCanvas(width, height);
      (oc.getContext('2d') as OffscreenCanvasRenderingContext2D).drawImage(bitmap, 0, 0, width, height);
      bitmap.close(); // libera referência GPU imediatamente
      let quality = 0.75;
      let blob = await oc.convertToBlob({ type: mimeType, quality });
      while (blob.size > targetBytes && quality > 0.2) {
        quality = parseFloat((quality - 0.1).toFixed(1));
        blob = await oc.convertToBlob({ type: mimeType, quality });
      }
      return { blob, fileName };
    } catch {
      // OffscreenCanvas pode falhar em alguns contextos — cai no fallback
    }
  }

  // ── Fallback: Canvas regular + toBlob ────────────────────────────────────
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const r = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        let quality = 0.75;
        const tryBlob = () => {
          canvas.toBlob((b) => {
            if (!b) { reject(new Error(`Falha ao converter ${file.name}`)); return; }
            if (b.size > targetBytes && quality > 0.2) {
              quality = parseFloat((quality - 0.1).toFixed(1)); tryBlob();
            } else resolve({ blob: b, fileName });
          }, mimeType, quality);
        };
        tryBlob();
      };
      img.onerror = () => reject(new Error(`Falha ao decodificar ${file.name}`));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
  });
}

/** Parse slug DDMMYYYYHHMM into readable "DD/MM/YYYY · HH:MM" */
function formatSlug(slug: string): string {
  if (/^\d{12}$/.test(slug)) {
    return `${slug.slice(0, 2)}/${slug.slice(2, 4)}/${slug.slice(4, 8)} · ${slug.slice(8, 10)}:${slug.slice(10, 12)}`;
  }
  return slug;
}

/** Compute slug DDMMYYYYHHMM from date (YYYY-MM-DD) + time (HH:MM) */
function computeSlug(date: string, time: string): string {
  if (!date || !time) return '';
  const [y, m, d] = date.split('-');
  const [h, min] = time.split(':');
  return `${d}${m}${y}${h}${min}`;
}

// faceService importado acima apenas para disparar pré-carregamento dos modelos em background.
// O processamento real é feito pela fila global em faceQueue.ts.
void faceService.loadModels; // evita "unused import" sem chamar loadModels aqui

/* ─── ConfirmModal ─────────────────────────────────────────────────────────── */
interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  detail?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDark: boolean;
  loading?: boolean;
}
function ConfirmModal({ open, title, description, detail, confirmLabel = 'Excluir', onConfirm, onCancel, isDark, loading }: ConfirmModalProps) {
  const cardBg     = isDark ? 'rgba(15,10,20,0.98)' : '#fff';
  const textColor  = isDark ? '#fff' : '#09090B';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(9,9,11,0.5)';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="confirm-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !loading && onCancel()}
            className="fixed inset-0 z-[200]"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          />
          {/* Modal */}
          <motion.div
            key="confirm-modal"
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed z-[201] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[360px] px-4"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: cardBg, border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>

              {/* Red top accent */}
              <div className="h-[3px]" style={{ background: 'linear-gradient(90deg,#b91c1c,#ef4444,#f87171)' }} />

              <div className="p-6">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 400 }}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(220,38,38,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Trash2 className="w-6 h-6" style={{ color: isDark ? '#fca5a5' : '#dc2626' }} />
                </motion.div>

                {/* Title */}
                <h2 className="mb-2" style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 900, fontSize: '1.15rem', color: textColor, letterSpacing: '-0.01em' }}>
                  {title}
                </h2>

                {/* Description */}
                <p className="text-sm leading-relaxed mb-4" style={{ color: mutedColor }}>
                  {description}
                </p>

                {/* Detail pill */}
                {detail && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-5"
                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'}` }}>
                    <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" style={{ color: mutedColor }} />
                    <span className="text-xs font-mono font-semibold" style={{ color: textColor }}>{detail}</span>
                  </div>
                )}

                {/* Warning */}
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl mb-6"
                  style={{ background: isDark ? 'rgba(239,68,68,0.07)' : 'rgba(220,38,38,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: isDark ? '#fca5a5' : '#dc2626' }} />
                  <p className="text-xs leading-relaxed" style={{ color: isDark ? 'rgba(252,165,165,0.85)' : '#b91c1c' }}>
                    Esta ação é <strong>permanente e irreversível</strong>. Não é possível recuperar os dados após a exclusão.
                  </p>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={onCancel} disabled={loading}
                    className="py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                      color: mutedColor,
                    }}
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={!loading ? { scale: 1.02 } : {}} whileTap={!loading ? { scale: 0.97 } : {}}
                    onClick={onConfirm} disabled={loading}
                    className="py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    style={{
                      background: isDark ? 'rgba(220,38,38,0.85)' : '#dc2626',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#fff',
                      opacity: loading ? 0.7 : 1,
                      boxShadow: loading ? 'none' : '0 4px 16px rgba(220,38,38,0.3)',
                    }}
                  >
                    {loading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo…</>
                      : <><Trash2 className="w-4 h-4" /> {confirmLabel}</>}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── SuccessToast ─────────────────────────────────────────────────────────── */
function SuccessToast({ msg, onClose, isDark }: { msg: string | null; onClose: () => void; isDark: boolean }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, x: 20, y: 8 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: 20 }}
          className="fixed bottom-6 right-6 z-[300] flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl max-w-xs"
          style={{
            background: isDark ? 'rgba(4,20,10,0.97)' : '#fff',
            border: `1px solid ${isDark ? 'rgba(134,239,172,0.22)' : 'rgba(22,101,52,0.18)'}`,
            backdropFilter: 'blur(14px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isDark ? 'rgba(134,239,172,0.12)' : 'rgba(22,101,52,0.08)' }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: isDark ? '#86efac' : '#166534' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold mb-0.5" style={{ color: isDark ? '#86efac' : '#166534' }}>Excluído com sucesso</p>
            <p className="text-xs leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(9,9,11,0.55)' }}>{msg}</p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 rounded-lg p-0.5 hover:opacity-60 transition-opacity">
            <X className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── ErrorToast ──────────────────────────────────────────────────────────── */
function ErrorToast({ msg, onClose, isDark }: { msg: string | null; onClose: () => void; isDark: boolean }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, x: 20, y: 8 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: 20 }}
          className="fixed bottom-24 right-6 z-[300] flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl max-w-xs"
          style={{
            background: isDark ? 'rgba(20,6,6,0.97)' : '#fff',
            border: `1px solid ${isDark ? 'rgba(252,165,165,0.22)' : 'rgba(220,38,38,0.18)'}`,
            backdropFilter: 'blur(14px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isDark ? 'rgba(252,165,165,0.1)' : 'rgba(220,38,38,0.07)' }}>
            <AlertCircle className="w-4 h-4" style={{ color: isDark ? '#fca5a5' : '#dc2626' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold mb-0.5" style={{ color: isDark ? '#fca5a5' : '#dc2626' }}>Erro ao excluir</p>
            <p className="text-xs leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(9,9,11,0.55)' }}>{msg}</p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 rounded-lg p-0.5 hover:opacity-60 transition-opacity">
            <X className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AdminEvents() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, getToken } = useAuth();
  const { branding, refreshBranding } = useBranding();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerFileInputRef = useRef<HTMLInputElement>(null);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [eventPhotos, setEventPhotos] = useState<PhotoRecord[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  // Upload form
  const [uploadDate, setUploadDate] = useState('');
  const [uploadTime, setUploadTime] = useState('');
  const [uploadSessionType, setUploadSessionType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'compressing' | 'uploading' | ''>('');
  const [dragOver, setDragOver] = useState(false);

  // Sync storage
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [syncError, setSyncError] = useState('');
  const [skipCompleteSync, setSkipCompleteSync] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination — tours list
  const EVENTS_PER_PAGE = 8;
  const [eventsPage, setEventsPage] = useState(1);

  // Pagination — photos grid
  const PHOTOS_PER_PAGE = 24;  // Aumentado de 12 para 24 para ver mais fotos por página
  const [photosPage, setPhotosPage] = useState(1);

  // Photo price (dynamic)
  const [photoPrice, setPhotoPrice] = useState<number | null>(null);

  // Copy slug
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // ── Confirm modal + error toast ──
  const [confirmState, setConfirmState] = useState<{
    open: boolean; title: string; description: string; detail?: string;
    confirmLabel: string; successMsg?: string; action: (() => Promise<void>) | null; loading: boolean;
  }>({ open: false, title: '', description: '', confirmLabel: 'Excluir', action: null, loading: false });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Viewer — session type inline edit
  const [viewerSessionTypeInput, setViewerSessionTypeInput] = useState('');
  
  // Viewer — date/time inline edit
  const [viewerDateInput, setViewerDateInput] = useState('');
  const [viewerTimeInput, setViewerTimeInput] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  /** Persists a new session type to branding if it doesn't exist yet. */
  const registerSessionTypeIfNew = async (sessionType: string, token: string) => {
    if (!sessionType) return;
    const existing = branding.eventSessionTypes ?? [];
    if (existing.includes(sessionType)) return;
    try {
      await api.updateAdminBranding({ eventSessionTypes: [...existing, sessionType] }, token);
      await refreshBranding();
    } catch (err) {
      console.warn('Não foi possível salvar o novo tipo de sessão no branding:', err);
    }
  };

  const openConfirm = (opts: { title: string; description: string; detail?: string; confirmLabel?: string; successMsg?: string; action: () => Promise<void> }) => {
    setConfirmState({ open: true, loading: false, confirmLabel: opts.confirmLabel ?? 'Excluir', action: opts.action, title: opts.title, description: opts.description, detail: opts.detail, successMsg: opts.successMsg });
  };
  const closeConfirm = () => setConfirmState(prev => ({ ...prev, open: false, loading: false }));
  const runConfirm = async () => {
    if (!confirmState.action) return;
    setConfirmState(prev => ({ ...prev, loading: true }));
    try {
      await confirmState.action!();
      const msg = (confirmState as any).successMsg;
      closeConfirm();
      showSuccess(msg ?? 'Item removido com sucesso.');
    }
    catch (err: any) { closeConfirm(); setErrorMsg(err.message ?? 'Erro desconhecido'); setTimeout(() => setErrorMsg(null), 5000); }
  };

  const bg = isDark ? '#09090F' : '#F8F9FA';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(9,9,11,0.09)';
  const mutedText = isDark ? 'rgba(255,255,255,0.4)' : '#71717A';
  const textColor = isDark ? '#fff' : '#09090B';
  const green = isDark ? '#86efac' : '#166534';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(9,9,11,0.04)';

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAdmin, authLoading, navigate]);

  // Load events
  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const t = await getToken(); if (!t) return;
      const res = await api.getAdminEvents(t);
      setEvents(res.events.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (err: any) {
      setEventsError(err.message);
    } finally {
      setEventsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadEvents();
    // Also fetch config for photo price
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const cfg = await api.getAdminConfig(token);
          setPhotoPrice(cfg.photoPrice);
        }
      } catch { /* ignore — will show fallback */ }
    })();
  }, [loadEvents]);

  // Load photos when event selected
  useEffect(() => {
    if (!selectedEvent) { setEventPhotos([]); return; }
    setPhotosLoading(true);
    setPhotosPage(1); // reset photo page when switching events
    setViewerSessionTypeInput(selectedEvent.sessionType ?? '');
    
    // Initialize date/time fields
    if (selectedEvent.slug && /^\d{12}$/.test(selectedEvent.slug)) {
      const y = selectedEvent.slug.slice(0, 4);
      const m = selectedEvent.slug.slice(4, 6);
      const d = selectedEvent.slug.slice(6, 8);
      const h = selectedEvent.slug.slice(8, 10);
      const min = selectedEvent.slug.slice(10, 12);
      setViewerDateInput(`${y}-${m}-${d}`);
      setViewerTimeInput(`${h}:${min}`);
    } else {
      setViewerDateInput('');
      setViewerTimeInput('');
    }
    
    api.getEventPhotos(selectedEvent.id, 1, 500)
      .then((res) => {
        console.log(`[AdminEvents] Fotos carregadas para evento ${selectedEvent.id}:`, res.photos.length);
        setEventPhotos(res.photos);
      })
      .catch((err) => console.log('Erro ao buscar fotos:', err))
      .finally(() => setPhotosLoading(false));
  }, [selectedEvent]);

  const handleCopySlug = (slug: string) => {
    const url = `${window.location.origin}/eventos/${slug}`;
    try {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch { /* ignore */ }
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleDeleteEvent = (id: string) => {
    const event = events.find(e => e.id === id);
    const typeLabel = event?.sessionType || 'evento';
    openConfirm({
      title: `Excluir este ${typeLabel.toLowerCase()}?`,
      description: `Todas as fotos e dados deste ${typeLabel.toLowerCase()} serão permanentemente removidos.`,
      detail: event?.name ?? id,
      confirmLabel: `Sim, excluir ${typeLabel.toLowerCase()}`,
      successMsg: `${typeLabel} "${event?.name ?? id}" excluído com sucesso.`,
      action: async () => {
        const token = await getToken();
        if (!token) { navigate('/admin/login'); return; }
        await api.deleteEvent(id, token);
        setEvents(prev => prev.filter(e => e.id !== id));
        if (selectedEvent?.id === id) setSelectedEvent(null);
      },
    });
  };

  const handleDeletePhoto = (photoId: string) => {
    if (!selectedEvent) return;
    openConfirm({
      title: 'Excluir esta foto?',
      description: 'Esta foto será permanentemente removida do tour e do acervo.',
      confirmLabel: 'Sim, excluir foto',
      successMsg: 'Foto removida do acervo com sucesso.',
      action: async () => {
        const token = await getToken();
        if (!token) { navigate('/admin/login'); return; }
        await api.deletePhoto(selectedEvent.id, photoId, token);
        setEventPhotos(prev => prev.filter(p => p.id !== photoId));
        setEvents(prev => prev.map(e =>
          e.id === selectedEvent.id ? { ...e, photoCount: Math.max(0, e.photoCount - 1) } : e
        ));
      },
    });
  };

  const [creatingEvent, setCreatingEvent] = useState(false);

  // Sync from storage (state declared above)
  const [syncResult, setSyncResult] = useState<{ eventsCreated: number; photosImported: number; eventsSkipped: number; photosSkipped: number; errors: string[] } | null>(null);

  const handleSyncStorage = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncProgress('Iniciando sincronização...');
    setSyncError('');
    try {
      const token = await getToken();
      if (!token) { navigate('/admin/login'); return; }
      setSyncProgress('Varrendo pastas do S3...');
      const res = await api.syncStorage(token, skipCompleteSync);
      setSyncResult(res.stats);
      setSyncProgress(`Concluído: ${res.stats.eventsCreated} evento(s), ${res.stats.photosImported} foto(s)`);
      if (res.stats.eventsCreated > 0 || res.stats.photosImported > 0) {
        // Reload events list
        await loadEvents();
        showSuccess(`Sincronizado: ${res.stats.eventsCreated} evento(s) novo(s), ${res.stats.photosImported} foto(s) importada(s)`);
      }
    } catch (err: any) {
      setSyncError(`Erro ao sincronizar: ${err.message}`);
      setErrorMsg(`Erro ao sincronizar: ${err.message}`);
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setSyncing(false);
      setTimeout(() => {
        setSyncProgress('');
        setSyncError('');
      }, 3000);
    }
  };

  /** Cria o evento vazio (sem fotos) e abre o viewer. */
  const handleCreateEventOnly = async () => {
    if (!uploadDate || !uploadTime) {
      setUploadError('Selecione a data e horário do tour.');
      return;
    }
    setCreatingEvent(true);
    setUploadError('');
    try {
      const token = await getToken();
      if (!token) { navigate('/admin/login'); return; }
      const dateISO = `${uploadDate}T${uploadTime}:00`;
      const resolvedSessionType = uploadSessionType || 'Tour';
      const eventRes = await api.createEvent({ date: dateISO, sessionType: resolvedSessionType }, token);
      const event = eventRes.event;
      await registerSessionTypeIfNew(resolvedSessionType, token);
      setEvents((prev) => {
        const exists = prev.find((e) => e.id === event.id);
        return exists
          ? prev.map((e) => (e.id === event.id ? event : e))
          : [event, ...prev];
      });
      setSelectedEvent(event);
    } catch (err: any) {
      setUploadError(err.message ?? 'Erro ao criar evento.');
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleFileUpload = async (files: FileList | null, targetEvent?: EventRecord) => {
    if (!files || files.length === 0) return;

    // Se não há evento-alvo direto, valida data+hora para criar/encontrar um
    if (!targetEvent && (!uploadDate || !uploadTime)) {
      setUploadError('Selecione a data e horário do tour antes de enviar as fotos.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess(0);

    try {
      const token = await getToken();
      if (!token) { navigate('/admin/login'); return; }

      let event: EventRecord;

      if (targetEvent) {
        // Upload direto para o evento já selecionado — sem criar novo
        console.log(`[Upload] Usando evento existente: ${targetEvent.id} (${targetEvent.name})`);
        event = targetEvent;
      } else {
        // Step 1 — Find or create the event by date+time slug
        const dateISO = `${uploadDate}T${uploadTime}:00`;
        const resolvedSessionType = uploadSessionType || 'Tour';
        console.log(`[Upload] Criando/buscando evento: ${dateISO}, tipo=${resolvedSessionType}`);
        const eventRes = await api.createEvent({ date: dateISO, sessionType: resolvedSessionType }, token);
        event = eventRes.event;
        console.log(`[Upload] Evento obtido: ${event.id} (${event.name})`);

        // Auto-register new session type in branding
        await registerSessionTypeIfNew(resolvedSessionType, token);

        // Sync local events list
        setEvents((prev) => {
          const exists = prev.find((e) => e.id === event.id);
          return exists
            ? prev.map((e) => (e.id === event.id ? event : e))
            : [event, ...prev];
        });
        setSelectedEvent(event);
      }

      // Step 2 — Compress all files concurrently (CPU, não-bloqueante com OffscreenCanvas),
      // depois envia em lotes paralelos de 3 via multipart binário (sem base64).
      let count = 0;
      const uploadedPhotos: { id: string; url: string }[] = [];
      const fileArr = Array.from(files);
      console.log(`[Upload] Iniciando compressão de ${fileArr.length} fotos...`);

      // Set total and phase
      setUploadTotal(fileArr.length);
      setUploadPhase('compressing');

      // Compressão paralela — OffscreenCanvas não bloqueia o main thread
      const compressed = await Promise.all(
        fileArr.map(async (file) => {
          try {
            return await compressToBlob(file);
          } catch (err: any) {
            console.error('[Upload] Erro ao comprimir foto:', err.message);
            return null;
          }
        })
      );
      const validFiles = compressed.filter(Boolean) as { blob: Blob; fileName: string }[];
      console.log(`[Upload] Compressão completa: ${validFiles.length}/${fileArr.length} fotos válidas`);

      // Switch to uploading phase
      setUploadPhase('uploading');
      setUploadTotal(validFiles.length);

      // Upload em lotes paralelos de 3 via FormData binário (sem base64, sem atob)
      const BATCH_SIZE = 3;
      for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
        const batch = validFiles.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (item) => {
            try {
              // Try stream upload first (37% less payload)
              console.log(`[Upload] Tentando stream para ${item.fileName} no evento ${event.id}`);
              return await api.uploadPhotoStream(event.id, item.blob, item.fileName, 'Geral', token);
            } catch (streamErr: any) {
              // Fallback to base64 upload if stream fails
              console.warn(`[Upload] Stream falhou para ${item.fileName}, tentando base64:`, streamErr.message);
              const reader = new FileReader();
              const base64 = await new Promise<string>((resolve, reject) => {
                reader.onload = () => {
                  const result = reader.result as string;
                  resolve(result.split(',')[1] || result);
                };
                reader.onerror = () => reject(new Error('FileReader failed'));
                reader.readAsDataURL(item.blob);
              });
              console.log(`[Upload] Tentando base64 para ${item.fileName}`);
              return await api.uploadPhoto(event.id, { base64, fileName: item.fileName, mimeType: 'image/jpeg', tag: 'Geral' }, token);
            }
          })
        );
        const failedErrors: string[] = [];
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const res = result.value;
            console.log(`[Upload] ✓ Sucesso: ${res.photo.fileName} (${res.photo.id})`);
            setEventPhotos((prev) => [...prev, res.photo]);
            setEvents((prev) => prev.map((e) =>
              e.id === event.id ? { ...e, photoCount: e.photoCount + 1 } : e
            ));
            count++;
            setUploadSuccess(count);
            if (res.photo.url) {
              uploadedPhotos.push({ id: res.photo.id, url: res.photo.url });
            }
          } else {
            const errMsg = result.reason?.message ?? String(result.reason);
            console.error('[Upload] ✗ Erro:', errMsg, result.reason);
            failedErrors.push(errMsg);
          }
        }
        // Show partial errors immediately
        if (failedErrors.length > 0 && count > 0) {
          setUploadError(`${failedErrors.length} foto(s) falharam: ${failedErrors[0]}`);
        }
      }

      if (count === 0) {
        console.error(`[Upload] NENHUMA foto enviada. validFiles=${validFiles.length}, fileArr=${fileArr.length}`);
        setUploadError(`Nenhuma foto foi enviada (${validFiles.length} arquivo(s) comprimidos, todos falharam no upload). Verifique os logs do console (F12) para detalhes.`);
      } else if (uploadedPhotos.length > 0) {
        // Enfileira na fila global — processa em background sem bloquear a UI
        // O toast de progresso é exibido globalmente via FaceQueueToast no Root
        faceQueueEnqueue(uploadedPhotos.map(({ id, url }) => ({
          photoId: id,
          eventId: event.id,
          photoUrl: url,
          token,
        })));
      }
    } catch (err: any) {
      setUploadError(err.message ?? 'Erro ao processar upload.');
    } finally {
      setUploading(false);
      setUploadPhase('');
      setUploadTotal(0);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.replace(/\D/g, ''); // strip non-digits for slug search
    const slugMatch = q && e.slug?.includes(q);
    const nameMatch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const slugFull = e.slug?.includes(searchQuery);
    return slugMatch || nameMatch || slugFull;
  });

  // Reset events page when search changes
  useEffect(() => { setEventsPage(1); }, [searchQuery]);

  const eventsTotalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE));
  const pagedEvents = filteredEvents.slice((eventsPage - 1) * EVENTS_PER_PAGE, eventsPage * EVENTS_PER_PAGE);

  const photosTotalPages = Math.max(1, Math.ceil(eventPhotos.length / PHOTOS_PER_PAGE));
  const pagedPhotos = eventPhotos.slice((photosPage - 1) * PHOTOS_PER_PAGE, photosPage * PHOTOS_PER_PAGE);

  // Clamp photosPage when photos are deleted or added
  useEffect(() => {
    setPhotosPage((prev) => Math.min(prev, Math.max(1, Math.ceil(eventPhotos.length / PHOTOS_PER_PAGE))));
  }, [eventPhotos.length]);

  const previewSlug = computeSlug(uploadDate, uploadTime);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: isDark ? '#86efac' : '#166534' }} />
      </div>
    );
  }

  return (
    <div className="pt-20 pb-16 min-h-screen" style={{ background: bg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Confirm Modal ── */}
        <ConfirmModal
          open={confirmState.open}
          title={confirmState.title}
          description={confirmState.description}
          detail={confirmState.detail}
          confirmLabel={confirmState.confirmLabel}
          onConfirm={runConfirm}
          onCancel={closeConfirm}
          isDark={isDark}
          loading={confirmState.loading}
        />

        {/* ── Success Toast ── */}
        <SuccessToast msg={successMsg} onClose={() => setSuccessMsg(null)} isDark={isDark} />

        {/* ── Error Toast ── */}
        <ErrorToast msg={errorMsg} onClose={() => setErrorMsg(null)} isDark={isDark} />

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 'clamp(1.4rem, 3vw, 2rem)',
              fontWeight: 900,
              color: textColor,
              letterSpacing: '-0.02em',
            }}
          >
            Controle de Eventos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: mutedText }}>
            Allianz Parque · Tour Oficial · Slug = DDMMYYYYHHMM
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <TabNav
          className="mb-8"
          active="eventos"
          tabs={[
            { key: 'dashboard',  label: 'Dashboard',   icon: BarChart3,    to: '/admin' },
            { key: 'eventos',    label: 'Eventos',      icon: CalendarDays, to: '/admin/eventos' },
            { key: 'financeiro', label: 'Financeiro',   icon: DollarSign,   to: '/admin/financeiro' },
            { key: 'pedidos',    label: 'Pedidos',      icon: ClipboardList, to: '/admin/pedidos' },
            { key: 'pdv',        label: 'PDV',           icon: Store,        to: '/admin/pdv' },
          ]}
        />

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Left: Event list ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 rounded-2xl overflow-hidden flex flex-col"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            {/* Header */}
            <div className="p-5 flex flex-col gap-3" style={{ borderBottom: `1px solid ${cardBorder}` }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '1rem', color: textColor }}>
                    Tours Cadastrados
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: mutedText }}>
                    {filteredEvents.length} {filteredEvents.length === 1 ? 'tour' : 'tours'} · busca por slug ou data
                  </p>
                </div>
                <div
                  className="px-2.5 py-1 rounded-lg text-xs"
                  style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.07)', color: green, fontWeight: 700 }}
                >
                  R$ {photoPrice ?? 30} / foto
                </div>
              </div>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: mutedText }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: 26022026 ou 18:00..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textColor }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5" style={{ color: mutedText }} />
                  </button>
                )}
              </div>

              {/* Sync from Storage */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="skipCompleteSync"
                    checked={skipCompleteSync}
                    onChange={(e) => setSkipCompleteSync(e.target.checked)}
                    className="w-3.5 h-3.5 rounded cursor-pointer"
                    style={{ accentColor: green }}
                  />
                  <label htmlFor="skipCompleteSync" className="text-xs cursor-pointer flex-1" style={{ color: mutedText }}>
                    Pular eventos com 100% de sincronização
                  </label>
                </div>
                <motion.button
                  whileHover={!syncing ? { scale: 1.02 } : {}}
                  whileTap={!syncing ? { scale: 0.97 } : {}}
                  onClick={handleSyncStorage}
                  disabled={syncing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: isDark ? 'rgba(251,191,36,0.08)' : 'rgba(217,119,6,0.06)',
                    border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : 'rgba(217,119,6,0.15)'}`,
                    color: isDark ? '#fbbf24' : '#b45309',
                    opacity: syncing ? 0.7 : 1,
                  }}
                >
                  {syncing
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {syncProgress || 'Sincronizando...'}</>
                    : <><HardDriveDownload className="w-3.5 h-3.5" /> Sincronizar do Storage (S3)</>}
                </motion.button>
              </div>

              {/* Sync progress */}
              {syncing && syncProgress && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-[10px] p-2.5 rounded-xl"
                  style={{
                    background: isDark ? 'rgba(251,191,36,0.05)' : 'rgba(217,119,6,0.04)',
                    border: `1px solid ${isDark ? 'rgba(251,191,36,0.12)' : 'rgba(217,119,6,0.1)'}`,
                    color: isDark ? 'rgba(251,191,36,0.8)' : '#92400e',
                  }}
                >
                  <p className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {syncProgress}
                  </p>
                </motion.div>
              )}

              {/* Sync error */}
              {syncError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-[10px] p-2.5 rounded-xl"
                  style={{
                    background: isDark ? 'rgba(252,165,165,0.08)' : 'rgba(220,38,38,0.06)',
                    border: `1px solid ${isDark ? 'rgba(252,165,165,0.2)' : 'rgba(220,38,38,0.15)'}`,
                    color: isDark ? '#fca5a5' : '#dc2626',
                  }}
                >
                  <p className="flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {syncError}
                  </p>
                </motion.div>
              )}

              {/* Sync result */}
              {syncResult && !syncing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-[10px] p-2.5 rounded-xl space-y-0.5"
                  style={{
                    background: isDark ? 'rgba(251,191,36,0.05)' : 'rgba(217,119,6,0.04)',
                    border: `1px solid ${isDark ? 'rgba(251,191,36,0.12)' : 'rgba(217,119,6,0.1)'}`,
                    color: isDark ? 'rgba(251,191,36,0.8)' : '#92400e',
                  }}
                >
                  <p><strong>{syncResult.eventsCreated}</strong> evento(s) criado(s) · <strong>{syncResult.photosImported}</strong> foto(s) importada(s)</p>
                  <p style={{ opacity: 0.7 }}>{syncResult.eventsSkipped} evento(s) já existiam · {syncResult.photosSkipped} foto(s) já existiam</p>
                  {syncResult.errors.length > 0 && (
                    <p style={{ color: isDark ? '#fca5a5' : '#dc2626' }}>⚠ {syncResult.errors.length} erro(s)</p>
                  )}
                </motion.div>
              )}
            </div>

            {/* Event list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {eventsLoading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: mutedText }} />
                </div>
              )}
              {eventsError && (
                <div className="flex items-center gap-2 p-4 rounded-xl text-sm" style={{ background: isDark ? 'rgba(252,165,165,0.08)' : 'rgba(220,38,38,0.06)', color: isDark ? '#fca5a5' : '#dc2626' }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {eventsError}
                </div>
              )}
              {!eventsLoading && filteredEvents.length === 0 && (
                <div className="text-center py-16">
                  <Camera className="w-10 h-10 mx-auto mb-3" style={{ color: mutedText }} />
                  <p className="text-sm" style={{ color: mutedText }}>
                    {searchQuery ? 'Nenhum tour encontrado para essa busca.' : 'Nenhum tour ainda. Envie fotos para criar o primeiro!'}
                  </p>
                </div>
              )}
              {pagedEvents.map((event) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: selectedEvent?.id === event.id
                      ? isDark ? 'rgba(134,239,172,0.06)' : 'rgba(22,101,52,0.05)'
                      : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${selectedEvent?.id === event.id
                      ? isDark ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.2)'
                      : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                  }}
                  onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                >
                  {/* Date badge */}
                  <div
                    className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center"
                    style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.07)' }}
                  >
                    {/^\d{12}$/.test(event.slug ?? '') ? (
                      <>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: green, lineHeight: 1 }}>
                          {event.slug!.slice(0, 2)}/{event.slug!.slice(2, 4)}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: mutedText, lineHeight: 1.4 }}>
                          {event.slug!.slice(8, 10)}:{event.slug!.slice(10, 12)}
                        </span>
                      </>
                    ) : (
                      <CalendarDays className="w-5 h-5" style={{ color: green }} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm truncate" style={{ color: textColor, fontWeight: 700 }}>
                        {event.name}
                      </p>
                      {event.sessionType && (
                        <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide"
                          style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.06)', color: green, border: `1px solid ${isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.12)'}` }}>
                          {event.sessionType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                        style={{
                          background: isDark ? 'rgba(125,211,252,0.08)' : 'rgba(2,132,199,0.07)',
                          color: isDark ? '#7dd3fc' : '#0284c7',
                          fontWeight: 600,
                        }}
                      >
                        {/^\d{12}$/.test(event.slug ?? '') ? formatSlug(event.slug!) : event.slug}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: mutedText }}>
                        <Camera className="w-3 h-3" />
                        {event.photoCount}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopySlug(event.id); }}
                      className="p-1.5 rounded-lg transition-colors text-[10px] flex items-center gap-1"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                        color: copiedSlug === event.id ? green : mutedText,
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{
                        background: isDark ? 'rgba(252,165,165,0.06)' : 'rgba(220,38,38,0.05)',
                        color: isDark ? '#fca5a5' : '#dc2626',
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight
                      className="w-3.5 h-3.5 ml-1"
                      style={{ color: selectedEvent?.id === event.id ? green : mutedText }}
                    />
                  </div>
                </motion.div>
              ))}
              {eventsTotalPages > 1 && (
                <div className="flex items-center justify-center gap-1 mt-4 pt-3 flex-shrink-0" style={{ borderTop: `1px solid ${cardBorder}` }}>
                  {/* Prev */}
                  <button
                    onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
                    disabled={eventsPage <= 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: cardBg, border: `1px solid ${cardBorder}`, color: eventsPage > 1 ? green : mutedText, opacity: eventsPage <= 1 ? 0.35 : 1 }}
                  >
                    <ChevronRight className="w-3 h-3 rotate-180" />
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: eventsTotalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === eventsTotalPages || Math.abs(p - eventsPage) <= 1)
                    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) => p === '...'
                      ? <span key={`e${i}`} className="w-7 text-center text-[10px]" style={{ color: mutedText }}>…</span>
                      : (
                        <button
                          key={p}
                          onClick={() => setEventsPage(p as number)}
                          className="w-7 h-7 rounded-lg text-[11px] font-bold transition-all"
                          style={{
                            background: p === eventsPage
                              ? (isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.12)')
                              : cardBg,
                            border: `1px solid ${p === eventsPage ? (isDark ? 'rgba(134,239,172,0.35)' : 'rgba(22,101,52,0.25)') : cardBorder}`,
                            color: p === eventsPage ? green : mutedText,
                          }}
                        >
                          {p}
                        </button>
                      )
                    )
                  }

                  {/* Next */}
                  <button
                    onClick={() => setEventsPage((p) => Math.min(eventsTotalPages, p + 1))}
                    disabled={eventsPage >= eventsTotalPages}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: cardBg, border: `1px solid ${cardBorder}`, color: eventsPage < eventsTotalPages ? green : mutedText, opacity: eventsPage >= eventsTotalPages ? 0.35 : 1 }}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Right: Upload panel / Photo viewer ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 rounded-2xl overflow-hidden flex flex-col"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <AnimatePresence mode="wait">
              {!selectedEvent ? (
                /* ── Upload form (default state) ── */
                <motion.div
                  key="upload-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col h-full"
                >
                  {/* Header */}
                  <div className="p-5" style={{ borderBottom: `1px solid ${cardBorder}` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarDays className="w-4 h-4" style={{ color: green }} />
                      <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '1rem', color: textColor }}>
                        Novo Tour / Enviar Fotos
                      </h3>
                    </div>
                    <p className="text-xs" style={{ color: mutedText }}>
                      Crie o tour vazio agora e envie as fotos depois, ou arraste as fotos para criar e enviar de uma vez
                    </p>
                  </div>

                  <div className="p-5 flex flex-col gap-4 flex-1">
                    {/* Date */}
                    <div>
                      <label className="flex items-center gap-2 text-xs mb-2" style={{ color: mutedText, fontWeight: 600 }}>
                        <CalendarDays className="w-3 h-3" style={{ color: green }} />
                        DATA DO TOUR
                      </label>
                      <input
                        type="date"
                        value={uploadDate}
                        onChange={(e) => setUploadDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textColor, colorScheme: isDark ? 'dark' : 'light' }}
                      />
                    </div>

                    {/* Time */}
                    <div>
                      <label className="flex items-center gap-2 text-xs mb-2" style={{ color: mutedText, fontWeight: 600 }}>
                        <Clock className="w-3 h-3" style={{ color: green }} />
                        HORÁRIO DE INÍCIO
                      </label>
                      <input
                        type="time"
                        value={uploadTime}
                        onChange={(e) => setUploadTime(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textColor, colorScheme: isDark ? 'dark' : 'light' }}
                      />
                    </div>

                    {/* Slug preview */}
                    {previewSlug && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex items-center gap-2 p-3 rounded-xl"
                        style={{ background: isDark ? 'rgba(125,211,252,0.06)' : 'rgba(2,132,199,0.05)', border: `1px solid ${isDark ? 'rgba(125,211,252,0.15)' : 'rgba(2,132,199,0.12)'}` }}
                      >
                        <span className="text-xs" style={{ color: mutedText }}>Slug do tour:</span>
                        <code
                          className="text-sm font-mono"
                          style={{ color: isDark ? '#7dd3fc' : '#0284c7', fontWeight: 700 }}
                        >
                          {previewSlug}
                        </code>
                      </motion.div>
                    )}

                    {/* Session Type */}
                    <div>
                      <label className="flex items-center gap-2 text-xs mb-2" style={{ color: mutedText, fontWeight: 600 }}>
                        <CalendarDays className="w-3 h-3" style={{ color: green }} />
                        TIPO DE SESSÃO
                      </label>
                      <input
                        type="text"
                        value={uploadSessionType}
                        onChange={(e) => setUploadSessionType(e.target.value)}
                        placeholder="Ex: Tour, Camarote, VIP…"
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-2"
                        style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textColor }}
                      />
                      {(branding.eventSessionTypes ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {branding.eventSessionTypes.map((st) => {
                            const active = uploadSessionType === st;
                            return (
                              <button
                                key={st}
                                onClick={() => setUploadSessionType(uploadSessionType === st ? '' : st)}
                                className="px-3 py-1 rounded-lg text-[10px] transition-all font-medium"
                                style={{
                                  background: active ? (isDark ? 'rgba(134,239,172,0.12)' : 'rgba(22,101,52,0.1)') : inputBg,
                                  border: `1px solid ${active ? (isDark ? 'rgba(134,239,172,0.3)' : 'rgba(22,101,52,0.25)') : cardBorder}`,
                                  color: active ? green : mutedText,
                                  fontWeight: active ? 700 : 500,
                                }}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* ── Botão Criar Evento ── */}
                    <motion.button
                      whileHover={!creatingEvent ? { scale: 1.02 } : {}}
                      whileTap={!creatingEvent ? { scale: 0.97 } : {}}
                      onClick={handleCreateEventOnly}
                      disabled={creatingEvent || !uploadDate || !uploadTime}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: (uploadDate && uploadTime)
                          ? (isDark ? 'rgba(134,239,172,0.12)' : 'rgba(22,101,52,0.09)')
                          : inputBg,
                        border: `1px solid ${(uploadDate && uploadTime)
                          ? (isDark ? 'rgba(134,239,172,0.3)' : 'rgba(22,101,52,0.22)')
                          : cardBorder}`,
                        color: (uploadDate && uploadTime) ? green : mutedText,
                        opacity: (!uploadDate || !uploadTime) ? 0.5 : 1,
                        cursor: (!uploadDate || !uploadTime) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {creatingEvent
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando…</>
                        : <><CalendarDays className="w-4 h-4" /> Criar Evento</>}
                    </motion.button>

                    {/* Separador */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px" style={{ background: cardBorder }} />
                      <span className="text-[10px] uppercase tracking-widest" style={{ color: mutedText }}>ou envie fotos agora</span>
                      <div className="flex-1 h-px" style={{ background: cardBorder }} />
                    </div>

                    {/* Drop zone */}
                    <div
                      className="flex-1 min-h-[120px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
                      style={{
                        borderColor: dragOver
                          ? isDark ? 'rgba(134,239,172,0.5)' : 'rgba(22,101,52,0.4)'
                          : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        background: dragOver
                          ? isDark ? 'rgba(134,239,172,0.04)' : 'rgba(22,101,52,0.03)'
                          : 'transparent',
                      }}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        handleFileUpload(e.dataTransfer.files);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-8 h-8 animate-spin" style={{ color: green }} />
                          <p className="text-sm" style={{ color: mutedText }}>
                            {uploadPhase === 'compressing' ? 'Comprimindo fotos...' : 'Enviando fotos...'}
                          </p>
                          {uploadTotal > 0 && (
                            <div className="w-full max-w-xs">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold" style={{ color: green }}>
                                  {uploadSuccess}/{uploadTotal}
                                </span>
                                <span className="text-xs" style={{ color: mutedText }}>
                                  {Math.round((uploadSuccess / uploadTotal) * 100)}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                                <div
                                  className="h-full transition-all duration-300"
                                  style={{
                                    width: `${(uploadSuccess / uploadTotal) * 100}%`,
                                    background: `linear-gradient(90deg, ${green}, ${cyan})`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      ) : uploadSuccess > 0 ? (
                        <>
                          <CheckCircle2 className="w-8 h-8" style={{ color: green }} />
                          <p className="text-sm font-bold" style={{ color: green }}>
                            {uploadSuccess} foto{uploadSuccess > 1 ? 's' : ''} enviada{uploadSuccess > 1 ? 's' : ''}!
                          </p>
                          <p className="text-xs" style={{ color: mutedText }}>Clique para enviar mais</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8" style={{ color: mutedText }} />
                          <p className="text-sm" style={{ color: mutedText }}>
                            Arraste as fotos ou <span style={{ color: green, fontWeight: 700 }}>clique aqui</span>
                          </p>
                          <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}>
                            JPG, PNG · múltiplos arquivos suportados
                          </p>
                        </>
                      )}
                    </div>

                    {/* Error */}
                    {uploadError && (
                      <div
                        className="flex items-start gap-2 p-3 rounded-xl text-xs"
                        style={{ background: isDark ? 'rgba(252,165,165,0.08)' : 'rgba(220,38,38,0.06)', color: isDark ? '#fca5a5' : '#dc2626' }}
                      >
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        {uploadError}
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                  </div>
                </motion.div>
              ) : (
                /* ── Photo viewer (event selected) ── */
                <motion.div
                  key={`event-${selectedEvent.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col h-full"
                >
                  {/* Header */}
                  <div className="p-5 flex items-start gap-3" style={{ borderBottom: `1px solid ${cardBorder}` }}>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate" style={{ color: textColor }}>
                        {selectedEvent.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <code
                          className="text-[11px] px-2 py-0.5 rounded-lg font-mono"
                          style={{ background: isDark ? 'rgba(125,211,252,0.08)' : 'rgba(2,132,199,0.07)', color: isDark ? '#7dd3fc' : '#0284c7' }}
                        >
                          {/^\d{12}$/.test(selectedEvent.slug ?? '') ? formatSlug(selectedEvent.slug!) : selectedEvent.slug}
                        </code>
                        <span className="text-xs" style={{ color: mutedText }}>
                          {selectedEvent.photoCount} foto{selectedEvent.photoCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => viewerFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                        style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.08)', color: green, fontWeight: 700 }}
                      >
                        <Upload className="w-3 h-3" /> Enviar
                      </button>
                      <button
                        onClick={() => setSelectedEvent(null)}
                        className="p-1.5 rounded-lg"
                        style={{ background: inputBg, color: mutedText }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Session type inline editor */}
                  <div className="px-5 pt-3 pb-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-[11px] flex-shrink-0" style={{ color: mutedText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo:</span>
                      <input
                        type="text"
                        value={viewerSessionTypeInput}
                        onChange={(e) => setViewerSessionTypeInput(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            if (!selectedEvent || viewerSessionTypeInput === selectedEvent.sessionType) return;
                            const token = await getToken();
                            if (!token) return;
                            try {
                              await api.updateEvent(selectedEvent.id, { sessionType: viewerSessionTypeInput }, token);
                              setSelectedEvent(prev => prev ? { ...prev, sessionType: viewerSessionTypeInput } : prev);
                              setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, sessionType: viewerSessionTypeInput } : ev));
                              await registerSessionTypeIfNew(viewerSessionTypeInput, token);
                            } catch (err: any) {
                              setErrorMsg(`Erro ao atualizar tipo: ${err.message}`);
                              setTimeout(() => setErrorMsg(null), 4000);
                            }
                          }
                        }}
                        placeholder="Ex: Tour, VIP…"
                        className="flex-1 min-w-[110px] px-2.5 py-1 rounded-lg text-xs outline-none"
                        style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textColor }}
                      />
                      {viewerSessionTypeInput !== (selectedEvent?.sessionType ?? '') && (
                        <button
                          onClick={async () => {
                            if (!selectedEvent) return;
                            const token = await getToken();
                            if (!token) return;
                            try {
                              await api.updateEvent(selectedEvent.id, { sessionType: viewerSessionTypeInput }, token);
                              setSelectedEvent(prev => prev ? { ...prev, sessionType: viewerSessionTypeInput } : prev);
                              setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? { ...ev, sessionType: viewerSessionTypeInput } : ev));
                              await registerSessionTypeIfNew(viewerSessionTypeInput, token);
                            } catch (err: any) {
                              setErrorMsg(`Erro ao atualizar tipo: ${err.message}`);
                              setTimeout(() => setErrorMsg(null), 4000);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex-shrink-0"
                          style={{ background: isDark ? 'rgba(134,239,172,0.12)' : 'rgba(22,101,52,0.1)', color: green, border: `1px solid ${isDark ? 'rgba(134,239,172,0.3)' : 'rgba(22,101,52,0.25)'}` }}
                        >
                          Salvar
                        </button>
                      )}
                    </div>
                    {(branding.eventSessionTypes ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {branding.eventSessionTypes.map((st) => {
                          const active = viewerSessionTypeInput === st;
                          return (
                            <button
                              key={st}
                              onClick={() => setViewerSessionTypeInput(st)}
                              className="px-2 py-0.5 rounded-md text-[10px] transition-all"
                              style={{
                                background: active ? (isDark ? 'rgba(134,239,172,0.12)' : 'rgba(22,101,52,0.1)') : inputBg,
                                border: `1px solid ${active ? (isDark ? 'rgba(134,239,172,0.3)' : 'rgba(22,101,52,0.25)') : cardBorder}`,
                                color: active ? green : mutedText,
                                fontWeight: active ? 700 : 500,
                              }}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Date/Time inline editor */}
                  <div className="px-5 py-3 border-t" style={{ borderColor: cardBorder }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] flex-shrink-0" style={{ color: mutedText, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Data e hora:</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-3 h-3" style={{ color: green }} />
                        <input
                          type="date"
                          value={viewerDateInput}
                          onChange={(e) => setViewerDateInput(e.target.value)}
                          className="px-2.5 py-1 rounded-lg text-xs outline-none"
                          style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textColor }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" style={{ color: green }} />
                        <input
                          type="time"
                          value={viewerTimeInput}
                          onChange={(e) => setViewerTimeInput(e.target.value)}
                          className="px-2.5 py-1 rounded-lg text-xs outline-none"
                          style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textColor }}
                        />
                      </div>
                      {(() => {
                        if (!selectedEvent || !viewerDateInput || !viewerTimeInput) return null;
                        const [y, m, d] = viewerDateInput.split('-');
                        const [h, min] = viewerTimeInput.split(':');
                        const newSlug = `${y}${m}${d}${h}${min}`;
                        const changed = newSlug !== selectedEvent.slug;
                        if (!changed) return null;
                        return (
                          <button
                            onClick={async () => {
                              if (!selectedEvent) return;
                              const token = await getToken();
                              if (!token) return;
                              try {
                                await api.updateEvent(selectedEvent.id, { slug: newSlug, date: viewerDateInput }, token);
                                const updatedEvent = { ...selectedEvent, slug: newSlug, date: viewerDateInput, name: `Tour ${d}/${m}/${y}, ${h}:${min}` };
                                setSelectedEvent(updatedEvent);
                                setEvents(prev => prev.map(ev => ev.id === selectedEvent.id ? updatedEvent : ev).sort((a, b) => b.date.localeCompare(a.date)));
                                showSuccess('Data e hora atualizadas!');
                              } catch (err: any) {
                                setErrorMsg(`Erro ao atualizar data/hora: ${err.message}`);
                                setTimeout(() => setErrorMsg(null), 4000);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex-shrink-0"
                            style={{ background: isDark ? 'rgba(134,239,172,0.12)' : 'rgba(22,101,52,0.1)', color: green, border: `1px solid ${isDark ? 'rgba(134,239,172,0.3)' : 'rgba(22,101,52,0.25)'}` }}
                          >
                            Salvar
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="px-5 pb-1">
                  <div className="flex items-center gap-2">
                    {uploading && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: green }}>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {uploadSuccess > 0 ? `${uploadSuccess} enviada(s)` : 'enviando...'}
                      </span>
                    )}
                    {!uploading && uploadSuccess > 0 && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: green }}>
                        <CheckCircle2 className="w-3 h-3" />
                        {uploadSuccess} foto{uploadSuccess > 1 ? 's' : ''} adicionada{uploadSuccess > 1 ? 's' : ''}!
                      </span>
                    )}
                    {!uploading && uploadError && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: isDark ? '#fca5a5' : '#dc2626' }}>
                        <AlertCircle className="w-3 h-3" />
                        {uploadError}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                      className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: isDark ? 'rgba(252,165,165,0.08)' : 'rgba(220,38,38,0.06)', color: isDark ? '#fca5a5' : '#dc2626', fontWeight: 600 }}
                    >
                      <Trash2 className="w-3 h-3" /> Excluir {(selectedEvent.sessionType || 'evento').toLowerCase()}
                    </button>
                  </div>
                  </div>

                  {/* Photos grid */}
                  <div className="flex-1 overflow-y-auto p-5">
                    {/* Photo count header */}
                    {eventPhotos.length > 0 && (
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" style={{ color: green }} />
                          <span className="text-sm font-bold" style={{ color: textColor }}>
                            {eventPhotos.length} foto{eventPhotos.length !== 1 ? 's' : ''} no evento
                          </span>
                          {photosTotalPages > 1 && (
                            <span 
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{ 
                                background: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.2)', 
                                color: isDark ? '#fbbf24' : '#d97706',
                                border: `1px solid ${isDark ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.4)'}`
                              }}
                            >
                              {photosTotalPages} páginas
                            </span>
                          )}
                        </div>
                        {photosTotalPages > 1 && (
                          <span className="text-xs" style={{ color: mutedText }}>
                            Página {photosPage} de {photosTotalPages}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {photosLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: mutedText }} />
                      </div>
                    ) : eventPhotos.length === 0 ? (
                      <div
                        className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed cursor-pointer"
                        style={{
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        }}
                        onClick={() => viewerFileInputRef.current?.click()}
                      >
                        <ImageIcon className="w-8 h-8 mb-3" style={{ color: mutedText }} />
                        <p className="text-sm" style={{ color: mutedText }}>
                          Nenhuma foto ainda · <span style={{ color: green, fontWeight: 700 }}>Enviar</span>
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {pagedPhotos.map((photo) => (
                          <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden" style={{ border: `1px solid ${cardBorder}` }}>
                            <img
                              src={photo.url}
                              alt={photo.tag}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="p-1.5 rounded-lg"
                                style={{ background: 'rgba(220,38,38,0.8)', color: '#fff' }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px]" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                              {photo.tag}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Seção de Envio de Novas Fotos ── */}
                    {eventPhotos.length > 0 && (
                      <div className="mt-6">
                        <div className="mb-3">
                          <p className="text-xs uppercase tracking-wider" style={{ color: mutedText, fontWeight: 600 }}>
                            OU ENVIE FOTOS AGORA
                          </p>
                        </div>
                        <div
                          className="min-h-[100px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all p-4"
                          style={{
                            borderColor: dragOver
                              ? isDark ? 'rgba(134,239,172,0.5)' : 'rgba(22,101,52,0.4)'
                              : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                            background: dragOver
                              ? isDark ? 'rgba(134,239,172,0.04)' : 'rgba(22,101,52,0.03)'
                              : 'transparent',
                          }}
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOver(false);
                            handleFileUpload(e.dataTransfer.files, selectedEvent ?? undefined);
                          }}
                          onClick={() => viewerFileInputRef.current?.click()}
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="w-6 h-6 animate-spin" style={{ color: green }} />
                              <p className="text-xs" style={{ color: mutedText }}>
                                {uploadPhase === 'compressing' ? 'Comprimindo...' : 'Enviando...'}
                              </p>
                              {uploadTotal > 0 && (
                                <div className="w-full max-w-[180px]">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-semibold" style={{ color: green }}>
                                      {uploadSuccess}/{uploadTotal}
                                    </span>
                                    <span className="text-[10px]" style={{ color: mutedText }}>
                                      {Math.round((uploadSuccess / uploadTotal) * 100)}%
                                    </span>
                                  </div>
                                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                                    <div
                                      className="h-full transition-all duration-300"
                                      style={{
                                        width: `${(uploadSuccess / uploadTotal) * 100}%`,
                                        background: `linear-gradient(90deg, ${green}, ${isDark ? '#7dd3fc' : '#0284c7'})`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <Upload className="w-6 h-6" style={{ color: mutedText }} />
                              <p className="text-xs text-center" style={{ color: mutedText }}>
                                Arraste fotos ou <span style={{ color: green, fontWeight: 700 }}>clique aqui</span>
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Info + paginação de fotos */}
                    {eventPhotos.length > 0 && (
                      <div className="mt-4 flex flex-col gap-2">
                        <p className="text-center text-[10px]" style={{ color: mutedText }}>
                          {(photosPage - 1) * PHOTOS_PER_PAGE + 1}–{Math.min(photosPage * PHOTOS_PER_PAGE, eventPhotos.length)} de {eventPhotos.length} fotos
                        </p>
                        {photosTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-1">
                            {/* Prev */}
                            <button
                              onClick={() => setPhotosPage((p) => Math.max(1, p - 1))}
                              disabled={photosPage <= 1}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                              style={{ background: cardBg, border: `1px solid ${cardBorder}`, color: photosPage > 1 ? green : mutedText, opacity: photosPage <= 1 ? 0.35 : 1 }}
                            >
                              <ChevronRight className="w-3 h-3 rotate-180" />
                            </button>

                            {/* Page numbers */}
                            {Array.from({ length: photosTotalPages }, (_, i) => i + 1)
                              .filter(p => p === 1 || p === photosTotalPages || Math.abs(p - photosPage) <= 1)
                              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                                acc.push(p);
                                return acc;
                              }, [])
                              .map((p, i) => p === '...'
                                ? <span key={`ph${i}`} className="w-7 text-center text-[10px]" style={{ color: mutedText }}>…</span>
                                : (
                                  <button
                                    key={p}
                                    onClick={() => setPhotosPage(p as number)}
                                    className="w-7 h-7 rounded-lg text-[11px] font-bold transition-all"
                                    style={{
                                      background: p === photosPage
                                        ? (isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.12)')
                                        : cardBg,
                                      border: `1px solid ${p === photosPage ? (isDark ? 'rgba(134,239,172,0.35)' : 'rgba(22,101,52,0.25)') : cardBorder}`,
                                      color: p === photosPage ? green : mutedText,
                                    }}
                                  >
                                    {p}
                                  </button>
                                )
                              )
                            }

                            {/* Next */}
                            <button
                              onClick={() => setPhotosPage((p) => Math.min(photosTotalPages, p + 1))}
                              disabled={photosPage >= photosTotalPages}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                              style={{ background: cardBg, border: `1px solid ${cardBorder}`, color: photosPage < photosTotalPages ? green : mutedText, opacity: photosPage >= photosTotalPages ? 0.35 : 1 }}
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <input
                    ref={viewerFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      // Passa o evento selecionado diretamente — sem depender de state de data/hora
                      handleFileUpload(e.target.files, selectedEvent ?? undefined);
                      // Reset input para permitir re-selecionar os mesmos arquivos
                      e.target.value = '';
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}