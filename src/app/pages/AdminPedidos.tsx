import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  ClipboardList, BarChart3, CalendarDays, DollarSign, Store,
  Search, Loader2, Eye, XCircle, CheckCircle2, Clock, Package,
  ChevronDown, ChevronUp, Filter, Printer, Globe, ShoppingCart,
  User, CreditCard, Banknote, AlertCircle, X, Download, Check,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { TabNav } from '../components/TabNav';
import { useAuth } from '../contexts/AuthContext';
import { api, type OrderRecord } from '../lib/api';

const fmt = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/* ── Status badge ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    pending:   { label: 'Pendente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: Clock },
    paid:      { label: 'Pago',      color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   icon: CheckCircle2 },
    delivered: { label: 'Entregue',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: Package },
    cancelled: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: XCircle },
  };
  const s = map[status] ?? { label: status, color: '#888', bg: 'rgba(136,136,136,0.1)', icon: AlertCircle };
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
      style={{ background: s.bg, color: s.color }}
    >
      <Icon style={{ width: 12, height: 12 }} /> {s.label}
    </span>
  );
}

function ChannelBadge({ channel }: { channel?: string }) {
  const isPos = channel === 'pos';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
      style={{
        background: isPos ? 'rgba(192,132,252,0.1)' : 'rgba(59,130,246,0.1)',
        color: isPos ? '#c084fc' : '#60a5fa',
      }}
    >
      {isPos ? <Store style={{ width: 10, height: 10 }} /> : <Globe style={{ width: 10, height: 10 }} />}
      {isPos ? 'PDV' : 'Online'}
    </span>
  );
}

function PaymentBadge({ method }: { method: string }) {
  const map: Record<string, { label: string; icon: React.ElementType }> = {
    pix: { label: 'PIX', icon: CreditCard },
    card: { label: 'Cartao', icon: CreditCard },
    dinheiro: { label: 'Dinheiro', icon: Banknote },
    debito: { label: 'Debito', icon: CreditCard },
    credito: { label: 'Credito', icon: CreditCard },
  };
  const p = map[method] ?? { label: method, icon: CreditCard };
  const Icon = p.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
      <Icon style={{ width: 10, height: 10 }} /> {p.label}
    </span>
  );
}

/* ── Cancel Modal ── */
function CancelModal({ order, onClose, onConfirm, isDark }: {
  order: OrderRecord; onClose: () => void; onConfirm: (reason: string) => void; isDark: boolean;
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const text = isDark ? '#fff' : '#09090B';
  const muted = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(9,9,11,0.42)';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(22,101,52,0.1)';

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(reason || 'Cancelado pelo admin');
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md p-6 rounded-2xl"
        style={{ background: isDark ? '#0e0e1a' : '#fff', border: `1px solid ${border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, color: text, fontSize: '1.1rem' }}>
            Cancelar Pedido
          </h3>
          <button onClick={onClose} className="cursor-pointer p-1"><X className="w-4 h-4" style={{ color: muted }} /></button>
        </div>

        <p className="text-sm mb-1" style={{ color: muted }}>
          Pedido <code className="text-xs font-mono" style={{ color: '#ef4444' }}>{order.id.slice(0, 20)}</code>
        </p>
        <p className="text-sm mb-4" style={{ color: muted }}>
          {order.customerName} · {fmt(order.total)} · {order.items?.length} foto(s)
        </p>

        {order.status === 'paid' && order.mpPaymentId && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-xs"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            Sera tentado reembolso automatico via Mercado Pago
          </div>
        )}

        <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-widest" style={{ color: muted }}>
          Motivo do cancelamento
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Informe o motivo..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none mb-4"
          style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${border}`, color: text }}
        />

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer"
            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: text }}>
            Voltar
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', opacity: loading ? 0.6 : 1 }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Confirmar Cancelamento
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Custom Select ── */
function CustomSelect({ value, onChange, options, isDark, border, card, text, muted }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  isDark: boolean;
  border: string;
  card: string;
  text: string;
  muted: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm whitespace-nowrap cursor-pointer"
        style={{ background: card, border: `1px solid ${border}`, color: text, minWidth: 160 }}
      >
        <span className="flex-1 text-left">{selected?.label}</span>
        <ChevronDown
          className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
          style={{ color: muted, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1.5 w-full rounded-xl overflow-hidden shadow-xl"
          style={{
            background: isDark ? '#0e0e1a' : '#ffffff',
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? '0 8px 32px rgba(0,0,0,0.6)'
              : '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left cursor-pointer transition-colors"
              style={{
                color: opt.value === value ? (isDark ? '#86efac' : '#166534') : text,
                background: opt.value === value
                  ? (isDark ? 'rgba(134,239,172,0.07)' : 'rgba(22,101,52,0.06)')
                  : 'transparent',
              }}
              onMouseEnter={e => {
                if (opt.value !== value)
                  (e.currentTarget as HTMLElement).style.background = isDark
                    ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
              }}
              onMouseLeave={e => {
                if (opt.value !== value)
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              {opt.label}
              {opt.value === value && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */
export function AdminPedidos() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading, getToken } = useAuth();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderRecord | null>(null);

  const bg     = isDark ? '#09090F' : '#F8F9FA';
  const card   = isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(9,9,11,0.09)';
  const muted  = isDark ? 'rgba(255,255,255,0.4)'  : '#71717A';
  const text   = isDark ? '#fff' : '#09090B';
  const green  = isDark ? '#86efac' : '#166534';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(9,9,11,0.04)';

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/admin/login', { replace: true });
  }, [isAdmin, authLoading, navigate]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const res = await api.getOrders(token);
      setOrders(res.orders ?? []);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [isAdmin]);

  const handleCancel = async (reason: string) => {
    if (!cancelOrder) return;
    try {
      const token = await getToken();
      if (!token) return;
      await api.cancelOrder(cancelOrder.id, reason, token);
      setCancelOrder(null);
      await loadOrders();
    } catch (err: any) {
      console.error('Erro ao cancelar:', err);
      alert(err.message ?? 'Erro ao cancelar pedido');
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      await api.updateOrderStatus(orderId, { status: newStatus }, token);
      await loadOrders();
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  // Filters
  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (channelFilter !== 'all' && (o.channel ?? 'online') !== channelFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        o.id.toLowerCase().includes(s) ||
        (o.customerName?.toLowerCase().includes(s)) ||
        (o.customerEmail?.toLowerCase().includes(s))
      );
    }
    return true;
  });

  // KPIs
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total ?? 0), 0);
  const paidOrders = orders.filter(o => o.status === 'paid').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

  /* ── Export CSV ── */
  const handleExport = () => {
    const now = new Date();
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const row = (...cells: (string | number)[]) => cells.map(esc).join(',');

    const statusLabel: Record<string, string> = {
      pending: 'Pendente', paid: 'Pago', delivered: 'Entregue', cancelled: 'Cancelado',
    };
    const channelLabel: Record<string, string> = { pos: 'PDV', online: 'Online' };

    const lines: string[] = [];

    lines.push(row('Smart Match — Relatório de Pedidos'));
    lines.push(row(`Gerado em: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`));

    const filterDesc = [
      statusFilter !== 'all' ? `Status: ${statusLabel[statusFilter] ?? statusFilter}` : '',
      channelFilter !== 'all' ? `Canal: ${channelLabel[channelFilter] ?? channelFilter}` : '',
      searchTerm ? `Busca: ${searchTerm}` : '',
    ].filter(Boolean).join(' | ');
    if (filterDesc) lines.push(row(`Filtros: ${filterDesc}`));

    lines.push(row(`Total de registros: ${filtered.length} de ${orders.length}`));
    lines.push(row(''));

    // Cabeçalho da tabela
    lines.push(row(
      'ID', 'Data', 'Cliente', 'E-mail', 'Canal',
      'Qtd Fotos', 'Total (R$)', 'Pagamento', 'Status',
      'MP Payment ID', 'Motivo Cancelamento',
    ));

    for (const o of filtered) {
      const items = o.items ?? [];
      const totalFotos = items.length;
      const eventNames = [...new Set(items.map(it => it.eventName ?? ''))].join('; ');

      lines.push(row(
        o.id,
        o.createdAt ? new Date(o.createdAt).toLocaleString('pt-BR') : '',
        o.customerName ?? '',
        o.customerEmail ?? '',
        channelLabel[o.channel ?? 'online'] ?? o.channel ?? 'Online',
        totalFotos,
        (o.total ?? 0).toFixed(2),
        o.paymentMethod ?? '',
        statusLabel[o.status] ?? o.status ?? '',
        (o as any).mpPaymentId ?? '',
        (o as any).cancelReason ?? '',
      ));
    }

    // Seção de detalhamento de itens por pedido
    lines.push(row(''));
    lines.push(row('=== DETALHAMENTO DE ITENS ==='));
    lines.push(row('Pedido ID', 'Cliente', 'Tag da Foto', 'Evento', 'Preço (R$)'));
    for (const o of filtered) {
      for (const item of o.items ?? []) {
        lines.push(row(
          o.id,
          o.customerName ?? o.customerEmail ?? '',
          item.tag ?? '',
          item.eventName ?? '',
          (item.price ?? 0).toFixed(2),
        ));
      }
    }

    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartmatch-pedidos-${now.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: isDark ? 'rgba(96,165,250,0.1)' : 'rgba(59,130,246,0.08)' }}>
                <ClipboardList className="w-5 h-5" style={{ color: isDark ? '#60a5fa' : '#3b82f6' }} />
              </div>
              <div>
                <h1 style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, color: text, letterSpacing: '-0.02em' }}>
                  Pedidos
                </h1>
                <p className="text-sm" style={{ color: muted }}>
                  Gerencie todos os pedidos do e-commerce e PDV
                </p>
              </div>
            </div>

            {/* Exportar */}
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleExport}
              disabled={loading || filtered.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm self-start sm:self-auto"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(22,101,52,0.06)',
                border: `1px solid ${border}`,
                color: muted,
                cursor: (loading || filtered.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (loading || filtered.length === 0) ? 0.5 : 1,
                fontWeight: 600,
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
              {filtered.length > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(22,101,52,0.08)', color: green }}
                >
                  {filtered.length}
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* TabNav */}
        <TabNav className="mb-8" active="pedidos" tabs={[
          { key: 'dashboard',  label: 'Dashboard',  icon: BarChart3,      to: '/admin' },
          { key: 'eventos',    label: 'Eventos',     icon: CalendarDays,   to: '/admin/eventos' },
          { key: 'financeiro', label: 'Financeiro',  icon: DollarSign,     to: '/admin/financeiro' },
          { key: 'pedidos',    label: 'Pedidos',     icon: ClipboardList,  to: '/admin/pedidos' },
          { key: 'pdv',        label: 'PDV',         icon: Store,          to: '/admin/pdv' },
        ]} />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Receita Total', value: fmt(totalRevenue), color: green, icon: DollarSign },
            { label: 'Pagos', value: paidOrders.toString(), color: '#22c55e', icon: CheckCircle2 },
            { label: 'Pendentes', value: pendingOrders.toString(), color: '#f59e0b', icon: Clock },
            { label: 'Cancelados', value: cancelledOrders.toString(), color: '#ef4444', icon: XCircle },
          ].map((kpi) => (
            <div key={kpi.label} className="p-4 rounded-2xl" style={{ background: card, border: `1px solid ${border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon style={{ width: 14, height: 14, color: kpi.color }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: muted }}>{kpi.label}</span>
              </div>
              <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 900, fontSize: '1.3rem', color: kpi.color }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: muted }} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID, nome ou email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: card, border: `1px solid ${border}`, color: text }}
            />
          </div>
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            isDark={isDark}
            border={border}
            card={card}
            text={text}
            muted={muted}
            options={[
              { value: 'all',       label: 'Todos os status' },
              { value: 'pending',   label: 'Pendente' },
              { value: 'paid',      label: 'Pago' },
              { value: 'delivered', label: 'Entregue' },
              { value: 'cancelled', label: 'Cancelado' },
            ]}
          />
          <CustomSelect
            value={channelFilter}
            onChange={setChannelFilter}
            isDark={isDark}
            border={border}
            card={card}
            text={text}
            muted={muted}
            options={[
              { value: 'all',    label: 'Todos os canais' },
              { value: 'online', label: 'Online' },
              { value: 'pos',    label: 'PDV' },
            ]}
          />
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: muted }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList className="w-10 h-10 mx-auto mb-3" style={{ color: muted }} />
            <p className="text-sm" style={{ color: muted }}>
              {orders.length === 0 ? 'Nenhum pedido registrado' : 'Nenhum pedido corresponde aos filtros'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((order, i) => {
              const isExpanded = expandedOrder === order.id;
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: card, border: `1px solid ${border}` }}
                >
                  {/* Row */}
                  <button
                    className="w-full flex items-center gap-3 p-4 text-left cursor-pointer"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <code className="text-[11px] font-mono font-bold" style={{ color: green }}>
                          #{order.id.slice(-8).toUpperCase()}
                        </code>
                        <StatusBadge status={order.status} />
                        <ChannelBadge channel={order.channel} />
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: muted }}>
                        <span className="flex items-center gap-1">
                          <User style={{ width: 11, height: 11 }} />
                          {order.customerName || order.customerEmail || 'Cliente'}
                        </span>
                        <span>{fmtDate(order.createdAt)}</span>
                        <span>{order.items?.length ?? 0} foto(s)</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, fontSize: '1rem', color: text }}>
                        {fmt(order.total)}
                      </div>
                      <PaymentBadge method={order.paymentMethod} />
                    </div>
                    <div style={{ color: muted }}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-1" style={{ borderTop: `1px solid ${border}` }}>
                          {/* Items */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                            {order.items?.map((item, j) => (
                              <div key={j} className="flex items-center gap-2 p-2 rounded-xl"
                                style={{ background: inputBg, border: `1px solid ${border}` }}>
                                {item.src ? (
                                  <div className="w-10 h-7 rounded overflow-hidden flex-shrink-0">
                                    <img src={item.src} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ background: inputBg }}>
                                    <ShoppingCart className="w-3 h-3" style={{ color: muted }} />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] truncate font-semibold" style={{ color: text }}>{item.tag}</p>
                                  <p className="text-[10px]" style={{ color: green, fontWeight: 700 }}>{fmt(item.price)}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Order details */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs mb-4">
                            {order.customerEmail && (
                              <div>
                                <span className="block text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: muted }}>Email</span>
                                <span style={{ color: text }}>{order.customerEmail}</span>
                              </div>
                            )}
                            {order.mpPaymentId && (
                              <div>
                                <span className="block text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: muted }}>MP Payment ID</span>
                                <span style={{ color: text }}>{order.mpPaymentId}</span>
                              </div>
                            )}
                            {order.cancelReason && (
                              <div className="col-span-2">
                                <span className="block text-[10px] uppercase tracking-widest font-bold mb-0.5" style={{ color: '#ef4444' }}>Motivo cancelamento</span>
                                <span style={{ color: text }}>{order.cancelReason}</span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 flex-wrap">
                            {order.status === 'paid' && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'delivered')}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
                                style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}
                              >
                                <Package className="w-3.5 h-3.5" /> Marcar Entregue
                              </button>
                            )}
                            {order.status !== 'cancelled' && (
                              <button
                                onClick={() => setCancelOrder(order)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}
                              >
                                <XCircle className="w-3.5 h-3.5" /> Cancelar
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Total count */}
        {!loading && filtered.length > 0 && (
          <p className="text-xs text-center mt-6" style={{ color: muted }}>
            Exibindo {filtered.length} de {orders.length} pedidos
          </p>
        )}
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {cancelOrder && (
          <CancelModal
            order={cancelOrder}
            onClose={() => setCancelOrder(null)}
            onConfirm={handleCancel}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}