import { useState } from 'react';
import { Link } from 'react-router';
import {
  ShoppingCart,
  Trash2,
  Tag,
  ChevronRight,
  CheckCircle2,
  CreditCard,
  Smartphone,
  ImageIcon,
  ArrowLeft,
  Copy,
  Check,
  Download,
  Package,
  Lock,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../components/ThemeProvider';
import { TabNav } from '../components/TabNav';

/* ── Mock QR Code SVG ── */
function QRCodeMock({ size = 160 }: { size?: number }) {
  const pattern = [
    [1,1,1,1,1,1,1,0,1,0,1,1,0,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,1,0,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,1,1,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0],
    [1,0,1,1,0,1,1,1,0,0,1,0,1,1,1,0,1,0,1,1,0],
    [0,1,0,1,1,0,0,0,1,0,0,1,0,0,1,1,0,1,0,0,1],
    [1,1,0,0,1,1,1,0,0,1,1,0,1,1,0,0,1,1,0,0,1],
    [0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0],
    [1,0,1,1,0,0,1,0,1,1,0,1,1,0,1,0,1,1,0,1,1],
    [0,0,0,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,0,0,0],
    [1,1,1,1,1,1,1,0,0,1,0,1,0,0,1,0,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,1,0,1,0,1,0,0,1,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,0,1,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,0,0,1,0,0,1,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,0,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,0,1,0,1,1,0,1,0,1,1,1,1,1],
  ];
  const cellSize = size / pattern.length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {pattern.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="currentColor"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

/* ── Success Modal ── */
function SuccessModal({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const textColor = isDark ? '#ffffff' : '#0D2818';
  const mutedColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,40,20,0.45)';
  const green = isDark ? '#86efac' : '#006B2B';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="w-full max-w-sm p-8 rounded-3xl text-center relative"
        style={{
          background: isDark ? '#0e0e1a' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(134,239,172,0.15)' : 'rgba(0,107,43,0.15)'}`,
          boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ color: mutedColor, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Animated check */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 14, stiffness: 200 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(0,107,43,0.08)', border: `2px solid ${green}` }}
        >
          <CheckCircle2 className="w-10 h-10" style={{ color: green }} />
        </motion.div>

        <h2
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 900,
            fontSize: '1.5rem',
            color: textColor,
            letterSpacing: '-0.02em',
          }}
        >
          Compra realizada!
        </h2>
        <p className="mt-2 text-sm" style={{ color: mutedColor, lineHeight: 1.6 }}>
          Suas fotos já estão disponíveis para download em alta resolução.
        </p>

        <div
          className="mt-6 p-4 rounded-2xl text-sm"
          style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,107,43,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.1)'}` }}
        >
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: mutedColor, fontWeight: 600 }}>
            Código do pedido
          </p>
          <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, color: green, fontSize: '1.1rem' }}>
            #EVF-{Math.floor(Math.random() * 90000) + 10000}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="mt-5 w-full py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2"
          style={{
            background: isDark ? 'linear-gradient(135deg, rgba(22,101,52,0.95), rgba(21,128,61,0.9))' : 'linear-gradient(135deg, #006B2B, #00843D)',
            color: '#fff',
            fontWeight: 800,
          }}
        >
          <Download className="w-4 h-4" />
          Baixar minhas fotos
        </motion.button>

        <Link
          to="/eventos"
          onClick={onClose}
          className="mt-3 block text-sm"
          style={{ color: mutedColor }}
        >
          Ver mais eventos
        </Link>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Cart Page ── */
export function Cart() {
  const { items, removeItem, clearCart, totalItems, totalPrice } = useCart();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState(false);
  const [payMethod, setPayMethod] = useState<'pix' | 'card'>('pix');
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Card form
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const bg = isDark ? '#08080E' : '#F2F8F4';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.1)';
  const textColor = isDark ? '#ffffff' : '#0D2818';
  const mutedColor = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,40,20,0.42)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const green = isDark ? '#86efac' : '#006B2B';

  const discount = couponApplied ? Math.round(totalPrice * 0.1) : 0;
  const finalPrice = totalPrice - discount;

  const handleCoupon = () => {
    if (coupon.trim().toUpperCase() === 'ALLIANZ10') {
      setCouponApplied(true);
      setCouponError(false);
    } else {
      setCouponError(true);
      setCouponApplied(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText('00020126580014BR.GOV.BCB.PIX0136eventface@pix.com.br5204000053039865802BR5925EventFace Fotografias6009SAO PAULO62140510EVF0000016304ABCD');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFinish = () => {
    setShowSuccess(true);
    clearCart();
  };

  const formatCardNumber = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 4);
    return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  };

  return (
    <div className="min-h-screen pt-20 pb-20" style={{ background: bg }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8 pt-4"
        >
          <Link
            to="/eventos"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: mutedColor }}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <div
            className="w-px h-4"
            style={{ background: borderColor }}
          />
          <h1
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
              color: textColor,
              letterSpacing: '-0.02em',
            }}
          >
            Meu Carrinho
          </h1>
          {totalItems > 0 && (
            <span
              className="px-2 py-0.5 rounded-lg text-xs"
              style={{
                background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(0,107,43,0.08)',
                color: green,
                fontWeight: 700,
              }}
            >
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </span>
          )}
        </motion.div>

        {/* Empty state */}
        {totalItems === 0 && !showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: cardBg, border: `1px solid ${borderColor}` }}
            >
              <ShoppingCart className="w-9 h-9" style={{ color: mutedColor }} />
            </div>
            <h2
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 800,
                fontSize: '1.3rem',
                color: textColor,
                marginBottom: 8,
              }}
            >
              Carrinho vazio
            </h2>
            <p className="text-sm max-w-xs" style={{ color: mutedColor, lineHeight: 1.7 }}>
              Explore os eventos e adicione suas fotos favoritas ao carrinho.
            </p>
            <Link to="/eventos">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="mt-8 flex items-center gap-2 px-6 py-3 rounded-2xl text-sm"
                style={{
                  background: isDark ? 'linear-gradient(135deg, rgba(22,101,52,0.95), rgba(21,128,61,0.9))' : 'linear-gradient(135deg, #006B2B, #00843D)',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                <ImageIcon className="w-4 h-4" />
                Explorar eventos
              </motion.button>
            </Link>
          </motion.div>
        )}

        {/* Cart content */}
        {totalItems > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left: Items ── */}
            <div className="lg:col-span-2 space-y-3">
              <AnimatePresence mode="popLayout">
                {items.map((item, i) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, scale: 0.97 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-2xl group"
                    style={{ background: cardBg, border: `1px solid ${borderColor}` }}
                  >
                    {/* Thumbnail */}
                    <div
                      className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ border: `1px solid ${borderColor}` }}
                    >
                      <img
                        src={item.src}
                        alt={item.tag}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-[10px] mb-1 uppercase tracking-widest"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                          color: mutedColor,
                          fontWeight: 600,
                        }}
                      >
                        {item.tag}
                      </span>
                      <p
                        className="text-sm truncate"
                        style={{ color: textColor, fontWeight: 700 }}
                      >
                        {item.eventName}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: mutedColor }}>
                        Foto #{item.photoId} · Alta resolução · Download imediato
                      </p>
                    </div>

                    {/* Price + Remove */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        style={{
                          fontFamily: "'Montserrat', sans-serif",
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          color: green,
                        }}
                      >
                        R$ {item.price}
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeItem(item.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                        style={{
                          background: isDark ? 'rgba(252,165,165,0.07)' : 'rgba(220,38,38,0.06)',
                          border: `1px solid ${isDark ? 'rgba(252,165,165,0.12)' : 'rgba(220,38,38,0.1)'}`,
                          color: isDark ? '#fca5a5' : '#dc2626',
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Package upsell */}
              {totalItems >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 rounded-2xl"
                  style={{
                    background: isDark ? 'rgba(134,239,172,0.04)' : 'rgba(0,107,43,0.04)',
                    border: `1px solid ${isDark ? 'rgba(134,239,172,0.12)' : 'rgba(0,107,43,0.12)'}`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(0,107,43,0.08)' }}
                  >
                    <Package className="w-5 h-5" style={{ color: green }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: textColor }}>
                      Pacote Coleção — até 6 fotos por R$ {Math.round(29 * 2.7)}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: mutedColor }}>
                      Economize com o pacote e leve mais memórias
                    </p>
                  </div>
                  <Link
                    to="/eventos"
                    className="flex items-center gap-1 text-xs flex-shrink-0"
                    style={{ color: green, fontWeight: 700 }}
                  >
                    Ver pacotes
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              )}
            </div>

            {/* ── Right: Summary + Payment ── */}
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl overflow-hidden"
                style={{ background: cardBg, border: `1px solid ${borderColor}` }}
              >
                {/* Summary */}
                <div className="p-6">
                  <h3
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      color: textColor,
                      marginBottom: 16,
                    }}
                  >
                    Resumo do pedido
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: mutedColor }}>
                        Subtotal ({totalItems} {totalItems === 1 ? 'foto' : 'fotos'})
                      </span>
                      <span style={{ color: textColor, fontWeight: 600 }}>R$ {totalPrice}</span>
                    </div>
                    {couponApplied && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex justify-between"
                      >
                        <span style={{ color: green }}>Desconto (ALLIANZ10)</span>
                        <span style={{ color: green, fontWeight: 700 }}>− R$ {discount}</span>
                      </motion.div>
                    )}
                    <div
                      className="flex justify-between pt-3"
                      style={{ borderTop: `1px solid ${borderColor}` }}
                    >
                      <span
                        style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, color: textColor, fontSize: '1rem' }}
                      >
                        Total
                      </span>
                      <span
                        style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, color: green, fontSize: '1.2rem' }}
                      >
                        R$ {finalPrice}
                      </span>
                    </div>
                  </div>

                  {/* Coupon */}
                  <div className="mt-5">
                    <label className="text-xs uppercase tracking-widest mb-2 block" style={{ color: mutedColor, fontWeight: 600 }}>
                      Cupom de desconto
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: mutedColor }} />
                        <input
                          type="text"
                          placeholder="ALLIANZ10"
                          value={coupon}
                          onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponError(false); }}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{
                            background: inputBg,
                            border: `1px solid ${couponError ? '#fca5a5' : couponApplied ? (isDark ? 'rgba(134,239,172,0.3)' : 'rgba(0,107,43,0.3)') : borderColor}`,
                            color: textColor,
                          }}
                        />
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleCoupon}
                        disabled={couponApplied}
                        className="px-3 py-2.5 rounded-xl text-xs"
                        style={{
                          background: couponApplied
                            ? isDark ? 'rgba(134,239,172,0.1)' : 'rgba(0,107,43,0.08)'
                            : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                          border: `1px solid ${borderColor}`,
                          color: couponApplied ? green : textColor,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {couponApplied ? <CheckCircle2 className="w-4 h-4" /> : 'Aplicar'}
                      </motion.button>
                    </div>
                    {couponError && (
                      <p className="text-xs mt-1.5" style={{ color: '#fca5a5' }}>
                        Cupom inválido. Tente ALLIANZ10.
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment method */}
                <div style={{ borderTop: `1px solid ${borderColor}` }}>
                  <div className="px-6 pt-5 pb-4">
                    <p className="text-xs uppercase tracking-widest mb-3" style={{ color: mutedColor, fontWeight: 600 }}>
                      Forma de pagamento
                    </p>

                    <TabNav
                      className="mb-4"
                      fullWidth={true}
                      active={payMethod}
                      onChange={(k) => setPayMethod(k as 'pix' | 'card')}
                      tabs={[
                        { key: 'pix',  label: 'Pix',    icon: Smartphone },
                        { key: 'card', label: 'Cartão', icon: CreditCard },
                      ]}
                    />

                    {/* Pix */}
                    <AnimatePresence mode="wait">
                      {payMethod === 'pix' && (
                        <motion.div
                          key="pix"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="flex flex-col items-center gap-4"
                        >
                          <div
                            className="p-4 rounded-2xl"
                            style={{
                              background: '#ffffff',
                              border: `1px solid ${borderColor}`,
                              color: '#000000',
                            }}
                          >
                            <QRCodeMock size={148} />
                          </div>
                          <div className="w-full">
                            <p className="text-xs text-center mb-2" style={{ color: mutedColor }}>
                              Ou copie a chave Pix
                            </p>
                            <button
                              onClick={handleCopy}
                              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs transition-all"
                              style={{
                                background: copied
                                  ? isDark ? 'rgba(134,239,172,0.1)' : 'rgba(0,107,43,0.08)'
                                  : inputBg,
                                border: `1px solid ${copied ? (isDark ? 'rgba(134,239,172,0.2)' : 'rgba(0,107,43,0.15)') : borderColor}`,
                                color: copied ? green : textColor,
                                fontWeight: 700,
                              }}
                            >
                              {copied ? (
                                <><Check className="w-3.5 h-3.5" /> Copiado!</>
                              ) : (
                                <><Copy className="w-3.5 h-3.5" /> Copiar chave Pix</>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-center" style={{ color: mutedColor }}>
                            Aprovação instantânea · Pix disponível 24h
                          </p>
                        </motion.div>
                      )}

                      {/* Card form */}
                      {payMethod === 'card' && (
                        <motion.div
                          key="card"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3"
                        >
                          <div>
                            <label className="text-xs mb-1.5 block" style={{ color: mutedColor, fontWeight: 600 }}>
                              Número do cartão
                            </label>
                            <input
                              type="text"
                              placeholder="0000 0000 0000 0000"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                              style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor }}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs mb-1.5 block" style={{ color: mutedColor, fontWeight: 600 }}>
                                Validade
                              </label>
                              <input
                                type="text"
                                placeholder="MM/AA"
                                value={cardExpiry}
                                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor }}
                              />
                            </div>
                            <div>
                              <label className="text-xs mb-1.5 block" style={{ color: mutedColor, fontWeight: 600 }}>
                                CVV
                              </label>
                              <input
                                type="text"
                                placeholder="123"
                                maxLength={4}
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs mb-1.5 block" style={{ color: mutedColor, fontWeight: 600 }}>
                              Nome no cartão
                            </label>
                            <input
                              type="text"
                              placeholder="NOME COMPLETO"
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value.toUpperCase())}
                              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                              style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Confirm button */}
                  <div className="px-6 pb-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleFinish}
                      className="w-full py-4 rounded-2xl text-sm flex items-center justify-center gap-2 mt-2"
                      style={{
                        background: isDark ? 'linear-gradient(135deg, rgba(22,101,52,0.95), rgba(21,128,61,0.9))' : 'linear-gradient(135deg, #006B2B, #00843D)',
                        color: '#fff',
                        fontWeight: 800,
                        fontFamily: "'Montserrat', sans-serif",
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {payMethod === 'pix' ? (
                        <><Smartphone className="w-4 h-4" /> Confirmar pagamento via Pix</>
                      ) : (
                        <><CreditCard className="w-4 h-4" /> Pagar R$ {finalPrice}</>
                      )}
                    </motion.button>

                    <p className="text-center text-xs mt-3 flex items-center justify-center gap-1" style={{ color: mutedColor }}>
                      <Lock className="w-3 h-3" />
                      Pagamento 100% seguro e criptografado
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* Success modal */}
      <AnimatePresence>
        {showSuccess && (
          <SuccessModal
            onClose={() => setShowSuccess(false)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}