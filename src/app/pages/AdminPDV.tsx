import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Store, CalendarDays, BarChart3, DollarSign, Search, ShoppingCart,
  Printer, CheckCircle2, Loader2, Trash2, X, User,
  CreditCard, Banknote, ImageIcon, AlertCircle, ClipboardList,
  FolderOpen, Scan, Trash, MoveHorizontal, ChevronLeft, ChevronRight,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { TabNav } from '../components/TabNav';
import { useAuth } from '../contexts/AuthContext';
import { api, type EventRecord, type PhotoRecord, type OrderItem } from '../lib/api';
import { FacePDVSearch } from '../components/FacePDVSearch';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// URL da página pública — exibe foto + auto-download ao carregar.
// Usada nos QR codes porque o gateway do Supabase Edge Functions exige
// Authorization header (não aceita ?apikey= como query param), e o celular
// do visitante abre URLs no browser sem headers customizados.
const getPublicPhotoUrl = (orderId: string, photoId: string) =>
  `${window.location.origin}/minha-foto/${orderId}/${photoId}`;

// Alias para clareza — QR codes sempre apontam para a página pública
const getDirectDownloadUrl = getPublicPhotoUrl;

// Busca URL pública fresca para exibição/impressão (evita URLs assinadas expiradas)
const BASE_SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-68454e9b`;
async function fetchFreshPhotoUrl(orderId: string, photoId: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_SERVER}/orders/${orderId}/photos/${photoId}/signed-url`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    const data = await res.json();
    return data.viewUrl ?? null;
  } catch {
    return null;
  }
}

interface PosCartItem {
  photoId: string;
  src: string;
  tag: string;
  eventId: string;
  eventName: string;
  price: number;
}

/* ── Preview: foto + rodapé real + QR sobreposto ─────────────────────────── */
function PhotoPreviewWithFooter({
  src,
  footerSrc,
  downloadUrl,
  compact = false,
  qrRight = 16,
}: {
  src: string;
  footerSrc?: string;
  downloadUrl?: string;
  compact?: boolean;
  qrRight?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <img
        src={src}
        alt=""
        className="w-full block object-cover"
        style={{ maxHeight: compact ? 200 : 400 }}
      />
      {footerSrc && (
        <div className="relative w-full select-none">
          <img src={footerSrc} alt="Rodapé" className="w-full block" draggable={false} />
          {downloadUrl && (
            <div
              className="absolute"
              style={{ right: `${qrRight}%`, top: '6%', height: '88%', aspectRatio: '1/1' }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(downloadUrl)}&color=ffffff&bgcolor=006B2B`}
                alt="QR"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   AdminPDV
══════════════════════════════════════════════════════════════════════════════ */
export function AdminPDV() {
  const { theme }  = useTheme();
  const isDark     = theme === 'dark';
  const navigate   = useNavigate();
  const { user, isAdmin, loading: authLoading, getToken, token } = useAuth();

  /* design tokens */
  const bg      = isDark ? '#08080E' : '#F2F8F4';
  const card    = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)';
  const border  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.1)';
  const muted   = isDark ? 'rgba(255,255,255,0.4)'  : 'rgba(0,40,20,0.42)';
  const text    = isDark ? '#fff'                    : '#0D2818';
  const green   = isDark ? '#86efac'                 : '#006B2B';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)'  : 'rgba(0,0,0,0.04)';
  const brd     = `1px solid ${border}`;
  const btnPri  = isDark
    ? 'rgba(22,101,52,0.85)'
    : 'linear-gradient(135deg,#006B2B,#00843D)';

  /* ── Imagem do rodapé — salva no localStorage ── */
  const footerFileRef = useRef<HTMLInputElement>(null);
  const [footerSrc, setFooterSrc] = useState<string>(() => {
    try { return localStorage.getItem('pdv_footer_img') ?? ''; } catch { return ''; }
  });

  /* ── Dimensões da imagem do rodapé (para calcular max do slider) ── */
  const [footerDims, setFooterDims] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  useEffect(() => {
    if (!footerSrc) return;
    const img = new Image();
    img.onload = () => setFooterDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = footerSrc;
  }, [footerSrc]);
  // QR width as % of footer width (height:88%, aspect-ratio:1/1)
  const qrWidthPct = footerDims.w > 0 ? (0.88 * footerDims.h / footerDims.w) * 100 : 15;
  const sliderMax = Math.max(0, Math.round((100 - qrWidthPct) * 2) / 2);

  /* ── Posição horizontal do QR (% a partir da ESQUERDA) ── */
  const [qrRight, setQrRight] = useState<number>(() => {
    try { return Number(localStorage.getItem('pdv_qr_right') ?? '2'); } catch { return 2; }
  });
  const saveQrRight = (v: number) => {
    setQrRight(v);
    try { localStorage.setItem('pdv_qr_right', String(v)); } catch {}
  };

  const handlePickFooter = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUrl = ev.target?.result as string;
      setFooterSrc(dataUrl);
      try { localStorage.setItem('pdv_footer_img', dataUrl); } catch {}

      // Sincroniza com o servidor para que MinhaFoto possa usar
      if (token) {
        try {
          const base64 = dataUrl.split(',')[1];
          const mimeType = dataUrl.split(';')[0].split(':')[1];
          await api.uploadBrandingAsset({ type: 'footer-image', base64, mimeType }, token);
          console.log('[AdminPDV] Footer image sincronizada com servidor');
        } catch (err) {
          console.warn('[AdminPDV] Falha ao sincronizar footer com servidor:', err);
        }
      }
    };
    reader.readAsDataURL(file);
    if (footerFileRef.current) footerFileRef.current.value = '';
  };

  const removeFooter = () => {
    setFooterSrc('');
    try { localStorage.removeItem('pdv_footer_img'); } catch {}
  };

  // Salva qrRight no servidor com debounce
  const saveQrRightToServer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncQrRight = (v: number) => {
    saveQrRight(v);
    if (saveQrRightToServer.current) clearTimeout(saveQrRightToServer.current);
    saveQrRightToServer.current = setTimeout(async () => {
      if (!token) return;
      try {
        await api.updateBranding({ footerQrRight: v } as any, token);
      } catch (err) {
        console.warn('[AdminPDV] Falha ao sincronizar qrRight com servidor:', err);
      }
    }, 800);
  };

  /* ── State geral ── */
  const [events,         setEvents]         = useState<EventRecord[]>([]);
  const [selectedEvent,  setSelectedEvent]  = useState<EventRecord | null>(null);
  const [photos,         setPhotos]         = useState<PhotoRecord[]>([]);
  const [photosLoading,  setPhotosLoading]  = useState(false);
  const [searchTerm,     setSearchTerm]     = useState('');
  const [faceMatchIds,   setFaceMatchIds]   = useState<string[]>([]);
  const [showFaceSearch, setShowFaceSearch] = useState(false);
  const [previewPhoto,   setPreviewPhoto]   = useState<PosCartItem | null>(null);

  /* Carrinho */
  const [cart,          setCart]          = useState<PosCartItem[]>([]);
  const [customerName,  setCustomerName]  = useState('');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');

  /* Checkout */
  const [processing, setProcessing] = useState(false);
  const [lastOrder,  setLastOrder]  = useState<any>(null);
  const [error,      setError]      = useState('');

  /* ── Guards ── */
  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/admin/login', { replace: true });
  }, [isAdmin, authLoading, navigate]);

  /* ── Carregar eventos (tenant-scoped via admin route) ── */
  useEffect(() => {
    if (!token) return;
    api.getAdminEvents(token).then(r => {
      const sorted = r.events
        .filter((e: any) => e.photoCount > 0)
        .sort((a: any, b: any) => b.date.localeCompare(a.date));
      setEvents(sorted);
      if (sorted.length > 0) setSelectedEvent(sorted[0]);
    }).catch(console.error);
  }, [token]);

  /* ── Carregar fotos ao trocar evento ── */
  useEffect(() => {
    if (!selectedEvent) return;
    setPhotosLoading(true);
    setSearchTerm('');
    setFaceMatchIds([]);
    api.getEventPhotos(selectedEvent.id, 1, 500)
      .then(r => setPhotos(r.photos))
      .catch(console.error)
      .finally(() => setPhotosLoading(false));
  }, [selectedEvent?.id]);

  /* ── Helpers do carrinho ── */
  const isInCart      = useCallback((id: string) => cart.some(c => c.photoId === id), [cart]);
  const addToCart     = useCallback((photo: PhotoRecord) => {
    if (!selectedEvent || isInCart(photo.id)) return;
    setCart(prev => [...prev, {
      photoId: photo.id, src: photo.url ?? '', tag: photo.tag,
      eventId: selectedEvent.id, eventName: selectedEvent.name, price: photo.price,
    }]);
  }, [selectedEvent, isInCart]);
  const removeFromCart = (photoId: string) =>
    setCart(prev => prev.filter(c => c.photoId !== photoId));
  const clearAll       = () => { setCart([]); setCustomerName(''); setLastOrder(null); setError(''); };
  const total          = cart.reduce((s, c) => s + c.price, 0);

  /* ── Checkout ── */
  const handleCheckout = async () => {
    if (!cart.length) return;
    if (!footerSrc) {
      setError('Configure um rodapé antes de finalizar a venda.');
      return;
    }
    setProcessing(true); setError('');
    try {
      const token = await getToken();
      if (!token) { navigate('/admin/login'); return; }
      const items: OrderItem[] = cart.map(c => ({
        photoId: c.photoId, eventId: c.eventId, eventName: c.eventName,
        tag: c.tag, price: c.price, src: c.src,
      }));
      const { order } = await api.createPosOrder(
        { items, customerName: customerName || 'Cliente presencial', paymentMethod },
        token,
      );
      setLastOrder(order);
      setCart([]); setCustomerName('');
    } catch (err: any) {
      setError(err.message ?? 'Erro ao finalizar venda');
    } finally {
      setProcessing(false);
    }
  };

  /* ── Imprimir comprovante térmico ── */
  const handlePrint = () => {
    const pw = window.open('', '_blank', 'width=400,height=600');
    if (!pw || !lastOrder) return;
    const items = lastOrder.items ?? [];
    pw.document.write(`<!DOCTYPE html><html><head><title>Comprovante</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Montserrat',sans-serif;width:80mm;padding:8mm;color:#111;}
.hd{text-align:center;border-bottom:2px dashed #ccc;padding-bottom:12px;margin-bottom:12px;}
.logo{font-weight:900;font-size:18px;}.logo span{color:#006B2B;}
.sub{font-size:10px;color:#888;margin-top:2px;}
.info div{display:flex;justify-content:space-between;padding:3px 0;font-size:11px;}
.items{border-top:1px solid #ddd;border-bottom:1px solid #ddd;padding:8px 0;margin:10px 0;}
.item{display:flex;justify-content:space-between;font-size:11px;padding:2px 0;}
.total{display:flex;justify-content:space-between;font-weight:900;font-size:16px;margin:12px 0;}
.thanks{text-align:center;font-size:10px;color:#888;margin-top:16px;border-top:2px dashed #ccc;padding-top:12px;}
@media print{body{width:100%;}}
</style></head><body>
<div class="hd"><div class="logo">Smart<span>Match</span></div><div class="sub">Tour Palmeiras · Allianz Parque</div></div>
<div class="info">
<div><span>Pedido:</span><span>#${lastOrder.id?.slice(-8).toUpperCase()}</span></div>
<div><span>Cliente:</span><span>${lastOrder.customerName}</span></div>
<div><span>Pgto:</span><span>${({ dinheiro:'Dinheiro',debito:'Débito',credito:'Crédito',pix:'PIX' } as any)[lastOrder.paymentMethod] ?? lastOrder.paymentMethod}</span></div>
<div><span>Data:</span><span>${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>
</div>
<div class="items">${items.map((it: any) => `<div class="item"><span>${it.tag}</span><span>R$ ${Number(it.price).toFixed(2)}</span></div>`).join('')}</div>
<div class="total"><span>TOTAL</span><span>R$ ${Number(lastOrder.total).toFixed(2)}</span></div>
<div class="thanks">Obrigado por visitar o Allianz Parque!<br/>smartmatch.com.br</div>
</body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 300);
  };

  /* ── Imprimir fotos com rodapé ── */
  const handlePrintPhotos = async () => {
    if (!footerSrc || !lastOrder) return;
    const pw = window.open('', '_blank');
    if (!pw) return;
    const items = lastOrder.items ?? [];

    // Converte imagens remotas para data URL — garante carregamento na janela de impressão
    async function toDataUrl(url: string): Promise<string> {
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        return url;
      }
    }

    // Detecta orientação real da imagem via naturalWidth/naturalHeight
    async function getOrientation(dataUrl: string): Promise<'landscape' | 'portrait'> {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload  = () => resolve(img.naturalWidth >= img.naturalHeight ? 'landscape' : 'portrait');
        img.onerror = () => resolve('landscape'); // fallback padrão paisagem
        img.src = dataUrl;
      });
    }

    // Busca URLs frescas + converte para data URL + detecta orientação
    const freshItems = await Promise.all(
      items.map(async (it: any) => {
        const freshUrl    = await fetchFreshPhotoUrl(lastOrder.id, String(it.photoId));
        const dataUrl     = await toDataUrl(freshUrl ?? it.src);
        const orientation = await getOrientation(dataUrl);
        return { ...it, src: dataUrl, orientation };
      })
    );

    // Footer também vira data URL
    const footerDataUrl = await toDataUrl(footerSrc);
    const qrRightPct = qrRight;

    const photosHtml = freshItems.map((it: any, idx: number) => {
      const directDlUrl = getDirectDownloadUrl(lastOrder.id, String(it.photoId));
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(directDlUrl)}&color=ffffff&bgcolor=006B2B`;
      const pageClass = it.orientation === 'portrait' ? 'page-portrait' : 'page-landscape';

      return `
        <div class="page ${pageClass}"${idx > 0 ? ' style="page-break-before:always"' : ''}>
          <img src="${it.src}" class="photo"/>
          <div class="footer-wrap">
            <img src="${footerDataUrl}" class="footer-img"/>
            <img src="${qrUrl}" class="footer-qr" style="right:${qrRightPct}%"/>
          </div>
        </div>`;
    }).join('');

    pw.document.write(`<!DOCTYPE html><html><head><title>Fotos Smart Match</title>
<style>
/* Named pages — permitem orientação diferente por folha */
@page { margin: 0; }
@page landscape-page { size: 200mm 150mm; margin: 0; }
@page portrait-page  { size: 150mm 200mm; margin: 0; }

* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: white; }

/* Base da página */
.page {
  display: flex; flex-direction: column;
  overflow: hidden;
  page-break-after: always; break-after: page;
}
.page:last-child { page-break-after: avoid; break-after: avoid; }

/* Paisagem (padrão) — 200 × 150 mm (papel 15×20 deitado) */
.page-landscape {
  page: landscape-page;
  width: 200mm; height: 150mm;
}

/* Retrato — 150 × 200 mm (papel 15×20 em pé) */
.page-portrait {
  page: portrait-page;
  width: 150mm; height: 200mm;
}

/* Foto ocupa o espaço restante */
.photo {
  display: block;
  width: 100%;
  flex: 1;
  min-height: 0;
  object-fit: cover;
  object-position: center center;
}

/* Rodapé sempre 100% da largura da folha, QR posicionado via % */
.footer-wrap { flex-shrink: 0; position: relative; width: 100%; line-height: 0; }
.footer-img  { width: 100%; display: block; }
.footer-qr   { position: absolute; top: 6%; height: 88%; width: auto; object-fit: contain; }
</style>
</head><body>${photosHtml}<script>
window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 300); });
<\/script></body></html>`);
    pw.document.close();
  };

  /* ── Carrossel de eventos ── */
  const eventsCarouselRef = useRef<HTMLDivElement>(null);
  const scrollEvents = (dir: 'left' | 'right') => {
    const el = eventsCarouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
  };

  /* ── Filtrar fotos ── */
  const filteredPhotos = photos.filter(p => {
    const term     = searchTerm.toLowerCase();
    const bySearch = !term || p.tag?.toLowerCase().includes(term) || p.id.includes(term);
    const byFace   = faceMatchIds.length === 0 || faceMatchIds.includes(String(p.id));
    return bySearch && byFace;
  });

  /* ── Paginação das fotos ── */
  const PHOTOS_PER_PAGE = 20;
  const [photosPage, setPhotosPage] = useState(1);
  const photosTotalPages = Math.max(1, Math.ceil(filteredPhotos.length / PHOTOS_PER_PAGE));
  const pagedFilteredPhotos = filteredPhotos.slice(
    (photosPage - 1) * PHOTOS_PER_PAGE,
    photosPage * PHOTOS_PER_PAGE,
  );

  // Resetar página quando o evento, busca ou face-match mudarem
  useEffect(() => { setPhotosPage(1); }, [selectedEvent?.id, searchTerm, faceMatchIds.length]);

  /* ─────────────────────────────────────────────────────────────────────────── */

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: green }} />
      </div>
    );
  }

  return (
    <div className="pt-20 pb-16 min-h-screen" style={{ background: bg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: isDark ? 'rgba(192,132,252,0.1)' : 'rgba(107,33,168,0.08)' }}>
              <Store className="w-5 h-5" style={{ color: isDark ? '#c084fc' : '#7c3aed' }} />
            </div>
            <h1 style={{ fontFamily:"'Montserrat',sans-serif", fontSize:'clamp(1.4rem,3vw,2rem)', fontWeight:900, color:text, letterSpacing:'-0.02em' }}>
              Ponto de Venda
            </h1>
          </div>
          <p className="text-sm" style={{ color: muted }}>
            Venda presencial · Selecione o evento, encontre as fotos do cliente e finalize
          </p>
        </motion.div>

        {/* ── TabNav ── */}
        <TabNav className="mb-8" active="pdv" tabs={[
          { key:'dashboard',  label:'Dashboard',  icon:BarChart3,    to:'/admin' },
          { key:'eventos',    label:'Eventos',     icon:CalendarDays, to:'/admin/eventos' },
          { key:'financeiro', label:'Financeiro',  icon:DollarSign,   to:'/admin/financeiro' },
          { key:'pedidos',    label:'Pedidos',     icon:ClipboardList, to:'/admin/pedidos' },
          { key:'pdv',        label:'PDV',         icon:Store,        to:'/admin/pdv' },
        ]} />

        {/* ── ESTADO DE SUCESSO ── */}
        <AnimatePresence>
          {lastOrder && (
            <motion.div
              initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
              className="max-w-2xl mx-auto mb-8"
            >
              <div className="p-8 rounded-2xl text-center" style={{ background:card, border:`1px solid ${border}` }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background:'rgba(34,197,94,0.1)' }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color:'#22c55e' }} />
                </div>
                <h2 className="mb-1" style={{ fontFamily:"'Montserrat',sans-serif", fontWeight:900, color:text, fontSize:'1.3rem' }}>
                  Venda Registrada!
                </h2>
                <p className="text-sm mb-1" style={{ color:muted }}>
                  Pedido <code className="font-mono text-xs" style={{ color:green }}>{lastOrder.id?.slice(0,20)}</code>
                </p>
                <p className="text-lg font-bold mb-1" style={{ color:green, fontFamily:"'Montserrat',sans-serif" }}>
                  {fmt(lastOrder.total)}
                </p>
                <p className="text-xs mb-6" style={{ color:muted }}>
                  {lastOrder.items?.length} foto{lastOrder.items?.length !== 1 ? 's' : ''} · {lastOrder.customerName}
                </p>

                {/* Preview das fotos com rodapé real */}
                <div className="space-y-3 mb-6 text-left">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-center" style={{ color:muted }}>
                    Preview — como ficará impresso
                  </p>
                  {!footerSrc && (
                    <div className="text-center py-2">
                      <p className="text-xs" style={{ color:muted }}>Nenhum rodapé configurado</p>
                    </div>
                  )}
                  <div className={`grid gap-3 ${(lastOrder.items?.length ?? 0) > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {lastOrder.items?.map((item: any, i: number) => (
                      <PhotoPreviewWithFooter
                        key={i}
                        src={item.src}
                        footerSrc={footerSrc || undefined}
                        downloadUrl={getDirectDownloadUrl(lastOrder.id, String(item.photoId))}
                        compact={(lastOrder.items?.length ?? 0) > 1}
                        qrRight={qrRight}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <motion.button
                    whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                    onClick={handlePrintPhotos}
                    disabled={!footerSrc}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
                    style={{
                      background: footerSrc ? btnPri : inputBg,
                      color: footerSrc ? '#fff' : muted,
                      border: footerSrc ? 'none' : brd,
                      opacity: footerSrc ? 1 : 0.6,
                      cursor: footerSrc ? 'pointer' : 'not-allowed',
                    }}
                    title={footerSrc ? undefined : 'Configure um rodapé antes de imprimir'}
                  >
                    <ImageIcon className="w-4 h-4" />
                    {footerSrc ? 'Imprimir Fotos com Rodapé' : 'Configure um rodapé para imprimir'}
                  </motion.button>
                  <div className="flex gap-3 justify-center">
                    <motion.button
                      whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                      onClick={handlePrint}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                      style={{ background:inputBg, border:brd, color:text }}
                    >
                      <Printer className="w-4 h-4" /> Comprovante
                    </motion.button>
                    <button onClick={clearAll}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold"
                      style={{ background:inputBg, border:brd, color:text }}>
                      Nova Venda
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── LAYOUT PRINCIPAL ── */}
        {!lastOrder && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ═══ COLUNA ESQUERDA — Eventos + Fotos ═══ */}
            <div className="lg:col-span-2 flex flex-col gap-4">

              {/* Seleção de Evento */}
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
                className="rounded-2xl overflow-hidden" style={{ background:card, border:`1px solid ${border}` }}>
                <div className="px-5 py-3 flex items-center gap-2"
                  style={{ borderBottom:`1px solid ${border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,107,43,0.03)' }}>
                  <CalendarDays className="w-4 h-4" style={{ color:green }} />
                  <span className="text-xs font-bold" style={{ color:muted }}>EVENTO</span>
                  {selectedEvent && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.07)', color:green }}>
                      {selectedEvent.photoCount} fotos
                    </span>
                  )}
                </div>
                {events.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color:muted }}>Nenhum evento com fotos</p>
                ) : (
                  <div className="relative">
                    {/* Seta esquerda */}
                    <button
                      onClick={() => scrollEvents('left')}
                      className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full transition-all"
                      style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', border: `1px solid ${border}`, color: text }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Trilha rolável */}
                    <div
                      ref={eventsCarouselRef}
                      className="carousel-track flex gap-3 overflow-x-auto px-10 py-4 scroll-smooth"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {events.map(e => {
                        const active = selectedEvent?.id === e.id;
                        return (
                          <button
                            key={e.id}
                            onClick={() => setSelectedEvent(e)}
                            className="flex-shrink-0 w-44 text-left px-3 py-3 rounded-xl transition-all"
                            style={{
                              background: active ? (isDark ? 'rgba(134,239,172,0.1)' : 'rgba(0,107,43,0.09)') : inputBg,
                              border: `1.5px solid ${active ? (isDark ? 'rgba(134,239,172,0.35)' : 'rgba(0,107,43,0.3)') : border}`,
                              boxShadow: active ? `0 0 0 3px ${isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.06)'}` : 'none',
                            }}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <CalendarDays className="w-3 h-3 flex-shrink-0" style={{ color: active ? green : muted }} />
                              <span className="text-[10px] font-black truncate" style={{ color: active ? green : text }}>
                                {e.name}
                              </span>
                            </div>
                            <span className="text-[9px] block truncate" style={{ color: muted }}>
                              {e.date}
                            </span>
                            <div className="mt-2 flex items-center gap-1">
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                style={{
                                  background: active ? (isDark ? 'rgba(134,239,172,0.15)' : 'rgba(0,107,43,0.1)') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                                  color: active ? green : muted,
                                }}
                              >
                                {e.photoCount} fotos
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Seta direita */}
                    <button
                      onClick={() => scrollEvents('right')}
                      className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full transition-all"
                      style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', border: `1px solid ${border}`, color: text }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>

              {/* Busca por texto + reconhecimento facial */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:muted }} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por tag ou ID…"
                    className="w-full pl-10 pr-3 py-3 rounded-xl text-sm outline-none"
                    style={{ background:card, border:`1px solid ${border}`, color:text }}
                  />
                </div>
                <motion.button
                  whileHover={{ scale:1.03 }} whileTap={{ scale:0.96 }}
                  onClick={() => selectedEvent && setShowFaceSearch(true)}
                  disabled={!selectedEvent}
                  title="Busca por reconhecimento facial"
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap"
                  style={{
                    background: faceMatchIds.length > 0
                      ? (isDark ? 'rgba(134,239,172,0.15)' : 'rgba(0,107,43,0.12)')
                      : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                    border: `1px solid ${faceMatchIds.length > 0
                      ? (isDark ? 'rgba(134,239,172,0.35)' : 'rgba(0,107,43,0.25)') : border}`,
                    color: faceMatchIds.length > 0 ? green : text,
                    opacity: !selectedEvent ? 0.4 : 1,
                  }}
                >
                  <Scan className="w-4 h-4" />
                  {faceMatchIds.length > 0 ? `${faceMatchIds.length} matches` : 'Rosto'}
                  {faceMatchIds.length > 0 && (
                    <X className="w-3 h-3 opacity-60" onClick={e => { e.stopPropagation(); setFaceMatchIds([]); }} />
                  )}
                </motion.button>
              </div>

              {/* Grade de fotos */}
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
                className="rounded-2xl p-4" style={{ background:card, border:`1px solid ${border}` }}>

                {faceMatchIds.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl text-xs"
                    style={{ background: isDark ? 'rgba(134,239,172,0.06)' : 'rgba(0,107,43,0.05)', border:`1px solid ${isDark ? 'rgba(134,239,172,0.15)' : 'rgba(0,107,43,0.12)'}`, color:green }}>
                    <Scan className="w-3.5 h-3.5" />
                    {filteredPhotos.length} foto{filteredPhotos.length !== 1 ? 's' : ''} correspondentes ao rosto
                    <button onClick={() => setFaceMatchIds([])} className="ml-auto opacity-60 hover:opacity-100">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {photosLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color:muted }} />
                  </div>
                ) : filteredPhotos.length === 0 ? (
                  <div className="text-center py-16">
                    <ImageIcon className="w-10 h-10 mx-auto mb-3" style={{ color:muted }} />
                    <p className="text-sm" style={{ color:muted }}>
                      {photos.length === 0 ? 'Nenhuma foto neste evento' : 'Nenhuma foto encontrada'}
                    </p>
                  </div>
                ) : (
                  <>
                  {/* Sumário + paginação topo */}
                  {filteredPhotos.length > 0 && (
                    <div className="flex items-center justify-between mb-2 text-[10px]" style={{ color: muted }}>
                      <span>
                        {(photosPage - 1) * PHOTOS_PER_PAGE + 1}–{Math.min(photosPage * PHOTOS_PER_PAGE, filteredPhotos.length)} de {filteredPhotos.length} fotos
                      </span>
                      {photosTotalPages > 1 && (
                        <span style={{ color: green, fontWeight: 700 }}>Pág. {photosPage}/{photosTotalPages}</span>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {pagedFilteredPhotos.map(photo => {
                      const inCart      = isInCart(photo.id);
                      const isFaceMatch = faceMatchIds.length > 0 && faceMatchIds.includes(String(photo.id));
                      return (
                        <motion.div
                          key={photo.id}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          className="relative group cursor-pointer overflow-hidden rounded-xl"
                          style={{
                            aspectRatio: '3/2',
                            border: inCart
                              ? `2px solid ${green}`
                              : isFaceMatch ? `2px solid #22c55e` : `1px solid ${border}`,
                            boxShadow: isFaceMatch && !inCart ? '0 0 0 2px rgba(34,197,94,0.25)' : 'none',
                          }}
                        >
                          {photo.url ? (
                            <img src={photo.url} alt={photo.tag} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background:inputBg }}>
                              <ImageIcon className="w-6 h-6" style={{ color:muted }} />
                            </div>
                          )}

                          {inCart && (
                            <div className="absolute inset-0 flex items-center justify-center"
                              style={{ background:'rgba(22,101,52,0.5)' }}>
                              <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                          )}

                          {isFaceMatch && !inCart && (
                            <div className="absolute top-1 right-1">
                              <span className="text-[8px] px-1 py-0.5 rounded font-bold"
                                style={{ background:'rgba(34,197,94,0.9)', color:'#fff' }}>★</span>
                            </div>
                          )}

                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end">
                            <div className="flex gap-1 p-1.5">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setPreviewPhoto({
                                    photoId: photo.id, src: photo.url ?? '', tag: photo.tag,
                                    eventId: selectedEvent?.id ?? '', eventName: selectedEvent?.name ?? '',
                                    price: photo.price,
                                  });
                                }}
                                className="flex-1 py-1 rounded-lg text-[9px] font-bold"
                                style={{ background:'rgba(0,0,0,0.75)', color:'#fff' }}
                              >
                                Preview
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); inCart ? removeFromCart(photo.id) : addToCart(photo); }}
                                className="flex-1 py-1 rounded-lg text-[9px] font-bold"
                                style={{ background: inCart ? 'rgba(239,68,68,0.85)' : 'rgba(22,101,52,0.85)', color:'#fff' }}
                              >
                                {inCart ? 'Remover' : '+ Cart'}
                              </button>
                            </div>
                          </div>

                          <div className="absolute bottom-0 left-0 right-0 pointer-events-none group-hover:opacity-0 transition-opacity">
                            <span className="text-[8px] px-1.5 py-0.5 block truncate"
                              style={{ background:'rgba(0,0,0,0.6)', color:'#fff' }}>
                              {photo.tag}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Barra de paginação */}
                  {photosTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 mt-3 pt-3" style={{ borderTop: `1px solid ${border}` }}>
                      {/* Prev */}
                      <button
                        onClick={() => setPhotosPage(p => Math.max(1, p - 1))}
                        disabled={photosPage <= 1}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: card, border: `1px solid ${border}`, color: photosPage > 1 ? green : muted, opacity: photosPage <= 1 ? 0.3 : 1 }}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* Números de página */}
                      {Array.from({ length: photosTotalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === photosTotalPages || Math.abs(p - photosPage) <= 1)
                        .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                          if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) => p === '...'
                          ? <span key={`pdv${i}`} className="w-7 text-center text-[10px]" style={{ color: muted }}>…</span>
                          : (
                            <button
                              key={p}
                              onClick={() => setPhotosPage(p as number)}
                              className="w-7 h-7 rounded-lg text-[11px] font-bold transition-all"
                              style={{
                                background: p === photosPage
                                  ? (isDark ? 'rgba(134,239,172,0.15)' : 'rgba(0,107,43,0.12)')
                                  : card,
                                border: `1px solid ${p === photosPage
                                  ? (isDark ? 'rgba(134,239,172,0.35)' : 'rgba(0,107,43,0.25)')
                                  : border}`,
                                color: p === photosPage ? green : muted,
                              }}
                            >
                              {p}
                            </button>
                          )
                        )
                      }

                      {/* Next */}
                      <button
                        onClick={() => setPhotosPage(p => Math.min(photosTotalPages, p + 1))}
                        disabled={photosPage >= photosTotalPages}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ background: card, border: `1px solid ${border}`, color: photosPage < photosTotalPages ? green : muted, opacity: photosPage >= photosTotalPages ? 0.3 : 1 }}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  </>
                )}
              </motion.div>

              {/* ── Rodapé — seletor de arquivo + ajuste de posição ── */}
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}
                className="rounded-2xl overflow-hidden" style={{ background:card, border:`1px solid ${border}` }}>

                <div className="px-5 py-3 flex items-center gap-2"
                  style={{ borderBottom:`1px solid ${border}`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,107,43,0.03)' }}>
                  <ImageIcon className="w-4 h-4" style={{ color:green }} />
                  <span className="text-xs font-bold" style={{ color:muted }}>IMAGEM DO RODAPÉ</span>
                  {footerSrc && (
                    <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background:'rgba(34,197,94,0.12)', color:'#22c55e' }}>
                      ✓ Configurado
                    </span>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-3">
                  {footerSrc ? (
                    <>
                      {/* Preview com QR dinâmico */}
                      <div className="relative rounded-xl overflow-hidden" style={{ border:`1px solid ${border}` }}>
                        <img src={footerSrc} alt="Rodapé" className="w-full block" />
                        {/* QR de posição ajustável */}
                        <div
                          className="absolute flex items-center justify-center rounded"
                          style={{
                            left: `${qrRight}%`,
                            top: '6%',
                            height: '88%',
                            aspectRatio: '1/1',
                            background: 'rgba(0,255,127,0.25)',
                            border: '2px solid rgba(0,255,127,0.8)',
                          }}
                        >
                          <span style={{ fontSize:'9px', fontWeight:900, color:'#00FF7F', textShadow:'0 1px 2px rgba(0,0,0,0.8)' }}>QR</span>
                        </div>
                      </div>

                      {/* Slider de posição horizontal do QR */}
                      <div className="px-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <MoveHorizontal className="w-3.5 h-3.5" style={{ color:green }} />
                            <span className="text-[10px] font-bold" style={{ color:muted }}>
                              POSIÇÃO DO QR — arraste para alinhar com o quadrado branco
                            </span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                            style={{ background:inputBg, color:green }}>
                            {qrRight}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={sliderMax}
                          step={0.5}
                          value={Math.min(qrRight, sliderMax)}
                          onChange={e => syncQrRight(Number(e.target.value))}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer"
                          style={{
                            background: sliderMax > 0
                              ? `linear-gradient(to right, ${green} 0%, ${green} ${(Math.min(qrRight, sliderMax) / sliderMax) * 100}%, ${inputBg} ${(Math.min(qrRight, sliderMax) / sliderMax) * 100}%, ${inputBg} 100%)`
                              : inputBg,
                            accentColor: green,
                          }}
                        />
                        <div className="flex justify-between text-[9px] mt-1" style={{ color:muted }}>
                          <span>← esquerda</span>
                          <span>direita →</span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                          onClick={() => footerFileRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                          style={{ background:inputBg, border:brd, color:text }}
                        >
                          <FolderOpen className="w-3.5 h-3.5" /> Trocar imagem
                        </motion.button>
                        <button
                          onClick={removeFooter}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold"
                          style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.15)', color:'#ef4444' }}
                        >
                          <Trash className="w-3.5 h-3.5" /> Remover
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Nenhum rodapé — drop zone */
                    <motion.button
                      whileHover={{ scale:1.01 }}
                      whileTap={{ scale:0.98 }}
                      onClick={() => footerFileRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-xl transition-all"
                      style={{
                        background: isDark ? 'rgba(134,239,172,0.04)' : 'rgba(0,107,43,0.04)',
                        border: `1.5px dashed ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(0,107,43,0.2)'}`,
                        color: green,
                      }}
                    >
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.07)' }}>
                        <FolderOpen className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">Escolher imagem do rodapé</p>
                        <p className="text-[10px] mt-0.5" style={{ color:muted }}>
                          PNG, JPG ou WEBP · Ajuste a posição do QR com o slider após enviar
                        </p>
                      </div>
                    </motion.button>
                  )}
                  {/* Input oculto */}
                  <input
                    ref={footerFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handlePickFooter}
                  />
                </div>
              </motion.div>
            </div>

            {/* ═══ COLUNA DIREITA — Carrinho ═══ */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
                className="rounded-2xl sticky top-24"
                style={{ background:card, border:`1px solid ${border}` }}
              >
                {/* Cabeçalho */}
                <div className="p-5 flex items-center gap-2" style={{ borderBottom:`1px solid ${border}` }}>
                  <ShoppingCart className="w-4 h-4" style={{ color:green }} />
                  <h2 style={{ fontFamily:"'Montserrat',sans-serif", fontWeight:800, fontSize:'0.95rem', color:text }}>
                    Carrinho PDV
                  </h2>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.07)', color:green }}>
                    {cart.length} {cart.length === 1 ? 'foto' : 'fotos'}
                  </span>
                </div>

                {/* Itens */}
                <div className="p-4 max-h-60 overflow-y-auto space-y-2" style={{ scrollbarWidth:'thin' }}>
                  {cart.length === 0 ? (
                    <p className="text-xs text-center py-6" style={{ color:muted }}>
                      Clique em "+ Cart" nas fotos para adicionar
                    </p>
                  ) : cart.map(item => (
                    <div key={item.photoId} className="flex items-center gap-2 p-2 rounded-xl"
                      style={{ background:inputBg, border:brd }}>
                      <div className="w-10 h-7 rounded overflow-hidden flex-shrink-0 bg-black">
                        {item.src
                          ? <img src={item.src} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-3 h-3" style={{ color:muted }} /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] truncate font-semibold" style={{ color:text }}>{item.tag}</p>
                        <p className="text-[10px] font-bold" style={{ color:green }}>{fmt(item.price)}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.photoId)}
                        className="p-1 rounded-lg" style={{ color: isDark ? '#fca5a5' : '#dc2626' }}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Cliente + Pagamento */}
                <div className="p-4 space-y-3" style={{ borderTop:`1px solid ${border}` }}>
                  <div>
                    <label className="block text-[10px] font-bold mb-1" style={{ color:muted }}>NOME DO CLIENTE</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color:muted }} />
                      <input
                        type="text"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Cliente presencial"
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl text-xs outline-none"
                        style={{ background:inputBg, border:brd, color:text }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold mb-1.5" style={{ color:muted }}>FORMA DE PAGAMENTO</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        { key:'dinheiro', label:'Dinheiro', Icon:Banknote },
                        { key:'debito',   label:'Débito',   Icon:CreditCard },
                        { key:'credito',  label:'Crédito',  Icon:CreditCard },
                        { key:'pix',      label:'PIX',      Icon:Banknote },
                      ] as const).map(pm => (
                        <button
                          key={pm.key}
                          onClick={() => setPaymentMethod(pm.key)}
                          className="flex items-center gap-1.5 px-2 py-2.5 rounded-xl text-[10px] font-bold transition-all"
                          style={{
                            background: paymentMethod === pm.key
                              ? (isDark ? 'rgba(134,239,172,0.1)' : 'rgba(0,107,43,0.08)') : inputBg,
                            border: `1px solid ${paymentMethod === pm.key
                              ? (isDark ? 'rgba(134,239,172,0.3)' : 'rgba(0,107,43,0.2)') : border}`,
                            color: paymentMethod === pm.key ? green : muted,
                          }}
                        >
                          <pm.Icon style={{ width:12, height:12 }} />
                          {pm.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Total + Finalizar */}
                <div className="p-4" style={{ borderTop:`1px solid ${border}` }}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold" style={{ color:muted }}>TOTAL</span>
                    <span style={{ fontFamily:"'Montserrat',sans-serif", fontWeight:900, fontSize:'1.3rem', color:green }}>
                      {fmt(total)}
                    </span>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl mb-3 text-xs"
                      style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444' }}>
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
                    </div>
                  )}

                  {!footerSrc && cart.length > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-xl mb-3 text-xs"
                      style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', color:'#f59e0b' }}>
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Configure a <strong>imagem do rodapé</strong> antes de finalizar a venda. Sem ela, a foto não pode ser impressa.</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {cart.length > 0 && (
                      <button onClick={clearAll}
                        className="px-3 py-3 rounded-xl"
                        style={{ background:inputBg, border:brd, color: isDark ? '#fca5a5' : '#dc2626' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <motion.button
                      whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                      onClick={handleCheckout}
                      disabled={cart.length === 0 || processing || !footerSrc}
                      title={!footerSrc ? 'Configure um rodapé antes de finalizar' : undefined}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                      style={{
                        background: cart.length === 0 ? inputBg : btnPri,
                        color: cart.length === 0 ? muted : '#fff',
                        opacity: processing ? 0.6 : 1,
                        border: cart.length === 0 ? brd : 'none',
                      }}
                    >
                      {processing
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando…</>
                        : !footerSrc
                          ? <><ImageIcon className="w-4 h-4" /> Configure o rodapé</>
                          : <><Store className="w-4 h-4" /> Finalizar Venda</>
                      }
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: preview da foto com o rodapé ── */}
      <AnimatePresence>
        {previewPhoto && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background:'rgba(0,0,0,0.82)', backdropFilter:'blur(4px)' }}
            onClick={() => setPreviewPhoto(null)}
          >
            <motion.div
              initial={{ scale:0.94, y:16 }} animate={{ scale:1, y:0 }} exit={{ scale:0.94 }}
              className="w-full max-w-xl rounded-2xl overflow-hidden"
              style={{ background: isDark ? '#0F1A0F' : '#fff' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom:`1px solid ${border}`, background:card }}>
                <span className="text-sm font-bold" style={{ color:text }}>{previewPhoto.tag}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold" style={{ color:green }}>{fmt(previewPhoto.price)}</span>
                  <button onClick={() => setPreviewPhoto(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background:'rgba(239,68,68,0.08)', color:'#ef4444' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-black">
                <img
                  src={previewPhoto.src}
                  alt={previewPhoto.tag}
                  className="w-full block"
                  style={{ maxHeight: 420, objectFit:'cover' }}
                />
                {footerSrc && (
                  <div className="relative w-full">
                    <img src={footerSrc} alt="Rodapé" className="w-full block" />
                    <div className="absolute" style={{ right: `${qrRight}%`, top: '6%', height: '88%', aspectRatio: '1/1' }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(getPublicPhotoUrl('preview', previewPhoto.photoId))}&color=ffffff&bgcolor=006B2B`}
                        alt="QR"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}
                {!footerSrc && (
                  <div className="flex items-center justify-center py-3 gap-2 text-xs"
                    style={{ background:'rgba(255,255,255,0.05)', color:muted }}>
                    <FolderOpen className="w-3.5 h-3.5" />
                    Nenhum rodapé configurado — escolha uma imagem na seção abaixo
                  </div>
                )}
              </div>

              <div className="p-4 flex gap-2" style={{ background:card }}>
                <button
                  onClick={() => {
                    const photo = photos.find(p => p.id === previewPhoto.photoId);
                    if (photo) addToCart(photo);
                    setPreviewPhoto(null);
                  }}
                  disabled={isInCart(previewPhoto.photoId)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{
                    background: isInCart(previewPhoto.photoId) ? inputBg : btnPri,
                    color: isInCart(previewPhoto.photoId) ? muted : '#fff',
                    border: isInCart(previewPhoto.photoId) ? brd : 'none',
                  }}
                >
                  {isInCart(previewPhoto.photoId) ? '✓ Já no carrinho' : 'Adicionar ao carrinho'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: busca facial ── */}
      <AnimatePresence>
        {showFaceSearch && selectedEvent && (
          <FacePDVSearch
            eventId={selectedEvent.id}
            eventName={selectedEvent.name}
            isDark={isDark}
            onMatches={ids => setFaceMatchIds(ids)}
            onClose={() => setShowFaceSearch(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}