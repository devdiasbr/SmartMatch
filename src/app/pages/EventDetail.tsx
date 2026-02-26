import { useState } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../contexts/CartContext';
import { TabNav } from '../components/TabNav';

/* ─── Mock Data ─── */
const IMG_MARATHON =
  'https://images.unsplash.com/photo-1745818016652-a890846ed361?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200';
const IMG_TRIATHLON =
  'https://images.unsplash.com/photo-1508730328641-47c1616341b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200';
const IMG_TRAIL =
  'https://images.unsplash.com/photo-1762375212814-21dfcb0bfb38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200';
const IMG_CYCLING =
  'https://images.unsplash.com/photo-1753516231269-2a676b28f6fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200';
const IMG_PORTRAIT =
  'https://images.unsplash.com/photo-1600366249664-acd65e33e5d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400';
const IMG_CONCERT =
  'https://images.unsplash.com/photo-1771865107543-3e6b77bee2e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200';
const IMG_RUNNER =
  'https://images.unsplash.com/photo-1763226931148-c2b591bde5ef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800';

const PHOTOS_MOCK = [
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

const EVENT_DATA: Record<string, {
  title: string;
  date: string;
  location: string;
  photos: number;
  participants: number;
  price: number;
  tag: string;
  tagColor: string;
  hero: string;
}> = {
  'maratona-sp-2024': {
    title: 'Maratona de São Paulo 2024',
    date: '12 Mai 2024',
    location: 'São Paulo, SP',
    photos: 12480,
    participants: 35000,
    price: 29,
    tag: 'CORRIDA',
    tagColor: '#00FF7F',
    hero: IMG_MARATHON,
  },
  'ultra-trail-mantiqueira': {
    title: 'Ultra Trail Mantiqueira',
    date: '25 Jun 2024',
    location: 'Campos do Jordão, SP',
    photos: 8640,
    participants: 2800,
    price: 39,
    tag: 'TRAIL',
    tagColor: '#00D4FF',
    hero: IMG_TRAIL,
  },
  'ironman-floripa': {
    title: 'IRONMAN Florianópolis',
    date: '03 Ago 2024',
    location: 'Florianópolis, SC',
    photos: 15200,
    participants: 3200,
    price: 49,
    tag: 'TRIATHLON',
    tagColor: '#FFB800',
    hero: IMG_TRIATHLON,
  },
  'rock-in-rio-2024': {
    title: 'Rock in Rio 2024',
    date: '14-22 Set 2024',
    location: 'Rio de Janeiro, RJ',
    photos: 28900,
    participants: 100000,
    price: 59,
    tag: 'FESTIVAL',
    tagColor: '#FF6B9D',
    hero: IMG_CONCERT,
  },
};

const FALLBACK_EVENT = EVENT_DATA['maratona-sp-2024'];

/* ─── PhotoCard ─── */
function PhotoCard({
  photo,
  eventId,
  eventName,
  onClick,
}: {
  photo: (typeof PHOTOS_MOCK)[0];
  eventId: string;
  eventName: string;
  onClick: () => void;
}) {
  const { addItem, isInCart, openDrawer } = useCart();
  const [liked, setLiked] = useState(photo.liked);
  const inCart = isInCart(photo.id, eventId);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inCart) {
      addItem({ photoId: photo.id, src: photo.src, tag: photo.tag, eventName, eventId, price: photo.price });
    }
    openDrawer();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="relative group overflow-hidden cursor-pointer"
      style={{
        borderRadius: 14,
        border: inCart ? '1px solid rgba(134,239,172,0.35)' : '1px solid rgba(255,255,255,0.05)',
        aspectRatio: '3/2',
      }}
      onClick={onClick}
    >
      <img
        src={photo.src}
        alt={photo.tag}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        style={{ filter: 'brightness(0.85)' }}
      />

      {/* In-cart indicator */}
      {inCart && (
        <div
          className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px]"
          style={{ background: 'rgba(134,239,172,0.18)', border: '1px solid rgba(134,239,172,0.35)', color: '#86efac', fontWeight: 700 }}
        >
          <CheckCircle2 className="w-2.5 h-2.5" />
          No carrinho
        </div>
      )}

      {/* Hover overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
        }}
      />

      {/* Tag */}
      <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span
          className="px-2 py-1 rounded-full text-[10px]"
          style={{
            background: 'rgba(0,0,0,0.5)',
            color: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {photo.tag}
        </span>
      </div>

      {/* Like button */}
      <button
        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
        style={{
          background: liked ? 'rgba(255,107,157,0.3)' : 'rgba(0,0,0,0.5)',
          border: `1px solid ${liked ? 'rgba(255,107,157,0.5)' : 'rgba(255,255,255,0.1)'}`,
          backdropFilter: 'blur(8px)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setLiked(!liked);
        }}
      >
        <Heart
          className="w-4 h-4"
          style={{ color: liked ? '#FF6B9D' : 'rgba(255,255,255,0.6)' }}
          fill={liked ? '#FF6B9D' : 'transparent'}
        />
      </button>

      {/* Bottom actions */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <span
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '1.1rem',
            fontWeight: 700,
            color: '#86efac',
          }}
        >
          R$ {photo.price}
        </span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
          style={{
            background: inCart ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.85)',
            border: `1px solid ${inCart ? 'rgba(134,239,172,0.4)' : 'rgba(134,239,172,0.25)'}`,
            color: inCart ? '#86efac' : '#fff',
            fontWeight: 700,
            backdropFilter: 'blur(10px)',
          }}
        >
          {inCart ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              No carrinho
            </>
          ) : (
            <>
              <ShoppingCart className="w-3 h-3" />
              Adicionar
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Lightbox ─── */
function Lightbox({
  photos,
  index,
  onClose,
  onNext,
  onPrev,
}: {
  photos: typeof PHOTOS_MOCK;
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const photo = photos[index];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)' }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center z-10"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Counter */}
      <div
        className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm z-10"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        {index + 1} / {photos.length}
      </div>

      {/* Nav arrows */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center z-10"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center z-10"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* Image */}
      <motion.img
        key={photo.id}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        src={photo.src}
        alt={photo.tag}
        className="max-h-[80vh] max-w-[70vw] object-contain rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}
      />

      {/* Bottom bar */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-2xl"
        style={{
          background: 'rgba(8,8,14,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={{ color: '#FFB800', fontFamily: "'Fraunces', serif", fontSize: '1.2rem', fontWeight: 700 }}>
          R$ {photo.price}
        </span>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          style={{
            background: 'rgba(22,101,52,0.85)',
            border: '1px solid rgba(134,239,172,0.2)',
            color: '#fff',
            fontWeight: 700,
          }}
        >
          <ShoppingCart className="w-4 h-4" />
          Comprar foto
        </button>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <Download className="w-4 h-4" />
          Preview
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Face Search Tab ─── */
function FaceSearchTab() {
  const [stage, setStage] = useState<'idle' | 'camera' | 'processing' | 'results'>('idle');

  const handleStart = () => {
    setStage('camera');
    setTimeout(() => setStage('processing'), 2000);
    setTimeout(() => setStage('results'), 4500);
  };

  return (
    <div className="py-8">
      <AnimatePresence mode="wait">
        {stage === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-lg mx-auto"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.18)' }}
            >
              <Scan className="w-10 h-10" style={{ color: '#86efac' }} />
            </div>
            <h3
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '2rem', fontWeight: 700 }}
              className="text-white mb-4"
            >
              Encontre suas fotos
            </h3>
            <p className="mb-8 text-base" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
              Nossa IA vai analisar seu rosto e localizar todas as suas fotos neste evento. Simples, rápido e seguro.
            </p>

            {/* Steps */}
            <div className="flex justify-center gap-8 mb-10">
              {[
                { icon: Camera, label: 'Abrir câmera' },
                { icon: Scan, label: 'Tirar selfie' },
                { icon: ImageIcon, label: 'Ver fotos' },
              ].map(({ icon: Icon, label }, i) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(134,239,172,0.07)', border: '1px solid rgba(134,239,172,0.14)' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: '#86efac' }} />
                  </div>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                  {i < 2 && (
                    <div
                      className="absolute"
                      style={{ display: 'none' }}
                    />
                  )}
                </div>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStart}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl text-base mx-auto"
              style={{
                background: 'rgba(22,101,52,0.9)',
                border: '1px solid rgba(134,239,172,0.2)',
                color: '#fff',
                fontWeight: 800,
              }}
            >
              <Camera className="w-5 h-5" />
              Abrir câmera
            </motion.button>

            <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
              <Lock className="w-3 h-3 inline mr-1" />
              Sua imagem não é armazenada
            </p>
          </motion.div>
        )}

        {stage === 'camera' && (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-sm mx-auto text-center"
          >
            <div
              className="relative mx-auto overflow-hidden mb-6"
              style={{
                width: 280,
                height: 280,
                borderRadius: '50%',
                border: '1.5px solid rgba(134,239,172,0.45)',
                background: 'rgba(10,10,20,0.9)',
              }}
            >
              <img
                src={IMG_PORTRAIT}
                alt="Camera preview"
                className="w-full h-full object-cover"
                style={{ filter: 'brightness(0.8)' }}
              />
              <motion.div
                className="absolute inset-x-0 h-0.5"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(134,239,172,0.7), transparent)',
                }}
                animate={{ top: ['5%', '95%', '5%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Posicione seu rosto no centro...
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStage('processing')}
              className="mt-6 px-8 py-3 rounded-2xl text-sm"
              style={{
                background: 'rgba(22,101,52,0.9)',
                border: '1px solid rgba(134,239,172,0.2)',
                color: '#fff',
                fontWeight: 800,
              }}
            >
              Capturar selfie
            </motion.button>
          </motion.div>
        )}

        {stage === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full border-2 border-transparent mx-auto mb-6"
              style={{
                borderTopColor: '#86efac',
                borderRightColor: 'rgba(134,239,172,0.15)',
              }}
            />
            <p
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'white',
              }}
              className="mb-2"
            >
              Processando reconhecimento facial...
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Analisando {PHOTOS_MOCK.length * 1000}+ fotos
            </p>
            <div
              className="max-w-xs mx-auto mt-6 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #86efac, #7dd3fc)' }}
                animate={{ width: ['0%', '100%'] }}
                transition={{ duration: 2.5, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        )}

        {stage === 'results' && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm mb-2"
                  style={{
                    background: 'rgba(134,239,172,0.08)',
                    border: '1px solid rgba(134,239,172,0.2)',
                    color: '#86efac',
                    fontWeight: 700,
                  }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  {PHOTOS_MOCK.length} fotos encontradas
                </div>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Baseado no seu reconhecimento facial · 98.7% de confiança
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm"
                style={{
                  background: 'rgba(22,101,52,0.9)',
                  border: '1px solid rgba(134,239,172,0.2)',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                <ShoppingCart className="w-4 h-4" />
                Comprar tudo (Álbum R$ 149)
              </motion.button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PHOTOS_MOCK.slice(0, 8).map((photo, i) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative group overflow-hidden"
                  style={{ borderRadius: 12, aspectRatio: '1', cursor: 'pointer' }}
                >
                  <img
                    src={photo.src}
                    alt={photo.tag}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.6)' }}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between"
                  >
                    <span style={{ color: '#fcd34d', fontWeight: 700, fontSize: '0.9rem' }}>
                      R$ {photo.price}
                    </span>
                    <button
                      className="p-1.5 rounded-lg text-xs"
                      style={{ background: 'rgba(22,101,52,0.85)', border: '1px solid rgba(134,239,172,0.25)', color: '#fff' }}
                    >
                      <ShoppingCart className="w-3 h-3" />
                    </button>
                  </div>
                  {/* AI badge */}
                  <div
                    className="absolute top-2 left-2"
                    style={{
                      background: 'rgba(134,239,172,0.1)',
                      border: '1px solid rgba(134,239,172,0.2)',
                      borderRadius: 6,
                      padding: '2px 6px',
                    }}
                  >
                    <span className="text-[9px]" style={{ color: '#86efac', fontWeight: 700 }}>
                      IA
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Packages Tab ─── */
function PackagesTab({ price }: { price: number }) {
  const pkgs = [
    {
      name: 'Digital',
      desc: '1 foto selecionada',
      price,
      color: '#7dd3fc',
      features: ['Alta resolução', 'Uso pessoal', 'Download imediato'],
      highlight: false,
    },
    {
      name: 'Coleção',
      desc: 'Até 6 fotos',
      price: Math.round(price * 2.7),
      color: '#86efac',
      features: ['Alta resolução', 'Sem marca d\'água', 'Uso em redes sociais', 'Download imediato'],
      highlight: true,
    },
    {
      name: 'Álbum Premium',
      desc: 'Fotos ilimitadas',
      price: Math.round(price * 5.1),
      color: '#fcd34d',
      features: ['Resolução máxima', 'Todos os formatos', 'Uso comercial', 'Álbum digital', 'Suporte VIP'],
      highlight: false,
    },
  ];

  return (
    <div className="py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pkgs.map((pkg, i) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative p-6"
            style={{
              borderRadius: 20,
              background: pkg.highlight ? 'rgba(134,239,172,0.04)' : 'rgba(255,255,255,0.02)',
              border: pkg.highlight
                ? '1px solid rgba(134,239,172,0.2)'
                : '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {pkg.highlight && (
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs"
                style={{
                  background: 'rgba(22,101,52,0.9)',
                  border: '1px solid rgba(134,239,172,0.2)',
                  color: '#fff',
                  fontWeight: 800,
                }}
              >
                MAIS POPULAR
              </div>
            )}
            <div
              className="inline-block px-3 py-1 rounded-full text-xs mb-4"
              style={{
                background: `${pkg.color}12`,
                border: `1px solid ${pkg.color}28`,
                color: pkg.color,
                fontWeight: 700,
              }}
            >
              {pkg.name}
            </div>
            <div className="mb-1">
              <span
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: pkg.color,
                  lineHeight: 1,
                }}
              >
                R$ {pkg.price}
              </span>
            </div>
            <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {pkg.desc}
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="w-full py-3 rounded-xl text-sm mb-6"
              style={{
                background: pkg.highlight
                  ? 'rgba(22,101,52,0.9)'
                  : `${pkg.color}12`,
                border: pkg.highlight ? '1px solid rgba(134,239,172,0.2)' : `1px solid ${pkg.color}25`,
                color: pkg.highlight ? '#fff' : pkg.color,
                fontWeight: 700,
              }}
            >
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
  const event = (id && EVENT_DATA[id]) ? EVENT_DATA[id] : FALLBACK_EVENT;
  const eventId = id ?? 'maratona-sp-2024';

  const { addItem, isInCart, totalItems, totalPrice, openDrawer } = useCart();

  const [activeTab, setActiveTab] = useState<'fotos' | 'minhas' | 'pacotes'>('fotos');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleAddAllPhotos = () => {
    PHOTOS_MOCK.forEach((photo) => {
      if (!isInCart(photo.id, eventId)) {
        addItem({ photoId: photo.id, src: photo.src, tag: photo.tag, eventName: event.title, eventId, price: photo.price });
      }
    });
    openDrawer();
  };

  const tabs: { key: typeof activeTab; label: string; icon: typeof ImageIcon }[] = [
    { key: 'fotos', label: 'Todas as fotos', icon: ImageIcon },
    { key: 'minhas', label: 'Minhas fotos', icon: Scan },
    { key: 'pacotes', label: 'Pacotes', icon: Star },
  ];

  return (
    <div className="min-h-screen">
      {/* Event Hero */}
      <section className="relative h-72 md:h-96 overflow-hidden">
        <img
          src={event.hero}
          alt={event.title}
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.4) saturate(0.8)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, #08080E 0%, rgba(8,8,14,0.5) 50%, rgba(8,8,14,0.3) 100%)',
          }}
        />

        {/* Glow accent */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 20% 80%, ${event.tagColor}08 0%, transparent 60%)`,
          }}
        />

        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 max-w-7xl mx-auto w-full">
          {/* Back button */}
          <Link
            to="/eventos"
            className="absolute top-24 left-6 md:left-12 flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Eventos
          </Link>

          {/* Tag */}
          <span
            className="self-start px-3 py-1 rounded-full text-[11px] tracking-widest mb-3"
            style={{
              background: `${event.tagColor}20`,
              border: `1px solid ${event.tagColor}40`,
              color: event.tagColor,
              fontWeight: 700,
            }}
          >
            {event.tag}
          </span>

          {/* Title */}
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
            className="text-white mb-4"
          >
            {event.title}
          </h1>

          {/* KPIs row */}
          <div className="flex flex-wrap gap-6">
            {[
              { icon: ImageIcon, label: `${event.photos.toLocaleString('pt-BR')} fotos`, color: event.tagColor },
              { icon: Users, label: `${event.participants.toLocaleString('pt-BR')} atletas`, color: 'rgba(255,255,255,0.5)' },
              { icon: Camera, label: event.date, color: 'rgba(255,255,255,0.5)' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 text-sm" style={{ color }}>
                <Icon className="w-4 h-4" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs + Content */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab bar */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <TabNav
            fullWidth={false}
            active={activeTab}
            onChange={(k) => setActiveTab(k as typeof activeTab)}
            tabs={[
              { key: 'fotos',   label: 'Todas as fotos', icon: ImageIcon },
              { key: 'minhas',  label: 'Minhas fotos',   icon: Scan },
              { key: 'pacotes', label: 'Pacotes',         icon: Star },
            ]}
          />

          {/* Cart badge */}
          {totalItems > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
              style={{
                background: 'rgba(134,239,172,0.1)',
                border: '1px solid rgba(134,239,172,0.2)',
                color: '#86efac',
              }}
            >
              <ShoppingCart className="w-4 h-4" />
              <span style={{ fontWeight: 700 }}>{totalItems} foto(s) · R$ {totalPrice}</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={openDrawer}
                className="ml-2 px-3 py-1 rounded-lg text-xs"
                style={{ background: 'rgba(134,239,172,0.2)', color: '#86efac', fontWeight: 800, border: '1px solid rgba(134,239,172,0.3)' }}
              >
                Ver carrinho
              </motion.button>
            </motion.div>
          )}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'fotos' && (
            <motion.div
              key="fotos"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {PHOTOS_MOCK.map((photo, i) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    eventId={eventId}
                    eventName={event.title}
                    onClick={() => setLightboxIndex(i)}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'minhas' && (
            <motion.div
              key="minhas"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <FaceSearchTab />
            </motion.div>
          )}

          {activeTab === 'pacotes' && (
            <motion.div
              key="pacotes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PackagesTab price={event.price} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            photos={PHOTOS_MOCK}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNext={() => setLightboxIndex((i) => (i! + 1) % PHOTOS_MOCK.length)}
            onPrev={() =>
              setLightboxIndex((i) => (i! - 1 + PHOTOS_MOCK.length) % PHOTOS_MOCK.length)
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}