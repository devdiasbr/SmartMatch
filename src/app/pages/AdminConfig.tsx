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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Hero texts */}
                <SectionCard icon={FileText} title="Hero — Manchete"
                  subtitle="As 3 linhas do headline principal (a última fica em verde)"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                  <div className="space-y-4">
                    <FieldRow label="Linha 1 (branca)"
                      value={heroLine1} onChange={v => { setHeroLine1(v); setHomeDirty(true); }}
                      placeholder="Você vibrou." isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow label="Linha 2 (branca)"
                      value={heroLine2} onChange={v => { setHeroLine2(v); setHomeDirty(true); }}
                      placeholder="Você torceu." isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow label="Linha 3 (verde — destaque)"
                      value={heroLine3} onChange={v => { setHeroLine3(v); setHomeDirty(true); }}
                      placeholder="Encontre-se." isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <SaveBar dirty={homeDirty} saving={savingHome} onSave={saveHome} green={green} isDark={isDark} />
                  </div>
                </SectionCard>

                {/* Preview hero */}
                <SectionCard icon={Eye} title="Prévia do Hero"
                  subtitle="Simulação do cabeçalho da Home"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                  <div className="rounded-xl overflow-hidden relative" style={{ aspectRatio: '16/7', background: '#0a0a12' }}>
                    {branding?.backgroundUrls?.[0] && (
                      <img src={branding.backgroundUrls[0]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
                    )}
                    <div className="absolute inset-0 flex flex-col justify-center px-6">
                      <span className="text-[9px] tracking-widest uppercase mb-2" style={{ color: '#00FF7F', fontWeight: 700 }}>
                        {heroBadge || 'Allianz Parque · Tour Oficial'}
                      </span>
                      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 900, lineHeight: 1.1 }}>
                        <div className="text-white text-lg">{heroLine1 || 'Você vibrou.'}</div>
                        <div className="text-white text-lg">{heroLine2 || 'Você torceu.'}</div>
                        <div className="text-lg" style={{ color: '#00FF7F' }}>{heroLine3 || 'Encontre-se.'}</div>
                      </div>
                      <p className="text-[10px] mt-2 max-w-[60%] leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {heroSubtitle || 'Nossa IA varre milhares de fotos...'}
                      </p>
                      <div className="mt-3">
                        <span className="text-[10px] px-3 py-1.5 rounded-lg font-bold" style={{ background: '#006B2B', color: '#fff' }}>
                          {heroCTA || 'Ver eventos'}
                        </span>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* Subtitle + badge + CTA */}
                <div className="lg:col-span-2">
                  <SectionCard icon={Layout} title="Hero — Subtítulo, Badge e CTA"
                    subtitle="Texto de apoio, etiqueta acima do headline e botão principal"
                    isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <FieldRow label="Subtítulo" hint="Parágrafo exibido abaixo da manchete"
                          value={heroSubtitle} onChange={v => { setHeroSubtitle(v); setHomeDirty(true); }}
                          placeholder="Nossa IA varre milhares de fotos..." textarea
                          isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                      </div>
                      <div className="space-y-4">
                        <FieldRow label="Badge acima do título" hint="Ex: Allianz Parque · Tour Oficial"
                          value={heroBadge} onChange={v => { setHeroBadge(v); setHomeDirty(true); }}
                          placeholder="Allianz Parque · Tour Oficial do Palmeiras"
                          isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                        <FieldRow label="Texto do botão CTA"
                          value={heroCTA} onChange={v => { setHeroCTA(v); setHomeDirty(true); }}
                          placeholder="Ver eventos" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                      </div>
                    </div>
                    <SaveBar dirty={homeDirty} saving={savingHome} onSave={saveHome} green={green} isDark={isDark} />
                  </SectionCard>
                </div>

                {/* CTA Banner */}
                <div className="lg:col-span-2">
                  <SectionCard icon={Layout} title="Banner de CTA"
                    subtitle="Texto e botão exibidos na seção de CTA da Home"
                    isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <FieldRow label="Título 1" hint="Primeira linha do título"
                          value={ctaTitle1} onChange={v => { setCtaTitle1(v); setHomeDirty(true); }}
                          placeholder="Encontre seu" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                        <FieldRow label="Título 2" hint="Segunda linha do título"
                          value={ctaTitle2} onChange={v => { setCtaTitle2(v); setHomeDirty(true); }}
                          placeholder="momento" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                        <FieldRow label="Subtítulo" hint="Parágrafo exibido abaixo do título"
                          value={ctaSubtitle} onChange={v => { setCtaSubtitle(v); setHomeDirty(true); }}
                          placeholder="Reviva seus momentos especiais com a Smart Match." textarea
                          isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                      </div>
                      <div className="space-y-4">
                        <FieldRow label="Texto do botão CTA"
                          value={ctaButton} onChange={v => { setCtaButton(v); setHomeDirty(true); }}
                          placeholder="Ver eventos" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                      </div>
                    </div>
                    <SaveBar dirty={homeDirty} saving={savingHome} onSave={saveHome} green={green} isDark={isDark} />
                  </SectionCard>
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════════════════ TAB: EVENTOS ════════════════════ */}
          {activeTab === 'eventos' && (
            <motion.div key="eventos" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Events hero texts */}
                <SectionCard icon={CalendarDays} title="Hero da Página de Eventos"
                  subtitle="Título e subtítulo exibidos no topo da listagem de tours"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                  <div className="space-y-4">
                    <FieldRow label="Título — parte principal (branca)"
                      hint="Ex: Reviva seus"
                      value={eventsHeroTitle} onChange={v => { setEventsHeroTitle(v); setEventsDirty(true); }}
                      placeholder="Reviva seus" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow label="Título — parte em destaque (verde)"
                      hint="Ex: Momentos no Allianz"
                      value={eventsHeroTitleAccent} onChange={v => { setEventsHeroTitleAccent(v); setEventsDirty(true); }}
                      placeholder="Momentos no Allianz" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow label="Subtítulo" hint="Parágrafo de apoio abaixo do título"
                      value={eventsHeroSubtitle} onChange={v => { setEventsHeroSubtitle(v); setEventsDirty(true); }}
                      placeholder="Busca com reconhecimento facial..." textarea
                      isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <FieldRow label="Título da lista de eventos"
                      value={eventsListTitle} onChange={v => { setEventsListTitle(v); setEventsDirty(true); }}
                      placeholder="Eventos" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    <SaveBar dirty={eventsDirty} saving={savingEvents} onSave={saveEvents} green={green} isDark={isDark} />
                  </div>
                </SectionCard>

                {/* Preview events hero */}
                <SectionCard icon={Eye} title="Prévia do Hero de Eventos"
                  subtitle="Simulação do topo da página /eventos"
                  isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                  <div className="rounded-xl overflow-hidden relative" style={{ aspectRatio: '16/7', background: '#0a0a12' }}>
                    {branding?.backgroundUrls?.[0] && (
                      <img src={branding.backgroundUrls[0]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                      <span className="text-[9px] tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                        {heroBadge || 'Allianz Parque · Tour Oficial'}
                      </span>
                      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 900, fontSize: '1.1rem', lineHeight: 1.1 }}>
                        <span className="text-white">{eventsHeroTitle || 'Reviva seus'} </span>
                        <span style={{ color: '#86efac' }}>{eventsHeroTitleAccent || 'Momentos no Allianz'}</span>
                      </div>
                      <p className="text-[10px] mt-2 max-w-[60%] leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>
                        {eventsHeroSubtitle || 'Busca com reconhecimento facial...'}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] mt-3" style={{ color: muted }}>
                    O background é compartilhado com a Home (configurado na aba Marca).
                  </p>
                </SectionCard>

                {/* Venue / Tour identity — full width */}
                <div className="lg:col-span-2">
                  <SectionCard icon={Tag} title="Identidade do Local e Tour"
                    subtitle="Defina o nome do local, cidade e label do tipo de evento — afeta cards, Home e marca d'água"
                    isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldRow label="Nome do local / venue"
                        hint="Ex: Allianz Parque, Maracanã, Arena BRB"
                        value={venueName} onChange={v => { setVenueName(v); setVenueDirty(true); }}
                        placeholder="Allianz Parque" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                      <FieldRow label="Cidade e estado"
                        hint="Exibido nos cards de evento"
                        value={venueLocation} onChange={v => { setVenueLocation(v); setVenueDirty(true); }}
                        placeholder="São Paulo, SP" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                      <FieldRow label="Label do tipo de evento"
                        hint="Palavra exibida acima da data nos cards (ex: Tour, Jogo, Show)"
                        value={tourLabel} onChange={v => { setTourLabel(v); setVenueDirty(true); }}
                        placeholder="Tour" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                      <FieldRow label="Texto do badge 'Exclusivo' (Home)"
                        hint="Badge verde exibido na seção CTA da Home"
                        value={homeExclusiveText} onChange={v => { setHomeExclusiveText(v); setVenueDirty(true); }}
                        placeholder="Exclusivo Allianz Parque" isDark={isDark} text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd} />
                    </div>
                    {/* Live card preview */}
                    <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,107,43,0.08)'}` }}>
                      <p className="text-[11px] uppercase tracking-wider font-bold mb-3" style={{ color: muted }}>Prévia do card de evento</p>
                      <div className="inline-block rounded-xl overflow-hidden" style={{ minWidth: 200, border: `1px solid ${cardBorder}`, background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.85)' }}>
                        <div style={{ height: 3, background: isDark ? 'linear-gradient(90deg,#166534,#15803d)' : 'linear-gradient(90deg,#006B2B,#00843D)' }} />
                        <div className="p-4">
                          <span className="text-[10px] tracking-widest uppercase font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(13,40,24,0.45)', fontFamily: "'Montserrat',sans-serif" }}>
                            {tourLabel || 'Tour'}
                          </span>
                          <div className="text-sm font-bold mt-1" style={{ color: text, fontFamily: "'Montserrat',sans-serif" }}>27/02/2026, 10:00</div>
                          <div className="text-[11px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(13,40,24,0.45)' }}>sexta-feira</div>
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] uppercase tracking-wider font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(13,40,24,0.55)' }}>
                            <span>📍</span>{venueName || 'Allianz Parque'}, {venueLocation || 'São Paulo, SP'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <SaveBar dirty={venueDirty} saving={savingVenue} onSave={saveVenue} green={green} isDark={isDark} />
                  </SectionCard>
                </div>
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