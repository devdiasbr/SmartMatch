import { api, type BrandingConfig } from '../lib/api';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Settings, Image as ImageIcon, Globe, Type, Droplets, Upload, Trash2,
  CheckCircle2, AlertCircle, Loader2, Plus, Monitor, Camera,
  BarChart3, CalendarDays, DollarSign, ClipboardList, Store,
  Home, Tag, Eye,
  Palette, Layout, FileText, Save, Layers, Scan, List, X as XIcon,
  Database, Cpu, Zap, RefreshCw, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { TabNav } from '../components/TabNav';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => { res((reader.result as string).split(',')[1] ?? ''); };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

/**
 * Compress image via Canvas before base64 encoding.
 * maxDim controls resize, targetKB controls quality loop.
 * Returns { base64, mimeType } — always outputs JPEG for photos.
 * SVG/ICO are returned as-is without compression.
 */
function compressImage(
  file: File,
  { maxDim = 1920, targetKB = 500 } = {},
): Promise<{ base64: string; mimeType: string }> {
  if (['image/svg+xml', 'image/x-icon', 'image/ico'].includes(file.type)) {
    return fileToBase64(file).then(b64 => ({ base64: b64, mimeType: file.type }));
  }
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
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        const maxB64 = targetKB * 1024 * 1.37;
        let quality = 0.82;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > maxB64 && quality > 0.2) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
      };
      img.onerror = () => reject(new Error(`Falha ao decodificar ${file.name}`));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
  });
}

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, isDark }: { msg: { type: 'ok' | 'err'; text: string } | null; isDark: boolean }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold shadow-2xl"
          style={{
            background: msg.type === 'ok'
              ? (isDark ? 'rgba(22,163,74,0.95)' : '#166534')
              : (isDark ? 'rgba(220,38,38,0.95)' : '#dc2626'),
            color: '#fff',
            backdropFilter: 'blur(12px)',
          }}
        >
          {msg.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({ label, accept, onFile, uploading, isDark, green, muted, inputBg, border }: {
  label: string; accept: string; onFile: (f: File) => void; uploading: boolean;
  isDark: boolean; green: string; muted: string; inputBg: string; border: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl cursor-pointer transition-all"
      style={{
        border: `2px dashed ${drag ? green : border}`,
        background: drag ? (isDark ? 'rgba(134,239,172,0.04)' : 'rgba(22,101,52,0.03)') : inputBg,
      }}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      {uploading
        ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: green }} />
        : <Upload className="w-5 h-5" style={{ color: muted }} />}
      <span className="text-xs text-center" style={{ color: muted }}>
        {uploading ? 'Enviando...' : label}
      </span>
    </div>
  );
}

// ── ImagePreview ──────────────────────────────────────────────────────────────

function ImagePreview({ url, label, onDelete, deleting }: {
  url: string; label: string; onDelete: () => void; deleting: boolean;
}) {
  return (
    <div className="relative group rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <img src={url} alt={label} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-all flex items-center justify-center">
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
          onClick={onDelete} disabled={deleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
        >
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          Remover
        </motion.button>
      </div>
    </div>
  );
}

// ── FieldRow ─────────────────────────────────────────────────────────────────

function FieldRow({ label, hint, value, onChange, placeholder, textarea, isDark, text, muted, inputBg, inputBorder }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; textarea?: boolean;
  isDark: boolean; text: string; muted: string; inputBg: string; inputBorder: string;
}) {
  const shared = {
    className: `w-full px-3 ${textarea ? 'py-3' : 'py-2.5'} rounded-xl text-sm outline-none` + (textarea ? ' resize-none' : ''),
    style: { background: inputBg, border: `1px solid ${inputBorder}`, color: text },
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    placeholder: placeholder || '',
  };
  return (
    <div>
      <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wider" style={{ color: muted }}>{label}</label>
      {textarea
        ? <textarea {...shared} rows={3} />
        : <input type="text" {...shared} />}
      {hint && <p className="text-[11px] mt-1" style={{ color: muted }}>{hint}</p>}
    </div>
  );
}

// ── SaveBar ───────────────────────────────────────────────────────────────────

function SaveBar({ dirty, saving, onSave, green, isDark }: {
  dirty: boolean; saving: boolean; onSave: () => void; green: string; isDark: boolean;
}) {
  return (
    <AnimatePresence>
      {dirty && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
          className="mt-5 flex justify-end"
        >
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={onSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold"
            style={{
              background: isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.09)',
              border: `1px solid ${isDark ? 'rgba(134,239,172,0.3)' : 'rgba(22,101,52,0.22)'}`,
              color: green,
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, subtitle, children, isDark, cardBg, cardBorder, green, text }: {
  icon: React.ElementType; title: string; subtitle?: string; children: React.ReactNode;
  isDark: boolean; cardBg: string; cardBorder: string; green: string; text: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl"
      style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.07)' }}>
          <Icon className="w-4 h-4" style={{ color: green }} />
        </div>
        <div>
          <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.95rem', color: text }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(9,9,11,0.42)' }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

// ── PageSection ───────────────────────────────────────────────────────────────
// Cada seção da página com campos à esquerda e preview ao vivo à direita

function PageSection({ number, icon: Icon, title, desc, preview, children, isDark, cardBg, cardBorder, green, text, muted }: {
  number: number; icon: React.ElementType; title: string; desc?: string;
  preview: React.ReactNode; children: React.ReactNode;
  isDark: boolean; cardBg: string; cardBorder: string; green: string; text: string; muted: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
    >
      {/* ── Header da seção ── */}
      <div className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: `1px solid ${cardBorder}`, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(22,101,52,0.02)' }}>
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
          style={{ background: isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.09)', color: green }}>
          {number}
        </span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.06)' }}>
          <Icon className="w-3.5 h-3.5" style={{ color: green }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.9rem', color: text }}>{title}</h3>
          {desc && <p className="text-[11px] mt-0.5" style={{ color: muted }}>{desc}</p>}
        </div>
      </div>

      {/* ── Corpo: campos + preview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5">
        {/* Campos editáveis */}
        <div className="lg:col-span-3 p-5 space-y-4">
          {children}
        </div>
        {/* Preview ao vivo */}
        <div className="lg:col-span-2 p-5"
          style={{
            borderTop: `1px solid ${cardBorder}`,
            background: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.015)',
          }}
        >
          <p className="text-[10px] uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5"
            style={{ color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(9,9,11,0.3)' }}>
            <Eye className="w-3 h-3" /> Prévia ao vivo
          </p>
          {preview}
        </div>
      </div>
    </motion.div>
  );
}

// ── ADMIN TABS ────────────────────────────────────────────────────────────────

const ADMIN_TABS = [
  { key: 'dashboard',  label: 'Dashboard',  icon: BarChart3,    to: '/admin' },
  { key: 'eventos',    label: 'Eventos',    icon: CalendarDays, to: '/admin/eventos' },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign,   to: '/admin/financeiro' },
  { key: 'pedidos',    label: 'Pedidos',    icon: ClipboardList, to: '/admin/pedidos' },
  { key: 'pdv',        label: 'PDV',        icon: Store,         to: '/admin/pdv' },
];

// ── CONFIG INTERNAL TABS ──────────────────────────────────────────────────────

type ConfigTab = 'marca' | 'home' | 'eventos' | 'watermark' | 'sistema';

const CONFIG_TABS: { key: ConfigTab; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'marca',     label: 'Marca',       icon: Palette,     desc: 'Logo, nome e identidade visual' },
  { key: 'home',      label: 'Home',         icon: Home,        desc: 'Textos e conteúdo da página inicial' },
  { key: 'eventos',   label: 'Eventos',      icon: CalendarDays, desc: 'Textos da página de eventos' },
  { key: 'watermark', label: 'Marca d\'água', icon: Layers,     desc: 'Texto sobreposto nas fotos' },
  { key: 'sistema',   label: 'Sistema',      icon: Cpu,         desc: 'IA, banco vetorial e manutenção' },
];

// ── MAIN ──────────────────────────────────────────────────────────────────────

export function AdminConfig() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { user, token, isAdmin, loading: authLoading, getToken } = useAuth();
  const { refreshBranding } = useBranding();

  const [activeTab, setActiveTab] = useState<ConfigTab>('marca');

  // ── migration state ──
  type MigrStatus = 'idle' | 'running' | 'done' | 'error';
  const [migrStatus, setMigrStatus] = useState<MigrStatus>('idle');
  const [migrResult, setMigrResult] = useState<{
    totalEvents: number; totalPhotos: number; totalFaces: number;
    skippedPhotos: number; elapsedMs: number; errors: string[]; usedFallback?: boolean;
  } | null>(null);
  const [migrError, setMigrError] = useState('');
  const [migrProgress, setMigrProgress] = useState({ current: 0, total: 0 });

  // ── Reclaim Ownership state ──
  // ── Flatten to Global state ──
  const [flattenFromId,   setFlattenFromId]   = useState('30a616f9-1c98-46c7-97c5-ef094b22ab63');
  const [flattenStatus,   setFlattenStatus]   = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [flattenResult,   setFlattenResult]   = useState<{ migrated: string[]; tenantKeysFound: string[]; message: string } | null>(null);
  const [flattenError,    setFlattenError]    = useState('');

  // ── KV Diagnose state ──
  type DiagStatus = 'idle' | 'running' | 'done' | 'error';
  const [diagStatus, setDiagStatus] = useState<DiagStatus>('idle');
  const [diagResult, setDiagResult] = useState<{
    total: number;
    prefixCounts: Record<string, number>;
    sampleKeys: string[];
    events?: Array<{ id: string; name: string; photoCount: number; photosKey: string; hasList: boolean }>;
  } | null>(null);
  const [diagError, setDiagError] = useState('');

  // ── Face Reindex state ──
  type ReindexStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error';
  const [reindexStatus, setReindexStatus] = useState<ReindexStatus>('idle');
  const [reindexEventId, setReindexEventId] = useState<string>('');
  const [reindexProgress, setReindexProgress] = useState({ current: 0, total: 0 });
  const [reindexResult, setReindexResult] = useState<{ processed: number; noFace: number; failed: number; faces: number } | null>(null);
  const [reindexError, setReindexError] = useState('');
  const [availableEvents, setAvailableEvents] = useState<Array<{ id: string; name: string; photoCount: number }>>([]);
  const [reindexCurrentEvent, setReindexCurrentEvent] = useState<string>(''); // Nome do evento atual
  const [reindexEventIndex, setReindexEventIndex] = useState(0); // Índice do evento atual (para TODOS)
  const [reindexLiveStats, setReindexLiveStats] = useState({ processed: 0, faces: 0, noFace: 0, failed: 0 }); // Acumulado em tempo real
  const [reindexPhotoProgress, setReindexPhotoProgress] = useState({ current: 0, total: 0 }); // Progresso foto a foto

  // ── Storage Sync state ──
  type SyncStatus = 'idle' | 'running' | 'done' | 'error';
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncProgress, setSyncProgress] = useState('');
  const [syncResult, setSyncResult] = useState<{
    eventsCreated: number;
    photosImported: number;
    eventsSkipped: number;
    photosSkipped: number;
    elapsedMs: number;
    errors: string[];
  } | null>(null);
  const [syncError, setSyncError] = useState('');
  const [skipCompleteSync, setSkipCompleteSync] = useState(true);

  // ── Complete Flow state ──
  type FlowStatus = 'idle' | 'sync' | 'reindex' | 'done' | 'error';
  const [flowStatus, setFlowStatus] = useState<FlowStatus>('idle');
  const [flowStep, setFlowStep] = useState(0); // 0=idle, 1=sync, 2=reindex
  const [flowError, setFlowError] = useState('');
  const [flowResults, setFlowResults] = useState<{
    sync?: { eventsCreated: number; photosImported: number };
    reindex?: { processed: number; faces: number };
    migrate?: { embeddings: number };
  }>({});

  // ── branding state ──
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [brandingLoading, setBrandingLoading] = useState(true);

  // Marca fields
  const [appName, setAppName] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [marcaDirty, setMarcaDirty] = useState(false);
  const [savingMarca, setSavingMarca] = useState(false);

  // Watermark fields
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkProducer, setWatermarkProducer] = useState('');
  const [watermarkPhotoTag, setWatermarkPhotoTag] = useState('');
  const [watermarkTour, setWatermarkTour] = useState('');
  const [watermarkDirty, setWatermarkDirty] = useState(false);
  const [savingWatermark, setSavingWatermark] = useState(false);

  // Venue / tour identity fields
  const [venueName, setVenueName] = useState('');
  const [venueLocation, setVenueLocation] = useState('');
  const [tourLabel, setTourLabel] = useState('');
  const [homeExclusiveText, setHomeExclusiveText] = useState('');
  const [venueDirty, setVenueDirty] = useState(false);
  const [savingVenue, setSavingVenue] = useState(false);

  // Home fields
  const [heroLine1, setHeroLine1] = useState('');
  const [heroLine2, setHeroLine2] = useState('');
  const [heroLine3, setHeroLine3] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroCTA, setHeroCTA] = useState('');
  const [heroBadge, setHeroBadge] = useState('');
  // Home CTA banner fields
  const [ctaTitle1, setCtaTitle1] = useState('');
  const [ctaTitle2, setCtaTitle2] = useState('');
  const [ctaSubtitle, setCtaSubtitle] = useState('');
  const [ctaButton, setCtaButton] = useState('');
  const [homeDirty, setHomeDirty] = useState(false);
  const [savingHome, setSavingHome] = useState(false);

  // Session types
  const [eventSessionTypes, setEventSessionTypes] = useState<string[]>(['Tour']);
  const [newSessionType, setNewSessionType] = useState('');
  const [sessionTypesDirty, setSessionTypesDirty] = useState(false);
  const [savingSessionTypes, setSavingSessionTypes] = useState(false);

  // Background slideshow interval
  const [bgTransitionInterval, setBgTransitionInterval] = useState(5);
  const [bgIntervalDirty, setBgIntervalDirty] = useState(false);
  const [savingBgInterval, setSavingBgInterval] = useState(false);

  // Events fields
  const [eventsHeroTitle, setEventsHeroTitle] = useState('');
  const [eventsHeroTitleAccent, setEventsHeroTitleAccent] = useState('');
  const [eventsHeroSubtitle, setEventsHeroSubtitle] = useState('');
  const [eventsListTitle, setEventsListTitle] = useState('');
  const [eventsDirty, setEventsDirty] = useState(false);
  const [savingEvents, setSavingEvents] = useState(false);

  // Asset states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [deletingFavicon, setDeletingFavicon] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [deletingBgIdx, setDeletingBgIdx] = useState<number | null>(null);
  const [uploadingCtaBg, setUploadingCtaBg] = useState(false);
  const [deletingCtaBg, setDeletingCtaBg] = useState(false);
  const [uploadingScanner, setUploadingScanner] = useState(false);
  const [deletingScanner, setDeletingScanner] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── Colors ──
  const bg         = isDark ? '#09090F' : '#FAFBFC';
  const cardBg     = isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(9,9,11,0.09)';
  const text       = isDark ? '#ffffff' : '#09090B';
  const muted      = isDark ? 'rgba(255,255,255,0.38)' : '#71717A';
  const green      = isDark ? '#86efac' : '#166534';
  const inputBg    = isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF';
  const inputBrd   = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(9,9,11,0.12)';

  // ── Auth guard ──
  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/admin/login', { replace: true });
  }, [isAdmin, authLoading, navigate]);

  // ── Helpers ──
  const showToast = (type: 'ok' | 'err', txt: string) => {
    setToast({ type, text: txt });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load branding ──
  const loadBranding = useCallback(async () => {
    const t = await getToken();
    if (!t) return;
    try {
      const data = await api.getAdminBranding(t);
      console.log('[AdminConfig] Branding carregado:', {
        logoUrl: data.logoUrl ? '✓' : '✗',
        faviconUrl: data.faviconUrl ? '✓' : '✗',
        backgroundUrls: data.backgroundUrls?.length ?? 0,
        ctaBgUrl: data.ctaBgUrl ? '✓' : '✗',
        scannerImageUrl: data.scannerImageUrl ? '✓' : '✗',
      });
      setBranding(data);
      setAppName(data.appName);
      setPageTitle(data.pageTitle);
      setWatermarkText(data.watermarkText);
      setWatermarkProducer(data.watermarkProducer);
      setWatermarkPhotoTag(data.watermarkPhotoTag);
      setWatermarkTour(data.watermarkTour);
      setHeroLine1(data.heroLine1 ?? 'Você vibrou.');
      setHeroLine2(data.heroLine2 ?? 'Você torceu.');
      setHeroLine3(data.heroLine3 ?? 'Encontre-se.');
      setHeroSubtitle(data.heroSubtitle ?? '');
      setHeroCTA(data.heroCTA ?? 'Ver eventos');
      setHeroBadge(data.heroBadge ?? '');
      setEventsHeroTitle(data.eventsHeroTitle ?? 'Reviva seus');
      setEventsHeroTitleAccent(data.eventsHeroTitleAccent ?? 'Momentos no Allianz');
      setEventsHeroSubtitle(data.eventsHeroSubtitle ?? '');
      setEventsListTitle(data.eventsListTitle ?? 'Eventos');
      setEventSessionTypes(data.eventSessionTypes?.length ? data.eventSessionTypes : ['Tour']);
      setBgTransitionInterval(typeof data.bgTransitionInterval === 'number' ? data.bgTransitionInterval : 5);
      setVenueName(data.venueName ?? 'Allianz Parque');
      setVenueLocation(data.venueLocation ?? 'São Paulo, SP');
      setTourLabel(data.tourLabel ?? 'Tour Oficial');
      setHomeExclusiveText(data.homeExclusiveText ?? 'Exclusivo para clientes');
      setCtaTitle1(data.ctaTitle1 ?? 'Encontre seu');
      setCtaTitle2(data.ctaTitle2 ?? 'momento');
      setCtaSubtitle(data.ctaSubtitle ?? 'Reviva seus momentos especiais com a Smart Match.');
      setCtaButton(data.ctaButton ?? 'Ver eventos');
    } catch (err: any) {
      showToast('err', `Erro ao carregar: ${err.message}`);
    } finally {
      setBrandingLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (token) { loadBranding(); }
  }, [token, loadBranding]);

  // Load events when Sistema tab is active
  useEffect(() => {
    if (activeTab === 'sistema' && token) {
      loadEventsForReindex();
    }
  }, [activeTab, token]);

  // ── Save Marca ──
  const saveMarca = async () => {
    const t = await getToken(); if (!t) return;
    setSavingMarca(true);
    try {
      await api.updateAdminBranding({ appName, pageTitle }, t);
      setMarcaDirty(false);
      showToast('ok', 'Identidade da marca salva!');
      await refreshBranding();
      setBranding(prev => prev ? { ...prev, appName, pageTitle } : prev);
    } catch (err: any) { showToast('err', err.message); }
    finally { setSavingMarca(false); }
  };

  // ── Save Watermark ──
  const saveWatermark = async () => {
    const t = await getToken(); if (!t) return;
    setSavingWatermark(true);
    try {
      await api.updateAdminBranding({ watermarkText, watermarkProducer, watermarkPhotoTag, watermarkTour }, t);
      setWatermarkDirty(false);
      showToast('ok', 'Marca d\'água salva!');
      await refreshBranding();
      setBranding(prev => prev ? { ...prev, watermarkText, watermarkProducer, watermarkPhotoTag, watermarkTour } : prev);
    } catch (err: any) { showToast('err', err.message); }
    finally { setSavingWatermark(false); }
  };

  // ── Save Home ──
  const saveHome = async () => {
    const t = await getToken(); if (!t) return;
    setSavingHome(true);
    try {
      await api.updateAdminBranding({ heroLine1, heroLine2, heroLine3, heroSubtitle, heroCTA, heroBadge, ctaTitle1, ctaTitle2, ctaSubtitle, ctaButton }, t);
      setHomeDirty(false);
      showToast('ok', 'Conteúdo da Home salvo!');
      await refreshBranding();
    } catch (err: any) { showToast('err', err.message); }
    finally { setSavingHome(false); }
  };

  // ── Save Session Types ──
  const saveSessionTypes = async () => {
    const t = await getToken(); if (!t) return;
    setSavingSessionTypes(true);
    try {
      await api.updateAdminBranding({ eventSessionTypes }, t);
      setSessionTypesDirty(false);
      showToast('ok', 'Tipos de sessão salvos!');
      await refreshBranding();
    } catch (err: any) { showToast('err', err.message); }
    finally { setSavingSessionTypes(false); }
  };

  // ── Save BG Transition Interval ──
  const saveBgInterval = async () => {
    const t = await getToken(); if (!t) return;
    setSavingBgInterval(true);
    try {
      await api.updateAdminBranding({ bgTransitionInterval }, t);
      setBgIntervalDirty(false);
      showToast('ok', 'Intervalo de transição salvo!');
      await refreshBranding();
    } catch (err: any) { showToast('err', err.message); }
    finally { setSavingBgInterval(false); }
  };

  // ── Save Events ──
  const saveEvents = async () => {
    const t = await getToken(); if (!t) return;
    setSavingEvents(true);
    try {
      await api.updateAdminBranding({ eventsHeroTitle, eventsHeroTitleAccent, eventsHeroSubtitle, eventsListTitle }, t);
      setEventsDirty(false);
      showToast('ok', 'Conteúdo de Eventos salvo!');
      await refreshBranding();
    } catch (err: any) { showToast('err', err.message); }
    finally { setSavingEvents(false); }
  };

  // ── Save Venue ──
  const saveVenue = async () => {
    const t = await getToken(); if (!t) return;
    setSavingVenue(true);
    try {
      await api.updateAdminBranding({ venueName, venueLocation, tourLabel, homeExclusiveText }, t);
      setVenueDirty(false);
      showToast('ok', 'Identidade do local/tour salva!');
      await refreshBranding();
    } catch (err: any) { showToast('err', err.message); }
    finally { setSavingVenue(false); }
  };

  // ── Upload asset ──
  const uploadAsset = async (type: 'logo' | 'favicon' | 'background', file: File) => {
    const t = await getToken(); if (!t) return;
    if (type === 'logo') setUploadingLogo(true);
    else if (type === 'favicon') setUploadingFavicon(true);
    else setUploadingBg(true);
    try {
      const opts = type === 'background' ? { maxDim: 1920, targetKB: 400 } : type === 'logo' ? { maxDim: 480, targetKB: 200 } : { maxDim: 64, targetKB: 50 };
      const { base64, mimeType } = await compressImage(file, opts);
      await api.uploadBrandingAsset({ type, base64, mimeType }, t);
      showToast('ok', type === 'logo' ? 'Logotipo enviado!' : type === 'favicon' ? 'Favicon enviado!' : 'Background adicionado!');
      await refreshBranding();
      await loadBranding();
    } catch (err: any) { showToast('err', `Upload falhou: ${err.message}`); }
    finally {
      if (type === 'logo') setUploadingLogo(false);
      else if (type === 'favicon') setUploadingFavicon(false);
      else setUploadingBg(false);
    }
  };

  // ── Delete asset ──
  const deleteAsset = async (asset: 'logo' | 'favicon') => {
    const t = await getToken(); if (!t) return;
    if (asset === 'logo') setDeletingLogo(true); else setDeletingFavicon(true);
    try {
      await api.deleteBrandingAsset(asset, t);
      showToast('ok', `${asset === 'logo' ? 'Logotipo' : 'Favicon'} removido.`);
      await refreshBranding(); await loadBranding();
    } catch (err: any) { showToast('err', err.message); }
    finally { if (asset === 'logo') setDeletingLogo(false); else setDeletingFavicon(false); }
  };

  const deleteBg = async (idx: number) => {
    const t = await getToken(); if (!t) return;
    setDeletingBgIdx(idx);
    try {
      await api.deleteBrandingBackground(idx, t);
      showToast('ok', 'Background removido.');
      await refreshBranding(); await loadBranding();
    } catch (err: any) { showToast('err', err.message); }
    finally { setDeletingBgIdx(null); }
  };

  const uploadCtaBg = async (file: File) => {
    const t = await getToken(); if (!t) return;
    setUploadingCtaBg(true);
    try {
      const { base64, mimeType } = await compressImage(file, { maxDim: 1920, targetKB: 400 });
      await api.uploadBrandingAsset({ type: 'cta-background', base64, mimeType }, t);
      showToast('ok', 'Imagem do banner CTA enviada!');
      await refreshBranding();
      await loadBranding();
    } catch (err: any) { showToast('err', `Upload falhou: ${err.message}`); }
    finally { setUploadingCtaBg(false); }
  };

  const deleteCtaBg = async () => {
    const t = await getToken(); if (!t) return;
    setDeletingCtaBg(true);
    try {
      await api.deleteBrandingAsset('cta-background', t);
      showToast('ok', 'Imagem do banner CTA removida.');
      await refreshBranding(); await loadBranding();
    } catch (err: any) { showToast('err', err.message); }
    finally { setDeletingCtaBg(false); }
  };

  const uploadScannerImage = async (file: File) => {
    const t = await getToken(); if (!t) return;
    setUploadingScanner(true);
    try {
      const { base64, mimeType } = await compressImage(file, { maxDim: 600, targetKB: 150 });
      await api.uploadBrandingAsset({ type: 'scanner-image', base64, mimeType }, t);
      showToast('ok', 'Foto do scanner enviada!');
      await refreshBranding();
      await loadBranding();
    } catch (err: any) { showToast('err', `Upload falhou: ${err.message}`); }
    finally { setUploadingScanner(false); }
  };

  const deleteScannerImage = async () => {
    const t = await getToken(); if (!t) return;
    setDeletingScanner(true);
    try {
      await api.deleteBrandingAsset('scanner-image', t);
      showToast('ok', 'Foto do scanner removida.');
      await refreshBranding(); await loadBranding();
    } catch (err: any) { showToast('err', err.message); }
    finally { setDeletingScanner(false); }
  };

  // ── Flatten to Global ──
  const runFlattenToGlobal = async () => {
    const t = await getToken(); if (!t) return;
    setFlattenStatus('running');
    setFlattenResult(null);
    setFlattenError('');
    try {
      const data = await api.flattenToGlobal(flattenFromId.trim() || undefined, t);
      if (data.error) throw new Error(data.error);
      setFlattenResult(data);
      setFlattenStatus('done');
      showToast('ok', data.migrated.length > 0 ? `✓ Migração concluída: ${data.migrated.join(', ')}` : '✓ Dados já estavam globais');
    } catch (err: any) {
      setFlattenError(err.message ?? 'Erro desconhecido');
      setFlattenStatus('error');
    }
  };

  // ── diagnóstico KV ──
  const runDiagnose = async () => {
    const t = await getToken(); if (!t) return;
    setDiagStatus('running');
    setDiagResult(null);
    setDiagError('');
    try {
      const data = await api.diagnoseKv(t);
      if (data.error) throw new Error(data.error);
      console.log('[AdminConfig] Diagnóstico KV:', data);
      console.log(`[AdminConfig] Eventos retornados: ${data.events?.length ?? 0}`);
      setDiagResult(data);
      setDiagStatus('done');
    } catch (err: any) {
      setDiagError(err.message ?? 'Erro desconhecido');
      setDiagStatus('error');
    }
  };

  // ── migrar faces KV → pgvector ──
  const runMigration = async () => {
    const t = await getToken(); if (!t) return;
    setMigrStatus('running');
    setMigrResult(null);
    setMigrError('');
    setMigrProgress({ current: 0, total: 0 });
    try {
      const { stats } = await api.migrateFacesToPgvector(t);
      setMigrResult(stats);
      setMigrStatus('done');
    } catch (err: any) {
      setMigrError(err.message ?? 'Erro desconhecido');
      setMigrStatus('error');
    }
  };

  // ── Load events for reindex ──
  const loadEventsForReindex = async () => {
    const t = await getToken(); if (!t) return;
    try {
      const { events } = await api.getAdminEvents(t);
      // Mostra todos os eventos, mesmo sem fotos (para permitir reindexação)
      setAvailableEvents(events.map(e => ({
        id: e.id,
        name: e.name,
        photoCount: e.photoCount || 0,
      })));
    } catch (err: any) {
      console.error('Erro ao carregar eventos:', err);
    }
  };

  // ── Helper: indexa um evento foto a foto, atualizando progresso em tempo real ──
  /** Aguarda N ms — throttle entre requisições para evitar rate-limit */
  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  /**
   * Executa fn até maxAttempts vezes.
   * Reinicia apenas em erros de rede (TypeError: Failed to fetch / NetworkError).
   * Erros HTTP (4xx/5xx) são relançados imediatamente.
   */
  const withRetry = async <T,>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    baseDelayMs = 800,
  ): Promise<T> => {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastErr = err;
        const isNetwork =
          err instanceof TypeError ||
          String(err?.message ?? '').toLowerCase().includes('fetch') ||
          String(err?.message ?? '').toLowerCase().includes('network');
        if (!isNetwork || attempt === maxAttempts) throw err;
        const delay = baseDelayMs * attempt;
        console.warn(`[retry] Tentativa ${attempt}/${maxAttempts} falhou (${err.message}). Aguardando ${delay}ms…`);
        await sleep(delay);
      }
    }
    throw lastErr;
  };

  // ── Helper: indexa um evento foto a foto, atualizando progresso em tempo real ──
  const reindexEventByPhoto = async (
    eventId: string,
    token: string,
    onPhotoProgress: (current: number, total: number) => void,
    onStats: (delta: { processed: number; faces: number; noFace: number; failed: number }) => void,
  ) => {
    // 1. Buscar lista de IDs — com retry em falhas de rede
    const { photoIds, total } = await withRetry(
      () => api.getEventPhotoIds(eventId, token),
      3,
      1000,
    );
    onPhotoProgress(0, total);

    let processed = 0, faces = 0, noFace = 0, failed = 0;

    // 2. Indexar foto a foto (throttle 60 ms entre chamadas para não saturar a Edge Function)
    for (let j = 0; j < photoIds.length; j++) {
      try {
        const res = await withRetry(
          () => api.reindexPhoto(eventId, photoIds[j], token),
          2,
          500,
        );
        if (res.noFace || res.notFound) {
          noFace++;
        } else if (res.success) {
          processed++;
          faces += res.faces;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      onPhotoProgress(j + 1, total);
      onStats({ processed, faces, noFace, failed });

      // Pequena pausa para não sobrecarregar a Edge Function do Supabase
      if (j < photoIds.length - 1) await sleep(60);
    }

    return { processed, faces, noFace, failed, total };
  };

  // ── Reindex faces for an event (server-side via pgvector) ──
  const startReindex = async () => {
    if (!reindexEventId) {
      setReindexError('Selecione um evento');
      return;
    }
    const t = await getToken(); if (!t) return;

    setReindexStatus('processing');
    setReindexResult(null);
    setReindexError('');
    setReindexProgress({ current: 0, total: 0 });
    setReindexPhotoProgress({ current: 0, total: 0 });
    setReindexLiveStats({ processed: 0, faces: 0, noFace: 0, failed: 0 });

    const event = availableEvents.find(e => e.id === reindexEventId);
    setReindexCurrentEvent(event?.name ?? reindexEventId);

    try {
      const stats = await reindexEventByPhoto(
        reindexEventId,
        t,
        (cur, tot) => setReindexPhotoProgress({ current: cur, total: tot }),
        ({ processed, faces, noFace, failed }) =>
          setReindexLiveStats({ processed, faces, noFace, failed }),
      );

      const finalResult = { processed: stats.processed, noFace: stats.noFace, failed: stats.failed, faces: stats.faces };
      setReindexResult(finalResult);
      setReindexProgress({ current: 1, total: 1 });
      setReindexStatus('done');
      showToast('ok', `Reindexação concluída: ${stats.faces} faces em ${stats.total} fotos`);
    } catch (err: any) {
      setReindexError(err.message ?? 'Erro desconhecido');
      setReindexStatus('error');
    }
  };

  // ── Reindex ALL events (foto a foto por evento) ──
  const startReindexAll = async () => {
    if (availableEvents.length === 0) {
      setReindexError('Nenhum evento disponível');
      return;
    }
    const t = await getToken(); if (!t) return;

    setReindexStatus('processing');
    setReindexResult(null);
    setReindexError('');
    setReindexProgress({ current: 0, total: availableEvents.length });
    setReindexPhotoProgress({ current: 0, total: 0 });
    setReindexEventIndex(0);
    setReindexLiveStats({ processed: 0, faces: 0, noFace: 0, failed: 0 });

    try {
      let totalProcessed = 0;
      let totalNoFace = 0;
      let totalFailed = 0;
      let totalFacesAll = 0;

      for (let i = 0; i < availableEvents.length; i++) {
        const event = availableEvents[i];
        setReindexEventIndex(i + 1);
        setReindexCurrentEvent(event.name);
        setReindexPhotoProgress({ current: 0, total: 0 });

        try {
          await reindexEventByPhoto(
            event.id,
            t,
            (cur, tot) => setReindexPhotoProgress({ current: cur, total: tot }),
            ({ processed, faces, noFace, failed }) => {
              setReindexLiveStats({
                processed: totalProcessed + processed,
                faces: totalFacesAll + faces,
                noFace: totalNoFace + noFace,
                failed: totalFailed + failed,
              });
            },
          ).then(stats => {
            totalProcessed += stats.processed;
            totalNoFace    += stats.noFace;
            totalFailed    += stats.failed;
            totalFacesAll  += stats.faces;
          });
        } catch (err: any) {
          console.error(`Erro ao processar evento ${event.id}:`, err);
          totalFailed += 1;
        }

        setReindexProgress({ current: i + 1, total: availableEvents.length });
        setReindexLiveStats({ processed: totalProcessed, faces: totalFacesAll, noFace: totalNoFace, failed: totalFailed });
      }

      setReindexResult({ processed: totalProcessed, noFace: totalNoFace, failed: totalFailed, faces: totalFacesAll });
      setReindexStatus('done');
      setReindexCurrentEvent('');
      showToast('ok', `Reindexação total concluída: ${totalFacesAll} faces em ${availableEvents.length} eventos`);
    } catch (err: any) {
      setReindexError(err.message ?? 'Erro desconhecido');
      setReindexStatus('error');
      setReindexCurrentEvent('');
    }
  };

  // ── COMPLETE FLOW: Sync → Reindex (pipeline otimizado) ──
  const runCompleteFlow = async () => {
    const t = await getToken(); if (!t) return;
    
    setFlowStatus('sync');
    setFlowStep(1);
    setFlowError('');
    setFlowResults({});
    setSyncProgress('');
    setReindexProgress({ current: 0, total: 0 });
    setReindexPhotoProgress({ current: 0, total: 0 });
    setReindexCurrentEvent('');
    setReindexLiveStats({ processed: 0, faces: 0, noFace: 0, failed: 0 });
    
    try {
      // ═══════════════════════════════════════════════════════════════════════
      // STEP 1: Sync Storage → KV
      // ═══════════════════════════════════════════════════════════════════════
      setSyncStatus('running');
      setSyncProgress('Varrendo pastas do Storage S3...');
      const syncRes = await api.syncStorage(t, skipCompleteSync);
      setSyncStatus('done');
      setSyncResult(syncRes.stats);
      
      setFlowResults(prev => ({ 
        ...prev, 
        sync: { 
          eventsCreated: syncRes.stats.eventsCreated, 
          photosImported: syncRes.stats.photosImported 
        } 
      }));
      
      // Se não importou fotos, para aqui
      if (syncRes.stats.photosImported === 0) {
        setFlowStatus('done');
        showToast('ok', 'Fluxo concluído: nenhuma foto nova para processar');
        return;
      }
      
      // Recarrega lista de eventos
      await loadEventsForReindex();
      
      // ═══════════════════════════════════════════════════════════════════════
      // STEP 2: Reindex ALL events (server-side, direto no pgvector)
      // ═══════════════════════════════════════════════════════════════════════
      setFlowStatus('reindex');
      setFlowStep(2);
      setReindexStatus('processing');
      
      // Pega eventos atualizados
      const t = await getToken(); if (!t) return;
      const eventsRes = await api.getAdminEvents(t);
      const events = eventsRes.events;
      
      let totalProcessed = 0;
      let totalFaces = 0;
      let totalFailed = 0;
      
      setReindexProgress({ current: 0, total: events.length });
      setReindexPhotoProgress({ current: 0, total: 0 });
      
      // Processa evento por evento (foto a foto)
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        setReindexCurrentEvent(event.name);
        setReindexEventIndex(i + 1);
        setReindexPhotoProgress({ current: 0, total: 0 });

        try {
          await reindexEventByPhoto(
            event.id,
            t,
            (cur, tot) => setReindexPhotoProgress({ current: cur, total: tot }),
            ({ processed, faces, noFace, failed }) => {
              // processed/faces/noFace/failed são cumulativos DENTRO do evento atual
              setReindexLiveStats({
                processed: totalProcessed + processed,
                faces: totalFaces + faces,
                noFace: totalFailed + noFace,
                failed: totalFailed + failed,
              });
            },
          ).then(stats => {
            totalProcessed += stats.processed;
            totalFaces += stats.faces;
            totalFailed += stats.failed;
          });
        } catch (err: any) {
          console.error(`Erro ao processar evento ${event.id}:`, err);
          totalFailed += 1;
        }

        setReindexProgress({ current: i + 1, total: events.length });
      }
      
      setReindexStatus('done');
      setReindexResult({ processed: totalProcessed, noFace: 0, failed: totalFailed, faces: totalFaces });
      setReindexCurrentEvent('');
      setFlowResults(prev => ({ ...prev, reindex: { processed: totalProcessed, faces: totalFaces } }));
      
      // Já indexamos no pgvector diretamente, então não precisa do step 3!
      setFlowStatus('done');
      showToast('ok', `✅ Fluxo completo: ${totalFaces} faces indexadas no pgvector em ${events.length} eventos!`);
      
    } catch (err: any) {
      console.error('Erro no fluxo completo:', err);
      setFlowError(err.message ?? 'Erro desconhecido');
      setFlowStatus('error');
      showToast('err', `Erro no fluxo: ${err.message ?? 'desconhecido'}`);
    }
  };

  // ── Sync Storage → KV ──
  const runStorageSync = async () => {
    const t = await getToken(); if (!t) return;
    setSyncStatus('running');
    setSyncResult(null);
    setSyncError('');
    setSyncProgress('Varrendo pastas do Storage S3...');
    
    try {
      const res = await api.syncStorage(t, skipCompleteSync);
      setSyncResult(res.stats);
      setSyncStatus('done');
      setSyncProgress(`Concluído: ${res.stats.eventsCreated} evento(s), ${res.stats.photosImported} foto(s)`);
      if (res.stats.eventsCreated > 0 || res.stats.photosImported > 0) {
        showToast('ok', `Sincronizado: ${res.stats.eventsCreated} evento(s), ${res.stats.photosImported} foto(s)`);
      }
    } catch (err: any) {
      setSyncError(err.message ?? 'Erro desconhecido');
      setSyncStatus('error');
    } finally {
      setTimeout(() => setSyncProgress(''), 3000);
    }
  };

  // ── Render ──
  if (authLoading || brandingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: bg }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: green }} />
      </div>
    );
  }

  return (
    <div className="pt-20 pb-20 min-h-screen" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* ── Page Header ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.07)' }}>
              <Settings className="w-4.5 h-4.5" style={{ color: green }} />
            </div>
            <h1 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 900, fontSize: 'clamp(1.4rem,3vw,2rem)', color: text, letterSpacing: '-0.02em' }}>
              Configurações
            </h1>
          </div>
          <p className="text-sm ml-12" style={{ color: muted }}>Personalize cada detalhe da sua plataforma SaaS</p>
        </motion.div>

        {/* ── Admin TabNav (sem Config) ── */}
        <TabNav className="mb-8" active="config-none" tabs={ADMIN_TABS} />

        {/* ── Config internal tabs ── */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1 justify-center">
          {CONFIG_TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all cursor-pointer flex-shrink-0"
                style={{
                  background: active
                    ? (isDark ? 'rgba(134,239,172,0.12)' : 'rgba(22,101,52,0.1)')
                    : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)'),
                  border: `1px solid ${active
                    ? (isDark ? 'rgba(134,239,172,0.25)' : 'rgba(22,101,52,0.2)')
                    : cardBorder}`,
                  color: active ? green : muted,
                  fontWeight: active ? 700 : 500,
                }}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {/* Dirty indicator */}
                {((tab.key === 'marca' && marcaDirty) ||
                  (tab.key === 'home' && homeDirty) ||
                  (tab.key === 'eventos' && (eventsDirty || venueDirty || sessionTypesDirty)) ||
                  (tab.key === 'watermark' && watermarkDirty)) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* ════════════════════ TAB: MARCA ════════════════════ */}
        <AnimatePresence mode="wait">
          {activeTab === 'marca' && (
            <motion.div key="marca" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Identidade textual */}
                <SectionCard icon={Type} title="Identidade da Marca" subtitle="Nome e textos exibidos na plataforma"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                  <div className="space-y-4">
                    <FieldRow label="Nome da aplicação" hint="Exibido no cabeçalho e e-mails"
                      value={appName} onChange={v => { setAppName(v); setMarcaDirty(true); }}
                      placeholder="Smart Match" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow label="Título da aba (browser)" hint="Tag <title> — aparece na aba do navegador"
                      value={pageTitle} onChange={v => { setPageTitle(v); setMarcaDirty(true); }}
                      placeholder="Smart Match – Tour Palmeiras" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <SaveBar dirty={marcaDirty} saving={savingMarca} onSave={saveMarca} green={green} isDark={isDark} />
                  </div>
                </SectionCard>

                {/* Preview */}
                <SectionCard icon={Monitor} title="Pré-visualização" subtitle="Como sua marca aparece na plataforma"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                  <div className="space-y-3">
                    {/* Browser tab mock */}
                    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${cardBorder}` }}>
                      <div className="px-3 py-2 flex items-center gap-2"
                        style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                        <div className="flex gap-1.5">
                          {['#ff5f57','#febc2e','#28c840'].map(c => (
                            <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                          ))}
                        </div>
                        <div className="flex-1 flex items-center gap-2 px-3 py-1 rounded-lg text-xs"
                          style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'white', color: muted }}>
                          {branding?.faviconUrl && <img src={branding.faviconUrl} alt="fav" className="w-3.5 h-3.5 object-contain" />}
                          <span className="truncate" style={{ color: text, fontSize: 11 }}>{pageTitle || 'Smart Match'}</span>
                        </div>
                      </div>
                      <div className="px-4 py-3 flex items-center gap-3"
                        style={{ background: isDark ? '#0f0f1a' : '#09090B' }}>
                        {branding?.logoUrl
                          ? <img src={branding.logoUrl} alt="logo" className="h-7 object-contain" />
                          : <div className="flex items-center gap-2">
                              <Camera className="w-4 h-4 text-white/80" />
                              <span className="text-white font-black text-sm" style={{ fontFamily: "'Montserrat',sans-serif" }}>
                                {appName || 'Smart Match'}
                              </span>
                            </div>}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Logotipo */}
                <SectionCard icon={ImageIcon} title="Logotipo" subtitle="PNG ou SVG com fundo transparente • max 2 MB"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                  {branding?.logoUrl ? (
                    <div>
                      <div className="relative rounded-xl overflow-hidden group mb-3"
                        style={{ maxWidth: 240, aspectRatio: '3/1', border: `1px solid ${cardBorder}` }}>
                        <img src={branding.logoUrl} alt="logo" className="w-full h-full object-contain p-2"
                          style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                          <button onClick={() => deleteAsset('logo')} disabled={deletingLogo}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
                            style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>
                            {deletingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            Remover
                          </button>
                        </div>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: green }}>
                        <Upload className="w-3 h-3" /> Trocar logotipo
                        <input type="file" accept="image/png,image/svg+xml,image/webp" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadAsset('logo', f); e.target.value = ''; }} />
                      </label>
                    </div>
                  ) : (
                    <DropZone label="Clique ou arraste (PNG/SVG, 240×80 px)"
                      accept="image/png,image/svg+xml,image/webp"
                      onFile={f => uploadAsset('logo', f)} uploading={uploadingLogo}
                      isDark={isDark} green={green} muted={muted} inputBg={inputBg} border={inputBrd} />
                  )}
                  <p className="text-[11px] mt-3" style={{ color: muted }}>Recomendado: 240 × 80 px, fundo transparente.</p>
                </SectionCard>

                {/* Favicon */}
                <SectionCard icon={Globe} title="Favicon" subtitle="Ícone exibido na aba do navegador"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                  {branding?.faviconUrl ? (
                    <div>
                      <div className="relative rounded-xl overflow-hidden group mb-3"
                        style={{ width: 72, aspectRatio: '1', border: `1px solid ${cardBorder}` }}>
                        <img src={branding.faviconUrl} alt="favicon" className="w-full h-full object-contain p-2"
                          style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                          <button onClick={() => deleteAsset('favicon')} disabled={deletingFavicon}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-xs font-bold"
                            style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>
                            {deletingFavicon ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: green }}>
                        <Upload className="w-3 h-3" /> Trocar favicon
                        <input type="file" accept="image/png,image/x-icon" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadAsset('favicon', f); e.target.value = ''; }} />
                      </label>
                    </div>
                  ) : (
                    <DropZone label="Clique ou arraste (PNG/ICO, 32×32 px)"
                      accept="image/png,image/x-icon,image/jpeg"
                      onFile={f => uploadAsset('favicon', f)} uploading={uploadingFavicon}
                      isDark={isDark} green={green} muted={muted} inputBg={inputBg} border={inputBrd} />
                  )}
                  <p className="text-[11px] mt-3" style={{ color: muted }}>Recomendado: 32 × 32 px em formato PNG.</p>
                </SectionCard>

                {/* Backgrounds — full width */}
                <div className="lg:col-span-2">
                  <SectionCard icon={Droplets} title="Fotos de Background"
                    subtitle="Imagens de fundo usadas na Home, Eventos e páginas públicas"
                    isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                    {(branding?.backgroundUrls?.length ?? 0) > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                        {branding!.backgroundUrls.map((url, idx) => (
                          <ImagePreview key={`${url}-${idx}`} url={url} label={`BG ${idx + 1}`}
                            onDelete={() => deleteBg(idx)} deleting={deletingBgIdx === idx} />
                        ))}
                        <div
                          onClick={() => !uploadingBg && document.getElementById('bg-add-input')?.click()}
                          className="flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-all"
                          style={{ aspectRatio: '16/9', border: `2px dashed ${inputBrd}`, background: inputBg }}
                        >
                          {uploadingBg ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: green }} /> : <Plus className="w-5 h-5" style={{ color: muted }} />}
                          <span className="text-[11px]" style={{ color: muted }}>{uploadingBg ? 'Enviando...' : 'Adicionar'}</span>
                        </div>
                      </div>
                    )}
                    {(!branding?.backgroundUrls?.length) && (
                      <DropZone label="Arraste fotos de fundo ou clique para selecionar (JPG/PNG)"
                        accept="image/*" onFile={f => uploadAsset('background', f)} uploading={uploadingBg}
                        isDark={isDark} green={green} muted={muted} inputBg={inputBg} border={inputBrd} />
                    )}
                    <input id="bg-add-input" type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadAsset('background', f); e.target.value = ''; }} />
                    <p className="text-[11px] mt-3" style={{ color: muted }}>
                      A primeira imagem é usada como destaque no hero. Sugerido: 1920×1080 px, JPG.
                    </p>

                    {/* ── Intervalo de transição ── */}
                    <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${cardBorder}` }}>
                      <label className="block text-[11px] font-bold mb-3 uppercase tracking-wider flex items-center gap-1.5" style={{ color: muted }}>
                        <span>⏱</span> Tempo entre slides (segundos)
                      </label>

                      {/* Slider */}
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min={2}
                          max={30}
                          step={1}
                          value={bgTransitionInterval}
                          onChange={e => { setBgTransitionInterval(Number(e.target.value)); setBgIntervalDirty(true); }}
                          className="flex-1"
                          style={{ accentColor: green }}
                        />
                        <div
                          className="flex items-center justify-center rounded-xl text-sm font-bold min-w-[56px] h-10"
                          style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.07)', border: `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.15)'}`, color: green, fontFamily: "'Montserrat',sans-serif" }}
                        >
                          {bgTransitionInterval}s
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {[3, 5, 8, 10, 15, 20].map(v => (
                          <button
                            key={v}
                            onClick={() => { setBgTransitionInterval(v); setBgIntervalDirty(true); }}
                            className="px-3 py-1.5 rounded-lg text-xs transition-all"
                            style={{
                              background: bgTransitionInterval === v
                                ? isDark ? 'rgba(134,239,172,0.12)' : 'rgba(22,101,52,0.1)'
                                : inputBg,
                              border: `1px solid ${bgTransitionInterval === v
                                ? isDark ? 'rgba(134,239,172,0.3)' : 'rgba(22,101,52,0.2)'
                                : inputBrd}`,
                              color: bgTransitionInterval === v ? green : muted,
                              fontWeight: bgTransitionInterval === v ? 700 : 500,
                            }}
                          >
                            {v}s
                          </button>
                        ))}
                      </div>

                      <SaveBar dirty={bgIntervalDirty} saving={savingBgInterval} onSave={saveBgInterval} green={green} isDark={isDark} />
                    </div>
                  </SectionCard>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════════════════ TAB: HOME ════════════════════ */}
          {activeTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="space-y-5">

                {/* ── Aviso informativo ── */}
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
                  style={{ background: isDark ? 'rgba(134,239,172,0.05)' : 'rgba(22,101,52,0.04)', border: `1px solid ${isDark ? 'rgba(134,239,172,0.12)' : 'rgba(22,101,52,0.12)'}` }}>
                  <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: green }} />
                  <p className="text-xs leading-relaxed" style={{ color: muted }}>
                    As seções abaixo estão na mesma ordem em que aparecem na página Home. Edite os campos e veja a prévia ao vivo antes de salvar.
                  </p>
                </div>

                {/* ══ IMAGENS DA HOME ══ */}
                <SectionCard icon={ImageIcon} title="Imagens da Home"
                  subtitle="Fotos de fundo do hero e imagem da animação de scanner facial"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                  <div className="space-y-5">

                    {/* ── Backgrounds do Hero ── */}
                    <div>
                      <p className="text-[11px] uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5" style={{ color: muted }}>
                        <Droplets className="w-3.5 h-3.5" /> Fotos de Background (Hero + Eventos)
                      </p>
                      {(branding?.backgroundUrls?.length ?? 0) > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                          {branding!.backgroundUrls.map((url, idx) => (
                            <ImagePreview key={`${url}-${idx}`} url={url} label={`BG ${idx + 1}`}
                              onDelete={() => deleteBg(idx)} deleting={deletingBgIdx === idx} />
                          ))}
                          <div
                            onClick={() => !uploadingBg && document.getElementById('home-bg-add')?.click()}
                            className="flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-all"
                            style={{ aspectRatio: '16/9', border: `2px dashed ${inputBrd}`, background: inputBg }}
                          >
                            {uploadingBg ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: green }} /> : <Plus className="w-5 h-5" style={{ color: muted }} />}
                            <span className="text-[11px]" style={{ color: muted }}>{uploadingBg ? 'Enviando...' : 'Adicionar'}</span>
                          </div>
                        </div>
                      )}
                      {(!branding?.backgroundUrls?.length) && (
                        <DropZone label="Arraste fotos de fundo ou clique para selecionar (JPG/PNG)"
                          accept="image/*" onFile={f => uploadAsset('background', f)} uploading={uploadingBg}
                          isDark={isDark} green={green} muted={muted} inputBg={inputBg} border={inputBrd} />
                      )}
                      <input id="home-bg-add" type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadAsset('background', f); e.target.value = ''; }} />
                      <p className="text-[11px] mt-2" style={{ color: muted }}>
                        A 1ª imagem é usada no hero da Home e da página Eventos. Sugerido: 1920×1080 px, JPG.
                      </p>
                    </div>

                    {/* ── Foto do Scanner Facial ── */}
                    <div>
                      <p className="text-[11px] uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5" style={{ color: muted }}>
                        <Scan className="w-3.5 h-3.5" /> Foto da Animação de Scanner Facial
                      </p>
                      {branding?.scannerImageUrl ? (
                        <div className="space-y-2">
                          <div className="relative rounded-xl overflow-hidden group" style={{ width: 160, height: 160, border: `1px solid ${cardBorder}` }}>
                            <img src={branding.scannerImageUrl} alt="Scanner" className="w-full h-full object-cover rounded-full" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all flex items-center justify-center gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={deleteScannerImage} disabled={deletingScanner}
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                                style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
                              >
                                {deletingScanner ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                Remover
                              </motion.button>
                              <label
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                style={{ background: 'rgba(22,101,52,0.9)', color: '#fff' }}
                              >
                                <Upload className="w-3 h-3" /> Trocar
                                <input type="file" accept="image/*" className="hidden"
                                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadScannerImage(f); e.target.value = ''; }} />
                              </label>
                            </div>
                          </div>
                          <p className="text-[11px]" style={{ color: muted }}>Passe o mouse para trocar ou remover.</p>
                        </div>
                      ) : (
                        <div>
                          <DropZone label="Clique ou arraste a foto (rosto do torcedor · JPG/PNG)"
                            accept="image/*" onFile={uploadScannerImage} uploading={uploadingScanner}
                            isDark={isDark} green={green} muted={muted} inputBg={inputBg} border={inputBrd} />
                          <p className="text-[11px] mt-2" style={{ color: muted }}>
                            Foto exibida dentro do círculo com animação de scanner facial na Home. Recomendado: retrato/selfie, 400×400 px.
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </SectionCard>

                {/* ══ SEÇÃO 1: HERO ══ */}
                <PageSection
                  number={1}
                  icon={FileText}
                  title="Hero — Tela inicial"
                  desc="Primeira coisa que o visitante vê ao abrir o site"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text} muted={muted}
                  preview={
                    <div className="rounded-xl overflow-hidden relative" style={{ aspectRatio: '4/3', background: '#07070d', minHeight: 160 }}>
                      {branding?.backgroundUrls?.[0] && (
                        <img src={branding.backgroundUrls[0]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                      )}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,rgba(8,8,14,0.95) 0%,rgba(8,8,14,0.7) 100%)' }} />
                      <div className="absolute inset-0 flex flex-col justify-center px-5 py-4">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full mb-3 self-start"
                          style={{ background: 'rgba(22,101,52,0.18)', border: '1px solid rgba(22,101,52,0.4)' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00FF7F' }} />
                          <span className="text-[8px] tracking-widest uppercase font-bold" style={{ color: '#00FF7F' }}>
                            {heroBadge || 'Allianz Parque · Tour Oficial'}
                          </span>
                        </div>
                        {/* Headline */}
                        <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 900, lineHeight: 1.08, fontSize: '1.15rem' }}>
                          <div style={{ color: '#fff' }}>{heroLine1 || 'Você vibrou.'}</div>
                          <div style={{ color: '#fff' }}>{heroLine2 || 'Você torceu.'}</div>
                          <div style={{ color: '#00FF7F' }}>{heroLine3 || 'Encontre-se.'}</div>
                        </div>
                        {/* Subtítulo */}
                        <p className="text-[9px] mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)', maxWidth: '80%' }}>
                          {heroSubtitle || 'Nossa IA varre milhares de fotos e encontra você em segundos.'}
                        </p>
                        {/* CTA */}
                        <div className="mt-3">
                          <span className="text-[9px] px-3 py-1.5 rounded-lg font-bold inline-block"
                            style={{ background: 'linear-gradient(135deg,#166534,#15803d)', color: '#fff' }}>
                            {heroCTA || 'Ver eventos'}
                          </span>
                        </div>
                      </div>
                    </div>
                  }
                >
                  {/* Badge */}
                  <FieldRow
                    label="🏷️ Etiqueta acima do título"
                    hint="Texto pequeno em VERDE sobre o headline. Ex: Allianz Parque · Tour Oficial"
                    value={heroBadge} onChange={v => { setHeroBadge(v); setHomeDirty(true); }}
                    placeholder="Allianz Parque · Tour Oficial do Palmeiras"
                    isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                  {/* Headline */}
                  <div className="rounded-xl p-3 space-y-3" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${cardBorder}` }}>
                    <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: muted }}>📝 Título principal (3 linhas)</p>
                    <FieldRow
                      label="Linha 1 — texto branco"
                      value={heroLine1} onChange={v => { setHeroLine1(v); setHomeDirty(true); }}
                      placeholder="Você vibrou." isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow
                      label="Linha 2 — texto branco"
                      value={heroLine2} onChange={v => { setHeroLine2(v); setHomeDirty(true); }}
                      placeholder="Você torceu." isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow
                      label="Linha 3 — destaque VERDE"
                      hint="Esta linha aparece em verde elétrico para chamar atenção"
                      value={heroLine3} onChange={v => { setHeroLine3(v); setHomeDirty(true); }}
                      placeholder="Encontre-se." isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                  </div>
                  {/* Subtítulo */}
                  <FieldRow
                    label="📄 Subtítulo / texto de apoio"
                    hint="Parágrafo curto abaixo do título, explica o serviço"
                    value={heroSubtitle} onChange={v => { setHeroSubtitle(v); setHomeDirty(true); }}
                    placeholder="Nossa IA varre milhares de fotos e encontra você em segundos." textarea
                    isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                  {/* Botão */}
                  <FieldRow
                    label="🔘 Texto do botão principal"
                    hint="Botão verde que leva para a página de eventos"
                    value={heroCTA} onChange={v => { setHeroCTA(v); setHomeDirty(true); }}
                    placeholder="Ver eventos"
                    isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                  <SaveBar dirty={homeDirty} saving={savingHome} onSave={saveHome} green={green} isDark={isDark} />
                </PageSection>

                {/* ══ SEÇÃO 2: BANNER CTA ══ */}
                <PageSection
                  number={2}
                  icon={Layout}
                  title="Banner de Chamada para Ação (CTA)"
                  desc="Seção na parte inferior da Home que convida o usuário a comprar"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text} muted={muted}
                  preview={
                    <div className="rounded-xl overflow-hidden relative" style={{ background: isDark ? 'rgba(22,101,52,0.08)' : 'rgba(22,101,52,0.05)', border: `1px solid ${isDark ? 'rgba(22,101,52,0.2)' : 'rgba(22,101,52,0.12)'}` }}>
                      {/* BG image thumbnail */}
                      {branding?.ctaBgUrl && (
                        <div className="absolute inset-0 rounded-xl overflow-hidden">
                          <img src={branding.ctaBgUrl} alt="" className="w-full h-full object-cover" style={{ opacity: isDark ? 0.07 : 0.05 }} />
                        </div>
                      )}
                      <div className="relative z-10 p-4">
                        {/* exclusive badge */}
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full mb-3"
                          style={{ background: isDark ? 'rgba(22,101,52,0.18)' : 'rgba(22,101,52,0.08)', border: `1px solid ${isDark ? 'rgba(22,101,52,0.4)' : 'rgba(22,101,52,0.2)'}` }}>
                          <span className="text-[8px] tracking-widest uppercase font-bold" style={{ color: green }}>
                            {homeExclusiveText || 'Exclusivo Allianz Parque'}
                          </span>
                        </div>
                        {/* Title */}
                        <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 900, lineHeight: 1.1, fontSize: '0.95rem' }}>
                          <div style={{ color: isDark ? '#fff' : '#09090B' }}>{ctaTitle1 || 'Pronto para encontrar'}</div>
                          <div style={{ color: green }}>{ctaTitle2 || 'seus momentos?'}</div>
                        </div>
                        {/* Subtitle */}
                        <p className="text-[8px] mt-2 leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(9,9,11,0.5)', maxWidth: 200 }}>
                          {ctaSubtitle || 'Tire uma selfie e nossa IA encontra você em segundos.'}
                        </p>
                        {/* Button */}
                        <div className="mt-3">
                          <span className="text-[9px] px-3 py-1.5 rounded-lg font-bold inline-block"
                            style={{ background: isDark ? 'linear-gradient(135deg,#00FF7F,#00CC64)' : 'linear-gradient(135deg,#166534,#15803d)', color: isDark ? '#000' : '#fff' }}>
                            {ctaButton || 'Ver eventos'}
                          </span>
                        </div>
                        {/* BG image indicator */}
                        {branding?.ctaBgUrl && (
                          <p className="text-[8px] mt-3 flex items-center gap-1" style={{ color: green }}>
                            <CheckCircle2 className="w-2.5 h-2.5" /> Imagem de fundo configurada
                          </p>
                        )}
                      </div>
                    </div>
                  }
                >
                  {/* Badge exclusivo */}
                  <FieldRow
                    label="🏆 Etiqueta do badge 'Exclusivo'"
                    hint="Badge verde no topo do CTA. Ex: Exclusivo Allianz Parque"
                    value={homeExclusiveText} onChange={v => { setHomeExclusiveText(v); setVenueDirty(true); }}
                    placeholder="Exclusivo Allianz Parque"
                    isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />

                  {/* Títulos */}
                  <div className="rounded-xl p-3 space-y-3" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${cardBorder}` }}>
                    <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: muted }}>📝 Título do banner (2 linhas)</p>
                    <FieldRow
                      label="Linha 1 — texto normal"
                      value={ctaTitle1} onChange={v => { setCtaTitle1(v); setHomeDirty(true); }}
                      placeholder="Pronto para encontrar"
                      isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow
                      label="Linha 2 — destaque VERDE"
                      hint="Esta linha aparece em verde para criar contraste"
                      value={ctaTitle2} onChange={v => { setCtaTitle2(v); setHomeDirty(true); }}
                      placeholder="seus momentos?"
                      isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                  </div>

                  {/* Subtítulo */}
                  <FieldRow
                    label="📄 Subtítulo de apoio"
                    hint="Texto descritivo abaixo do título"
                    value={ctaSubtitle} onChange={v => { setCtaSubtitle(v); setHomeDirty(true); }}
                    placeholder="Tire uma selfie e nossa IA encontra você em segundos." textarea
                    isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />

                  {/* Botão */}
                  <FieldRow
                    label="🔘 Texto do botão"
                    value={ctaButton} onChange={v => { setCtaButton(v); setHomeDirty(true); }}
                    placeholder="Ver eventos"
                    isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />

                  {/* Imagem de fundo */}
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${cardBorder}` }}>
                    <div className="px-3 py-2 flex items-center gap-2"
                      style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderBottom: `1px solid ${cardBorder}` }}>
                      <Upload className="w-3.5 h-3.5" style={{ color: muted }} />
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: muted }}>🖼️ Imagem de fundo do banner</span>
                    </div>
                    <div className="p-3">
                      {branding?.ctaBgUrl ? (
                        <div className="space-y-2">
                          <div className="relative rounded-lg overflow-hidden group" style={{ aspectRatio: '16/5', border: `1px solid ${cardBorder}` }}>
                            <img src={branding.ctaBgUrl} alt="CTA background" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all flex items-center justify-center gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={deleteCtaBg} disabled={deletingCtaBg}
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                                style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
                              >
                                {deletingCtaBg ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                Remover
                              </motion.button>
                              <label
                                className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                                style={{ background: 'rgba(22,101,52,0.9)', color: '#fff' }}
                              >
                                <Upload className="w-3 h-3" /> Trocar
                                <input type="file" accept="image/*" className="hidden"
                                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadCtaBg(f); e.target.value = ''; }} />
                              </label>
                            </div>
                          </div>
                          <p className="text-[11px]" style={{ color: muted }}>Passe o mouse para trocar ou remover. Sem imagem usa o padrão.</p>
                        </div>
                      ) : (
                        <div>
                          <DropZone label="Clique ou arraste a foto de fundo do banner (JPG/PNG · 1920×600 px recomendado)"
                            accept="image/*" onFile={uploadCtaBg} uploading={uploadingCtaBg}
                            isDark={isDark} green={green} muted={muted} inputBg={inputBg} border={inputBrd} />
                          <p className="text-[11px] mt-2" style={{ color: muted }}>
                            Sem imagem, usa a foto padrão embutida.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <SaveBar dirty={homeDirty || venueDirty} saving={savingHome || savingVenue} onSave={async () => { await saveHome(); if (venueDirty) await saveVenue(); }} green={green} isDark={isDark} />
                </PageSection>

              </div>
            </motion.div>
          )}

          {/* ════════════════════ TAB: EVENTOS ════════════════════ */}
          {activeTab === 'eventos' && (
            <motion.div key="eventos" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="space-y-5">

                {/* ── Background da página Eventos ── */}
                <SectionCard icon={Droplets} title="Background da Página de Eventos"
                  subtitle="A imagem de fundo é compartilhada com a Home — edite na aba Home > Imagens"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                  {(branding?.backgroundUrls?.length ?? 0) > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {branding!.backgroundUrls.map((url, idx) => (
                          <ImagePreview key={`${url}-${idx}`} url={url} label={`BG ${idx + 1}`}
                            onDelete={() => deleteBg(idx)} deleting={deletingBgIdx === idx} />
                        ))}
                        <div
                          onClick={() => !uploadingBg && document.getElementById('ev-bg-add')?.click()}
                          className="flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-all"
                          style={{ aspectRatio: '16/9', border: `2px dashed ${inputBrd}`, background: inputBg }}
                        >
                          {uploadingBg ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: green }} /> : <Plus className="w-5 h-5" style={{ color: muted }} />}
                          <span className="text-[11px]" style={{ color: muted }}>{uploadingBg ? 'Enviando...' : 'Adicionar'}</span>
                        </div>
                      </div>
                      <input id="ev-bg-add" type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadAsset('background', f); e.target.value = ''; }} />
                      <p className="text-[11px]" style={{ color: muted }}>A 1ª imagem é usada como fundo do hero. Mesmas fotos da Home.</p>
                    </div>
                  ) : (
                    <div>
                      <DropZone label="Nenhum background configurado. Clique para adicionar (JPG/PNG)"
                        accept="image/*" onFile={f => uploadAsset('background', f)} uploading={uploadingBg}
                        isDark={isDark} green={green} muted={muted} inputBg={inputBg} border={inputBrd} />
                    </div>
                  )}
                </SectionCard>

                {/* ══ SEÇÃO 1: HERO DE EVENTOS ══ */}
                <PageSection
                  number={1}
                  icon={CalendarDays}
                  title="Hero — Topo da página de Eventos"
                  desc="Cabeçalho com imagem de fundo e título que aparece ao abrir /eventos"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text} muted={muted}
                  preview={
                    <div className="rounded-xl overflow-hidden relative" style={{ background: '#07070d', minHeight: 180, aspectRatio: '4/3' }}>
                      {branding?.backgroundUrls?.[0] && (
                        <img src={branding.backgroundUrls[0]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                      )}
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,8,14,0.55) 0%, rgba(8,8,14,0.88) 100%)' }} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 py-4">
                        {/* badge */}
                        <span className="text-[8px] tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.12em' }}>
                          {heroBadge || 'Allianz Parque · Tour Oficial'}
                        </span>
                        {/* título */}
                        <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 900, lineHeight: 1.08, fontSize: '1rem' }}>
                          <span style={{ color: '#fff' }}>{eventsHeroTitle || 'Reviva seus'} </span>
                          <span style={{ color: '#86efac' }}>{eventsHeroTitleAccent || 'Momentos no Allianz'}</span>
                        </div>
                        {/* subtítulo */}
                        <p className="text-[9px] mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '85%' }}>
                          {eventsHeroSubtitle || 'Busca com reconhecimento facial...'}
                        </p>
                        {/* search mock */}
                        <div className="mt-3 w-full max-w-[180px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                          <span className="text-[8px]" style={{ color: 'rgba(255,255,255,0.35)' }}>🔍 Buscar por data ou horário...</span>
                        </div>
                      </div>
                    </div>
                  }
                >
                  {/* Badge compartilhado com Home */}
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${cardBorder}` }}>
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: muted }} />
                    <p style={{ color: muted }}>
                      A <strong style={{ color: text }}>etiqueta de badge</strong> (ex: "Allianz Parque · Tour Oficial") é compartilhada com a Home. Altere-a na <strong style={{ color: text }}>aba Home → Seção 1</strong>.
                    </p>
                  </div>

                  {/* Título */}
                  <div className="rounded-xl p-3 space-y-3" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${cardBorder}` }}>
                    <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: muted }}>📝 Título principal da página</p>
                    <FieldRow
                      label="Texto normal (branco)"
                      hint="Primeira parte do título. Ex: Reviva seus"
                      value={eventsHeroTitle} onChange={v => { setEventsHeroTitle(v); setEventsDirty(true); }}
                      placeholder="Reviva seus"
                      isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow
                      label="Destaque em VERDE"
                      hint="Segunda parte do título, aparece em verde. Ex: Momentos no Allianz"
                      value={eventsHeroTitleAccent} onChange={v => { setEventsHeroTitleAccent(v); setEventsDirty(true); }}
                      placeholder="Momentos no Allianz"
                      isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                  </div>

                  {/* Subtítulo */}
                  <FieldRow
                    label="📄 Subtítulo de apoio"
                    hint="Texto descritivo abaixo do título"
                    value={eventsHeroSubtitle} onChange={v => { setEventsHeroSubtitle(v); setEventsDirty(true); }}
                    placeholder="Busca com reconhecimento facial em todos os tours disponíveis." textarea
                    isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />

                  <SaveBar dirty={eventsDirty} saving={savingEvents} onSave={saveEvents} green={green} isDark={isDark} />
                </PageSection>

                {/* ══ SEÇÃO 2: LISTAGEM DE TOURS ══ */}
                <PageSection
                  number={2}
                  icon={Tag}
                  title="Listagem de Tours — Identidade do Local"
                  desc="Título da seção, label dos cards e dados do local/venue"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text} muted={muted}
                  preview={
                    <div className="space-y-3">
                      {/* Section header mock */}
                      <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)', border: `1px solid ${cardBorder}` }}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full" style={{ background: green }} />
                          <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: '0.75rem', fontWeight: 800, color: text }}>
                            {eventsListTitle || 'Tours Disponíveis'}
                          </span>
                        </div>
                        <p className="text-[9px]" style={{ color: muted }}>
                          {(eventsListTitle || 'Tours').toLowerCase()} · slug = DDMMYYYYHHMM
                        </p>
                      </div>

                      {/* Card mock */}
                      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${cardBorder}`, background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.85)' }}>
                        <div style={{ height: 3, background: isDark ? 'linear-gradient(90deg,#166534,#15803d)' : 'linear-gradient(90deg,#166534,#15803d)' }} />
                        <div className="p-3">
                          <span className="text-[9px] tracking-widest uppercase font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(9,9,11,0.45)', fontFamily: "'Montserrat',sans-serif" }}>
                            {tourLabel || 'Tour'}
                          </span>
                          <div className="text-xs font-bold mt-0.5" style={{ color: text, fontFamily: "'Montserrat',sans-serif" }}>27/02/2026, 10:00</div>
                          <div className="text-[10px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(9,9,11,0.45)' }}>sexta-feira</div>
                          <div className="flex items-center gap-1 mt-2 text-[9px] uppercase tracking-wider font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(9,9,11,0.55)' }}>
                            <span>📍</span>
                            <span>{venueName || 'Allianz Parque'}</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span>{venueLocation || 'São Paulo, SP'}</span>
                          </div>
                          <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px]"
                            style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.07)', border: `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.15)'}`, color: green, fontWeight: 600 }}>
                            🖼 48 fotos →
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                >
                  {/* Título da listagem */}
                  <FieldRow
                    label="📋 Título da seção de listagem"
                    hint="Cabeçalho acima dos cards de eventos. Ex: Tours Disponíveis"
                    value={eventsListTitle} onChange={v => { setEventsListTitle(v); setEventsDirty(true); }}
                    placeholder="Tours Disponíveis"
                    isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />

                  {/* Label do card */}
                  <FieldRow
                    label="🏷️ Label exibida nos cards de evento"
                    hint="Palavra em cima da data em cada card. Ex: Tour, Jogo, Show, Evento"
                    value={tourLabel} onChange={v => { setTourLabel(v); setVenueDirty(true); }}
                    placeholder="Tour"
                    isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />

                  {/* Venue */}
                  <div className="rounded-xl p-3 space-y-3" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${cardBorder}` }}>
                    <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: muted }}>📍 Localização — aparece nos cards e marca d'água</p>
                    <FieldRow
                      label="Nome do local / arena / venue"
                      hint="Ex: Allianz Parque, Maracanã, Arena BRB"
                      value={venueName} onChange={v => { setVenueName(v); setVenueDirty(true); }}
                      placeholder="Allianz Parque"
                      isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow
                      label="Cidade e estado"
                      hint="Exibido junto com o nome do local nos cards"
                      value={venueLocation} onChange={v => { setVenueLocation(v); setVenueDirty(true); }}
                      placeholder="São Paulo, SP"
                      isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                  </div>

                  <SaveBar dirty={eventsDirty || venueDirty} saving={savingEvents || savingVenue} onSave={async () => { if (eventsDirty) await saveEvents(); if (venueDirty) await saveVenue(); }} green={green} isDark={isDark} />
                </PageSection>

                {/* ══ SEÇÃO 3: TIPOS DE SESSÃO ══ */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 px-5 py-4"
                    style={{ borderBottom: `1px solid ${cardBorder}`, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)' }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.1)', color: green }}>3</span>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.06)' }}>
                      <List className="w-3.5 h-3.5" style={{ color: green }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.9rem', color: text }}>Tipos de Sessão de Eventos</h3>
                      <p className="text-[11px] mt-0.5" style={{ color: muted }}>Labels aplicadas nos cards e usadas como filtros pelo público (ex: Tour, Partida, Show...)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5">
                    {/* Left: editor */}
                    <div className="lg:col-span-3 p-5 space-y-4">
                      {/* Current types */}
                      <div>
                        <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: muted }}>Tipos cadastrados</label>
                        <div className="flex flex-wrap gap-2 min-h-[48px] p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${cardBorder}` }}>
                          {eventSessionTypes.length === 0 && (
                            <span className="text-xs italic" style={{ color: muted }}>Nenhum tipo cadastrado</span>
                          )}
                          {eventSessionTypes.map((st, i) => (
                            <motion.span
                              key={`${st}-${i}`}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.85 }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{
                                background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.07)',
                                border: `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.15)'}`,
                                color: green,
                              }}
                            >
                              {st}
                              <button
                                onClick={() => {
                                  setEventSessionTypes(prev => prev.filter((_, idx) => idx !== i));
                                  setSessionTypesDirty(true);
                                }}
                                className="hover:opacity-60 transition-opacity ml-0.5"
                              >
                                <XIcon className="w-3 h-3" />
                              </button>
                            </motion.span>
                          ))}
                        </div>
                      </div>

                      {/* Add new type */}
                      <div>
                        <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: muted }}>Adicionar tipo</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSessionType}
                            onChange={e => setNewSessionType(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newSessionType.trim()) {
                                const trimmed = newSessionType.trim();
                                if (!eventSessionTypes.includes(trimmed)) {
                                  setEventSessionTypes(prev => [...prev, trimmed]);
                                  setSessionTypesDirty(true);
                                }
                                setNewSessionType('');
                              }
                            }}
                            placeholder="Ex: Pré-jogo, VIP, Backstage..."
                            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                            style={{ background: inputBg, border: `1px solid ${inputBrd}`, color: text }}
                          />
                          <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            disabled={!newSessionType.trim()}
                            onClick={() => {
                              const trimmed = newSessionType.trim();
                              if (!trimmed) return;
                              if (!eventSessionTypes.includes(trimmed)) {
                                setEventSessionTypes(prev => [...prev, trimmed]);
                                setSessionTypesDirty(true);
                              }
                              setNewSessionType('');
                            }}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
                            style={{
                              background: newSessionType.trim() ? (isDark ? 'rgba(134,239,172,0.12)' : 'rgba(22,101,52,0.1)') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                              border: `1px solid ${newSessionType.trim() ? (isDark ? 'rgba(134,239,172,0.25)' : 'rgba(22,101,52,0.2)') : cardBorder}`,
                              color: newSessionType.trim() ? green : muted,
                              opacity: newSessionType.trim() ? 1 : 0.5,
                            }}
                          >
                            <Plus className="w-4 h-4" />
                            Adicionar
                          </motion.button>
                        </div>
                        <p className="text-[11px] mt-1.5" style={{ color: muted }}>Pressione Enter ou clique em Adicionar. Cada tipo vira um chip de filtro na página de Eventos.</p>
                      </div>

                      {/* Presets */}
                      <div>
                        <label className="block text-[11px] font-bold mb-2 uppercase tracking-wider" style={{ color: muted }}>Sugestões rápidas</label>
                        <div className="flex flex-wrap gap-1.5">
                          {['Tour', 'Partida', 'Confraternização', 'Show', 'Corporativo', 'Pré-jogo', 'VIP', 'Backstage', 'Treino', 'Inauguração'].map(preset => {
                            const already = eventSessionTypes.includes(preset);
                            return (
                              <button
                                key={preset}
                                disabled={already}
                                onClick={() => {
                                  if (!already) {
                                    setEventSessionTypes(prev => [...prev, preset]);
                                    setSessionTypesDirty(true);
                                  }
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs transition-all"
                                style={{
                                  background: already ? (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)') : inputBg,
                                  border: `1px solid ${cardBorder}`,
                                  color: already ? muted : (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)'),
                                  opacity: already ? 0.4 : 1,
                                  cursor: already ? 'default' : 'pointer',
                                  fontWeight: 500,
                                }}
                              >
                                {already ? '✓ ' : '+ '}{preset}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <SaveBar dirty={sessionTypesDirty} saving={savingSessionTypes} onSave={saveSessionTypes} green={green} isDark={isDark} />
                    </div>

                    {/* Right: preview */}
                    <div className="lg:col-span-2 p-5"
                      style={{
                        borderTop: `1px solid ${cardBorder}`,
                        background: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.015)',
                      }}
                    >
                      <p className="text-[10px] uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5"
                        style={{ color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(9,9,11,0.3)' }}>
                        <Eye className="w-3 h-3" /> Prévia ao vivo
                      </p>
                      {/* Simulate filter bar */}
                      <div className="rounded-xl p-3 space-y-3"
                        style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.7)', border: `1px solid ${cardBorder}` }}>
                        <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: muted }}>Filtro por tipo de sessão</p>
                        <div className="flex flex-wrap gap-1.5">
                          {/* "Todos" chip */}
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                            style={{ background: isDark ? 'rgba(134,239,172,0.12)' : 'rgba(22,101,52,0.1)', border: `1px solid ${isDark ? 'rgba(134,239,172,0.3)' : 'rgba(22,101,52,0.25)'}`, color: green }}>
                            Todos
                          </span>
                          {eventSessionTypes.map((st, i) => (
                            <span
                              key={`prev-${st}-${i}`}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-medium"
                              style={{
                                background: inputBg,
                                border: `1px solid ${cardBorder}`,
                                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                              }}
                            >
                              {st}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Card mock */}
                      <div className="mt-3 rounded-xl overflow-hidden" style={{ border: `1px solid ${cardBorder}`, background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.85)' }}>
                        <div style={{ height: 3, background: isDark ? 'linear-gradient(90deg,#166534,#15803d)' : 'linear-gradient(90deg,#166534,#15803d)' }} />
                        <div className="p-3">
                          <span className="text-[9px] tracking-widest uppercase font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(9,9,11,0.45)', fontFamily: "'Montserrat',sans-serif" }}>
                            {eventSessionTypes[0] || 'Tipo de Sessão'}
                          </span>
                          <div className="text-xs font-bold mt-0.5" style={{ color: text, fontFamily: "'Montserrat',sans-serif" }}>27/02/2026, 10:00</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

              </div>
            </motion.div>
          )}

          {/* ════════════════════ TAB: MARCA D'ÁGUA ════════════════════ */}
          {activeTab === 'watermark' && (
            <motion.div key="watermark" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Watermark text */}
                <SectionCard icon={Layers} title="Marca d\'água"
                  subtitle="Texto sobreposto nas fotos para proteger o conteúdo"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                  <div className="space-y-4">
                    <FieldRow label="Texto da marca d\'água"
                      value={watermarkText} onChange={v => { setWatermarkText(v); setWatermarkDirty(true); }}
                      placeholder="© Smart Match" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow label="Produzido por"
                      value={watermarkProducer} onChange={v => { setWatermarkProducer(v); setWatermarkDirty(true); }}
                      placeholder="Smart Match" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow label="Tag da foto"
                      value={watermarkPhotoTag} onChange={v => { setWatermarkPhotoTag(v); setWatermarkDirty(true); }}
                      placeholder="Fotografia de" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow label="Nome do tour"
                      value={watermarkTour} onChange={v => { setWatermarkTour(v); setWatermarkDirty(true); }}
                      placeholder="Tour Oficial" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <SaveBar dirty={watermarkDirty} saving={savingWatermark} onSave={saveWatermark} green={green} isDark={isDark} />
                  </div>
                </SectionCard>

                {/* Preview watermark */}
                <SectionCard icon={Eye} title="Prévia da Marca d\'água"
                  subtitle="Simulação fiel do padrão sobreposto nas fotos"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                  <div className="relative rounded-xl overflow-hidden"
                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)', aspectRatio: '4/3' }}>
                    {/* Simulated photo */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="w-12 h-12" style={{ color: muted, opacity: 0.15 }} />
                    </div>
                    {/* Tiled watermark grid — matches ProtectedImage */}
                    <div className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
                      {(() => {
                        const defs = [
                          { t: watermarkText || 'SMART MATCH', s: '0.55rem', w: 900, c: 'rgba(255,255,255,0.35)' },
                          { t: watermarkProducer || 'EDU SANTANA PRODUÇÕES', s: '0.38rem', w: 700, c: 'rgba(0,255,127,0.32)' },
                          { t: watermarkPhotoTag || '◆ FOTO PROTEGIDA ◆', s: '0.34rem', w: 700, c: 'rgba(255,255,255,0.18)' },
                          { t: watermarkTour || '© TOUR PALMEIRAS', s: '0.38rem', w: 700, c: 'rgba(0,212,255,0.25)' },
                          { t: watermarkText || 'SMART MATCH', s: '0.55rem', w: 900, c: 'rgba(0,255,127,0.18)' },
                        ];
                        const totalRows = 18;
                        return (
                          <div style={{ position: 'absolute', top: '-60%', left: '-60%', width: '220%', height: '220%', display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-evenly' }}>
                            {Array.from({ length: totalRows }).map((_, r) => {
                              const d = defs[r % defs.length];
                              return (
                                <div key={r} className="whitespace-nowrap" style={{
                                  fontFamily: "'Montserrat',sans-serif", fontSize: d.s, fontWeight: d.w, color: d.c,
                                  letterSpacing: '0.18em', textTransform: 'uppercase' as const, lineHeight: '1',
                                  textShadow: '0 1px 4px rgba(0,0,0,0.5)', transform: 'rotate(-25deg)',
                                  transformOrigin: 'center center',
                                  marginLeft: r % 2 === 0 ? '-15%' : '0%',
                                }}>
                                  {Array.from({ length: 6 }).map((_, i) => <span key={i} style={{ marginRight: '1.8em' }}>{d.t}</span>)}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    {/* Corner badges */}
                    {[{ top: 8, left: 8 }, { top: 8, right: 8 }, { bottom: 8, left: 8 }, { bottom: 8, right: 8 }].map((pos, i) => (
                      <span key={i} className="absolute" style={{
                        ...pos, fontFamily: "'Montserrat',sans-serif", fontSize: '0.4rem', fontWeight: 800,
                        color: i % 2 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(0,255,127,0.25)',
                        letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                        textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                      } as React.CSSProperties}>
                        © {watermarkText || 'SMART MATCH'}
                      </span>
                    ))}
                    {/* Central logo text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: 'none' }}>
                      <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: '1rem', fontWeight: 900,
                        color: 'rgba(255,255,255,0.12)', letterSpacing: '0.3em', textTransform: 'uppercase' as const,
                        textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                        {watermarkText || 'SMART MATCH'}
                      </span>
                      <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: '0.45rem', fontWeight: 700,
                        color: 'rgba(0,255,127,0.15)', letterSpacing: '0.45em', textTransform: 'uppercase' as const, marginTop: 4 }}>
                        {watermarkProducer || 'EDU SANTANA PRODUÇÕES'}
                      </span>
                    </div>
                    {/* Label */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded"
                        style={{ background: isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.1)', color: green }}>
                        prévia
                      </span>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="mt-3 space-y-1.5">
                    {[
                      { label: 'Texto principal', color: 'rgba(255,255,255,0.4)', sample: watermarkText || 'SMART MATCH' },
                      { label: 'Produzido por', color: 'rgba(0,255,127,0.45)', sample: watermarkProducer || 'EDU SANTANA PRODUÇÕES' },
                      { label: 'Tag da foto', color: 'rgba(255,255,255,0.25)', sample: watermarkPhotoTag || '◆ FOTO PROTEGIDA ◆' },
                      { label: 'Nome do tour', color: 'rgba(0,212,255,0.35)', sample: watermarkTour || '© TOUR PALMEIRAS' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: item.color }} />
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: muted }}>{item.label}:</span>
                        <span className="text-[10px] truncate" style={{ color: text, opacity: 0.7 }}>{item.sample}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            </motion.div>
          )}
          {/* ════════════════════ TAB: SISTEMA ════════════════════ */}
          {activeTab === 'sistema' && (
            <motion.div key="sistema" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="max-w-6xl space-y-6">

                {/* ══════════════ FLUXO COMPLETO ══════════════ */}
                <div className="rounded-2xl overflow-hidden" style={{ 
                  background: flowStatus !== 'idle' 
                    ? (isDark ? 'rgba(16,185,129,0.05)' : 'rgba(5,150,105,0.04)') 
                    : cardBg, 
                  border: `1px solid ${flowStatus !== 'idle' 
                    ? (isDark ? 'rgba(16,185,129,0.2)' : 'rgba(5,150,105,0.15)') 
                    : cardBorder}` 
                }}>
                  <div className="p-5 border-b" style={{ borderColor: cardBorder }}>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(5,150,105,0.08)', border: `1px solid ${isDark ? 'rgba(16,185,129,0.25)' : 'rgba(5,150,105,0.2)'}` }}>
                        <Zap className="w-5 h-5" style={{ color: isDark ? '#10b981' : '#059669' }} />
                      </div>
                      <div className="flex-1">
                        <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '1.05rem', color: text }}>
                          🚀 Executar Fluxo Completo
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: muted }}>
                          Sincroniza Storage → Indexa Faces no pgvector — tudo automaticamente
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Steps indicator */}
                    <div className="flex items-center gap-3">
                      {[
                        { num: 1, label: 'Sync Storage', status: flowStep >= 1 },
                        { num: 2, label: 'Index Faces', status: flowStep >= 2 },
                      ].map(({ num, label, status }) => (
                        <div key={num} className="flex items-center gap-2 flex-1">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-black transition-all"
                            style={{
                              background: status 
                                ? (isDark ? 'rgba(16,185,129,0.15)' : 'rgba(5,150,105,0.12)') 
                                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
                              border: `2px solid ${status 
                                ? (isDark ? '#10b981' : '#059669') 
                                : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')}`,
                              color: status ? (isDark ? '#10b981' : '#059669') : muted,
                            }}>
                            {num}
                          </div>
                          <span className="text-xs font-bold" style={{ color: status ? (isDark ? '#10b981' : '#059669') : muted }}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Botão principal */}
                    <motion.button
                      whileHover={flowStatus === 'idle' ? { scale: 1.02 } : {}}
                      whileTap={flowStatus === 'idle' ? { scale: 0.98 } : {}}
                      onClick={runCompleteFlow}
                      disabled={flowStatus !== 'idle' && flowStatus !== 'done' && flowStatus !== 'error'}
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: flowStatus === 'idle' || flowStatus === 'done' || flowStatus === 'error'
                          ? 'linear-gradient(135deg,rgba(16,185,129,0.95),rgba(5,150,105,0.9))'
                          : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                        border: `1px solid ${flowStatus === 'idle' || flowStatus === 'done' || flowStatus === 'error' 
                          ? 'rgba(16,185,129,0.25)' 
                          : cardBorder}`,
                        color: flowStatus === 'idle' || flowStatus === 'done' || flowStatus === 'error' ? '#fff' : muted,
                        cursor: flowStatus === 'idle' || flowStatus === 'done' || flowStatus === 'error' ? 'pointer' : 'not-allowed',
                        fontFamily: "'Montserrat',sans-serif",
                      }}
                    >
                      {flowStatus === 'idle' && <><Zap className="w-5 h-5" /> Executar fluxo completo agora</>}
                      {flowStatus === 'sync' && <><Loader2 className="w-5 h-5 animate-spin" /> 1/2 Sincronizando Storage...</>}
                      {flowStatus === 'reindex' && (
                        reindexCurrentEvent ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> 2/2 {reindexCurrentEvent} ({reindexProgress.current}/{reindexProgress.total})</>
                        ) : (
                          <><Loader2 className="w-5 h-5 animate-spin" /> 2/2 Indexando faces no pgvector...</>
                        )
                      )}
                      {flowStatus === 'done' && <><CheckCircle2 className="w-5 h-5" /> Executar novamente</>}
                      {flowStatus === 'error' && <><AlertCircle className="w-5 h-5" /> Tentar novamente</>}
                    </motion.button>

                    {/* Resultados */}
                    {flowStatus === 'done' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl p-4 space-y-3"
                        style={{ background: isDark ? 'rgba(16,185,129,0.07)' : 'rgba(5,150,105,0.05)', border: `1px solid ${isDark ? 'rgba(16,185,129,0.2)' : 'rgba(5,150,105,0.15)'}` }}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" style={{ color: isDark ? '#10b981' : '#059669' }} />
                          <p className="text-sm font-bold" style={{ color: isDark ? '#10b981' : '#059669', fontFamily: "'Montserrat',sans-serif" }}>
                            Fluxo completo executado com sucesso! 🎉
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="rounded-lg p-2.5 text-center" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                            <p className="text-lg font-black" style={{ color: isDark ? '#10b981' : '#059669' }}>
                              {flowResults.sync?.photosImported || 0}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider font-medium mt-0.5" style={{ color: muted }}>Fotos Importadas</p>
                          </div>
                          <div className="rounded-lg p-2.5 text-center" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                            <p className="text-lg font-black" style={{ color: isDark ? '#10b981' : '#059669' }}>
                              {flowResults.reindex?.processed || 0}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider font-medium mt-0.5" style={{ color: muted }}>Fotos Processadas</p>
                          </div>
                          <div className="rounded-lg p-2.5 text-center" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                            <p className="text-lg font-black" style={{ color: isDark ? '#10b981' : '#059669' }}>
                              {flowResults.reindex?.faces || 0}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider font-medium mt-0.5" style={{ color: muted }}>Faces Indexadas</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Erro */}
                    {flowStatus === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl p-4 flex items-start gap-3"
                        style={{ background: isDark ? 'rgba(239,68,68,0.07)' : 'rgba(220,38,38,0.05)', border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : 'rgba(220,38,38,0.2)'}` }}
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: isDark ? '#f87171' : '#dc2626' }} />
                        <div>
                          <p className="text-sm font-bold" style={{ color: isDark ? '#f87171' : '#dc2626' }}>Erro no fluxo</p>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: muted }}>{flowError}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* ══════════════ 2 COLUNAS ══════════════ */}
                <div className="grid lg:grid-cols-2 gap-5">
                  
                  {/* ────── COLUNA 1: Setup Inicial (ordem de execução) ────── */}
                  <div className="space-y-5">
                    <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(109,40,217,0.06)' : 'rgba(109,40,217,0.04)', border: `1px solid ${isDark ? 'rgba(109,40,217,0.15)' : 'rgba(109,40,217,0.1)'}` }}>
                      <p className="text-xs font-black uppercase tracking-widest" style={{ color: isDark ? '#a78bfa' : '#7c3aed' }}>
                        📋 Setup Inicial (ordem de execução)
                      </p>
                    </div>

                    {/* ── Card: Sincronizar Storage → KV ── */}
                <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  <div className="p-5 border-b" style={{ borderColor: cardBorder }}>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(109,40,217,0.12)', color: isDark ? '#a78bfa' : '#7c3aed', border: `1px solid ${isDark ? 'rgba(139,92,246,0.3)' : 'rgba(109,40,217,0.25)'}` }}>1</span>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(109,40,217,0.07)', border: `1px solid ${isDark ? 'rgba(139,92,246,0.18)' : 'rgba(109,40,217,0.15)'}` }}>
                          <Database className="w-4 h-4" style={{ color: isDark ? '#a78bfa' : '#7c3aed' }} />
                        </div>
                      </div>
                      <div>
                        <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.95rem', color: text }}>
                          Sincronizar Storage → KV
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: muted }}>Importa eventos e fotos do S3/Storage para o KV Store</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* O que faz */}
                    <div className="rounded-xl p-4 space-y-2.5" style={{ background: isDark ? 'rgba(139,92,246,0.04)' : 'rgba(109,40,217,0.04)', border: `1px solid ${isDark ? 'rgba(139,92,246,0.1)' : 'rgba(109,40,217,0.1)'}` }}>
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: isDark ? '#a78bfa' : '#7c3aed' }}>O que essa sincronização faz</p>
                      {[
                        { icon: Database, text: 'Varre as pastas do bucket S3 (Supabase Storage)' },
                        { icon: CalendarDays, text: 'Cria eventos automaticamente a partir das pastas (evento-YYYY-MM-DD-HH-MM)' },
                        { icon: Camera, text: 'Importa fotos que existem no Storage mas não estão no KV' },
                        { icon: ShieldCheck, text: 'Idempotente: pode ser rodada várias vezes com segurança' },
                      ].map(({ icon: Icon, text: t }) => (
                        <div key={t} className="flex items-start gap-2.5">
                          <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: isDark ? '#a78bfa' : '#7c3aed', opacity: 0.7 }} />
                          <p className="text-xs leading-relaxed" style={{ color: muted }}>{t}</p>
                        </div>
                      ))}
                    </div>

                    {/* Checkbox */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="skipCompleteSync"
                        checked={skipCompleteSync}
                        onChange={(e) => setSkipCompleteSync(e.target.checked)}
                        disabled={syncStatus === 'running'}
                        className="w-3.5 h-3.5 rounded cursor-pointer"
                        style={{ accentColor: green }}
                      />
                      <label htmlFor="skipCompleteSync" className="text-xs cursor-pointer flex-1" style={{ color: muted }}>
                        Pular eventos com 100% de sincronização
                      </label>
                    </div>

                    {/* Botão */}
                    <motion.button
                      whileHover={syncStatus !== 'running' ? { scale: 1.02 } : {}}
                      whileTap={syncStatus !== 'running' ? { scale: 0.98 } : {}}
                      onClick={runStorageSync}
                      disabled={syncStatus === 'running'}
                      className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: syncStatus === 'running'
                          ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)')
                          : 'linear-gradient(135deg,rgba(109,40,217,0.95),rgba(139,92,246,0.9))',
                        border: `1px solid ${syncStatus === 'running' ? cardBorder : 'rgba(139,92,246,0.25)'}`,
                        color: syncStatus === 'running' ? muted : '#fff',
                        cursor: syncStatus === 'running' ? 'not-allowed' : 'pointer',
                        fontFamily: "'Montserrat',sans-serif",
                      }}
                    >
                      {syncStatus === 'running' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> {syncProgress || 'Sincronizando...'}</>
                      ) : syncStatus === 'done' ? (
                        <><RefreshCw className="w-4 h-4" /> Rodar sincronização novamente</>
                      ) : (
                        <><Database className="w-4 h-4" /> Iniciar sincronização</>
                      )}
                    </motion.button>

                    {/* Resultado — sucesso */}
                    {syncStatus === 'done' && syncResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl p-4 space-y-4"
                        style={{ background: isDark ? 'rgba(139,92,246,0.05)' : 'rgba(109,40,217,0.05)', border: `1px solid ${isDark ? 'rgba(139,92,246,0.2)' : 'rgba(109,40,217,0.15)'}` }}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" style={{ color: isDark ? '#a78bfa' : '#7c3aed' }} />
                          <p className="text-sm font-bold" style={{ color: isDark ? '#a78bfa' : '#7c3aed', fontFamily: "'Montserrat',sans-serif" }}>
                            Sincronização concluída em {(syncResult.elapsedMs / 1000).toFixed(1)}s
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {[
                            { label: 'Eventos novos', value: syncResult.eventsCreated, accent: syncResult.eventsCreated > 0 },
                            { label: 'Fotos importadas', value: syncResult.photosImported, accent: syncResult.photosImported > 0 },
                            { label: 'Eventos pulados', value: syncResult.eventsSkipped, accent: false },
                            { label: 'Fotos puladas', value: syncResult.photosSkipped, accent: false },
                          ].map(({ label, value, accent }) => (
                            <div key={label} className="rounded-lg p-3 text-center"
                              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${cardBorder}` }}>
                              <p className="text-xl font-black" style={{ 
                                color: accent ? (isDark ? '#a78bfa' : '#7c3aed') : text, 
                                fontFamily: "'Montserrat',sans-serif" 
                              }}>{value}</p>
                              <p className="text-[10px] mt-0.5 uppercase tracking-wider font-medium" style={{ color: muted }}>{label}</p>
                            </div>
                          ))}
                        </div>

                        {syncResult.eventsCreated === 0 && syncResult.photosImported === 0 && (
                          <div className="rounded-xl p-3 text-xs" style={{ background: isDark ? 'rgba(251,191,36,0.07)' : 'rgba(180,130,0,0.05)', border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : 'rgba(180,130,0,0.15)'}`, color: isDark ? '#fbbf24' : '#92400e' }}>
                            <strong>Nada para sincronizar.</strong> Todos os eventos e fotos do Storage já estão no KV.
                          </div>
                        )}

                        {syncResult.errors.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>
                              {syncResult.errors.length} erro(s) parciais:
                            </p>
                            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                              {syncResult.errors.map((e, i) => (
                                <p key={i} className="text-[11px] font-mono px-2 py-1 rounded" style={{ background: isDark ? 'rgba(251,191,36,0.07)' : 'rgba(180,130,0,0.06)', color: isDark ? '#fbbf24' : '#92400e' }}>
                                  {e}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Resultado — erro */}
                    {syncStatus === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl p-4 flex items-start gap-3"
                        style={{ background: isDark ? 'rgba(239,68,68,0.07)' : 'rgba(220,38,38,0.05)', border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : 'rgba(220,38,38,0.2)'}` }}
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: isDark ? '#f87171' : '#dc2626' }} />
                        <div>
                          <p className="text-sm font-bold" style={{ color: isDark ? '#f87171' : '#dc2626' }}>Falha na sincronização</p>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: muted }}>{syncError}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* ── Card: KV Diagnóstico ── */}
                <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  <div className="p-5 border-b" style={{ borderColor: cardBorder }}>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: isDark ? 'rgba(251,191,36,0.08)' : 'rgba(180,130,0,0.06)', border: `1px solid ${isDark ? 'rgba(251,191,36,0.18)' : 'rgba(180,130,0,0.15)'}` }}>
                        <Zap className="w-4 h-4" style={{ color: isDark ? '#fbbf24' : '#b45309' }} />
                      </div>
                      <div>
                        <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.95rem', color: text }}>
                          Diagnóstico do KV Store
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: muted }}>Inspeciona as chaves reais na tabela kv_store para depurar a migração</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <motion.button
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      onClick={runDiagnose}
                      disabled={diagStatus === 'running'}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: isDark ? 'rgba(251,191,36,0.12)' : 'rgba(180,130,0,0.09)',
                        border: `1px solid ${isDark ? 'rgba(251,191,36,0.3)' : 'rgba(180,130,0,0.25)'}`,
                        color: isDark ? '#fbbf24' : '#92400e',
                        opacity: diagStatus === 'running' ? 0.6 : 1,
                        cursor: diagStatus === 'running' ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {diagStatus === 'running'
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando KV…</>
                        : diagStatus === 'done'
                        ? <><RefreshCw className="w-4 h-4" /> Reanalisar KV</>
                        : <><Zap className="w-4 h-4" /> Analisar KV Store</>}
                    </motion.button>

                    {diagStatus === 'error' && (
                      <p className="text-xs text-red-400">{diagError}</p>
                    )}

                    {diagStatus === 'done' && diagResult && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="flex items-center gap-2 justify-between">
                          <span className="text-sm font-bold" style={{ color: text }}>
                            Total de registros no KV:
                          </span>
                          <span className="text-lg font-black px-3 py-0.5 rounded-lg"
                            style={{ background: isDark ? 'rgba(251,191,36,0.1)' : 'rgba(180,130,0,0.07)', color: isDark ? '#fbbf24' : '#92400e', fontFamily: "'Montserrat',sans-serif" }}>
                            {diagResult.total}
                          </span>
                        </div>

                        {diagResult.total === 0 ? (
                          <div className="rounded-xl p-3 text-sm" style={{ background: isDark ? 'rgba(239,68,68,0.07)' : 'rgba(220,38,38,0.05)', border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : 'rgba(220,38,38,0.2)'}`, color: isDark ? '#f87171' : '#dc2626' }}>
                            <strong>KV vazio.</strong> Nenhum dado foi salvo ainda. Crie eventos e faça upload de fotos pelo painel admin para popular o KV.
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: muted }}>Registros por prefixo</p>
                              {Object.entries(diagResult.prefixCounts).sort((a, b) => b[1] - a[1]).map(([prefix, count]) => (
                                <div key={prefix} className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                                  style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${cardBorder}` }}>
                                  <code className="text-[11px] font-mono" style={{ color: isDark ? '#86efac' : '#065f46' }}>{prefix}:*</code>
                                  <span className="text-xs font-bold" style={{ color: text }}>{count}</span>
                                </div>
                              ))}
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: muted }}>Amostra de chaves (até 30)</p>
                              <div className="max-h-40 overflow-y-auto rounded-xl p-2 space-y-0.5"
                                style={{ background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)', border: `1px solid ${cardBorder}` }}>
                                {diagResult.sampleKeys.map((k, i) => (
                                  <p key={i} className="text-[10px] font-mono truncate px-1" style={{ color: muted }}>{k}</p>
                                ))}
                              </div>
                            </div>

                            {diagResult.events && diagResult.events.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: muted }}>Eventos e fotos no KV</p>
                                <div className="max-h-64 overflow-y-auto space-y-1">
                                  {diagResult.events.map((evt) => (
                                    <div key={evt.id} className="rounded-lg p-2.5 flex items-center justify-between gap-2"
                                      style={{ 
                                        background: evt.photoCount > 0 
                                          ? (isDark ? 'rgba(134,239,172,0.05)' : 'rgba(22,101,52,0.04)') 
                                          : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), 
                                        border: `1px solid ${evt.photoCount > 0 
                                          ? (isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.1)') 
                                          : cardBorder}` 
                                      }}>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold truncate" style={{ color: text }}>{evt.name}</p>
                                        <code className="text-[10px] font-mono truncate block" style={{ color: muted }}>{evt.id}</code>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold px-2 py-0.5 rounded" 
                                          style={{ 
                                            background: evt.photoCount > 0 
                                              ? (isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.1)') 
                                              : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                                            color: evt.photoCount > 0 ? green : muted 
                                          }}>
                                          {evt.photoCount} fotos
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-[10px] mt-2" style={{ color: muted }}>
                                  💡 <strong>Chave de fotos:</strong> <code>ef:photos:event:&lt;eventId&gt;</code>
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* ── Card: pgvector migration — REMOVIDO (obsoleto) ── */}
                {false && <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  {/* header */}
                  <div className="p-5 border-b" style={{ borderColor: cardBorder }}>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.12)', color: green, border: `1px solid ${isDark ? 'rgba(134,239,172,0.3)' : 'rgba(22,101,52,0.25)'}` }}>2</span>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.07)', border: `1px solid ${isDark ? 'rgba(134,239,172,0.18)' : 'rgba(22,101,52,0.15)'}` }}>
                          <Database className="w-4.5 h-4.5" style={{ color: green }} />
                        </div>
                      </div>
                      <div>
                        <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.95rem', color: text }}>
                          Migrar Faces para pgvector
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: muted }}>Indexa os embeddings faciais do KV no banco vetorial</p>
                      </div>
                    </div>
                  </div>

                  {/* body */}
                  <div className="p-5 space-y-5">
                    {/* O que faz */}
                    <div className="rounded-xl p-4 space-y-2.5" style={{ background: isDark ? 'rgba(134,239,172,0.04)' : 'rgba(22,101,52,0.04)', border: `1px solid ${isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.1)'}` }}>
                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: green }}>O que essa migração faz</p>
                      {[
                        { icon: Database, text: 'Lê todos os descritores faciais armazenados no KV Store' },
                        { icon: Cpu,      text: 'Insere cada embedding 128-dim na tabela face_embeddings_68454e9b' },
                        { icon: Zap,      text: 'A busca passa a usar HNSW ANN — O(log n) ao invés de O(n)' },
                        { icon: ShieldCheck, text: 'Idempotente: pode ser rodada várias vezes com segurança' },
                      ].map(({ icon: Icon, text: t }) => (
                        <div key={t} className="flex items-start gap-2.5">
                          <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: green, opacity: 0.7 }} />
                          <p className="text-xs leading-relaxed" style={{ color: muted }}>{t}</p>
                        </div>
                      ))}
                    </div>

                    {/* Aviso */}
                    <div className="rounded-xl p-3.5 flex items-start gap-2.5"
                      style={{ background: isDark ? 'rgba(251,191,36,0.06)' : 'rgba(180,130,0,0.06)', border: `1px solid ${isDark ? 'rgba(251,191,36,0.18)' : 'rgba(180,130,0,0.18)'}` }}>
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: isDark ? '#fbbf24' : '#b45309' }} />
                      <p className="text-xs leading-relaxed" style={{ color: isDark ? '#fbbf24' : '#92400e' }}>
                        Fotos novas já são indexadas automaticamente. Esta migração é necessária apenas para fotos
                        que foram processadas <strong>antes</strong> da atualização pgvector.
                      </p>
                    </div>

                    {/* Botão */}
                    <motion.button
                      whileHover={migrStatus !== 'running' ? { scale: 1.02 } : {}}
                      whileTap={migrStatus !== 'running' ? { scale: 0.98 } : {}}
                      onClick={runMigration}
                      disabled={migrStatus === 'running'}
                      className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: migrStatus === 'running'
                          ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)')
                          : 'linear-gradient(135deg,rgba(22,101,52,0.95),rgba(21,128,61,0.9))',
                        border: `1px solid ${migrStatus === 'running' ? cardBorder : 'rgba(134,239,172,0.25)'}`,
                        color: migrStatus === 'running' ? muted : '#fff',
                        cursor: migrStatus === 'running' ? 'not-allowed' : 'pointer',
                        fontFamily: "'Montserrat',sans-serif",
                      }}
                    >
                      {migrStatus === 'running' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Migrando — aguarde…</>
                      ) : migrStatus === 'done' ? (
                        <><RefreshCw className="w-4 h-4" /> Rodar migração novamente</>
                      ) : (
                        <><Database className="w-4 h-4" /> Iniciar migração pgvector</>
                      )}
                    </motion.button>

                    {/* Progress bar indeterminada */}
                    {migrStatus === 'running' && (
                      <div className="space-y-2">
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                          <motion.div
                            animate={{
                              x: ['-100%', '200%'],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: 'linear',
                            }}
                            className="h-full w-1/3 rounded-full"
                            style={{ background: 'linear-gradient(90deg,#16a34a,#86efac)' }}
                          />
                        </div>
                        <p className="text-xs text-center" style={{ color: muted }}>
                          Processando faces do KV para o banco vetorial...
                        </p>
                      </div>
                    )}

                    {/* Resultado — sucesso */}
                    {migrStatus === 'done' && migrResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl p-4 space-y-4"
                        style={{ background: isDark ? 'rgba(134,239,172,0.05)' : 'rgba(22,101,52,0.05)', border: `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.15)'}` }}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" style={{ color: green }} />
                          <p className="text-sm font-bold" style={{ color: green, fontFamily: "'Montserrat',sans-serif" }}>
                            Migração concluída em {(migrResult.elapsedMs / 1000).toFixed(1)}s
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {[
                            { label: 'Eventos', value: migrResult.totalEvents, accent: false },
                            { label: 'Fotos c/ face', value: migrResult.totalPhotos, accent: false },
                            { label: 'Faces indexadas', value: migrResult.totalFaces, accent: false },
                            { label: 'Sem descritor', value: migrResult.skippedPhotos, accent: true },
                          ].map(({ label, value, accent }) => (
                            <div key={label} className="rounded-lg p-3 text-center"
                              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${cardBorder}` }}>
                              <p className="text-xl font-black" style={{ color: accent && value > 0 ? (isDark ? '#fbbf24' : '#b45309') : text, fontFamily: "'Montserrat',sans-serif" }}>{value}</p>
                              <p className="text-[10px] mt-0.5 uppercase tracking-wider font-medium" style={{ color: muted }}>{label}</p>
                            </div>
                          ))}
                        </div>

                        {migrResult.totalPhotos === 0 && migrResult.skippedPhotos === 0 && (
                          <div className="rounded-xl p-3 text-xs" style={{ background: isDark ? 'rgba(251,191,36,0.07)' : 'rgba(180,130,0,0.05)', border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : 'rgba(180,130,0,0.15)'}`, color: isDark ? '#fbbf24' : '#92400e' }}>
                            <strong>KV vazio ou sem descritores.</strong> Rode o <em>Diagnóstico do KV Store</em> acima para ver o que está salvo. Se o KV estiver vazio, certifique-se de que os eventos e fotos foram criados e processados pelo painel admin.
                          </div>
                        )}
                        {migrResult.skippedPhotos > 0 && migrResult.totalPhotos === 0 && (
                          <p className="text-xs" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>
                            {migrResult.skippedPhotos} foto(s) encontrada(s) no KV, mas nenhuma tem descritores faciais.
                            Isso ocorre quando o reconhecimento facial falhou ou não foi executado no upload.
                          </p>
                        )}
                        {migrResult.skippedPhotos > 0 && migrResult.totalPhotos > 0 && (
                          <p className="text-xs" style={{ color: muted }}>
                            {migrResult.skippedPhotos} foto(s) sem rosto detectado foram ignoradas.
                          </p>
                        )}
                        {migrResult.usedFallback && (
                          <p className="text-xs" style={{ color: muted }}>
                            ℹ️ Usou fallback via <code>events:index</code> (getByPrefix retornou vazio).
                          </p>
                        )}

                        {migrResult.errors.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>
                              {migrResult.errors.length} erro(s) parciais:
                            </p>
                            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                              {migrResult.errors.map((e, i) => (
                                <p key={i} className="text-[11px] font-mono px-2 py-1 rounded" style={{ background: isDark ? 'rgba(251,191,36,0.07)' : 'rgba(180,130,0,0.06)', color: isDark ? '#fbbf24' : '#92400e' }}>
                                  {e}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Resultado — erro */}
                    {migrStatus === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl p-4 flex items-start gap-3"
                        style={{ background: isDark ? 'rgba(239,68,68,0.07)' : 'rgba(220,38,38,0.05)', border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : 'rgba(220,38,38,0.2)'}` }}
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: isDark ? '#f87171' : '#dc2626' }} />
                        <div>
                          <p className="text-sm font-bold" style={{ color: isDark ? '#f87171' : '#dc2626' }}>Falha na migração</p>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: muted }}>{migrError}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>}

                {/* ── Card: Reindexação de Faces ── */}
                <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                  {/* header */}
                  <div className="p-5 border-b" style={{ borderColor: cardBorder }}>
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: isDark ? 'rgba(6,182,212,0.15)' : 'rgba(8,145,178,0.12)', color: isDark ? '#06b6d4' : '#0891b2', border: `1px solid ${isDark ? 'rgba(6,182,212,0.3)' : 'rgba(8,145,178,0.25)'}` }}>2</span>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: isDark ? 'rgba(6,182,212,0.08)' : 'rgba(8,145,178,0.07)', border: `1px solid ${isDark ? 'rgba(6,182,212,0.18)' : 'rgba(8,145,178,0.15)'}` }}>
                          <Scan className="w-4.5 h-4.5" style={{ color: isDark ? '#06b6d4' : '#0891b2' }} />
                        </div>
                      </div>
                      <div>
                        <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.95rem', color: text }}>
                          Reindexar Faces de Evento
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: muted }}>Processa novamente todas as fotos de um evento e detecta faces</p>
                      </div>
                    </div>
                  </div>

                  {/* body */}
                  <div className="p-5 space-y-4">
                    {/* Aviso */}
                    <div className="rounded-xl p-3.5 flex items-start gap-2.5"
                      style={{ background: isDark ? 'rgba(6,182,212,0.06)' : 'rgba(8,145,178,0.06)', border: `1px solid ${isDark ? 'rgba(6,182,212,0.18)' : 'rgba(8,145,178,0.18)'}` }}>
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: isDark ? '#06b6d4' : '#0891b2' }} />
                      <div className="text-xs leading-relaxed space-y-1" style={{ color: isDark ? '#06b6d4' : '#0e7490' }}>
                        <p><strong>Use esta ferramenta se:</strong></p>
                        <ul className="list-disc list-inside space-y-0.5 ml-1">
                          <li>Fotos foram importadas do Storage sem detectar faces</li>
                          <li>A busca facial retornou 0 resultados para um evento</li>
                          <li>Você precisa reprocessar um evento específico</li>
                        </ul>
                      </div>
                    </div>

                    {/* Select evento */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: muted }}>
                        Selecione um evento
                      </label>
                      <select
                        value={reindexEventId}
                        onChange={(e) => setReindexEventId(e.target.value)}
                        disabled={reindexStatus === 'processing'}
                        className="w-full px-4 py-2.5 rounded-xl text-sm transition-all [&>option]:bg-[#08080E] [&>option]:text-white"
                        style={{
                          background: inputBg,
                          border: `1px solid ${inputBrd}`,
                          color: text,
                          cursor: reindexStatus === 'processing' ? 'not-allowed' : 'pointer',
                          opacity: reindexStatus === 'processing' ? 0.6 : 1,
                        }}
                      >
                        <option value="">-- Escolha um evento --</option>
                        <option value="ALL" style={{ fontWeight: 'bold' }}>
                          🔥 TODOS OS EVENTOS ({availableEvents.length} eventos)
                        </option>
                        {availableEvents.map(evt => (
                          <option key={evt.id} value={evt.id}>
                            {evt.name} ({evt.photoCount} fotos)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Botão único */}
                    <motion.button
                      whileHover={reindexStatus === 'idle' && reindexEventId ? { scale: 1.02 } : {}}
                      whileTap={reindexStatus === 'idle' && reindexEventId ? { scale: 0.98 } : {}}
                      onClick={() => {
                        if (reindexEventId === 'ALL') startReindexAll();
                        else startReindex();
                      }}
                      disabled={!reindexEventId || reindexStatus === 'loading' || reindexStatus === 'processing'}
                      className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-bold transition-all"
                      style={{
                        background: (!reindexEventId || reindexStatus === 'loading' || reindexStatus === 'processing')
                          ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)')
                          : reindexEventId === 'ALL'
                          ? 'linear-gradient(135deg,rgba(251,191,36,0.95),rgba(245,158,11,0.9))'
                          : 'linear-gradient(135deg,rgba(8,145,178,0.95),rgba(6,182,212,0.9))',
                        border: `1px solid ${(!reindexEventId || reindexStatus === 'loading' || reindexStatus === 'processing') 
                          ? cardBorder 
                          : reindexEventId === 'ALL'
                          ? 'rgba(251,191,36,0.25)'
                          : 'rgba(6,182,212,0.25)'}`,
                        color: (!reindexEventId || reindexStatus === 'loading' || reindexStatus === 'processing') 
                          ? muted 
                          : reindexEventId === 'ALL'
                          ? '#166534'
                          : '#fff',
                        cursor: (!reindexEventId || reindexStatus === 'loading' || reindexStatus === 'processing') ? 'not-allowed' : 'pointer',
                        fontFamily: "'Montserrat',sans-serif",
                      }}
                    >
                      {reindexStatus === 'loading' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Carregando fotos…</>
                      ) : reindexStatus === 'processing' ? (
                        reindexEventId === 'ALL' ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Evento {reindexEventIndex}/{availableEvents.length} · Foto {reindexPhotoProgress.current}/{reindexPhotoProgress.total || '…'}</>
                        ) : (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Foto {reindexPhotoProgress.current}/{reindexPhotoProgress.total || '…'}</>
                        )
                      ) : reindexEventId === 'ALL' ? (
                        <><Zap className="w-4 h-4" /> Reindexar TODOS os eventos</>
                      ) : (
                        <><Scan className="w-4 h-4" /> Iniciar reindexação</>
                      )}
                    </motion.button>

                    {/* Progress bar indeterminada — loading */}
                    {reindexStatus === 'loading' && (
                      <div className="space-y-2">
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                          <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            className="h-full w-1/3 rounded-full"
                            style={{ background: 'linear-gradient(90deg,#0891b2,#06b6d4)' }}
                          />
                        </div>
                        <p className="text-xs text-center" style={{ color: muted }}>Carregando lista de eventos…</p>
                      </div>
                    )}

                    {/* Progress + live stats cards — processing */}
                    {reindexStatus === 'processing' && (
                      <div className="space-y-3">
                        {/* Barra de progresso — foto a foto (granular) */}
                        <div className="space-y-2">
                          {/* Barra primária: fotos (mais granular) */}
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                            {reindexPhotoProgress.total > 0 ? (
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(reindexPhotoProgress.current / reindexPhotoProgress.total) * 100}%` }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ background: 'linear-gradient(90deg,#0891b2,#06b6d4)' }}
                              />
                            ) : (
                              <motion.div
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                className="h-full w-1/3 rounded-full"
                                style={{ background: 'linear-gradient(90deg,#0891b2,#06b6d4)' }}
                              />
                            )}
                          </div>
                          {/* Barra secundária: eventos (apenas no modo ALL) */}
                          {reindexEventId === 'ALL' && reindexProgress.total > 0 && (
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                              <motion.div
                                animate={{ width: `${(reindexProgress.current / reindexProgress.total) * 100}%` }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ background: 'linear-gradient(90deg,rgba(139,92,246,0.7),rgba(168,85,247,0.7))' }}
                              />
                            </div>
                          )}

                          {/* Labels evento + foto */}
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {reindexCurrentEvent && (
                              <span className="text-xs font-semibold" style={{ color: isDark ? '#06b6d4' : '#0891b2' }}>
                                {reindexEventId === 'ALL'
                                  ? `Evento ${reindexEventIndex}/${availableEvents.length}: ${reindexCurrentEvent}`
                                  : reindexCurrentEvent}
                              </span>
                            )}
                            {reindexPhotoProgress.total > 0 && (
                              <>
                                {reindexCurrentEvent && <span className="text-xs" style={{ color: muted }}>·</span>}
                                <span className="text-xs tabular-nums" style={{ color: muted }}>
                                  Foto <strong style={{ color: text }}>{reindexPhotoProgress.current}</strong>/{reindexPhotoProgress.total}
                                </span>
                              </>
                            )}
                            {!reindexCurrentEvent && reindexPhotoProgress.total === 0 && (
                              <span className="text-xs" style={{ color: muted }}>Iniciando reindexação…</span>
                            )}
                          </div>
                        </div>

                        {/* Cards de estatísticas em tempo real */}
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="grid grid-cols-3 gap-2"
                        >
                          {[
                            { label: 'Indexadas', value: reindexLiveStats.processed, color: isDark ? '#06b6d4' : '#0891b2', dimColor: isDark ? 'rgba(6,182,212,0.12)' : 'rgba(8,145,178,0.1)', borderColor: isDark ? 'rgba(6,182,212,0.25)' : 'rgba(8,145,178,0.2)', title: 'Fotos com face indexada no pgvector' },
                            { label: 'Faces',     value: reindexLiveStats.faces,     color: isDark ? '#86efac' : '#16a34a', dimColor: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,163,74,0.08)', borderColor: isDark ? 'rgba(134,239,172,0.2)' : 'rgba(22,163,74,0.18)', title: 'Embeddings inseridos no pgvector' },
                            { label: 'Sem face',  value: reindexLiveStats.noFace,    color: muted, dimColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderColor: cardBorder, title: 'Fotos sem rosto detectado — esperado para fotos de cenário' },
                          ].map(({ label, value, color, dimColor, borderColor, title }) => (
                            <div key={label} className="rounded-xl p-3 text-center" style={{ background: dimColor, border: `1px solid ${borderColor}` }} title={title}>
                              <motion.p
                                key={value}
                                initial={{ scale: 1.25, opacity: 0.6 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-xl font-black"
                                style={{ color, fontFamily: "'Montserrat',sans-serif" }}
                              >
                                {value}
                              </motion.p>
                              <p className="text-[10px] mt-0.5 uppercase tracking-wider font-semibold" style={{ color: muted }}>{label}</p>
                            </div>
                          ))}
                        </motion.div>

                        {/* Pulsing dot de atividade */}
                        <div className="flex items-center justify-center gap-2">
                          <motion.span
                            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                            className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                            style={{ background: isDark ? '#06b6d4' : '#0891b2' }}
                          />
                          <p className="text-[11px] tabular-nums" style={{ color: muted }}>
                            {reindexPhotoProgress.total > 0
                              ? `Indexando foto ${reindexPhotoProgress.current} de ${reindexPhotoProgress.total} no pgvector…`
                              : 'Carregando lista de fotos…'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Resultado — sucesso */}
                    {reindexStatus === 'done' && reindexResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl p-4 space-y-3"
                        style={{ 
                          background: reindexResult.processed === 0 
                            ? (isDark ? 'rgba(251,191,36,0.05)' : 'rgba(180,130,0,0.05)') 
                            : (isDark ? 'rgba(6,182,212,0.05)' : 'rgba(8,145,178,0.05)'), 
                          border: `1px solid ${reindexResult.processed === 0 
                            ? (isDark ? 'rgba(251,191,36,0.2)' : 'rgba(180,130,0,0.15)') 
                            : (isDark ? 'rgba(6,182,212,0.2)' : 'rgba(8,145,178,0.15)')}` 
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {reindexResult.processed === 0 ? (
                            <AlertTriangle className="w-4 h-4" style={{ color: isDark ? '#fbbf24' : '#b45309' }} />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" style={{ color: isDark ? '#06b6d4' : '#0891b2' }} />
                          )}
                          <p className="text-sm font-bold" style={{ 
                            color: reindexResult.processed === 0 
                              ? (isDark ? '#fbbf24' : '#b45309') 
                              : (isDark ? '#06b6d4' : '#0891b2'), 
                            fontFamily: "'Montserrat',sans-serif" 
                          }}>
                            {reindexResult.processed === 0 ? 'Nenhuma foto encontrada!' : 'Reindexação concluída!'}
                          </p>
                        </div>

                        {reindexResult.processed === 0 ? (
                          <div className="text-xs space-y-2 leading-relaxed" style={{ color: isDark ? '#fbbf24' : '#92400e' }}>
                            <p><strong>⚠️ Os eventos selecionados não têm fotos no sistema.</strong></p>
                            <p>Você precisa primeiro:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li>Fazer upload de fotos via PDV</li>
                              <li>Ou rodar a <strong>Sincronização Storage → KV</strong> abaixo (se já tiver fotos no S3)</li>
                            </ul>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { label: 'Indexadas', value: reindexResult.processed, color: isDark ? '#06b6d4' : '#0891b2', bg: isDark ? 'rgba(6,182,212,0.08)' : 'rgba(8,145,178,0.07)', border: isDark ? 'rgba(6,182,212,0.2)' : 'rgba(8,145,178,0.18)', title: 'Fotos com face indexada com sucesso' },
                                { label: 'Faces', value: reindexResult.faces, color: isDark ? '#86efac' : '#16a34a', bg: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,163,74,0.06)', border: isDark ? 'rgba(134,239,172,0.2)' : 'rgba(22,163,74,0.18)', title: 'Embeddings inseridos no pgvector' },
                                { label: 'Sem face', value: reindexResult.noFace ?? reindexResult.failed, color: muted, bg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: cardBorder, title: 'Fotos sem rosto detectado — normal para fotos de cenário/arquitetura' },
                              ].map(({ label, value, color, bg, border, title }) => (
                                <div key={label} className="rounded-lg p-3 text-center" title={title}
                                  style={{ background: bg, border: `1px solid ${border}` }}>
                                  <p className="text-xl font-black" style={{ color, fontFamily: "'Montserrat',sans-serif" }}>{value}</p>
                                  <p className="text-[10px] mt-0.5 uppercase tracking-wider font-medium" style={{ color: muted }}>{label}</p>
                                </div>
                              ))}
                            </div>

                            {reindexResult.failed > 0 && (
                              <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: isDark ? 'rgba(239,68,68,0.07)' : 'rgba(220,38,38,0.05)', border: `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : 'rgba(220,38,38,0.15)'}` }}>
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isDark ? '#f87171' : '#dc2626' }} />
                                <p className="text-xs" style={{ color: isDark ? '#fca5a5' : '#b91c1c' }}>
                                  <strong>{reindexResult.failed}</strong> erro{reindexResult.failed !== 1 ? 's' : ''} reais ao indexar — verifique o console do servidor.
                                </p>
                              </div>
                            )}

                            {reindexResult.faces > 0 && (
                              <p className="text-xs" style={{ color: muted }}>
                                ✅ Faces indexadas no pgvector! Agora você pode usar o reconhecimento facial normalmente.
                              </p>
                            )}
                          </>
                        )}
                      </motion.div>
                    )}

                    {/* Resultado — erro */}
                    {reindexStatus === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl p-4 flex items-start gap-3"
                        style={{ background: isDark ? 'rgba(239,68,68,0.07)' : 'rgba(220,38,38,0.05)', border: `1px solid ${isDark ? 'rgba(239,68,68,0.25)' : 'rgba(220,38,38,0.2)'}` }}
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: isDark ? '#f87171' : '#dc2626' }} />
                        <div>
                          <p className="text-sm font-bold" style={{ color: isDark ? '#f87171' : '#dc2626' }}>Falha na reindexação</p>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: muted }}>{reindexError}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
                  </div>
                  
                  {/* ────── COLUNA 2: Ferramentas Avançadas ────── */}
                  <div className="space-y-5">
                    <div className="rounded-xl p-3" style={{ background: isDark ? 'rgba(251,191,36,0.06)' : 'rgba(180,130,0,0.04)', border: `1px solid ${isDark ? 'rgba(251,191,36,0.15)' : 'rgba(180,130,0,0.1)'}` }}>
                      <p className="text-xs font-black uppercase tracking-widest" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>
                        🔧 Ferramentas Avançadas
                      </p>
                    </div>

                    {/* ── Card: Flatten to Global ── */}
                    <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid rgba(168,85,247,0.2)` }}>
                      <div className="p-5 border-b" style={{ borderColor: 'rgba(168,85,247,0.15)' }}>
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
                            <Database className="w-4 h-4" style={{ color: '#a855f7' }} />
                          </div>
                          <div>
                            <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.95rem', color: text }}>
                              Migrar Dados para Global
                            </h3>
                            <p className="text-xs mt-0.5" style={{ color: muted }}>
                              Copia índices de prefixos legados para o prefixo global ef:
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        <div className="rounded-xl p-3 text-xs" style={{ background: isDark ? 'rgba(168,85,247,0.06)' : 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.15)', color: isDark ? '#d8b4fe' : '#7e22ce', lineHeight: 1.6 }}>
                          Use esta ferramenta uma vez se seus eventos não aparecem no painel. Ela copia os índices de qualquer prefixo tenant legado para o índice global <code className="px-1 rounded" style={{ background: 'rgba(0,0,0,0.1)' }}>ef:events:index</code>.
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1.5" style={{ color: muted }}>
                            UUID do tenant de origem (opcional)
                          </label>
                          <input
                            type="text"
                            value={flattenFromId}
                            onChange={e => { setFlattenFromId(e.target.value); setFlattenStatus('idle'); setFlattenError(''); }}
                            placeholder="Deixe em branco para varrer todos os prefixos"
                            className="w-full px-3 py-2 rounded-xl text-xs font-mono outline-none transition-all"
                            style={{ background: inputBg, border: `1px solid ${inputBrd}`, color: text }}
                          />
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                          onClick={runFlattenToGlobal}
                          disabled={flattenStatus === 'running'}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all"
                          style={{
                            background: flattenStatus === 'running' ? 'rgba(168,85,247,0.05)' : 'rgba(168,85,247,0.12)',
                            border: '1px solid rgba(168,85,247,0.3)',
                            color: '#a855f7',
                            cursor: flattenStatus === 'running' ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {flattenStatus === 'running'
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Migrando…</>
                            : <><Database className="w-4 h-4" /> Executar Migração</>}
                        </motion.button>

                        {flattenStatus === 'done' && flattenResult && (
                          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl p-4 space-y-2"
                            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e' }} />
                              <span className="text-xs font-black" style={{ color: '#22c55e' }}>Concluído!</span>
                            </div>
                            <p className="text-xs" style={{ color: muted }}>{flattenResult.message}</p>
                            {flattenResult.migrated.length > 0 && (
                              <div className="space-y-1 pt-1">
                                {flattenResult.migrated.map(m => (
                                  <div key={m} className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', color: text }}>✓ {m}</div>
                                ))}
                              </div>
                            )}
                            <p className="text-xs pt-1" style={{ color: muted }}>Recarregue a página para ver os dados.</p>
                          </motion.div>
                        )}

                        {flattenStatus === 'error' && (
                          <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                            <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5" />
                            {flattenError}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      <Toast msg={toast} isDark={isDark} />
    </div>
  );
}