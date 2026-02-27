import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  DollarSign,
  CreditCard,
  Percent,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  CalendarDays,
  Loader2,
  ExternalLink,
  Tag,
  ToggleLeft,
  ToggleRight,
  Webhook,
  Copy,
  Receipt,
  TrendingUp,
  Package,
  Eye,
  EyeOff,
  KeyRound,
  X,
  XCircle,
  Store,
  Globe,
  Printer,
  ClipboardList,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { TabNav } from '../components/TabNav';
import { useAuth } from '../contexts/AuthContext';
import { api, type AdminConfig, type Coupon, type OrderRecord } from '../lib/api';
import { projectId } from '/utils/supabase/info';

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Pendente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
    paid:      { label: 'Pago',      color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
    delivered: { label: 'Entregue',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
    cancelled: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  };
  const s = map[status] ?? { label: status, color: '#888', bg: 'rgba(136,136,136,0.1)' };
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
      style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

function ChannelBadge({ channel }: { channel?: string }) {
  if (channel === 'pos') {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"
        style={{ color: '#c084fc', background: 'rgba(192,132,252,0.1)' }}>
        <Store style={{ width: 9, height: 9 }} /> PDV
      </span>
    );
  }
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"
      style={{ color: '#7dd3fc', background: 'rgba(125,211,252,0.1)' }}>
      <Globe style={{ width: 9, height: 9 }} /> Online
    </span>
  );
}

export function AdminFinanceiro() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading, getToken } = useAuth();

  /* ── state ── */
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [photoPrice, setPhotoPrice] = useState(30);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // MP token field
  const [mpTokenInput, setMpTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenChanged, setTokenChanged] = useState(false);

  // save
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingToken, setSavingToken] = useState(false);
  const [tokenMsg, setTokenMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // coupon form
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState(10);

  // orders
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // webhook copy
  const [copied, setCopied] = useState(false);

  // cancel modal
  const [cancelTarget, setCancelTarget] = useState<OrderRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  /* ── design tokens ── */
  const bg         = isDark ? '#08080E' : '#F2F8F4';
  const card       = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)';
  const border     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.1)';
  const muted      = isDark ? 'rgba(255,255,255,0.4)'  : 'rgba(0,40,20,0.42)';
  const text       = isDark ? '#fff' : '#0D2818';
  const green      = isDark ? '#86efac' : '#006B2B';
  const inputBg    = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const inputBrd   = `1px solid ${border}`;
  const btnPrimary = isDark
    ? 'rgba(22,101,52,0.85)'
    : 'linear-gradient(135deg,#006B2B,#00843D)';

  const WEBHOOK = `https://${projectId}.supabase.co/functions/v1/make-server-68454e9b/payments/webhook`;

  /* ── guards & load ── */
  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/admin/login', { replace: true });
  }, [isAdmin, authLoading, navigate]);

  const loadData = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const [cfgRes, ordersRes] = await Promise.all([
        api.getAdminConfig(token),
        api.getOrders(token),
      ]);
      setConfig(cfgRes);
      setPhotoPrice(cfgRes.photoPrice);
      setCoupons(cfgRes.coupons);
      setOrders(ordersRes.orders);
    } catch (err: any) {
      console.error('Financeiro load error:', err.message);
    } finally {
      setConfigLoading(false);
      setOrdersLoading(false);
    }
  }, [getToken]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── save all (price + coupons) ── */
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const token = await getToken();
      if (!token) { navigate('/admin/login'); return; }
      await api.updateAdminConfig({ photoPrice, coupons }, token);
      setSaveMsg({ type: 'ok', text: 'Configurações salvas com sucesso!' });
    } catch (err: any) {
      setSaveMsg({ type: 'err', text: err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 5000);
    }
  };

  /* ── save MP token only ── */
  const handleSaveToken = async () => {
    setSavingToken(true);
    setTokenMsg(null);
    const wasRemoving = !mpTokenInput;
    try {
      const token = await getToken();
      if (!token) { navigate('/admin/login'); return; }
      await api.updateAdminConfig({ mpToken: mpTokenInput }, token);
      setMpTokenInput('');
      setTokenChanged(false);
      // Re-fetch config from server so badge + preview update immediately
      const freshCfg = await api.getAdminConfig(token);
      setConfig(freshCfg);
      setTokenMsg({ type: 'ok', text: wasRemoving ? 'Chave removida.' : 'Chave aplicada com sucesso!' });
    } catch (err: any) {
      setTokenMsg({ type: 'err', text: err.message });
    } finally {
      setSavingToken(false);
      setTimeout(() => setTokenMsg(null), 5000);
    }
  };

  /* ── coupons ── */
  const addCoupon = () => {
    const code = newCode.trim().toUpperCase();
    if (!code || coupons.find(c => c.code === code)) return;
    setCoupons([...coupons, { code, discount: newDiscount, active: true }]);
    setNewCode(''); setNewDiscount(10);
  };
  const removeCoupon = (code: string) => setCoupons(coupons.filter(c => c.code !== code));
  const toggleCoupon = (code: string) =>
    setCoupons(coupons.map(c => c.code === code ? { ...c, active: !c.active } : c));

  /* ── webhook copy ── */
  const copyWebhook = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = WEBHOOK; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
    } catch { /* ignore */ }
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  /* ── cancel order ── */
  const handleCancelOrder = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const token = await getToken();
      if (!token) return;
      await api.cancelOrder(cancelTarget.id, cancelReason || 'Cancelado pelo admin', token);
      setCancelTarget(null);
      setCancelReason('');
      loadData();
    } catch (err: any) {
      console.error('Cancel order error:', err.message);
      alert(`Erro ao cancelar: ${err.message}`);
    } finally {
      setCancelling(false);
    }
  };

  /* ── derived ── */
  const activeOrders   = orders.filter(o => o.status !== 'cancelled');
  const totalRevenue   = activeOrders.reduce((s, o) => s + (o.total ?? 0), 0);
  const paidRevenue    = activeOrders.filter(o => o.status === 'paid').reduce((s, o) => s + (o.total ?? 0), 0);
  const pendingRevenue = activeOrders.filter(o => o.status === 'pending').reduce((s, o) => s + (o.total ?? 0), 0);
  const avgTicket      = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0;
  const estFee         = paidRevenue * 0.045;
  const net            = paidRevenue - estFee;

  if (authLoading || configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: green }} />
      </div>
    );
  }

  const mpActive = config?.mpConfigured ?? false;

  return (
    <div className="pt-20 pb-16 min-h-screen" style={{ background: bg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, color: text, letterSpacing: '-0.02em' }}>
            Financeiro & Pagamentos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: muted }}>
            Precificação, cupons, integração de pagamento e extrato de pedidos
          </p>
        </motion.div>

        {/* TabNav */}
        <TabNav className="mb-8" active="financeiro" tabs={[
          { key: 'dashboard',  label: 'Dashboard',  icon: BarChart3,    to: '/admin' },
          { key: 'eventos',    label: 'Eventos',     icon: CalendarDays, to: '/admin/eventos' },
          { key: 'financeiro', label: 'Financeiro',  icon: DollarSign,   to: '/admin/financeiro' },
          { key: 'pedidos',    label: 'Pedidos',     icon: ClipboardList, to: '/admin/pedidos' },
          { key: 'pdv',        label: 'PDV',          icon: Store,        to: '/admin/pdv' },
        ]} />

        {/* KPI cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {[
            { label: 'Receita Total',      value: fmt(totalRevenue),   icon: TrendingUp,   color: green },
            { label: 'Receita Confirmada', value: fmt(paidRevenue),    icon: CheckCircle2, color: isDark ? '#86efac' : '#166534' },
            { label: 'Aguardando',         value: fmt(pendingRevenue), icon: Receipt,      color: isDark ? '#fbbf24' : '#b45309' },
            { label: 'Ticket Médio',       value: fmt(avgTicket),      icon: Package,      color: isDark ? '#7dd3fc' : '#0284c7' },
          ].map(s => (
            <motion.div key={s.label} whileHover={{ y: -2 }}
              className="p-4 rounded-2xl flex flex-col gap-2"
              style={{ background: card, border: `1px solid ${border}` }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: muted }}>{s.label}</span>
                <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              </div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '1.1rem', color: s.color }}>
                {s.value}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left col ── */}
          <div className="lg:col-span-1 flex flex-col gap-6">

            {/* Price card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="p-5 rounded-2xl" style={{ background: card, border: `1px solid ${border}` }}>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4" style={{ color: green }} />
                <h2 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.95rem', color: text }}>
                  Preço por Foto
                </h2>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-bold" style={{ color: text, fontFamily: "'Montserrat',sans-serif" }}>R$</span>
                <input
                  type="number" min={1} max={999} step={1} value={photoPrice}
                  onChange={e => setPhotoPrice(Math.max(1, Number(e.target.value)))}
                  className="w-24 text-center text-2xl font-bold rounded-xl px-3 py-2 outline-none"
                  style={{ background: inputBg, border: `2px solid ${isDark ? 'rgba(134,239,172,0.3)' : 'rgba(0,107,43,0.3)'}`, color: green, fontFamily: "'Montserrat',sans-serif" }}
                />
              </div>

              <input type="range" min={10} max={200} step={5} value={photoPrice}
                onChange={e => setPhotoPrice(Number(e.target.value))}
                className="w-full mb-4" style={{ accentColor: green }} />

              <div className="p-3 rounded-xl text-xs space-y-1"
                style={{ background: isDark ? 'rgba(134,239,172,0.05)' : 'rgba(0,107,43,0.04)', border: inputBrd }}>
                <div className="flex justify-between">
                  <span style={{ color: muted }}>Taxa do gateway (~4.5%)</span>
                  <span style={{ color: isDark ? '#fca5a5' : '#dc2626', fontWeight: 600 }}>− {fmt(photoPrice * 0.045)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: muted }}>Valor líquido por foto</span>
                  <span style={{ color: green, fontWeight: 700 }}>{fmt(photoPrice * 0.955)}</span>
                </div>
              </div>
            </motion.div>

            {/* Coupons card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="p-5 rounded-2xl flex flex-col gap-4" style={{ background: card, border: `1px solid ${border}` }}>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" style={{ color: green }} />
                <h2 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.95rem', color: text }}>
                  Cupons de Desconto
                </h2>
              </div>

              <div className="space-y-2">
                {coupons.length === 0 && (
                  <p className="text-xs text-center py-3" style={{ color: muted }}>Nenhum cupom cadastrado</p>
                )}
                {coupons.map(c => (
                  <div key={c.code} className="flex items-center gap-2 p-2.5 rounded-xl"
                    style={{ background: inputBg, border: inputBrd }}>
                    <code className="text-xs font-mono flex-1" style={{ color: c.active ? green : muted, fontWeight: 700 }}>
                      {c.code}
                    </code>
                    <span className="text-xs" style={{ color: muted }}>−{c.discount}%</span>
                    <button onClick={() => toggleCoupon(c.code)} title={c.active ? 'Desativar' : 'Ativar'}>
                      {c.active
                        ? <ToggleRight className="w-4 h-4" style={{ color: green }} />
                        : <ToggleLeft  className="w-4 h-4" style={{ color: muted  }} />}
                    </button>
                    <button onClick={() => removeCoupon(c.code)}>
                      <Trash2 className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(252,165,165,0.6)' : 'rgba(220,38,38,0.6)' }} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-3" style={{ borderTop: `1px solid ${border}` }}>
                <p className="text-xs mb-2 font-bold" style={{ color: muted }}>NOVO CUPOM</p>
                <div className="flex gap-2 mb-2">
                  <input type="text" placeholder="CÓDIGO" value={newCode}
                    onChange={e => setNewCode(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-mono outline-none uppercase"
                    style={{ background: inputBg, border: inputBrd, color: text }} />
                  <div className="flex items-center gap-1 px-3 py-2 rounded-lg" style={{ background: inputBg, border: inputBrd }}>
                    <input type="number" min={1} max={100} value={newDiscount}
                      onChange={e => setNewDiscount(Math.min(100, Math.max(1, Number(e.target.value))))}
                      className="w-10 text-xs text-center outline-none bg-transparent" style={{ color: text }} />
                    <Percent className="w-3 h-3" style={{ color: muted }} />
                  </div>
                </div>
                <button onClick={addCoupon} disabled={!newCode.trim()}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold"
                  style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(0,107,43,0.08)', color: green, opacity: newCode.trim() ? 1 : 0.4 }}>
                  <Plus className="w-3 h-3" /> Adicionar Cupom
                </button>
              </div>
            </motion.div>

            {/* Save button */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleSave} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold"
                style={{ background: btnPrimary, color: '#fff', opacity: saving ? 0.7 : 1 }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </motion.button>

              <AnimatePresence>
                {saveMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 mt-3 text-xs p-3 rounded-xl"
                    style={saveMsg.type === 'ok'
                      ? { background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.06)', color: green }
                      : { background: isDark ? 'rgba(252,165,165,0.08)' : 'rgba(220,38,38,0.06)', color: isDark ? '#fca5a5' : '#dc2626' }}>
                    {saveMsg.type === 'ok'
                      ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      : <AlertCircle  className="w-3.5 h-3.5 flex-shrink-0" />}
                    {saveMsg.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* ── Right col ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Mercado Pago card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="p-5 rounded-2xl" style={{ background: card, border: `1px solid ${border}` }}>

              {/* Header */}
              <div className="flex items-center gap-2 mb-5">
                <CreditCard className="w-4 h-4" style={{ color: green }} />
                <h2 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.95rem', color: text }}>
                  Integração de Pagamento
                </h2>
                {/* Simple status — no technical jargon */}
                <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
                  style={{
                    background: mpActive ? (isDark ? 'rgba(34,197,94,0.1)' : 'rgba(0,107,43,0.07)') : (isDark ? 'rgba(239,68,68,0.1)' : 'rgba(220,38,38,0.06)'),
                    color: mpActive ? green : (isDark ? '#fca5a5' : '#dc2626'),
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: mpActive ? green : (isDark ? '#fca5a5' : '#dc2626') }} />
                  {mpActive ? 'Ativo' : 'Não configurado'}
                </div>
              </div>

              {/* Token input section */}
              <div className="mb-5">
                <label className="block text-xs font-bold mb-1" style={{ color: muted }}>
                  CHAVE DE PAGAMENTO (MERCADO PAGO)
                </label>
                <p className="text-xs mb-3" style={{ color: muted }}>
                  Acesse{' '}
                  <a href="https://www.mercadopago.com.br/developers/panel/app"
                    target="_blank" rel="noreferrer"
                    className="underline font-semibold"
                    style={{ color: isDark ? '#7dd3fc' : '#0284c7' }}>
                    Mercado Pago → Credenciais
                  </a>
                  , copie o <strong style={{ color: text }}>Access Token</strong> e cole abaixo.
                </p>

                {/* Current token preview (when set and not being edited) */}
                {mpActive && !tokenChanged && (
                  <div className="flex items-center gap-2 mb-3 px-4 py-3 rounded-xl"
                    style={{ background: isDark ? 'rgba(134,239,172,0.06)' : 'rgba(0,107,43,0.05)', border: `1px solid ${isDark ? 'rgba(134,239,172,0.15)' : 'rgba(0,107,43,0.12)'}` }}>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: green }} />
                    <span className="text-xs flex-1" style={{ color: green, fontWeight: 600 }}>
                      Chave configurada e ativa
                    </span>
                    {config?.mpTokenPreview && (
                      <code className="text-[11px] font-mono tracking-wide" style={{ color: muted }}>
                        {config.mpTokenPreview}
                      </code>
                    )}
                  </div>
                )}

                {/* Input */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <KeyRound className="w-4 h-4" style={{ color: muted }} />
                  </div>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={mpTokenInput}
                    onChange={e => { setMpTokenInput(e.target.value); setTokenChanged(true); }}
                    placeholder={mpActive ? 'Digite para alterar a chave atual...' : 'Cole aqui sua chave de pagamento...'}
                    className="w-full pl-10 pr-20 py-3 rounded-xl text-sm outline-none font-mono"
                    style={{
                      background: inputBg,
                      border: `1px solid ${tokenChanged && mpTokenInput
                        ? (isDark ? 'rgba(134,239,172,0.4)' : 'rgba(0,107,43,0.4)')
                        : border}`,
                      color: text,
                    }}
                  />
                  {/* Controls inside input */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {tokenChanged && mpTokenInput && (
                      <button onClick={() => { setMpTokenInput(''); setTokenChanged(false); }}
                        className="p-1.5 rounded-lg" title="Cancelar">
                        <X className="w-3.5 h-3.5" style={{ color: muted }} />
                      </button>
                    )}
                    <button onClick={() => setShowToken(v => !v)}
                      className="p-1.5 rounded-lg" title={showToken ? 'Ocultar chave' : 'Mostrar chave'}
                      style={{ color: muted }}>
                      {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Apply token button — appears as soon as user types */}
                <AnimatePresence>
                  {tokenChanged && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      className="mt-3 overflow-hidden"
                    >
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleSaveToken}
                        disabled={savingToken}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                        style={{ background: btnPrimary, color: '#fff', opacity: savingToken ? 0.7 : 1 }}
                      >
                        {savingToken
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando...</>
                          : <><Save className="w-4 h-4" /> {mpTokenInput ? 'Aplicar Chave' : 'Remover Chave'}</>}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Token feedback */}
                <AnimatePresence>
                  {tokenMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2 mt-2 text-xs p-3 rounded-xl"
                      style={tokenMsg.type === 'ok'
                        ? { background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.06)', color: green }
                        : { background: isDark ? 'rgba(252,165,165,0.08)' : 'rgba(220,38,38,0.06)', color: isDark ? '#fca5a5' : '#dc2626' }}>
                      {tokenMsg.type === 'ok'
                        ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        : <AlertCircle  className="w-3.5 h-3.5 flex-shrink-0" />}
                      {tokenMsg.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Remove link */}
                {mpActive && !tokenChanged && (
                  <button
                    onClick={() => { setMpTokenInput(''); setTokenChanged(true); }}
                    className="mt-2 text-[11px] flex items-center gap-1 transition-opacity hover:opacity-100 opacity-60"
                    style={{ color: isDark ? '#fca5a5' : '#dc2626' }}>
                    <Trash2 className="w-3 h-3" /> Remover chave de pagamento
                  </button>
                )}
              </div>

              {/* Fees info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="p-4 rounded-xl" style={{ background: inputBg, border: inputBrd }}>
                  <p className="text-xs font-bold mb-2" style={{ color: muted }}>TAXAS POR MÉTODO</p>
                  <div className="space-y-1.5">
                    {[['PIX', '4.99%'], ['Cartão de crédito 1x', '3.79%'], ['Crédito parcelado', '5.85%'], ['Débito', '3.19%']].map(([m, r]) => (
                      <div key={m} className="flex justify-between text-xs">
                        <span style={{ color: muted }}>{m}</span>
                        <span style={{ color: text, fontWeight: 600 }}>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl"
                  style={{ background: isDark ? 'rgba(134,239,172,0.04)' : 'rgba(0,107,43,0.03)', border: inputBrd }}>
                  <p className="text-xs font-bold mb-2" style={{ color: muted }}>RECEITA LÍQUIDA ESTIMADA</p>
                  <div className="space-y-1.5">
                    {([
                      ['Vendas confirmadas', fmt(paidRevenue), text],
                      ['Taxa (~4.5%)',       `− ${fmt(estFee)}`, isDark ? '#fca5a5' : '#dc2626'],
                      ['Líquido estimado',   fmt(net),          green],
                    ] as const).map(([l, v, c]) => (
                      <div key={l} className="flex justify-between text-xs">
                        <span style={{ color: muted }}>{l}</span>
                        <span style={{ color: c, fontWeight: 700 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Webhook */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Webhook className="w-3.5 h-3.5" style={{ color: green }} />
                  <span className="text-xs font-bold" style={{ color: muted }}>
                    URL DE NOTIFICAÇÃO AUTOMÁTICA
                  </span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: inputBg, border: inputBrd }}>
                  <code className="flex-1 text-[11px] truncate font-mono" style={{ color: isDark ? '#7dd3fc' : '#0284c7' }}>
                    {WEBHOOK}
                  </code>
                  <button onClick={copyWebhook}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] flex-shrink-0 font-bold"
                    style={{ background: isDark ? 'rgba(125,211,252,0.08)' : 'rgba(2,132,199,0.07)', color: copied ? green : isDark ? '#7dd3fc' : '#0284c7' }}>
                    {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="text-[10px] mt-1.5 px-1" style={{ color: muted }}>
                  Registre esta URL no{' '}
                  <a href="https://www.mercadopago.com.br/developers/panel/webhooks"
                    target="_blank" rel="noreferrer" className="underline"
                    style={{ color: isDark ? '#7dd3fc' : '#0284c7' }}>
                    painel do Mercado Pago → Webhooks
                  </a>{' '}
                  para atualizar o status dos pedidos automaticamente.
                </p>
              </div>

              {/* Links */}
              <div className="flex gap-3">
                <a href="https://www.mercadopago.com.br/activities" target="_blank" rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                  style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.07)', color: green }}>
                  <ExternalLink className="w-3.5 h-3.5" /> Ver Extrato MP
                </a>
                <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                  style={{ background: inputBg, border: inputBrd, color: muted }}>
                  <ExternalLink className="w-3.5 h-3.5" /> Obter Credenciais
                </a>
              </div>
            </motion.div>

            {/* Orders */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-2xl overflow-hidden" style={{ background: card, border: `1px solid ${border}` }}>
              <div className="p-5 flex items-center gap-2" style={{ borderBottom: `1px solid ${border}` }}>
                <Receipt className="w-4 h-4" style={{ color: green }} />
                <h2 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '0.95rem', color: text }}>
                  Últimos Pedidos
                </h2>
                <span className="ml-auto text-xs px-2.5 py-0.5 rounded-full font-bold"
                  style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.07)', color: green }}>
                  {orders.length} pedido{orders.length !== 1 ? 's' : ''}
                </span>
              </div>

              {ordersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: muted }} />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-8 h-8 mx-auto mb-3" style={{ color: muted }} />
                  <p className="text-sm" style={{ color: muted }}>Nenhum pedido ainda</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${border}` }}>
                        {['ID', 'Cliente', 'Canal', 'Fotos', 'Total', 'Método', 'Status', 'Data', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left whitespace-nowrap font-bold" style={{ color: muted }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 30).map((o, i) => (
                        <tr key={o.id} style={{
                          borderBottom: i < Math.min(orders.length, 30) - 1 ? `1px solid ${border}` : 'none',
                          background: o.status === 'cancelled'
                            ? (isDark ? 'rgba(239,68,68,0.03)' : 'rgba(239,68,68,0.02)')
                            : i % 2 === 0 ? 'transparent' : isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
                        }}>
                          <td className="px-4 py-3">
                            <code className="font-mono text-[10px]" style={{ color: isDark ? '#7dd3fc' : '#0284c7' }}>
                              {o.id.slice(0, 16)}…
                            </code>
                          </td>
                          <td className="px-4 py-3 max-w-[130px]">
                            <div className="truncate font-semibold" style={{ color: text }}>{o.customerName || '—'}</div>
                            <div className="truncate text-[10px]" style={{ color: muted }}>{o.customerEmail || '—'}</div>
                          </td>
                          <td className="px-4 py-3"><ChannelBadge channel={(o as any).channel} /></td>
                          <td className="px-4 py-3 text-center" style={{ color: text }}>{o.items?.length ?? 0}</td>
                          <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: o.status === 'cancelled' ? muted : green, textDecoration: o.status === 'cancelled' ? 'line-through' : 'none' }}>{fmt(o.total ?? 0)}</td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: muted }}>
                            {{ pix: 'PIX', card: 'Cartão', dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito' }[o.paymentMethod] ?? o.paymentMethod}
                          </td>
                          <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: muted }}>
                            {new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            {o.status !== 'cancelled' && (
                              <button
                                onClick={() => { setCancelTarget(o); setCancelReason(''); }}
                                className="p-1.5 rounded-lg hover:opacity-100 opacity-50 transition-opacity"
                                title="Cancelar pedido"
                                style={{ color: isDark ? '#fca5a5' : '#dc2626' }}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Cancel order modal */}
        <AnimatePresence>
          {cancelTarget && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setCancelTarget(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl p-6"
                style={{ background: isDark ? '#12121a' : '#fff', border: `1px solid ${border}` }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <XCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, color: text, fontSize: '1rem' }}>
                      Cancelar Pedido
                    </h3>
                    <p className="text-xs" style={{ color: muted }}>
                      {cancelTarget.customerName || cancelTarget.customerEmail} · {fmt(cancelTarget.total)}
                    </p>
                  </div>
                </div>

                {cancelTarget.status === 'paid' && cancelTarget.mpPaymentId && (
                  <div className="p-3 rounded-xl mb-4 text-xs"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                    <strong>Atenção:</strong> Este pedido já foi pago. O estorno será solicitado automaticamente ao Mercado Pago.
                  </div>
                )}

                <div className="mb-5">
                  <label className="block text-xs font-bold mb-1.5" style={{ color: muted }}>MOTIVO DO CANCELAMENTO</label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="Ex: Cliente solicitou cancelamento"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: inputBg, border: inputBrd, color: text }}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCancelTarget(null)}
                    className="flex-1 py-3 rounded-xl text-sm font-bold"
                    style={{ background: inputBg, border: inputBrd, color: muted }}
                  >
                    Voltar
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleCancelOrder}
                    disabled={cancelling}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', opacity: cancelling ? 0.6 : 1 }}
                  >
                    {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    {cancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}