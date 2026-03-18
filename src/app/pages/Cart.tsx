import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ShoppingCart,
  Trash2,
  Tag,
  CheckCircle2,
  CreditCard,
  Smartphone,
  ImageIcon,
  ArrowLeft,
  Copy,
  Check,
  Download,
  Lock,
  X,
  Mail,
  User,
  AlertCircle,
  ExternalLink,
  Loader2,
  IdCard,
  Trash,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../components/ThemeProvider';
import { TabNav } from '../components/TabNav';
import { api } from '../lib/api';

/* ── Success Modal ── */
function SuccessModal({ onClose, isDark, orderId }: { onClose: () => void; isDark: boolean; orderId: string }) {
  const textColor = isDark ? '#ffffff' : '#09090B';
  const mutedColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(9,9,11,0.45)';
  const green = isDark ? '#86efac' : '#166534';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(22,101,52,0.1)';

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
          border: `1px solid ${isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.15)'}`,
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

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', damping: 14, stiffness: 200 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.08)', border: `2px solid ${green}` }}
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
          Pedido confirmado!
        </h2>
        <p className="mt-2 text-sm" style={{ color: mutedColor, lineHeight: 1.6 }}>
          Suas fotos serão liberadas após a confirmação do pagamento pelo Mercado Pago.
        </p>

        <div
          className="mt-6 p-4 rounded-2xl text-sm"
          style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(22,101,52,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(22,101,52,0.1)'}` }}
        >
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: mutedColor, fontWeight: 600 }}>
            Código do pedido
          </p>
          <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, color: green, fontSize: '1.1rem' }}>
            #{orderId.slice(-8).toUpperCase()}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="mt-5 w-full py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2"
          style={{
            background: isDark ? 'linear-gradient(135deg, rgba(22,101,52,0.95), rgba(21,128,61,0.9))' : 'linear-gradient(135deg, #166534, #15803d)',
            color: '#fff',
            fontWeight: 800,
          }}
        >
          <Download className="w-4 h-4" />
          Acompanhar pedido
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

/* ── PIX QR Display ── */
function PixQrPanel({
  qrCodeBase64,
  pixCode,
  isDark,
  onCopy,
  copied,
  onConfirm,
  amount,
}: {
  qrCodeBase64: string;
  pixCode: string;
  isDark: boolean;
  onCopy: () => void;
  copied: boolean;
  onConfirm: () => void;
  amount: number;
}) {
  const textColor = isDark ? '#ffffff' : '#09090B';
  const mutedColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(9,9,11,0.45)';
  const green = isDark ? '#86efac' : '#166534';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(22,101,52,0.1)';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4"
    >
      {/* Valor */}
      <div className="w-full text-center py-3 rounded-xl" style={{ background: isDark ? 'rgba(134,239,172,0.06)' : 'rgba(22,101,52,0.05)', border: `1px solid ${isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.12)'}` }}>
        <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: mutedColor, fontWeight: 600 }}>Valor a pagar</p>
        <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '1.4rem', color: green }}>
          R$ {amount.toFixed(2).replace('.', ',')}
        </p>
      </div>

      {/* QR Code */}
      <div className="p-3 rounded-2xl" style={{ background: '#ffffff', border: `1px solid ${borderColor}` }}>
        {qrCodeBase64 ? (
          <img
            src={`data:image/png;base64,${qrCodeBase64}`}
            alt="QR Code PIX"
            style={{ width: 160, height: 160, display: 'block' }}
          />
        ) : (
          <div className="w-40 h-40 flex items-center justify-center" style={{ color: '#ccc' }}>
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}
      </div>

      {/* Copy code */}
      <div className="w-full">
        <p className="text-xs text-center mb-2" style={{ color: mutedColor }}>
          Ou copie o código Pix Copia e Cola
        </p>
        <button
          onClick={onCopy}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs transition-all"
          style={{
            background: copied ? isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.08)' : inputBg,
            border: `1px solid ${copied ? (isDark ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.15)') : borderColor}`,
            color: copied ? green : textColor,
            fontWeight: 700,
          }}
        >
          {copied ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar código Pix</>}
        </button>
      </div>

      <p className="text-xs text-center" style={{ color: mutedColor }}>
        Aprovação instantânea · Pix disponível 24h · Válido por 30 min
      </p>

      {/* Confirm button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onConfirm}
        className="w-full py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2"
        style={{
          background: isDark ? 'rgba(134,239,172,0.12)' : 'rgba(22,101,52,0.1)',
          border: `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.2)'}`,
          color: green,
          fontWeight: 800,
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        <CheckCircle2 className="w-4 h-4" />
        Já paguei — confirmar pedido
      </motion.button>
    </motion.div>
  );
}

/* ── Main Cart Page ── */
export function Cart() {
  const { items, removeItem, clearCart, totalItems, totalPrice, syncPrices } = useCart();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [searchParams] = useSearchParams();

  const [coupon, setCoupon] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState(false);
  const [payMethod, setPayMethod] = useState<'pix' | 'card'>('pix');
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Customer info
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');

  // Order / payment
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [payError, setPayError] = useState('');

  // CPF validation state
  const [cpfError, setCpfError] = useState('');
  const [cpfTouched, setCpfTouched] = useState(false);

  // PIX state
  const [pixState, setPixState] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState('');
  const [pixCode, setPixCode] = useState('');

  // Card installments
  const [installments, setInstallments] = useState(1);

  const bg = isDark ? '#09090F' : '#F8F8FB';
  const cardBg = isDark ? '#111118' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(9,9,11,0.09)';
  const textColor = isDark ? '#ffffff' : '#09090B';
  const mutedColor = isDark ? 'rgba(255,255,255,0.38)' : '#71717A';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(9,9,11,0.04)';
  const green = isDark ? '#86efac' : '#166534';

  const discount = couponApplied ? Math.round(totalPrice * 0.1) : 0;
  const finalPrice = totalPrice - discount;

  // Handle return from MP Checkout Pro (card payment)
  useEffect(() => {
    const status = searchParams.get('status');
    const returnOrderId = searchParams.get('orderId');
    if (status === 'success' && returnOrderId) {
      setOrderId(returnOrderId);
      setShowSuccess(true);
      clearCart();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync cart prices with current server config on mount
  useEffect(() => {
    if (totalItems > 0) {
      syncPrices();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCoupon = () => {
    if (coupon.trim().toUpperCase() === 'ALLIANZ10') {
      setCouponApplied(true);
      setCouponError(false);
    } else {
      setCouponError(true);
      setCouponApplied(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixCode) return;
    try {
      const ta = document.createElement('textarea');
      ta.value = pixCode;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePixConfirm = () => {
    clearCart();
    setShowSuccess(true);
    setPixState('idle');
  };

  const formatCpf = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // Full CPF digit-verifier algorithm
  const isValidCpf = (cpf: string): boolean => {
    const d = cpf.replace(/\D/g, '');
    if (d.length !== 11) return false;
    if (/^(\d)\1+$/.test(d)) return false; // all same digit
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
    let rem = (sum * 10) % 11;
    if (rem === 10 || rem === 11) rem = 0;
    if (rem !== parseInt(d[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
    rem = (sum * 10) % 11;
    if (rem === 10 || rem === 11) rem = 0;
    return rem === parseInt(d[10]);
  };

  const validateCpf = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) { setCpfError(''); return true; } // optional field — blank = ok
    if (digits.length < 11) { setCpfError('CPF incompleto (11 dígitos)'); return false; }
    if (!isValidCpf(value)) { setCpfError('CPF inválido — verifique os dígitos'); return false; }
    setCpfError('');
    return true;
  };

  const handleFinish = async () => {
    if (!customerEmail) {
      setPayError('Por favor, informe seu e-mail para continuar.');
      return;
    }
    // Require CPF for PIX (Mercado Pago mandates payer identification)
    if (payMethod === 'pix' && !customerCpf.replace(/\D/g, '')) {
      setCpfError('CPF obrigatório para pagamento via Pix');
      setCpfTouched(true);
      return;
    }
    // Validate CPF if provided
    if (customerCpf && !validateCpf(customerCpf)) {
      setCpfTouched(true);
      return;
    }
    setPayError('');
    setCheckingOut(true);
    try {
      // 1. Create order in KV store
      const orderItems = items.map((item) => ({
        photoId: String(item.photoId),
        eventId: item.eventId,
        eventName: item.eventName,
        tag: item.tag,
        price: item.price,
        src: item.src,
      }));
      const orderRes = await api.createOrder({
        items: orderItems,
        customerEmail,
        customerName: customerName || 'Visitante',
        paymentMethod: payMethod,
      });
      const newOrderId = orderRes.order.id;
      setOrderId(newOrderId);

      if (payMethod === 'pix') {
        // 2a. Generate real PIX via Mercado Pago
        setPixState('loading');
        const pixRes = await api.createPixPayment({
          amount: finalPrice,
          customerEmail,
          customerName: customerName || 'Visitante',
          orderId: newOrderId,
          cpf: customerCpf ? customerCpf.replace(/\D/g, '') : undefined,
        });
        setPixQrCodeBase64(pixRes.qrCodeBase64);
        setPixCode(pixRes.qrCode);
        setPixState('ready');
      } else {
        // 2b. Create MP Checkout Pro preference for card
        const origin = window.location.origin;
        const prefRes = await api.createCardPreference({
          amount: finalPrice,
          customerEmail,
          orderId: newOrderId,
          successUrl: `${origin}/carrinho?status=success&orderId=${newOrderId}`,
          failureUrl: `${origin}/carrinho?status=failure`,
          pendingUrl: `${origin}/carrinho?status=pending`,
          installments,
        });

        // checkoutUrl = init_point (production) or sandbox_init_point (test)
        const redirectUrl = prefRes.checkoutUrl || prefRes.sandboxUrl;
        if (!redirectUrl) {
          throw new Error('Não foi possível obter o link do Mercado Pago. Verifique se a chave está correta.');
        }
        clearCart();
        window.open(redirectUrl, '_blank'); // open in new tab (avoids iframe restrictions)
      }
    } catch (err: any) {
      console.error('Erro ao processar pagamento:', err);
      setPayError(err?.message ?? 'Erro ao processar pagamento. Tente novamente.');
      setPixState('idle');
    } finally {
      setCheckingOut(false);
    }
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
          <div className="w-px h-4" style={{ background: borderColor }} />
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
                background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.08)',
                color: green,
                fontWeight: 700,
              }}
            >
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </span>
          )}
          {totalItems > 0 && (
            <div className="ml-auto">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={clearCart}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
                style={{
                  background: isDark ? 'rgba(252,165,165,0.06)' : 'rgba(220,38,38,0.05)',
                  border: `1px solid ${isDark ? 'rgba(252,165,165,0.12)' : 'rgba(220,38,38,0.1)'}`,
                  color: isDark ? '#fca5a5' : '#dc2626',
                  fontWeight: 600,
                }}
              >
                <Trash className="w-3.5 h-3.5" />
                Esvaziar carrinho
              </motion.button>
            </div>
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
                  background: 'linear-gradient(135deg, #166534, #15803d)',
                  color: '#fff',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(22,101,52,0.35)',
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
                      <p className="text-sm truncate" style={{ color: textColor, fontWeight: 700 }}>
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

              {/* Mercado Pago badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: cardBg, border: `1px solid ${borderColor}` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#009ee3' }}
                >
                  <span style={{ color: '#fff', fontSize: '0.6rem', fontWeight: 800 }}>MP</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: mutedColor }}>
                  Pagamento processado com segurança pelo{' '}
                  <span style={{ color: '#009ee3', fontWeight: 700 }}>Mercado Pago</span>
                  {' '}— Pix e Cartão de Crédito
                </p>
                <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: mutedColor }} />
              </motion.div>
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
                        Subtotal ({totalItems} {totalItems === 1 ? 'foto' : 'fotos'}{items.length > 0 && items.every(i => i.price === items[0].price) ? ` × R$ ${items[0].price}` : ''})
                      </span>
                      <span style={{ color: textColor, fontWeight: 600 }}>R$ {totalPrice}</span>
                    </div>
                    {couponApplied && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex justify-between"
                      >
                        <span style={{ color: green }}>Desconto (ALLIANZ10 — 10%)</span>
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
                            border: `1px solid ${couponError ? '#fca5a5' : couponApplied ? (isDark ? 'rgba(134,239,172,0.3)' : 'rgba(22,101,52,0.3)') : borderColor}`,
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
                            ? isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.08)'
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
                      Dados do pagador
                    </p>

                    {/* Customer info fields */}
                    <div className="space-y-3 mb-5">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: mutedColor }} />
                        <input
                          type="text"
                          placeholder="Seu nome completo"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor }}
                        />
                      </div>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: mutedColor }} />
                        <input
                          type="email"
                          placeholder="Seu e-mail (obrigatório)"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{
                            background: inputBg,
                            border: `1px solid ${!customerEmail && payError ? '#fca5a5' : borderColor}`,
                            color: textColor,
                          }}
                        />
                      </div>
                      {/* CPF — shown for all (needed for PIX) */}
                      <div>
                        <div className="relative">
                          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: mutedColor }} />
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder={payMethod === 'pix' ? 'CPF (obrigatório para Pix)' : 'CPF (opcional)'}
                            value={customerCpf}
                            onChange={(e) => {
                              const formatted = formatCpf(e.target.value);
                              setCustomerCpf(formatted);
                              if (cpfTouched) validateCpf(formatted);
                            }}
                            onBlur={() => { setCpfTouched(true); validateCpf(customerCpf); }}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
                            style={{
                              background: inputBg,
                              border: `1px solid ${cpfError && cpfTouched ? '#fca5a5' : borderColor}`,
                              color: textColor,
                            }}
                          />
                        </div>
                        {cpfError && cpfTouched && (
                          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: isDark ? '#fca5a5' : '#dc2626' }}>
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            {cpfError}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="text-xs uppercase tracking-widest mb-3" style={{ color: mutedColor, fontWeight: 600 }}>
                      Forma de pagamento
                    </p>

                    <TabNav
                      className="mb-4"
                      fullWidth={true}
                      active={payMethod}
                      onChange={(k) => {
                        setPayMethod(k as 'pix' | 'card');
                        setPixState('idle');
                        setPayError('');
                      }}
                      tabs={[
                        { key: 'pix',  label: 'Pix',    icon: Smartphone },
                        { key: 'card', label: 'Cartão', icon: CreditCard },
                      ]}
                    />

                    <AnimatePresence mode="wait">
                      {/* PIX panel */}
                      {payMethod === 'pix' && (
                        <motion.div
                          key="pix"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.18 }}
                        >
                          {pixState === 'idle' && (
                            <p className="text-xs text-center py-2" style={{ color: mutedColor }}>
                              Clique em "Pagar" para gerar o QR Code Pix via Mercado Pago
                            </p>
                          )}
                          {pixState === 'loading' && (
                            <div className="flex flex-col items-center gap-3 py-6">
                              <Loader2 className="w-8 h-8 animate-spin" style={{ color: green }} />
                              <p className="text-sm" style={{ color: mutedColor }}>Gerando QR Code...</p>
                            </div>
                          )}
                          {pixState === 'ready' && (
                            <PixQrPanel
                              qrCodeBase64={pixQrCodeBase64}
                              pixCode={pixCode}
                              isDark={isDark}
                              onCopy={handleCopyPix}
                              copied={copied}
                              onConfirm={handlePixConfirm}
                              amount={finalPrice}
                            />
                          )}
                        </motion.div>
                      )}

                      {/* Card panel */}
                      {payMethod === 'card' && (
                        <motion.div
                          key="card"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.18 }}
                          className="flex flex-col gap-4 py-3"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div
                              className="w-12 h-12 rounded-2xl flex items-center justify-center"
                              style={{ background: '#009ee3' }}
                            >
                              <CreditCard className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-sm text-center" style={{ color: textColor, fontWeight: 600 }}>
                              Cartão de Crédito
                            </p>
                          </div>

                          {/* Installments selector */}
                          <div>
                            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: mutedColor, fontWeight: 600 }}>
                              Parcelamento
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              {[1, 2, 3, 6, 10, 12].filter(n => finalPrice / n >= 5).map((n) => {
                                const isActive = installments === n;
                                const installmentValue = (finalPrice / n).toFixed(2).replace('.', ',');
                                return (
                                  <button
                                    key={n}
                                    onClick={() => setInstallments(n)}
                                    className="flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-xl text-center transition-all"
                                    style={{
                                      background: isActive
                                        ? isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.08)'
                                        : inputBg,
                                      border: `1.5px solid ${isActive
                                        ? isDark ? 'rgba(134,239,172,0.35)' : 'rgba(22,101,52,0.3)'
                                        : borderColor}`,
                                      color: isActive ? green : textColor,
                                    }}
                                  >
                                    <span style={{ fontWeight: 800, fontSize: '0.85rem', fontFamily: "'Montserrat', sans-serif" }}>
                                      {n}x
                                    </span>
                                    <span style={{ fontSize: '0.65rem', color: isActive ? green : mutedColor, fontWeight: 600 }}>
                                      R$ {installmentValue}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {installments > 1 && (
                              <p className="text-xs text-center mt-2" style={{ color: mutedColor }}>
                                {installments}x de R$ {(finalPrice / installments).toFixed(2).replace('.', ',')} sem juros
                              </p>
                            )}
                          </div>

                          <p className="text-xs text-center" style={{ color: mutedColor }}>
                            Você será redirecionado para a página segura do Mercado Pago
                          </p>
                          <div className="flex items-center justify-center gap-2 text-xs" style={{ color: mutedColor }}>
                            <ExternalLink className="w-3 h-3" />
                            Redirecionamento seguro via MP
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Error message */}
                  {payError && (
                    <div
                      className="mx-6 mb-3 flex items-start gap-2 p-3 rounded-xl text-xs"
                      style={{ background: isDark ? 'rgba(252,165,165,0.08)' : 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: isDark ? '#fca5a5' : '#dc2626' }}
                    >
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      {payError}
                    </div>
                  )}

                  {/* Confirm button — hidden when PIX QR is already shown */}
                  {pixState !== 'ready' && (
                    <div className="px-6 pb-6">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleFinish}
                        disabled={checkingOut || pixState === 'loading'}
                        className="w-full py-4 rounded-2xl text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                        style={{
                          background: 'linear-gradient(135deg, #166534, #15803d)',
                          color: '#fff',
                          fontWeight: 800,
                          fontFamily: "'Montserrat', sans-serif",
                          letterSpacing: '-0.01em',
                          boxShadow: '0 4px 16px rgba(22,101,52,0.35)',
                        }}
                      >
                        {checkingOut || pixState === 'loading' ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                        ) : payMethod === 'pix' ? (
                          <><Smartphone className="w-4 h-4" /> Gerar QR Code Pix — R$ {finalPrice}</>
                        ) : (
                          <><CreditCard className="w-4 h-4" /> Pagar R$ {finalPrice} com Cartão</>
                        )}
                      </motion.button>

                      <p className="text-center text-xs mt-3 flex items-center justify-center gap-1" style={{ color: mutedColor }}>
                        <Lock className="w-3 h-3" />
                        Pagamento 100% seguro via Mercado Pago
                      </p>
                    </div>
                  )}
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
            orderId={orderId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}