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
  Scan,
  Store,
  ClipboardList,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { TabNav } from '../components/TabNav';
import { useAuth } from '../contexts/AuthContext';
import { api, type EventRecord, type PhotoRecord, type AdminConfig } from '../lib/api';

/* ─── helpers ─── */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
  });
}

/**
 * Comprime a imagem via Canvas antes de codificar em base64.
 * Reduz dimensões para no máximo 2048px e qualidade progressiva
 * até o resultado caber em ~1.2 MB de base64 (≈ 900 KB de imagem).
 * Isso evita o erro de payload grande no Supabase Edge Function.
 */
async function compressToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Reduz dimensões se necessário
        const MAX_DIM = 2048;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width  = Math.round(width  * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        // Reduz qualidade progressivamente até ~1.2 MB de base64
        const MAX_B64_BYTES = 1.2 * 1024 * 1024;
        let quality = 0.88;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length > MAX_B64_BYTES && quality > 0.25) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl.split(',')[1]);
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

/* ── Processa faces de uma foto em background ────────────────────── */
async function processFacesForPhoto(
  photoId: string,
  eventId: string,
  photoUrl: string,
  token: string,
): Promise<number> {
  try {
    const faceService = await import('../lib/faceService');
    await faceService.loadModels();
    const img = await faceService.loadImage(photoUrl);
    const descriptors = await faceService.detectAllFaces(img);
    if (descriptors.length > 0) {
      await api.saveFaceDescriptors(eventId, photoId, descriptors, token);
    }
    return descriptors.length;
  } catch (err) {
    console.warn(`Face processing failed for photo ${photoId}:`, err);
    return 0;
  }
}

export function AdminEvents() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading, getToken } = useAuth();
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
  const [uploadTag, setUploadTag] = useState('Geral');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // Face processing status
  const [faceProcessing, setFaceProcessing] = useState(false);
  const [facesProcessed, setFacesProcessed] = useState(0);
  const [facesTotal, setFacesTotal] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination — tours list
  const EVENTS_PER_PAGE = 8;
  const [eventsPage, setEventsPage] = useState(1);

  // Pagination — photos grid
  const PHOTOS_PER_PAGE = 12;
  const [photosPage, setPhotosPage] = useState(1);

  // Photo price (dynamic)
  const [photoPrice, setPhotoPrice] = useState<number | null>(null);

  // Copy slug
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const bg = isDark ? '#08080E' : '#F2F8F4';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.1)';
  const mutedText = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,40,20,0.42)';
  const textColor = isDark ? '#fff' : '#0D2818';
  const green = isDark ? '#86efac' : '#006B2B';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

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
      const res = await api.getEvents();
      setEvents(res.events.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (err: any) {
      setEventsError(err.message);
    } finally {
      setEventsLoading(false);
    }
  }, []);

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
    api.getEventPhotos(selectedEvent.id)
      .then((res) => setEventPhotos(res.photos))
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

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Excluir este tour e todas as suas fotos?')) return;
    try {
      const token = await getToken();
      if (!token) { navigate('/admin/login'); return; }
      await api.deleteEvent(id, token);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (selectedEvent?.id === id) setSelectedEvent(null);
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!selectedEvent) return;
    try {
      const token = await getToken();
      if (!token) { navigate('/admin/login'); return; }
      await api.deletePhoto(selectedEvent.id, photoId, token);
      setEventPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setEvents((prev) => prev.map((e) =>
        e.id === selectedEvent.id ? { ...e, photoCount: Math.max(0, e.photoCount - 1) } : e
      ));
    } catch (err: any) {
      alert(`Erro ao excluir foto: ${err.message}`);
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
        event = targetEvent;
      } else {
        // Step 1 — Find or create the event by date+time slug
        const dateISO = `${uploadDate}T${uploadTime}:00`;
        const eventRes = await api.createEvent({ date: dateISO }, token);
        event = eventRes.event;

        // Sync local events list
        setEvents((prev) => {
          const exists = prev.find((e) => e.id === event.id);
          return exists
            ? prev.map((e) => (e.id === event.id ? event : e))
            : [event, ...prev];
        });
        setSelectedEvent(event);
      }

      // Step 2 — Upload each file
      let count = 0;
      const uploadedPhotos: { id: string; url: string }[] = [];

      for (const file of Array.from(files)) {
        try {
          const base64 = await compressToBase64(file);
          const res = await api.uploadPhoto(event.id, {
            base64,
            fileName: file.name,
            mimeType: file.type || 'image/jpeg',
            tag: uploadTag,
          }, token);
          setEventPhotos((prev) => [...prev, res.photo]);
          setEvents((prev) => prev.map((e) =>
            e.id === event.id ? { ...e, photoCount: e.photoCount + 1 } : e
          ));
          count++;
          setUploadSuccess(count);
          if (res.photo.url) {
            uploadedPhotos.push({ id: res.photo.id, url: res.photo.url });
          }
        } catch (err: any) {
          console.log('Erro ao enviar foto:', err.message);
        }
      }

      if (count === 0) {
        setUploadError('Nenhuma foto foi enviada. Verifique os arquivos e tente novamente.');
      } else if (uploadedPhotos.length > 0) {
        // Process faces in background (lazy — doesn't block UI)
        setFaceProcessing(true);
        setFacesProcessed(0);
        setFacesTotal(uploadedPhotos.length);
        ;(async () => {
          let done = 0;
          for (const { id, url } of uploadedPhotos) {
            await processFacesForPhoto(id, event.id, url, token);
            done++;
            setFacesProcessed(done);
          }
          setFaceProcessing(false);
        })();
      }
    } catch (err: any) {
      setUploadError(err.message ?? 'Erro ao processar upload.');
    } finally {
      setUploading(false);
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

  const previewSlug = computeSlug(uploadDate, uploadTime);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: isDark ? '#86efac' : '#006B2B' }} />
      </div>
    );
  }

  return (
    <div className="pt-20 pb-16 min-h-screen" style={{ background: bg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Face processing toast */}
        <AnimatePresence>
          {faceProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl"
              style={{ background: isDark ? '#0e0e1a' : '#fff', border: `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(0,107,43,0.15)'}`, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            >
              <div className="relative w-8 h-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-2 border-transparent"
                  style={{ borderTopColor: isDark ? '#86efac' : '#006B2B' }}
                />
                <Scan className="absolute inset-0 m-auto w-3.5 h-3.5" style={{ color: green }} />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: isDark ? '#fff' : '#0D2818' }}>
                  Processando reconhecimento facial
                </p>
                <p className="text-[11px]" style={{ color: mutedText }}>
                  {facesProcessed}/{facesTotal} fotos · modelos de IA ativos
                </p>
              </div>
              <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${green}, #7dd3fc)`, width: `${facesTotal > 0 ? (facesProcessed / facesTotal) * 100 : 0}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.07)', color: green, fontWeight: 700 }}
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
                      ? isDark ? 'rgba(134,239,172,0.06)' : 'rgba(0,107,43,0.05)'
                      : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${selectedEvent?.id === event.id
                      ? isDark ? 'rgba(134,239,172,0.2)' : 'rgba(0,107,43,0.2)'
                      : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                  }}
                  onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                >
                  {/* Date badge */}
                  <div
                    className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-center"
                    style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.07)' }}
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
                    <p className="text-sm truncate" style={{ color: textColor, fontWeight: 700 }}>
                      {event.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
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
                <div className="flex items-center justify-center mt-4">
                  <button
                    onClick={() => setEventsPage((prev) => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      color: eventsPage > 1 ? green : mutedText,
                    }}
                    disabled={eventsPage <= 1}
                  >
                    <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  </button>
                  <span className="mx-2 text-xs" style={{ color: mutedText }}>
                    Página {eventsPage} de {eventsTotalPages}
                  </span>
                  <button
                    onClick={() => setEventsPage((prev) => Math.min(eventsTotalPages, prev + 1))}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      color: eventsPage < eventsTotalPages ? green : mutedText,
                    }}
                    disabled={eventsPage >= eventsTotalPages}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
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
                      <Upload className="w-4 h-4" style={{ color: green }} />
                      <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '1rem', color: textColor }}>
                        Enviar Fotos para um Tour
                      </h3>
                    </div>
                    <p className="text-xs" style={{ color: mutedText }}>
                      Escolha data + hora → o tour é criado automaticamente pelo slug
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
                        style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textColor }}
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
                        style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textColor }}
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

                    {/* Tag */}
                    <div>
                      <label className="flex items-center gap-2 text-xs mb-2" style={{ color: mutedText, fontWeight: 600 }}>
                        <Camera className="w-3 h-3" style={{ color: green }} />
                        CATEGORIA DAS FOTOS
                      </label>
                      <select
                        value={uploadTag}
                        onChange={(e) => setUploadTag(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none appearance-none"
                        style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textColor }}
                      >
                        {['Geral', 'Arena', 'Camarote', 'Gramado', 'Fachada', 'Bastidores'].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Drop zone */}
                    <div
                      className="flex-1 min-h-[120px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
                      style={{
                        borderColor: dragOver
                          ? isDark ? 'rgba(134,239,172,0.5)' : 'rgba(0,107,43,0.4)'
                          : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        background: dragOver
                          ? isDark ? 'rgba(134,239,172,0.04)' : 'rgba(0,107,43,0.03)'
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
                            Enviando fotos{uploadSuccess > 0 ? ` (${uploadSuccess} ok)` : ''}...
                          </p>
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
                        style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(0,107,43,0.08)', color: green, fontWeight: 700 }}
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

                  {/* Tag + hidden input for upload-to-selected-event */}
                  <div className="px-5 pt-4 flex items-center gap-2">
                    <select
                      value={uploadTag}
                      onChange={(e) => setUploadTag(e.target.value)}
                      className="px-3 py-1.5 rounded-lg text-xs outline-none appearance-none"
                      style={{ background: inputBg, border: `1px solid ${cardBorder}`, color: textColor }}
                    >
                      {['Geral', 'Arena', 'Camarote', 'Gramado', 'Fachada', 'Bastidores'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
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
                      <Trash2 className="w-3 h-3" /> Excluir tour
                    </button>
                  </div>

                  {/* Photos grid */}
                  <div className="flex-1 overflow-y-auto p-5">
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
                    {photosTotalPages > 1 && (
                      <div className="flex items-center justify-center mt-4">
                        <button
                          onClick={() => setPhotosPage((prev) => Math.max(1, prev - 1))}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                            color: photosPage > 1 ? green : mutedText,
                          }}
                          disabled={photosPage <= 1}
                        >
                          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                        </button>
                        <span className="mx-2 text-xs" style={{ color: mutedText }}>
                          Página {photosPage} de {photosTotalPages}
                        </span>
                        <button
                          onClick={() => setPhotosPage((prev) => Math.min(photosTotalPages, prev + 1))}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                            color: photosPage < photosTotalPages ? green : mutedText,
                          }}
                          disabled={photosPage >= photosTotalPages}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
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