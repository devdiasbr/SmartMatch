import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import {
  ArrowLeft,
  Camera,
  Calendar,
  MapPin,
  Image as ImageIcon,
  Users,
  Download,
  ShoppingCart,
  Heart,
  X,
  CheckCircle2,
  Scan,
  Zap,
  ChevronLeft,
  ChevronRight,
  Star,
  Lock,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../contexts/CartContext';
import { TabNav } from '../components/TabNav';
import { api, type PhotoRecord } from '../lib/api';
import { FaceSearchPanel } from '../components/FaceSearchPanel';
import { FaceGroupingPanel } from '../components/FaceGroupingPanel';
import { ProtectedImage } from '../components/ProtectedImage';
import { useTheme } from '../components/ThemeProvider';
import { useBranding } from '../contexts/BrandingContext';
import { AnimatedBackground } from '../components/AnimatedBackground';

/* ─── Images ─── */
const IMG_STADIUM = 'https://images.unsplash.com/photo-1587565276758-0076cff659b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200';
const IMG_MARATHON = 'https://images.unsplash.com/photo-1745818016652-a890846ed361?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200';
const IMG_TRIATHLON = 'https://images.unsplash.com/photo-1508730328641-47c1616341b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200';
const IMG_TRAIL = 'https://images.unsplash.com/photo-1762375212814-21dfcb0bfb38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200';
const IMG_CYCLING = 'https://images.unsplash.com/photo-1753516231269-2a676b28f6fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200';
const IMG_PORTRAIT = 'https://images.unsplash.com/photo-1600366249664-acd65e33e5d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400';
const IMG_CONCERT = 'https://images.unsplash.com/photo-1771865107543-3e6b77bee2e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200';
const IMG_RUNNER = 'https://images.unsplash.com/photo-1763226931148-c2b591bde5ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800';

/* ─── Types ─── */
interface Photo {
  id: string | number;
  src: string;
  price: number;
  tag: string;
  liked: boolean;
  eventName?: string;
  eventId?: string;
}

interface EventInfo {
  title: string;
  date: string;
  location: string;
  photos: number;
  participants: number;
  price: number;
  tag: string;
  tagColor: string;
  hero: string;
}

/* ─── Mock fallback data ─── */
const PHOTOS_MOCK: Photo[] = [
  { id: 1, src: IMG_MARATHON, price: 29, tag: 'Largada', liked: false },
  { id: 2, src: IMG_TRAIL, price: 29, tag: 'KM 10', liked: false },
  { id: 3, src: IMG_TRIATHLON, price: 29, tag: 'Chegada', liked: true },
  { id: 4, src: IMG_CYCLING, price: 29, tag: 'KM 21', liked: false },
  { id: 5, src: IMG_CONCERT, price: 29, tag: 'KM 5', liked: false },
  { id: 6, src: IMG_RUNNER, price: 29, tag: 'Pódio', liked: false },
  { id: 7, src: IMG_MARATHON, price: 29, tag: 'KM 35', liked: false },
  { id: 8, src: IMG_TRAIL, price: 29, tag: 'Hidratação', liked: false },
  { id: 9, src: IMG_TRIATHLON, price: 29, tag: 'Transição', liked: false },
  { id: 10, src: IMG_CYCLING, price: 29, tag: 'Final', liked: false },
  { id: 11, src: IMG_CONCERT, price: 29, tag: 'Celebração', liked: false },
  { id: 12, src: IMG_RUNNER, price: 29, tag: 'Aquecimento', liked: false },
];

const EVENT_DATA: Record<string, EventInfo> = {
  'maratona-sp-2024': {
    title: 'Maratona de São Paulo 2024', date: '12 Mai 2024', location: 'São Paulo, SP',
    photos: 12480, participants: 35000, price: 29, tag: 'CORRIDA', tagColor: '#00FF7F', hero: IMG_MARATHON,
  },
  'ultra-trail-mantiqueira': {
    title: 'Ultra Trail Mantiqueira', date: '25 Jun 2024', location: 'Campos do Jordão, SP',
    photos: 8640, participants: 2800, price: 39, tag: 'TRAIL', tagColor: '#00D4FF', hero: IMG_TRAIL,
  },
  'ironman-floripa': {
    title: 'IRONMAN Florianópolis', date: '03 Ago 2024', location: 'Florianópolis, SC',
    photos: 15200, participants: 3200, price: 49, tag: 'TRIATHLON', tagColor: '#00D4FF', hero: IMG_TRIATHLON,
  },
  'rock-in-rio-2024': {
    title: 'Rock in Rio 2024', date: '14-22 Set 2024', location: 'Rio de Janeiro, RJ',
    photos: 28900, participants: 100000, price: 59, tag: 'FESTIVAL', tagColor: '#00D4FF', hero: IMG_CONCERT,
  },
};

const FALLBACK_EVENT = EVENT_DATA['maratona-sp-2024'];

/* ─── PhotoCard ─── */
function PhotoCard({ photo, eventId, eventName, onClick }: {
  photo: Photo; eventId: string; eventName: string; onClick: () => void;
}) {
  const { addItem, isInCart, openDrawer } = useCart();
  const [liked, setLiked] = useState(photo.liked);
  const inCart = isInCart(photo.id, eventId);
  const { branding } = useBranding();

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inCart) addItem({ photoId: photo.id, src: photo.src, tag: photo.tag, eventName, eventId, price: photo.price });
    openDrawer();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="relative group overflow-hidden cursor-pointer"
      style={{ borderRadius: 14, border: inCart ? '1px solid rgba(134,239,172,0.35)' : '1px solid rgba(128,128,128,0.15)', aspectRatio: '3/2' }}
      onClick={onClick}
    >
      <ProtectedImage
        src={photo.src}
        alt={photo.tag}
        watermark={true}
        watermarkText={branding.watermarkText}
        watermarkProducer={branding.watermarkProducer}
        watermarkPhotoTag={branding.watermarkPhotoTag}
        watermarkTour={branding.watermarkTour}
        className="w-full h-full"
        style={{ filter: 'brightness(0.85)' }}
      />
      {inCart && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px]" style={{ background: 'rgba(134,239,172,0.18)', border: '1px solid rgba(134,239,172,0.35)', color: '#86efac', fontWeight: 700 }}>
          <CheckCircle2 className="w-2.5 h-2.5" /> No carrinho
        </div>
      )}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="px-2 py-1 rounded-full text-[10px]" style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>{photo.tag}</span>
      </div>
      <button
        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        style={{ background: liked ? 'rgba(255,107,157,0.3)' : 'rgba(0,0,0,0.5)', border: `1px solid ${liked ? 'rgba(255,107,157,0.5)' : 'rgba(255,255,255,0.1)'}`, backdropFilter: 'blur(8px)' }}
        onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
      >
        <Heart className="w-4 h-4" style={{ color: liked ? '#FF6B9D' : 'rgba(255,255,255,0.6)' }} fill={liked ? '#FF6B9D' : 'transparent'} />
      </button>
      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#86efac' }}>R$ {photo.price}</span>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: inCart ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.85)', border: `1px solid ${inCart ? 'rgba(134,239,172,0.4)' : 'rgba(134,239,172,0.25)'}`, color: inCart ? '#86efac' : '#fff', fontWeight: 700, backdropFilter: 'blur(10px)' }}
        >
          {inCart ? <><CheckCircle2 className="w-3 h-3" /> No carrinho</> : <><ShoppingCart className="w-3 h-3" /> Adicionar</>}
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Lightbox ─── */
function Lightbox({ photos, index, eventId, eventName, onClose, onNext, onPrev, globalIndex, totalPhotos, hasNext, hasPrev }: {
  photos: Photo[]; index: number; eventId: string; eventName: string;
  onClose: () => void; onNext: () => void; onPrev: () => void;
  globalIndex: number; totalPhotos: number; hasNext: boolean; hasPrev: boolean;
}) {
  const photo = photos[index];
  const { addItem, isInCart, openDrawer } = useCart();
  const inCart = isInCart(photo.id, eventId);
  const { branding } = useBranding();

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inCart) {
      addItem({ photoId: photo.id, src: photo.src, tag: photo.tag, eventName, eventId, price: photo.price });
    }
    openDrawer();
  };

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(photo.src, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}
    >
      <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <X className="w-5 h-5 text-white" />
      </button>
      {/* Global counter: "13 / 24" */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm z-10" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
        {globalIndex + 1} / {totalPhotos || photos.length}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); if (hasPrev) onPrev(); }}
        className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center z-10 transition-opacity"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', opacity: hasPrev ? 1 : 0.25, cursor: hasPrev ? 'pointer' : 'not-allowed' }}
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); if (hasNext) onNext(); }}
        className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center z-10 transition-opacity"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', opacity: hasNext ? 1 : 0.25, cursor: hasNext ? 'pointer' : 'not-allowed' }}
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
      <div className="relative max-h-[80vh] max-w-[70vw]" onClick={(e) => e.stopPropagation()}>
        <ProtectedImage
          src={photo.src}
          alt={photo.tag}
          watermark={true}
          watermarkText={branding.watermarkText}
          watermarkProducer={branding.watermarkProducer}
          watermarkPhotoTag={branding.watermarkPhotoTag}
          watermarkTour={branding.watermarkTour}
          className="max-h-[80vh] max-w-[70vw] rounded-2xl"
          style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}
        />
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-2xl" style={{ background: 'rgba(8,8,14,0.9)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }} onClick={(e) => e.stopPropagation()}>
        <span style={{ color: '#86efac', fontFamily: "'Fraunces', serif", fontSize: '1.2rem', fontWeight: 700 }}>R$ {photo.price}</span>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={handleBuy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          style={{
            background: inCart ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.85)',
            border: `1px solid ${inCart ? 'rgba(134,239,172,0.4)' : 'rgba(134,239,172,0.2)'}`,
            color: inCart ? '#86efac' : '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {inCart
            ? <><CheckCircle2 className="w-4 h-4" /> Ver carrinho</>
            : <><ShoppingCart className="w-4 h-4" /> Comprar foto</>
          }
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Face Search Tab ─── */
function FaceSearchTab({ photos, eventId, eventName, org }: { photos: Photo[]; eventId: string; eventName: string; org?: string }) {
  return <FaceSearchPanel photos={photos} eventId={eventId} eventName={eventName} org={org} />;
}

/* ─── Face Grouping Tab ─── */
function FaceGroupingTab({ photos, eventId, eventName, org }: { photos: Photo[]; eventId: string; eventName: string; org?: string }) {
  return <FaceGroupingPanel photos={photos} eventId={eventId} eventName={eventName} org={org} />;
}

/* ─── Packages Tab ─── */
function PackagesTab({ price }: { price: number }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const pkgs = [
    { name: 'Digital', desc: '1 foto selecionada', price, color: '#7dd3fc', features: ['Alta resolução', 'Uso pessoal', 'Download imediato'], highlight: false },
    { name: 'Coleção', desc: 'Até 6 fotos', price: Math.round(price * 2.7), color: '#86efac', features: ['Alta resolução', 'Sem marca d\'água', 'Uso em redes sociais', 'Download imediato'], highlight: true },
    { name: 'Álbum Premium', desc: 'Fotos ilimitadas', price: Math.round(price * 5.1), color: '#7dd3fc', features: ['Resolução máxima', 'Todos os formatos', 'Uso comercial', 'Álbum digital', 'Suporte VIP'], highlight: false },
  ];
  return (
    <div className="py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pkgs.map((pkg, i) => (
          <motion.div key={pkg.name} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="relative p-6"
            style={{
              borderRadius: 20,
              background: pkg.highlight
                ? (isDark ? 'rgba(134,239,172,0.04)' : 'rgba(22,101,52,0.04)')
                : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
              border: pkg.highlight
                ? `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.2)'}`
                : `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
            }}>
            {pkg.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs" style={{ background: 'rgba(22,101,52,0.9)', border: '1px solid rgba(134,239,172,0.2)', color: '#fff', fontWeight: 800 }}>MAIS POPULAR</div>}
            <div className="inline-block px-3 py-1 rounded-full text-xs mb-4" style={{ background: `${pkg.color}12`, border: `1px solid ${pkg.color}28`, color: pkg.color, fontWeight: 700 }}>{pkg.name}</div>
            <div className="mb-1"><span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '2.5rem', fontWeight: 900, color: pkg.color, lineHeight: 1 }}>R$ {pkg.price}</span></div>
            <p className="text-xs mb-6" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)' }}>{pkg.desc}</p>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="w-full py-3 rounded-xl text-sm mb-6"
              style={{ background: pkg.highlight ? 'rgba(22,101,52,0.9)' : `${pkg.color}12`, border: pkg.highlight ? '1px solid rgba(134,239,172,0.2)' : `1px solid ${pkg.color}25`, color: pkg.highlight ? '#fff' : pkg.color, fontWeight: 700 }}>
              Escolher pacote
            </motion.button>
            <ul className="space-y-3">
              {pkg.features.map(f => (
                <li key={f} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: pkg.color }} />
                  <span style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.6)' }}>{f}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Event Detail ─── */
export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { addItem, isInCart, openDrawer } = useCart();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { branding } = useBranding();

  // Multi-tenant: read ?org= from URL for tenant-scoped API calls (LGPD)
  const orgId = new URLSearchParams(window.location.search).get('org') ?? undefined;

  /* theme-aware palette */
  const bg          = isDark ? '#09090F'                  : '#F8F8FB';
  const heroGrad    = isDark
    ? 'linear-gradient(to top, #09090F 0%, rgba(9,9,15,0.5) 50%, rgba(9,9,15,0.3) 100%)'
    : 'linear-gradient(to top, #F8F8FB 0%, rgba(248,248,251,0.5) 50%, rgba(248,248,251,0.1) 100%)';
  const textPrimary = isDark ? '#ffffff'                  : '#09090B';
  const textMuted   = isDark ? 'rgba(255,255,255,0.55)'   : '#71717A';
  const textSubtle  = isDark ? 'rgba(255,255,255,0.35)'   : '#A1A1AA';
  const divider     = isDark ? 'rgba(255,255,255,0.06)'   : 'rgba(9,9,11,0.08)';
  const statAccent1 = isDark ? '#86efac'                  : '#166534';
  const statAccent2 = isDark ? '#7dd3fc'                  : '#15803D';
  const cardBg      = isDark ? 'rgba(255,255,255,0.03)'   : '#FFFFFF';
  const cardBorder  = isDark ? 'rgba(255,255,255,0.06)'   : 'rgba(9,9,11,0.09)';
  const emptyText   = isDark ? 'rgba(255,255,255,0.35)'   : '#A1A1AA';

  const [activeTab, setActiveTab] = useState<'fotos' | 'minhas' | 'agrupamento'>('fotos');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [apiEvent, setApiEvent] = useState<EventInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const PHOTOS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    if (EVENT_DATA[id]) {
      setApiEvent(null);
      setPhotos(PHOTOS_MOCK);
      setTotalPhotos(PHOTOS_MOCK.length);
      setTotalPages(1);
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const [evRes, phRes] = await Promise.all([api.getEvent(id, orgId), api.getEventPhotos(id, 1, PHOTOS_PER_PAGE, orgId)]);
        const ev = evRes.event;
        const d = new Date(ev.date);
        setApiEvent({
          title: ev.name,
          date: d.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' }),
          location: ev.location,
          photos: ev.photoCount,
          participants: 0,
          price: ev.price,
          tag: 'TOUR',
          tagColor: '#86efac',
          hero: branding.backgroundUrls[0] ?? IMG_STADIUM,
        });
        const mapped: Photo[] = phRes.photos.map((p: PhotoRecord) => ({
          id: p.id, src: p.url ?? IMG_STADIUM, price: p.price, tag: p.tag, liked: false,
        }));
        setPhotos(mapped.length > 0 ? mapped : []);
        setTotalPhotos(phRes.total ?? mapped.length);
        setTotalPages(phRes.totalPages ?? 1);
      } catch (err) {
        console.log('Erro ao carregar evento, usando fallback:', err);
        setApiEvent(null);
        setPhotos(PHOTOS_MOCK);
        setTotalPhotos(PHOTOS_MOCK.length);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  /** Navigate to a specific page — fetches from server and replaces photos */
  const goToPage = async (page: number, scrollTop = true): Promise<boolean> => {
    if (!id || loadingPage || page < 1 || page > totalPages || page === currentPage) return false;
    setLoadingPage(true);
    try {
      const phRes = await api.getEventPhotos(id, page, PHOTOS_PER_PAGE, orgId);
      const mapped: Photo[] = phRes.photos.map((p: PhotoRecord) => ({
        id: p.id, src: p.url ?? IMG_STADIUM, price: p.price, tag: p.tag, liked: false,
      }));
      setPhotos(mapped);
      setCurrentPage(page);
      setTotalPhotos(phRes.total ?? totalPhotos);
      setTotalPages(phRes.totalPages ?? totalPages);
      if (scrollTop) {
        document.getElementById('photo-grid-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return true;
    } catch (err) {
      console.log('Erro ao carregar página de fotos:', err);
      return false;
    } finally {
      setLoadingPage(false);
    }
  };

  /**
   * Guard para navegação do lightbox — evita chamadas simultâneas.
   * Usa useRef para não causar re-render desnecessário.
   */
  const lightboxNavBusy = useRef(false);

  /**
   * Carrega uma página diretamente para o lightbox, sem usar goToPage
   * (que teria a trava de loadingPage e verificação de currentPage).
   */
  const fetchPageForLightbox = async (page: number): Promise<boolean> => {
    if (!id || lightboxNavBusy.current || page < 1 || page > totalPages) return false;
    lightboxNavBusy.current = true;
    try {
      const phRes = await api.getEventPhotos(id, page, PHOTOS_PER_PAGE, orgId);
      const mapped: Photo[] = phRes.photos.map((p: PhotoRecord) => ({
        id: p.id, src: p.url ?? IMG_STADIUM, price: p.price, tag: p.tag, liked: false,
      }));
      setPhotos(mapped);
      setCurrentPage(page);
      setTotalPhotos(phRes.total ?? totalPhotos);
      setTotalPages(phRes.totalPages ?? totalPages);
      return true;
    } catch (err) {
      console.log('Lightbox nav: erro ao carregar página:', err);
      return false;
    } finally {
      lightboxNavBusy.current = false;
    }
  };

  /**
   * Lightbox "next": avança foto a foto; ao chegar na última foto da página
   * busca a próxima página diretamente e abre no índice 0.
   */
  const lightboxNext = async () => {
    if (lightboxIndex === null || lightboxNavBusy.current) return;
    if (lightboxIndex < photos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    } else if (currentPage < totalPages) {
      const ok = await fetchPageForLightbox(currentPage + 1);
      if (ok) setLightboxIndex(0);
    }
    // última foto da última página — sem loop
  };

  /**
   * Lightbox "prev": recua foto a foto; ao chegar na primeira foto da página
   * busca a página anterior e abre na última foto.
   */
  const lightboxPrev = async () => {
    if (lightboxIndex === null || lightboxNavBusy.current) return;
    if (lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else if (currentPage > 1) {
      const ok = await fetchPageForLightbox(currentPage - 1);
      // página anterior (não é a última) sempre tem PHOTOS_PER_PAGE fotos
      if (ok) setLightboxIndex(PHOTOS_PER_PAGE - 1);
    }
    // primeira foto da primeira página — sem loop
  };

  // All photos (for face search / grouping tabs that need the complete set)
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [allPhotosLoaded, setAllPhotosLoaded] = useState(false);

  const loadAllPhotosIfNeeded = async () => {
    if (allPhotosLoaded || !id || EVENT_DATA[id]) return;
    try {
      const phRes = await api.getEventPhotos(id, 1, 500, orgId);
      const mapped: Photo[] = phRes.photos.map((p: PhotoRecord) => ({
        id: p.id, src: p.url ?? IMG_STADIUM, price: p.price, tag: p.tag, liked: false,
      }));
      setAllPhotos(mapped);
      setAllPhotosLoaded(true);
    } catch (err) {
      console.log('Erro ao carregar todas as fotos para agrupamento:', err);
      // Fallback: use whatever we have loaded so far
      setAllPhotos(photos);
      setAllPhotosLoaded(true);
    }
  };

  // Photos for face tabs: use allPhotos if available, otherwise current paginated photos
  const facePhotos = allPhotosLoaded ? allPhotos : photos;

  const event = apiEvent ?? (id && EVENT_DATA[id] ? EVENT_DATA[id] : FALLBACK_EVENT);
  const eventId = id ?? 'maratona-sp-2024';

  // Compute hero in render phase so branding updates are reflected without re-fetching
  // Prefer event-specific cover, then branding background, then static fallback
  const heroUrl = (apiEvent as any)?.coverUrl
    ?? (branding.backgroundUrls.length > 0 ? branding.backgroundUrls[0] : null)
    ?? event.hero;

  const handleAddAllPhotos = () => {
    photos.forEach((photo) => {
      if (!isInCart(photo.id, eventId)) addItem({ photoId: photo.id, src: photo.src, tag: photo.tag, eventName: event.title, eventId, price: photo.price });
    });
    openDrawer();
  };

  const tabs = [
    { key: 'fotos'      as const, label: 'Todas as fotos', icon: ImageIcon },
    { key: 'minhas'     as const, label: 'Minhas fotos',   icon: Scan },
    { key: 'agrupamento'as const, label: 'Agrupamento',    icon: Users },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: isDark ? '#86efac' : '#166534' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      {/* Event Hero */}
      <section className="relative overflow-hidden" style={{ paddingTop: '4rem', paddingBottom: '1.5rem', minHeight: 220, maxHeight: 320 }}>
        {apiEvent && branding.backgroundUrls.length > 1 ? (
          <AnimatedBackground
            urls={branding.backgroundUrls}
            fallback={heroUrl}
            interval={branding.bgTransitionInterval * 1000}
            filter="brightness(0.4) saturate(0.8)"
          />
        ) : (
          <img src={heroUrl} alt={event.title} className="w-full h-full object-cover" style={{ filter: 'brightness(0.4) saturate(0.8)' }} />
        )}
        <div className="absolute inset-0" style={{ background: heroGrad }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 20% 80%, ${event.tagColor}08 0%, transparent 60%)` }} />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 max-w-7xl mx-auto w-full">
          <Link to="/eventos" className="absolute top-24 left-6 md:left-12 flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl transition-opacity hover:opacity-70" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <ArrowLeft className="w-4 h-4" /> Eventos
          </Link>
          <span className="self-start px-3 py-1 rounded-full text-[11px] tracking-widest mb-3" style={{ background: `${event.tagColor}20`, border: `1px solid ${event.tagColor}40`, color: event.tagColor, fontWeight: 700 }}>
            {event.tag}
          </span>
          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 900, color: '#ffffff', lineHeight: 1.15 }}>
            {event.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <span className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <Calendar className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} /> {event.date}
            </span>
            <span className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <MapPin className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} /> {event.location}
            </span>
            <span className="flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <ImageIcon className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} /> {totalPhotos || photos.length} fotos disponíveis
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        {/* Stats bar */}
        <div className="rounded-2xl px-6 py-4 flex flex-wrap items-center gap-6 mb-8"
          style={{
            background: isDark ? '#111118' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.09)'}`,
          }}
        >
          {/* Photos stat */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(134,239,172,0.1)' }}>
              <ImageIcon className="w-4 h-4" style={{ color: statAccent1 }} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: textSubtle }}>Fotos</div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.4rem', fontWeight: 900, color: statAccent1, lineHeight: 1 }}>
                {totalPhotos || photos.length}
              </div>
            </div>
          </div>

          {/* Price stat */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(134,239,172,0.1)' }}>
              <ShoppingCart className="w-4 h-4" style={{ color: statAccent1 }} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: textSubtle }}>Por foto</div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.4rem', fontWeight: 900, color: statAccent1, lineHeight: 1 }}>
                R$ {photos.length > 0 ? photos[0].price : event.price}
              </div>
            </div>
          </div>

          {/* Precision stat */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(134,239,172,0.1)' }}>
              <Scan className="w-4 h-4" style={{ color: statAccent1 }} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: textSubtle }}>Precisão IA</div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.4rem', fontWeight: 900, color: statAccent1, lineHeight: 1 }}>
                98.7%
              </div>
            </div>
          </div>

          {/* Adicionar todas button */}
          <div className="ml-auto flex items-center">
            {photos.length > 0 && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleAddAllPhotos} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm"
                style={{ background: 'linear-gradient(135deg, rgba(22,101,52,0.9), rgba(15,70,36,0.95))', border: '1px solid rgba(134,239,172,0.2)', color: '#fff', fontWeight: 700, boxShadow: '0 4px 14px rgba(22,101,52,0.3)' }}>
                <ShoppingCart className="w-4 h-4" /> Adicionar todas
              </motion.button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <TabNav className="mb-8" active={activeTab} onChange={(k) => {
          const tab = k as typeof activeTab;
          setActiveTab(tab);
          if (tab === 'minhas' || tab === 'agrupamento') loadAllPhotosIfNeeded();
        }} tabs={tabs} />

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'fotos' && (
            <motion.div key="fotos" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              {photos.length === 0 ? (
                <div className="text-center py-20" style={{ color: emptyText }}>
                  <Camera className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  <p>Nenhuma foto disponível ainda para este evento.</p>
                  <p className="text-sm mt-2 opacity-60">As fotos são processadas em até 48h após o evento.</p>
                </div>
              ) : (
                <>
                  {/* Photo counter + page info */}
                  <div id="photo-grid-top" className="flex items-center justify-between mb-4 scroll-mt-28">
                    <p className="text-sm" style={{ color: textSubtle }}>
                      Exibindo <strong style={{ color: textPrimary }}>{(currentPage - 1) * PHOTOS_PER_PAGE + 1}–{Math.min(currentPage * PHOTOS_PER_PAGE, totalPhotos)}</strong> de <strong style={{ color: textPrimary }}>{totalPhotos}</strong> fotos
                    </p>
                    {totalPages > 1 && (
                      <p className="text-xs" style={{ color: textSubtle }}>
                        Página {currentPage} de {totalPages}
                      </p>
                    )}
                  </div>

                  {/* Loading overlay for page transitions */}
                  <div className="relative">
                    {loadingPage && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl" style={{ background: isDark ? 'rgba(8,8,14,0.7)' : 'rgba(242,248,244,0.7)', backdropFilter: 'blur(4px)' }}>
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: statAccent1 }} />
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {photos.map((photo, i) => (
                        <PhotoCard key={String(photo.id)} photo={photo} eventId={eventId} eventName={event.title} onClick={() => setLightboxIndex(i)} />
                      ))}
                    </div>
                  </div>

                  {/* ── Pagination bar ── */}
                  {totalPages > 1 && (
                    <div className="flex flex-col items-center gap-3 mt-10">
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        {/* Prev button */}
                        <button
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage <= 1 || loadingPage}
                          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                          style={{
                            background: currentPage > 1 ? cardBg : 'transparent',
                            border: `1px solid ${currentPage > 1 ? cardBorder : 'transparent'}`,
                            color: currentPage > 1 ? textPrimary : textSubtle,
                            opacity: currentPage <= 1 ? 0.3 : 1,
                            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Page number buttons */}
                        {(() => {
                          const pages: (number | '...')[] = [];
                          if (totalPages <= 7) {
                            for (let i = 1; i <= totalPages; i++) pages.push(i);
                          } else {
                            pages.push(1);
                            if (currentPage > 3) pages.push('...');
                            const start = Math.max(2, currentPage - 1);
                            const end = Math.min(totalPages - 1, currentPage + 1);
                            for (let i = start; i <= end; i++) pages.push(i);
                            if (currentPage < totalPages - 2) pages.push('...');
                            pages.push(totalPages);
                          }
                          return pages.map((p, idx) => {
                            if (p === '...') {
                              return (
                                <span key={`ellipsis-${idx}`} className="w-10 h-10 flex items-center justify-center text-xs" style={{ color: textSubtle }}>
                                  ...
                                </span>
                              );
                            }
                            const isActive = p === currentPage;
                            return (
                              <button
                                key={p}
                                onClick={() => goToPage(p)}
                                disabled={loadingPage}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm transition-all"
                                style={{
                                  background: isActive
                                    ? isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.1)'
                                    : cardBg,
                                  border: `1px solid ${isActive
                                    ? isDark ? 'rgba(134,239,172,0.35)' : 'rgba(22,101,52,0.25)'
                                    : cardBorder}`,
                                  color: isActive ? statAccent1 : textPrimary,
                                  fontWeight: isActive ? 800 : 500,
                                  fontFamily: "'Montserrat', sans-serif",
                                  cursor: loadingPage ? 'wait' : 'pointer',
                                }}
                              >
                                {p}
                              </button>
                            );
                          });
                        })()}

                        {/* Next button */}
                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage >= totalPages || loadingPage}
                          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                          style={{
                            background: currentPage < totalPages ? cardBg : 'transparent',
                            border: `1px solid ${currentPage < totalPages ? cardBorder : 'transparent'}`,
                            color: currentPage < totalPages ? textPrimary : textSubtle,
                            opacity: currentPage >= totalPages ? 0.3 : 1,
                            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quick summary */}
                      <p className="text-[11px]" style={{ color: textSubtle }}>
                        {PHOTOS_PER_PAGE} fotos por página · Total: {totalPhotos}
                      </p>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
          {activeTab === 'minhas'      && <FaceSearchTab    photos={facePhotos} eventId={eventId} eventName={event.title} org={orgId} />}
          {activeTab === 'agrupamento' && (
            <motion.div key="agrupamento" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <FaceGroupingTab photos={facePhotos} eventId={eventId} eventName={event.title} org={orgId} />
            </motion.div>
          )}
          {activeTab === 'pacotes' && (
            <motion.div key="pacotes" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <PackagesTab price={event.price} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && photos.length > 0 && (
          <Lightbox
            photos={photos} index={lightboxIndex}
            eventId={eventId} eventName={event.title}
            onClose={() => setLightboxIndex(null)}
            onNext={lightboxNext}
            onPrev={lightboxPrev}
            globalIndex={(currentPage - 1) * PHOTOS_PER_PAGE + lightboxIndex}
            totalPhotos={totalPhotos}
            hasNext={lightboxIndex < photos.length - 1 || currentPage < totalPages}
            hasPrev={lightboxIndex > 0 || currentPage > 1}
          />
        )}
      </AnimatePresence>
    </div>
  );
}