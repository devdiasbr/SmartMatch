import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Settings, Image, Globe, Type, Droplets, Upload, Trash2,
  CheckCircle2, AlertCircle, Loader2, Plus, Monitor, Camera,
  BarChart3, CalendarDays, DollarSign, ClipboardList, Store,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { TabNav } from '../components/TabNav';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';
import { api, type BrandingConfig } from '../lib/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the data:...;base64, prefix
      res(result.split(',')[1] ?? '');
    };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, subtitle, children, isDark, cardBg, cardBorder, green, text,
}: {
  icon: React.ElementType; title: string; subtitle?: string;
  children: React.ReactNode;
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
          <h2 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.95rem', color: text }}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,40,20,0.42)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function DropZone({
  label, accept, onFile, uploading, isDark, cardBg, border, green, text, muted,
}: {
  label: string; accept: string;
  onFile: (file: File) => void;
  uploading: boolean;
  isDark: boolean; cardBg: string; border: string; green: string; text: string; muted: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault(); setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl cursor-pointer transition-all"
      style={{
        border: `2px dashed ${dragOver ? green : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,107,43,0.18)')}`,
        background: dragOver
          ? (isDark ? 'rgba(134,239,172,0.05)' : 'rgba(0,107,43,0.04)')
          : cardBg,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />
      {uploading
        ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: green }} />
        : <Upload className="w-5 h-5" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,107,43,0.35)' }} />
      }
      <span className="text-xs text-center" style={{ color: muted }}>
        {uploading ? 'Enviando...' : label}
      </span>
    </div>
  );
}

function ImagePreview({
  url, label, onDelete, deleting, isDark, green,
}: {
  url: string; label: string;
  onDelete: () => void; deleting: boolean;
  isDark: boolean; green: string;
}) {
  return (
    <div className="relative group rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <img src={url} alt={label} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
          onClick={onDelete}
          disabled={deleting}
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

function AssetBlock({
  label, hint, type, accept, url, uploading, deleting,
  onUpload, onDelete,
  isDark, cardBg, cardBorder, green, text, muted, inputBg, inputBorder,
}: {
  label: string; hint: string; type: 'logo' | 'favicon';
  accept: string; url: string | null;
  uploading: boolean; deleting: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
  isDark: boolean; cardBg: string; cardBorder: string; green: string; text: string;
  muted: string; inputBg: string; inputBorder: string;
}) {
  const isSquare = type === 'favicon';
  return (
    <div className="space-y-3">
      {url ? (
        <div className="relative rounded-xl overflow-hidden group"
          style={{
            maxWidth: isSquare ? 72 : 240,
            aspectRatio: isSquare ? '1' : '3/1',
            border: `1px solid ${cardBorder}`,
          }}>
          <img src={url} alt={label} className="w-full h-full object-contain p-2"
            style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
            <button
              onClick={onDelete}
              disabled={deleting}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Remover
            </button>
          </div>
        </div>
      ) : (
        <DropZone
          label={hint}
          accept={accept}
          onFile={onUpload}
          uploading={uploading}
          isDark={isDark}
          cardBg={inputBg}
          border={inputBorder}
          green={green}
          text={text}
          muted={muted}
        />
      )}
      {url && (
        <button
          onClick={() => document.querySelector<HTMLInputElement>(`input[data-type="${type}"]`)?.click()}
          className="flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: green }}
        >
          <Upload className="w-3 h-3" />
          Trocar {label.toLowerCase()}
          <input
            data-type={type}
            type="file"
            accept={accept}
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }}
          />
        </button>
      )}
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ msg, isDark }: { msg: { type: 'ok' | 'err'; text: string } | null; isDark: boolean }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold shadow-2xl"
          style={{
            background: msg.type === 'ok'
              ? (isDark ? 'rgba(22,163,74,0.92)' : '#166534')
              : (isDark ? 'rgba(220,38,38,0.92)' : '#dc2626'),
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

// ── ADMIN TABS ─────────────────────────────────────────────────────────────────

const ADMIN_TABS = [
  { key: 'dashboard',  label: 'Dashboard',  icon: BarChart3,    to: '/admin' },
  { key: 'eventos',    label: 'Eventos',    icon: CalendarDays, to: '/admin/eventos' },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign,   to: '/admin/financeiro' },
  { key: 'pedidos',    label: 'Pedidos',    icon: ClipboardList, to: '/admin/pedidos' },
  { key: 'pdv',        label: 'PDV',        icon: Store,         to: '/admin/pdv' },
  { key: 'config',     label: 'Config',     icon: Settings,      to: '/admin/config' },
];

// ── MAIN ───────────────────────────────────────────────────────────────────────

export function AdminConfig() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { token, isAdmin, loading: authLoading, getToken } = useAuth();
  const { refreshBranding } = useBranding();

  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // text fields
  const [appName, setAppName] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [watermarkText, setWatermarkText] = useState('');
  const [textDirty, setTextDirty] = useState(false);
  const [savingText, setSavingText] = useState(false);

  // asset states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [deletingFavicon, setDeletingFavicon] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [deletingBgIdx, setDeletingBgIdx] = useState<number | null>(null);

  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── Colors ─────────────────────────────────────────────────────────────────
  const bg        = isDark ? '#08080E' : '#F2F8F4';
  const cardBg    = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)';
  const cardBorder= isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.1)';
  const text      = isDark ? '#ffffff' : '#0D2818';
  const muted     = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,40,20,0.42)';
  const green     = isDark ? '#86efac' : '#006B2B';
  const inputBg   = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';
  const inputBrd  = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,107,43,0.15)';

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/admin/login', { replace: true });
  }, [isAdmin, authLoading, navigate]);

  // ── Load branding ──────────────────────────────────────────────────────────
  const loadBranding = useCallback(async () => {
    const t = await getToken();
    if (!t) return;
    try {
      const data = await api.getAdminBranding(t);
      setBranding(data);
      setAppName(data.appName);
      setPageTitle(data.pageTitle);
      setWatermarkText(data.watermarkText);
    } catch (err: any) {
      showToast('err', `Erro ao carregar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { if (token) loadBranding(); }, [token, loadBranding]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (type: 'ok' | 'err', txt: string) => {
    setToast({ type, text: txt });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Save text ──────────────────────────────────────────────────────────────
  const saveText = async () => {
    const t = await getToken();
    if (!t) return;
    setSavingText(true);
    try {
      await api.updateAdminBranding({ appName, pageTitle, watermarkText }, t);
      setTextDirty(false);
      showToast('ok', 'Identidade salva!');
      await refreshBranding();
      setBranding(prev => prev ? { ...prev, appName, pageTitle, watermarkText } : prev);
    } catch (err: any) {
      showToast('err', `Erro: ${err.message}`);
    } finally {
      setSavingText(false);
    }
  };

  // ── Upload asset ───────────────────────────────────────────────────────────
  const uploadAsset = async (type: 'logo' | 'favicon' | 'background', file: File) => {
    const t = await getToken();
    if (!t) return;
    if (type === 'logo') setUploadingLogo(true);
    else if (type === 'favicon') setUploadingFavicon(true);
    else setUploadingBg(true);

    try {
      const base64 = await fileToBase64(file);
      const res = await api.uploadBrandingAsset({ type, base64, mimeType: file.type }, t);
      showToast('ok', type === 'logo' ? 'Logotipo enviado!' : type === 'favicon' ? 'Favicon enviado!' : 'Foto de background adicionada!');
      await refreshBranding();
      await loadBranding();
    } catch (err: any) {
      showToast('err', `Erro no upload: ${err.message}`);
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else if (type === 'favicon') setUploadingFavicon(false);
      else setUploadingBg(false);
    }
  };

  // ── Delete asset ───────────────────────────────────────────────────────────
  const deleteAsset = async (asset: 'logo' | 'favicon') => {
    const t = await getToken();
    if (!t) return;
    if (asset === 'logo') setDeletingLogo(true);
    else setDeletingFavicon(true);
    try {
      await api.deleteBrandingAsset(asset, t);
      showToast('ok', `${asset === 'logo' ? 'Logotipo' : 'Favicon'} removido.`);
      await refreshBranding();
      await loadBranding();
    } catch (err: any) {
      showToast('err', `Erro: ${err.message}`);
    } finally {
      if (asset === 'logo') setDeletingLogo(false);
      else setDeletingFavicon(false);
    }
  };

  const deleteBg = async (idx: number) => {
    const t = await getToken();
    if (!t) return;
    setDeletingBgIdx(idx);
    try {
      await api.deleteBrandingBackground(idx, t);
      showToast('ok', 'Foto de background removida.');
      await refreshBranding();
      await loadBranding();
    } catch (err: any) {
      showToast('err', `Erro: ${err.message}`);
    } finally {
      setDeletingBgIdx(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: bg }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: green }} />
      </div>
    );
  }

  return (
    <div className="pt-20 pb-20 min-h-screen" style={{ background: bg }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={{
              fontFamily: "'Montserrat',sans-serif", fontWeight: 900,
              fontSize: 'clamp(1.5rem,3vw,2rem)', color: text, letterSpacing: '-0.03em',
            }}>
              Configurações
            </h1>
            <p className="text-sm mt-1" style={{ color: muted }}>
              Personalize a identidade visual da sua plataforma
            </p>
          </div>
        </div>

        {/* Tab Nav */}
        <TabNav className="mb-8" active="config" tabs={ADMIN_TABS} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── Identidade da Marca ── */}
          <SectionCard
            icon={Type} title="Identidade da Marca"
            subtitle="Nome e textos exibidos na plataforma"
            isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: muted }}>
                  Nome da aplicação
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={e => { setAppName(e.target.value); setTextDirty(true); }}
                  placeholder="Smart Match"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: inputBg, border: `1px solid ${inputBrd}`, color: text }}
                />
                <p className="text-[11px] mt-1" style={{ color: muted }}>
                  Aparece no cabeçalho e e-mails enviados
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: muted }}>
                  Título da aba (browser)
                </label>
                <input
                  type="text"
                  value={pageTitle}
                  onChange={e => { setPageTitle(e.target.value); setTextDirty(true); }}
                  placeholder="Smart Match – Tour Palmeiras"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: inputBg, border: `1px solid ${inputBrd}`, color: text }}
                />
                <p className="text-[11px] mt-1" style={{ color: muted }}>
                  Tag {`<title>`} da página — aparece na aba do navegador
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: muted }}>
                  Texto da marca d'água
                </label>
                <input
                  type="text"
                  value={watermarkText}
                  onChange={e => { setWatermarkText(e.target.value); setTextDirty(true); }}
                  placeholder="© Smart Match"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: inputBg, border: `1px solid ${inputBrd}`, color: text }}
                />
                <p className="text-[11px] mt-1" style={{ color: muted }}>
                  Sobreposto nas fotos para proteger o conteúdo
                </p>
              </div>

              <AnimatePresence>
                {textDirty && (
                  <motion.button
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={saveText}
                    disabled={savingText}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold mt-1"
                    style={{
                      background: isDark ? 'rgba(134,239,172,0.15)' : 'rgba(0,107,43,0.1)',
                      color: green,
                      border: `1px solid ${isDark ? 'rgba(134,239,172,0.25)' : 'rgba(0,107,43,0.2)'}`,
                    }}
                  >
                    {savingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {savingText ? 'Salvando...' : 'Salvar alterações'}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </SectionCard>

          {/* ── Preview live ── */}
          <SectionCard
            icon={Monitor} title="Pré-visualização"
            subtitle="Como sua marca aparece na plataforma"
            isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}
          >
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
                    {branding?.faviconUrl && (
                      <img src={branding.faviconUrl} alt="favicon" className="w-3.5 h-3.5 object-contain" />
                    )}
                    <span className="truncate" style={{ color: text, fontSize: 11 }}>
                      {pageTitle || 'Smart Match – Tour Palmeiras'}
                    </span>
                  </div>
                </div>
                {/* Nav mock */}
                <div className="px-4 py-3 flex items-center gap-3"
                  style={{ background: isDark ? '#0f0f1a' : '#006B2B' }}>
                  {branding?.logoUrl
                    ? <img src={branding.logoUrl} alt="logo" className="h-7 object-contain" />
                    : (
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-white/80" />
                        <span className="text-white font-black text-sm" style={{ fontFamily: "'Montserrat',sans-serif" }}>
                          {appName || 'Smart Match'}
                        </span>
                      </div>
                    )
                  }
                </div>
              </div>

              {/* Watermark mock */}
              <div className="relative rounded-xl overflow-hidden"
                style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)', aspectRatio: '4/3' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-10 h-10" style={{ color: muted, opacity: 0.4 }} />
                </div>
                <div className="absolute inset-0 flex items-end justify-end p-3">
                  <span className="text-[11px] font-bold px-2 py-1 rounded-md"
                    style={{
                      background: 'rgba(0,0,0,0.45)',
                      color: 'rgba(255,255,255,0.75)',
                      backdropFilter: 'blur(4px)',
                    }}>
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
            </div>
          </SectionCard>

          {/* ── Logotipo ── */}
          <SectionCard
            icon={Image} title="Logotipo"
            subtitle="PNG ou SVG com fundo transparente • max 2 MB"
            isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}
          >
            <AssetBlock
              label="Logotipo" hint="Clique ou arraste para enviar logo (PNG/SVG)"
              type="logo" accept="image/png,image/svg+xml,image/webp"
              url={branding?.logoUrl ?? null}
              uploading={uploadingLogo} deleting={deletingLogo}
              onUpload={f => uploadAsset('logo', f)}
              onDelete={() => deleteAsset('logo')}
              isDark={isDark} cardBg={inputBg} cardBorder={cardBorder} green={green}
              text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd}
            />
            <p className="text-[11px] mt-3" style={{ color: muted }}>
              Recomendado: 240 × 80 px, fundo transparente. Exibido no cabeçalho e e-mails.
            </p>
          </SectionCard>

          {/* ── Favicon ── */}
          <SectionCard
            icon={Globe} title="Favicon"
            subtitle="Ícone exibido na aba do navegador"
            isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}
          >
            <AssetBlock
              label="Favicon" hint="Clique ou arraste (PNG/ICO, 32×32 px)"
              type="favicon" accept="image/png,image/x-icon,image/jpeg"
              url={branding?.faviconUrl ?? null}
              uploading={uploadingFavicon} deleting={deletingFavicon}
              onUpload={f => uploadAsset('favicon', f)}
              onDelete={() => deleteAsset('favicon')}
              isDark={isDark} cardBg={inputBg} cardBorder={cardBorder} green={green}
              text={text} muted={muted} inputBg={inputBg} inputBorder={inputBrd}
            />
            <p className="text-[11px] mt-3" style={{ color: muted }}>
              Recomendado: 32 × 32 px ou 64 × 64 px em formato PNG.
            </p>
          </SectionCard>

          {/* ── Backgrounds ── */}
          <div className="lg:col-span-2">
            <SectionCard
              icon={Droplets} title="Fotos de Background"
              subtitle="Imagens de fundo usadas na home e páginas públicas"
              isDark={isDark} cardBg={cardBg} cardBorder={cardBorder} green={green} text={text}
            >
              {/* Grid of uploaded backgrounds */}
              {(branding?.backgroundUrls?.length ?? 0) > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                  {branding!.backgroundUrls.map((url, idx) => (
                    <ImagePreview
                      key={`${url}-${idx}`}
                      url={url}
                      label={`Background ${idx + 1}`}
                      onDelete={() => deleteBg(idx)}
                      deleting={deletingBgIdx === idx}
                      isDark={isDark}
                      green={green}
                    />
                  ))}
                  {/* Add more button */}
                  <div
                    onClick={() => !uploadingBg && document.getElementById('bg-file-input')?.click()}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl cursor-pointer transition-all"
                    style={{
                      aspectRatio: '16/9',
                      border: `2px dashed ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,107,43,0.18)'}`,
                      background: inputBg,
                    }}
                  >
                    {uploadingBg
                      ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: green }} />
                      : <Plus className="w-5 h-5" style={{ color: muted }} />
                    }
                    <span className="text-[11px]" style={{ color: muted }}>
                      {uploadingBg ? 'Enviando...' : 'Adicionar'}
                    </span>
                  </div>
                </div>
              )}

              {/* Empty state dropzone */}
              {(branding?.backgroundUrls?.length ?? 0) === 0 && (
                <DropZone
                  label="Clique ou arraste fotos de background (JPG/PNG)"
                  accept="image/jpeg,image/png,image/webp"
                  onFile={f => uploadAsset('background', f)}
                  uploading={uploadingBg}
                  isDark={isDark} cardBg={inputBg} border={inputBrd}
                  green={green} text={text} muted={muted}
                />
              )}

              <input
                id="bg-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) uploadAsset('background', f);
                  e.target.value = '';
                }}
              />

              <p className="text-[11px] mt-3" style={{ color: muted }}>
                Recomendado: 1920 × 1080 px ou maior. Múltiplas fotos são exibidas em rotação.
                {(branding?.backgroundUrls?.length ?? 0) > 0 && (
                  <> Você tem <strong style={{ color: green }}>{branding!.backgroundUrls.length}</strong> foto{branding!.backgroundUrls.length !== 1 ? 's' : ''} configurada{branding!.backgroundUrls.length !== 1 ? 's' : ''}.</>
                )}
              </p>
            </SectionCard>
          </div>

        </div>
      </div>

      {/* Toast */}
      <Toast msg={toast} isDark={isDark} />
    </div>
  );
}
