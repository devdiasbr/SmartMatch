import { api, type BrandingConfig } from '../lib/api';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Settings, Image, Globe, Type, Droplets, Upload, Trash2,
  CheckCircle2, AlertCircle, Loader2, Plus, Monitor, Camera,
  BarChart3, CalendarDays, DollarSign, ClipboardList, Store,
  Home, Tag, Eye,
  Palette, Layout, FileText, Save, Layers,
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
        background: drag ? (isDark ? 'rgba(134,239,172,0.04)' : 'rgba(0,107,43,0.03)') : inputBg,
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
              background: isDark ? 'rgba(134,239,172,0.15)' : 'rgba(0,107,43,0.1)',
              border: `1px solid ${isDark ? 'rgba(134,239,172,0.3)' : 'rgba(0,107,43,0.25)'}`,
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
          style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(0,107,43,0.08)' }}>
          <Icon className="w-4 h-4" style={{ color: green }} />
        </div>
        <div>
          <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.95rem', color: text }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,40,20,0.42)' }}>{subtitle}</p>}
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
        style={{ borderBottom: `1px solid ${cardBorder}`, background: isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,107,43,0.02)' }}>
        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
          style={{ background: isDark ? 'rgba(134,239,172,0.15)' : 'rgba(0,107,43,0.1)', color: green }}>
          {number}
        </span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.06)' }}>
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
            style={{ color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,40,20,0.3)' }}>
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

type ConfigTab = 'marca' | 'home' | 'eventos' | 'watermark';

const CONFIG_TABS: { key: ConfigTab; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'marca',     label: 'Marca',       icon: Palette,     desc: 'Logo, nome e identidade visual' },
  { key: 'home',      label: 'Home',         icon: Home,        desc: 'Textos e conteúdo da página inicial' },
  { key: 'eventos',   label: 'Eventos',      icon: CalendarDays, desc: 'Textos da página de eventos' },
  { key: 'watermark', label: 'Marca d\'água', icon: Layers,     desc: 'Texto sobreposto nas fotos' },
];

// ── MAIN ──────────────────────────────────────────────────────────────────────

export function AdminConfig() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { token, isAdmin, loading: authLoading, getToken } = useAuth();
  const { refreshBranding } = useBranding();

  const [activeTab, setActiveTab] = useState<ConfigTab>('marca');

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

  // Toast
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── Colors ──
  const bg         = isDark ? '#08080E' : '#F2F8F4';
  const cardBg     = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.1)';
  const text       = isDark ? '#ffffff' : '#0D2818';
  const muted      = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,40,20,0.42)';
  const green      = isDark ? '#86efac' : '#006B2B';
  const inputBg    = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';
  const inputBrd   = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,107,43,0.15)';

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
      const base64 = await fileToBase64(file);
      await api.uploadBrandingAsset({ type, base64, mimeType: file.type }, t);
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
      const base64 = await fileToBase64(file);
      await api.uploadBrandingAsset({ type: 'cta-background', base64, mimeType: file.type }, t);
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
              style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(0,107,43,0.08)' }}>
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
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
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
                    ? (isDark ? 'rgba(134,239,172,0.12)' : 'rgba(0,107,43,0.1)')
                    : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)'),
                  border: `1px solid ${active
                    ? (isDark ? 'rgba(134,239,172,0.25)' : 'rgba(0,107,43,0.2)')
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
                  (tab.key === 'eventos' && (eventsDirty || venueDirty)) ||
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
                        style={{ background: isDark ? '#0f0f1a' : '#006B2B' }}>
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
                <SectionCard icon={Image} title="Logotipo" subtitle="PNG ou SVG com fundo transparente • max 2 MB"
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
                  style={{ background: isDark ? 'rgba(134,239,172,0.05)' : 'rgba(0,107,43,0.04)', border: `1px solid ${isDark ? 'rgba(134,239,172,0.12)' : 'rgba(0,107,43,0.12)'}` }}>
                  <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: green }} />
                  <p className="text-xs leading-relaxed" style={{ color: muted }}>
                    As seções abaixo estão na mesma ordem em que aparecem na página Home. Edite os campos e veja a prévia ao vivo antes de salvar.
                  </p>
                </div>

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
                          style={{ background: 'rgba(0,107,43,0.18)', border: '1px solid rgba(0,107,43,0.4)' }}>
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
                            style={{ background: 'linear-gradient(135deg,#006B2B,#00843D)', color: '#fff' }}>
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
                    <div className="rounded-xl overflow-hidden relative" style={{ background: isDark ? 'rgba(0,107,43,0.08)' : 'rgba(0,107,43,0.05)', border: `1px solid ${isDark ? 'rgba(0,107,43,0.2)' : 'rgba(0,107,43,0.12)'}` }}>
                      {/* BG image thumbnail */}
                      {branding?.ctaBgUrl && (
                        <div className="absolute inset-0 rounded-xl overflow-hidden">
                          <img src={branding.ctaBgUrl} alt="" className="w-full h-full object-cover" style={{ opacity: isDark ? 0.07 : 0.05 }} />
                        </div>
                      )}
                      <div className="relative z-10 p-4">
                        {/* exclusive badge */}
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full mb-3"
                          style={{ background: isDark ? 'rgba(0,107,43,0.18)' : 'rgba(0,107,43,0.08)', border: `1px solid ${isDark ? 'rgba(0,107,43,0.4)' : 'rgba(0,107,43,0.2)'}` }}>
                          <span className="text-[8px] tracking-widest uppercase font-bold" style={{ color: isDark ? '#00FF7F' : '#006B2B' }}>
                            {homeExclusiveText || 'Exclusivo Allianz Parque'}
                          </span>
                        </div>
                        {/* Title */}
                        <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 900, lineHeight: 1.1, fontSize: '0.95rem' }}>
                          <div style={{ color: isDark ? '#fff' : '#0D2818' }}>{ctaTitle1 || 'Pronto para encontrar'}</div>
                          <div style={{ color: isDark ? '#00FF7F' : '#006B2B' }}>{ctaTitle2 || 'seus momentos?'}</div>
                        </div>
                        {/* Subtitle */}
                        <p className="text-[8px] mt-2 leading-relaxed" style={{ color: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(13,40,24,0.5)', maxWidth: 200 }}>
                          {ctaSubtitle || 'Tire uma selfie e nossa IA encontra você em segundos.'}
                        </p>
                        {/* Button */}
                        <div className="mt-3">
                          <span className="text-[9px] px-3 py-1.5 rounded-lg font-bold inline-block"
                            style={{ background: isDark ? 'linear-gradient(135deg,#00FF7F,#00CC64)' : 'linear-gradient(135deg,#006B2B,#00843D)', color: isDark ? '#000' : '#fff' }}>
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
                                style={{ background: 'rgba(0,107,43,0.9)', color: '#fff' }}
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

                {/* ── Aviso informativo ── */}
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
                  style={{ background: isDark ? 'rgba(134,239,172,0.05)' : 'rgba(0,107,43,0.04)', border: `1px solid ${isDark ? 'rgba(134,239,172,0.12)' : 'rgba(0,107,43,0.12)'}` }}>
                  <Eye className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: green }} />
                  <p className="text-xs leading-relaxed" style={{ color: muted }}>
                    As seções abaixo estão na mesma ordem em que aparecem na página <strong style={{ color: text }}>/eventos</strong>. O background desta página é compartilhado com a Home — configure-o na aba <strong style={{ color: text }}>Marca</strong>.
                  </p>
                </div>

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
                        <div style={{ height: 3, background: isDark ? 'linear-gradient(90deg,#166534,#15803d)' : 'linear-gradient(90deg,#006B2B,#00843D)' }} />
                        <div className="p-3">
                          <span className="text-[9px] tracking-widest uppercase font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(13,40,24,0.45)', fontFamily: "'Montserrat',sans-serif" }}>
                            {tourLabel || 'Tour'}
                          </span>
                          <div className="text-xs font-bold mt-0.5" style={{ color: text, fontFamily: "'Montserrat',sans-serif" }}>27/02/2026, 10:00</div>
                          <div className="text-[10px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(13,40,24,0.45)' }}>sexta-feira</div>
                          <div className="flex items-center gap-1 mt-2 text-[9px] uppercase tracking-wider font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(13,40,24,0.55)' }}>
                            <span>📍</span>
                            <span>{venueName || 'Allianz Parque'}</span>
                            <span style={{ opacity: 0.4 }}>·</span>
                            <span>{venueLocation || 'São Paulo, SP'}</span>
                          </div>
                          <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px]"
                            style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.07)', border: `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(0,107,43,0.15)'}`, color: green, fontWeight: 600 }}>
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
                  subtitle="Simulação do texto sobreposto nas fotos"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                  <div className="relative rounded-xl overflow-hidden"
                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)', aspectRatio: '4/3' }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="w-10 h-10" style={{ color: muted, opacity: 0.3 }} />
                    </div>
                    <div className="absolute inset-0 flex items-end justify-end p-3">
                      <span className="text-[11px] font-bold px-2 py-1 rounded-md"
                        style={{ background: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(4px)' }}>
                        {watermarkText || '© Smart Match'}
                      </span>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded"
                        style={{ background: isDark ? 'rgba(134,239,172,0.15)' : 'rgba(0,107,43,0.1)', color: green }}>
                        prévia
                      </span>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Toast msg={toast} isDark={isDark} />
    </div>
  );
}