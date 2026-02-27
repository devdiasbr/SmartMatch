import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import {
  ArrowLeft,
  Camera,
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
      style={{ borderRadius: 14, border: inCart ? '1px solid rgba(134,239,172,0.35)' : '1px solid rgba(255,255,255,0.05)', aspectRatio: '3/2' }}
      onClick={onClick}
    >
      <ProtectedImage
        src={photo.src}
        alt={photo.tag}
        watermark={true}
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
function Lightbox({ photos, index, eventId, eventName, onClose, onNext, onPrev }: {
  photos: Photo[]; index: number; eventId: string; eventName: string;
  onClose: () => void; onNext: () => void; onPrev: () => void;
}) {
  const photo = photos[index];
  const { addItem, isInCart, openDrawer } = useCart();
  const inCart = isInCart(photo.id, eventId);

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
      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm z-10" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
        {index + 1} / {photos.length}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <ChevronRight className="w-6 h-6 text-white" />
      </button>
      <div className="relative max-h-[80vh] max-w-[70vw]" onClick={(e) => e.stopPropagation()}>
        <ProtectedImage
          src={photo.src}
          alt={photo.tag}
          watermark={true}
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
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={handlePreview}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer' }}
        >
          <Download className="w-4 h-4" /> Preview
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Face Search Tab ─── */
function FaceSearchTab({ photos, eventId, eventName }: { photos: Photo[]; eventId: string; eventName: string }) {
  return <FaceSearchPanel photos={photos} eventId={eventId} eventName={eventName} />;
}

/* ─── Face Grouping Tab ─── */
function FaceGroupingTab({ photos, eventId, eventName }: { photos: Photo[]; eventId: string; eventName: string }) {
  return <FaceGroupingPanel photos={photos} eventId={eventId} eventName={eventName} />;
}

/* ─── Packages Tab ─── */
function PackagesTab({ price }: { price: number }) {
  const pkgs = [
    { name: 'Digital', desc: '1 foto selecionada', price, color: '#7dd3fc', features: ['Alta resolução', 'Uso pessoal', 'Download imediato'], highlight: false },
    { name: 'Coleção', desc: 'Até 6 fotos', price: Math.round(price * 2.7), color: '#86efac', features: ['Alta resolução', 'Sem marca d\'água', 'Uso em redes sociais', 'Download imediato'], highlight: true },
    { name: 'Álbum Premium', desc: 'Fotos ilimitadas', price: Math.round(price * 5.1), color: '#7dd3fc', features: ['Resolução máxima', 'Todos os formatos', 'Uso comercial', 'Álbum digital', 'Suporte VIP'], highlight: false },
  ];
  return (
    <div className="py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pkgs.map((pkg, i) => (
          <motion.div key={pkg.name} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="relative p-6" style={{ borderRadius: 20, background: pkg.highlight ? 'rgba(134,239,172,0.04)' : 'rgba(255,255,255,0.02)', border: pkg.highlight ? '1px solid rgba(134,239,172,0.2)' : '1px solid rgba(255,255,255,0.07)' }}>
            {pkg.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs" style={{ background: 'rgba(22,101,52,0.9)', border: '1px solid rgba(134,239,172,0.2)', color: '#fff', fontWeight: 800 }}>MAIS POPULAR</div>}
            <div className="inline-block px-3 py-1 rounded-full text-xs mb-4" style={{ background: `${pkg.color}12`, border: `1px solid ${pkg.color}28`, color: pkg.color, fontWeight: 700 }}>{pkg.name}</div>
            <div className="mb-1"><span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '2.5rem', fontWeight: 900, color: pkg.color, lineHeight: 1 }}>R$ {pkg.price}</span></div>
            <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>{pkg.desc}</p>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="w-full py-3 rounded-xl text-sm mb-6" style={{ background: pkg.highlight ? 'rgba(22,101,52,0.9)' : `${pkg.color}12`, border: pkg.highlight ? '1px solid rgba(134,239,172,0.2)' : `1px solid ${pkg.color}25`, color: pkg.highlight ? '#fff' : pkg.color, fontWeight: 700 }}>
              Escolher pacote
            </motion.button>
            <ul className="space-y-3">
              {pkg.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: pkg.color }} />
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}>{f}</span>
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

  const [activeTab, setActiveTab] = useState<'fotos' | 'minhas' | 'agrupamento'>('fotos');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [apiEvent, setApiEvent] = useState<EventInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    if (EVENT_DATA[id]) {
      setApiEvent(null);
      setPhotos(PHOTOS_MOCK);
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const [evRes, phRes] = await Promise.all([api.getEvent(id), api.getEventPhotos(id)]);
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
          hero: IMG_STADIUM,
        });
        const mapped: Photo[] = phRes.photos.map((p: PhotoRecord) => ({
          id: p.id, src: p.url ?? IMG_STADIUM, price: p.price, tag: p.tag, liked: false,
        }));
        setPhotos(mapped.length > 0 ? mapped : []);
      } catch (err) {
        console.log('Erro ao carregar evento, usando fallback:', err);
        setApiEvent(null);
        setPhotos(PHOTOS_MOCK);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const event = apiEvent ?? (id && EVENT_DATA[id] ? EVENT_DATA[id] : FALLBACK_EVENT);
  const eventId = id ?? 'maratona-sp-2024';

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#08080E' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#86efac' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#08080E' }}>
      {/* Event Hero */}
      <section className="relative h-72 md:h-96 overflow-hidden">
        <img src={event.hero} alt={event.title} className="w-full h-full object-cover" style={{ filter: 'brightness(0.4) saturate(0.8)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #08080E 0%, rgba(8,8,14,0.5) 50%, rgba(8,8,14,0.3) 100%)' }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 20% 80%, ${event.tagColor}08 0%, transparent 60%)` }} />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 max-w-7xl mx-auto w-full">
          <Link to="/eventos" className="absolute top-24 left-6 md:left-12 flex items-center gap-2 text-sm transition-opacity hover:opacity-70" style={{ color: 'rgba(255,255,255,0.55)' }}>
            <ArrowLeft className="w-4 h-4" /> Eventos
          </Link>
          <span className="self-start px-3 py-1 rounded-full text-[11px] tracking-widest mb-3" style={{ background: `${event.tagColor}20`, border: `1px solid ${event.tagColor}40`, color: event.tagColor, fontWeight: 700 }}>
            {event.tag}
          </span>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 900, color: '#ffffff', lineHeight: 1.15 }}>
            {event.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>📅 {event.date}</span>
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>📍 {event.location}</span>
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>📸 {photos.length} fotos disponíveis</span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        {/* Stats bar */}
        <div className="flex flex-wrap gap-6 mb-8 pb-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { value: photos.length, label: 'Fotos', color: '#86efac' },
            { value: `R$ ${photos.length > 0 ? photos[0].price : event.price}`, label: 'por foto', color: '#7dd3fc' },
            { value: '98.7%', label: 'precisão facial', color: '#86efac' },
          ].map(({ value, label, color }, i) => (
            <div key={i} className={i > 0 ? 'flex items-center gap-6' : ''}>
              {i > 0 && <div className="w-px h-10 self-center" style={{ background: 'rgba(255,255,255,0.06)' }} />}
              <div>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.6rem', fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
              </div>
            </div>
          ))}
          <div className="ml-auto flex items-center">
            {photos.length > 0 && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleAddAllPhotos} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(22,101,52,0.85)', border: '1px solid rgba(134,239,172,0.2)', color: '#fff', fontWeight: 700 }}>
                <ShoppingCart className="w-4 h-4" /> Adicionar todas
              </motion.button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <TabNav className="mb-8" active={activeTab} onChange={(k) => setActiveTab(k as typeof activeTab)} tabs={tabs} />

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'fotos' && (
            <motion.div key="fotos" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              {photos.length === 0 ? (
                <div className="text-center py-20" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <Camera className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  <p>Nenhuma foto disponível ainda para este evento.</p>
                  <p className="text-sm mt-2 opacity-60">As fotos são processadas em até 48h após o evento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo, i) => (
                    <PhotoCard key={String(photo.id)} photo={photo} eventId={eventId} eventName={event.title} onClick={() => setLightboxIndex(i)} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
          {activeTab === 'minhas'      && <FaceSearchTab    photos={photos} eventId={eventId} eventName={event.title} />}
          {activeTab === 'agrupamento' && (
            <motion.div key="agrupamento" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <FaceGroupingTab photos={photos} eventId={eventId} eventName={event.title} />
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
            onNext={() => setLightboxIndex((lightboxIndex + 1) % photos.length)}
            onPrev={() => setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}