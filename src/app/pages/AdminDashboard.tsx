import { useState, useEffect, useMemo } from 'react';
import { useLocation, Link, useNavigate } from 'react-router';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  CalendarDays,
  Camera,
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Users,
  Plus,
  Download,
  ArrowRight,
  CheckCircle2,
  Clock,
  ImageIcon,
  Zap,
  Loader2,
  Store,
  ClipboardList,
  Settings,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { TabNav } from '../components/TabNav';
import { useAuth } from '../contexts/AuthContext';
import { api, type AdminStats, type EventRecord } from '../lib/api';

/* ─── Sub-components ─── */
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  trendUp,
  color,
  iconBg,
  delay,
  isDark,
  cardBg,
  cardBorder,
  mutedText,
  textColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  color: string;
  iconBg: string;
  delay: number;
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
  mutedText: string;
  textColor: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="p-5 rounded-2xl flex flex-col gap-4"
      style={{ background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
            style={{
              background: trendUp
                ? isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.07)'
                : isDark ? 'rgba(252,165,165,0.08)' : 'rgba(220,38,38,0.07)',
              color: trendUp
                ? isDark ? '#86efac' : '#166534'
                : isDark ? '#fca5a5' : '#dc2626',
            }}
          >
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 'clamp(1.5rem, 2.5vw, 1.9rem)',
            fontWeight: 800,
            color: textColor,
            lineHeight: 1.1,
          }}
        >
          {value}
        </div>
        <p className="text-xs mt-1 uppercase tracking-widest" style={{ color: mutedText, fontWeight: 600 }}>
          {label}
        </p>
        {sub && (
          <p className="text-xs mt-1" style={{ color: mutedText }}>
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Custom Tooltips ─── */
function CustomTooltipRevenue({ active, payload, label, isDark }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs"
      style={{
        background: isDark ? '#1a1a2e' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      <p style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name === 'receita' ? `R$ ${p.value}` : `${p.value} fotos`}
        </p>
      ))}
    </div>
  );
}

function CustomTooltipBar({ active, payload, label, isDark }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs"
      style={{
        background: isDark ? '#1a1a2e' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      <p style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)', marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill, fontWeight: 700 }}>
          {p.name === 'fotos' ? `${p.value} fotos` : `${p.value} vendas`}
        </p>
      ))}
    </div>
  );
}

/* ─── Main Component ─── */
export function AdminDashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, isAdmin, loading: authLoading, getToken } = useAuth();
  const isOnDashboard = location.pathname === '/admin' || location.pathname === '/admin/';

  const [chartView, setChartView] = useState<'receita' | 'fotos'>('receita');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<EventRecord[]>([]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!token) return;
    setStatsLoading(true);
    getToken().then((freshToken) => {
      if (!freshToken) return;
      return api.getAdminStats(freshToken);
    })
      .then((data) => { if (data) setStats(data); })
      .catch((err) => console.log('Erro ao buscar stats do dashboard:', err))
      .finally(() => setStatsLoading(false));
  }, [token, getToken]);

  useEffect(() => {
    if (!token) return;
    api.getAdminEvents(token)
      .then((res) => {
        const upcoming = res.events
          .filter((e) => e.status === 'em_breve')
          .slice(0, 5);
        setUpcomingEvents(upcoming);
      })
      .catch((err) => console.log('Erro ao buscar próximas sessões:', err));
  }, [token]);

  /* Colors */
  const bg = isDark ? '#09090F' : '#FAFBFC';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(9,9,11,0.09)';
  const mutedText = isDark ? 'rgba(255,255,255,0.38)' : '#71717A';
  const textColor = isDark ? '#ffffff' : '#09090B';
  const green = isDark ? '#86efac' : '#166534';
  const greenBright = isDark ? '#4ade80' : '#15803D';
  const cyan = isDark ? '#7dd3fc' : '#0284c7';
  const violet = isDark ? '#c4b5fd' : '#7c3aed';
  const rose = isDark ? '#fda4af' : '#be185d';

  /* Real KPI values */
  const chartData = useMemo(() => {
    const raw = stats?.daily ?? [];
    // Filter out entries with null/undefined day and deduplicate
    const seen = new Set<string>();
    return raw.filter((d) => {
      if (!d.day || seen.has(d.day)) return false;
      seen.add(d.day);
      return true;
    });
  }, [stats]);
  const totalRevenue = stats?.totalRevenue ?? 0;
  const totalFotos = stats?.totalPhotos ?? 0;
  const totalVendas = stats?.totalOrders ?? 0;
  const avgTicket = totalVendas > 0 ? (totalRevenue / totalVendas).toFixed(0) : '0';

  /* Compute sessions bar from real orders */
  const sessionsBarData = useMemo(() => {
    if (!stats?.recentOrders?.length) return [];
    const map: Record<string, { nome: string; fotos: number; vendas: number }> = {};
    for (const order of stats.recentOrders) {
      const eventName = order.items?.[0]?.eventName ?? 'Desconhecido';
      const shortName = eventName.replace('Tour ', '').split(',')[0];
      if (!map[eventName]) map[eventName] = { nome: shortName, fotos: 0, vendas: 0 };
      map[eventName].fotos += order.items?.length ?? 0;
      map[eventName].vendas += 1;
    }
    // Ensure unique nome values to avoid duplicate recharts keys
    const values = Object.values(map).slice(0, 7);
    const seen = new Map<string, number>();
    return values.map((v) => {
      const count = seen.get(v.nome) ?? 0;
      seen.set(v.nome, count + 1);
      return count > 0 ? { ...v, nome: `${v.nome} (${count + 1})` } : v;
    });
  }, [stats]);

  /* Compute top sessions from real orders */
  const topSessionsData = useMemo(() => {
    if (!stats?.recentOrders?.length) return [];
    const map: Record<string, { name: string; fotos: number; vendas: number; receita: number }> = {};
    for (const order of stats.recentOrders) {
      const eventName = order.items?.[0]?.eventName ?? 'Desconhecido';
      if (!map[eventName]) map[eventName] = { name: eventName, fotos: 0, vendas: 0, receita: 0 };
      map[eventName].fotos += order.items?.length ?? 0;
      map[eventName].vendas += 1;
      map[eventName].receita += order.total ?? 0;
    }
    const arr = Object.values(map).sort((a, b) => b.receita - a.receita);
    const maxReceita = arr[0]?.receita ?? 1;
    return arr.map((s) => ({ ...s, pct: Math.round((s.receita / maxReceita) * 100) }));
  }, [stats]);

  /* ── Export CSV ──────────────────────────────────────────────────────── */
  const handleExport = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');

    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const row = (...cells: (string | number)[]) => cells.map(esc).join(',');

    const lines: string[] = [];

    // Cabeçalho
    lines.push(row('Smart Match — Relatório Dashboard'));
    lines.push(row(`Gerado em: ${dateStr} ${timeStr}`));
    lines.push(row(''));

    // Resumo geral
    lines.push(row('=== RESUMO GERAL ==='));
    lines.push(row('Métrica', 'Valor'));
    lines.push(row('Receita Total', `R$ ${totalRevenue.toFixed(2)}`));
    lines.push(row('Total de Pedidos', totalVendas));
    lines.push(row('Total de Fotos Vendidas', totalFotos));
    lines.push(row('Ticket Médio', `R$ ${avgTicket}`));
    lines.push(row(''));

    // Dados diários
    if (stats?.daily?.length) {
      lines.push(row('=== DADOS DIÁRIOS ==='));
      lines.push(row('Data', 'Receita (R$)', 'Fotos'));
      for (const d of stats.daily) {
        lines.push(row(d.day, d.receita.toFixed(2), d.fotos));
      }
      lines.push(row(''));
    }

    // Top sessões
    if (topSessionsData.length) {
      lines.push(row('=== TOP SESSÕES ==='));
      lines.push(row('Evento', 'Fotos', 'Vendas', 'Receita (R$)'));
      for (const s of topSessionsData) {
        lines.push(row(s.name, s.fotos, s.vendas, s.receita.toFixed(2)));
      }
      lines.push(row(''));
    }

    // Pedidos recentes
    if (stats?.recentOrders?.length) {
      lines.push(row('=== PEDIDOS RECENTES ==='));
      lines.push(row('ID', 'Cliente', 'E-mail', 'Evento', 'Fotos', 'Total (R$)', 'Pagamento', 'Status'));
      for (const o of stats.recentOrders) {
        lines.push(row(
          o.id,
          o.customerName ?? '',
          o.customerEmail ?? '',
          o.items?.[0]?.eventName ?? '',
          o.items?.length ?? 0,
          (o.total ?? 0).toFixed(2),
          o.paymentMethod ?? '',
          (o as any).status ?? '',
        ));
      }
    }

    const csv = '\uFEFF' + lines.join('\r\n'); // BOM p/ Excel PT-BR
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartmatch-dashboard-${now.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: isDark ? '#09090F' : '#FAFBFC' }}>
        <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: isDark ? '#86efac' : '#166534' }} />
      </div>
    );
  }

  const gridBorder = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(9,9,11,0.07)';

  return (
    <div className="pt-20 pb-20 min-h-screen" style={{ background: bg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* ── Page Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                fontWeight: 900,
                color: textColor,
                letterSpacing: '-0.02em',
              }}
            >
              Dashboard
            </h1>
            <p className="text-sm mt-0.5" style={{ color: mutedText }}>
              Allianz Parque · Tour Oficial · Últimos 14 dias
              {statsLoading && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs" style={{ color: mutedText }}>
                  <Loader2 className="w-3 h-3 animate-spin" /> carregando...
                </span>
              )}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleExport}
              disabled={!stats}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(22,101,52,0.06)',
                border: `1px solid ${cardBorder}`,
                color: mutedText,
                cursor: stats ? 'pointer' : 'not-allowed',
                opacity: stats ? 1 : 0.5,
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </motion.button>
            <Link to="/admin/eventos">
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                style={{
                  background: isDark ? 'rgba(134,239,172,0.12)' : 'rgba(22,101,52,0.09)',
                  border: `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.18)'}`,
                  color: green,
                  fontWeight: 700,
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Evento
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* ── Tab Switcher ── */}
        <TabNav
          className="mb-8"
          active={isOnDashboard ? 'dashboard' : 'eventos'}
          tabs={[
            { key: 'dashboard',  label: 'Dashboard',   icon: BarChart3,    to: '/admin' },
            { key: 'eventos',    label: 'Eventos',      icon: CalendarDays, to: '/admin/eventos' },
            { key: 'financeiro', label: 'Financeiro',   icon: DollarSign,   to: '/admin/financeiro' },
            { key: 'pedidos',    label: 'Pedidos',      icon: ClipboardList, to: '/admin/pedidos' },
            { key: 'pdv',        label: 'PDV',           icon: Store,        to: '/admin/pdv' },
            // remove this line: { key: 'config',     label: 'Config',        icon: Settings,     to: '/admin/config' },
          ]}
        />

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard
            icon={DollarSign}
            label="Receita Total"
            value={`R$ ${totalRevenue.toLocaleString('pt-BR')}`}
            sub="desde o início"
            color={green}
            iconBg={isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.08)'}
            delay={0.05}
            isDark={isDark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            mutedText={mutedText}
            textColor={textColor}
          />
          <KpiCard
            icon={Camera}
            label="Fotos Vendidas"
            value={String(totalFotos)}
            sub={`${stats?.totalEvents ?? 0} eventos`}
            color={cyan}
            iconBg={isDark ? 'rgba(125,211,252,0.1)' : 'rgba(2,132,199,0.08)'}
            delay={0.1}
            isDark={isDark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            mutedText={mutedText}
            textColor={textColor}
          />
          <KpiCard
            icon={TrendingUp}
            label="Total de Pedidos"
            value={String(totalVendas)}
            sub={`${stats?.pendingOrders ?? 0} pendentes`}
            color={violet}
            iconBg={isDark ? 'rgba(196,181,253,0.1)' : 'rgba(124,58,237,0.08)'}
            delay={0.15}
            isDark={isDark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            mutedText={mutedText}
            textColor={textColor}
          />
          <KpiCard
            icon={Users}
            label="Ticket Médio"
            value={`R$ ${avgTicket}`}
            sub="por compra"
            color={rose}
            iconBg={isDark ? 'rgba(253,164,175,0.1)' : 'rgba(190,24,93,0.08)'}
            delay={0.2}
            isDark={isDark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            mutedText={mutedText}
            textColor={textColor}
          />
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

          {/* Area Chart – Receita/Fotos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="lg:col-span-2 p-6 rounded-2xl"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: textColor,
                  }}
                >
                  {chartView === 'receita' ? 'Receita por Dia' : 'Fotos por Dia'}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: mutedText }}>Últimos 14 dias</p>
              </div>
              <div
                className="flex rounded-lg overflow-hidden"
                style={{ border: `1px solid ${cardBorder}` }}
              >
                {(['receita', 'fotos'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setChartView(v)}
                    className="px-3 py-1.5 text-xs transition-all"
                    style={{
                      background: chartView === v
                        ? isDark ? 'rgba(255,255,255,0.1)' : 'rgba(22,101,52,0.1)'
                        : 'transparent',
                      color: chartView === v ? textColor : mutedText,
                      fontWeight: chartView === v ? 700 : 500,
                    }}
                  >
                    {v === 'receita' ? 'Receita' : 'Fotos'}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length === 0 && !statsLoading ? (
              <div className="h-[220px] flex items-center justify-center">
                <p className="text-sm" style={{ color: mutedText }}>Nenhum dado disponível ainda</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={greenBright} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={greenBright} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={cyan} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={cyan} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'} vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: mutedText }}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                  />
                  <YAxis tick={{ fontSize: 10, fill: mutedText }} tickLine={false} axisLine={false} />
                  <Tooltip content={(props) => <CustomTooltipRevenue {...props} isDark={isDark} />} />
                  <Area
                    type="monotone"
                    dataKey={chartView}
                    stroke={chartView === 'receita' ? greenBright : cyan}
                    strokeWidth={2}
                    fill={chartView === 'receita' ? 'url(#colorGreen)' : 'url(#colorCyan)'}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Upcoming Sessions — real data */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl flex flex-col"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.95rem', fontWeight: 800, color: textColor }}>
                  Próximas Sessões
                </h3>
                <p className="text-xs mt-0.5" style={{ color: mutedText }}>Em breve</p>
              </div>
              <Link to="/admin/eventos">
                <ArrowRight className="w-4 h-4" style={{ color: mutedText }} />
              </Link>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: mutedText }}>Nenhuma sessão agendada</p>
              ) : (
                upcomingEvents.map((e, i) => {
                  const d = new Date(e.date);
                  const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                  const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                  const weekdays = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
                  const weekday = weekdays[d.getDay()];
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.07 }}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(9,9,11,0.02)',
                        border: `1px solid ${gridBorder}`,
                      }}
                    >
                      <div
                        className="flex flex-col items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
                        style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.07)' }}
                      >
                        <span style={{ fontSize: '0.65rem', color: green, fontWeight: 800, lineHeight: 1 }}>{dateStr}</span>
                        <span style={{ fontSize: '0.6rem', color: mutedText, lineHeight: 1.4 }}>{weekday}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: textColor }}>{timeStr}</p>
                        <p style={{ fontSize: '0.7rem', color: mutedText }}>Tour Allianz Parque</p>
                      </div>
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: isDark ? 'rgba(125,211,252,0.6)' : '#0284c7' }}
                      />
                    </motion.div>
                  );
                })
              )}

              <Link to="/admin/eventos" className="mt-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(9,9,11,0.03)',
                    border: `1px solid ${cardBorder}`,
                    color: mutedText,
                    fontWeight: 600,
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Sessão
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Bar Chart – Fotos por Sessão (real data) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="lg:col-span-2 p-6 rounded-2xl"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.95rem', fontWeight: 800, color: textColor }}>
                  Fotos & Vendas por Sessão
                </h3>
                <p className="text-xs mt-0.5" style={{ color: mutedText }}>Baseado nos pedidos recentes</p>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: mutedText }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: greenBright }} />
                  Fotos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: cyan }} />
                  Vendas
                </span>
              </div>
            </div>

            {sessionsBarData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-sm" style={{ color: mutedText }}>Nenhum pedido registrado ainda</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={sessionsBarData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'} vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 9, fill: mutedText }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: mutedText }} tickLine={false} axisLine={false} />
                  <Tooltip content={(props) => <CustomTooltipBar {...props} isDark={isDark} />} />
                  <Bar dataKey="fotos" fill={greenBright} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="vendas" fill={cyan} radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Recent Orders — real data */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.95rem', fontWeight: 800, color: textColor }}>
                  Pedidos Recentes
                </h3>
                <p className="text-xs mt-0.5" style={{ color: mutedText }}>
                  {stats ? `${stats.recentOrders.length} pedidos` : 'Carregando...'}
                </p>
              </div>
              <Zap className="w-4 h-4" style={{ color: isDark ? '#009ee3' : '#007ab3' }} />
            </div>

            <div className="flex flex-col gap-3">
              {(!stats || stats.recentOrders.length === 0) && !statsLoading && (
                <p className="text-xs text-center py-8" style={{ color: mutedText }}>Nenhum pedido ainda</p>
              )}
              {statsLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: mutedText }} />
                </div>
              )}
              {(stats?.recentOrders ?? []).slice(0, 5).map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.07)' }}
                  >
                    <DollarSign className="w-3.5 h-3.5" style={{ color: green }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.customerName || order.customerEmail}
                      </p>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: green, whiteSpace: 'nowrap' }}>
                        R$ {order.total}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: mutedText, marginTop: 1 }} className="truncate">
                      {order.items?.length ?? 0} {order.items?.length === 1 ? 'foto' : 'fotos'} · {order.paymentMethod?.toUpperCase()}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {order.status === 'paid' || order.status === 'delivered'
                        ? <CheckCircle2 className="w-2.5 h-2.5" style={{ color: isDark ? 'rgba(134,239,172,0.5)' : 'rgba(22,101,52,0.5)' }} />
                        : <Clock className="w-2.5 h-2.5" style={{ color: isDark ? 'rgba(0,158,227,0.7)' : '#007ab3' }} />}
                      <span style={{ fontSize: '0.65rem', color: mutedText }}>
                        {order.status === 'pending' ? 'Aguardando MP' : order.status === 'paid' ? 'Pago' : 'Entregue'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Top Sessions Table — real data ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-4 p-6 rounded-2xl"
          style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.95rem', fontWeight: 800, color: textColor }}>
                Top Sessões por Receita
              </h3>
              <p className="text-xs mt-0.5" style={{ color: mutedText }}>Desempenho individual de cada tour</p>
            </div>
            <ImageIcon className="w-4 h-4" style={{ color: mutedText }} />
          </div>

          {topSessionsData.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: mutedText }}>
              Nenhum pedido registrado ainda. Os dados aparecerão aqui após as primeiras vendas.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div
                className="grid text-xs px-3"
                style={{
                  gridTemplateColumns: '1fr 80px 80px 90px 120px',
                  color: mutedText,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                <span>Sessão</span>
                <span className="text-right">Fotos</span>
                <span className="text-right">Vendas</span>
                <span className="text-right">Receita</span>
                <span className="text-right">Performance</span>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: cardBorder }} />

              {topSessionsData.map((s, i) => (
                <motion.div
                  key={s.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                  className="grid items-center px-3 py-2.5 rounded-xl"
                  style={{
                    gridTemplateColumns: '1fr 80px 80px 90px 120px',
                    background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(9,9,11,0.02)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                      style={{
                        background: i === 0
                          ? isDark ? 'rgba(134,239,172,0.15)' : 'rgba(22,101,52,0.1)'
                          : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        color: i === 0 ? green : mutedText,
                        fontWeight: 800,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm truncate" style={{ color: textColor, fontWeight: 600 }}>{s.name}</span>
                  </div>
                  <span className="text-sm text-right" style={{ color: textColor, fontWeight: 600 }}>{s.fotos}</span>
                  <span className="text-sm text-right" style={{ color: textColor, fontWeight: 600 }}>{s.vendas}</span>
                  <span className="text-sm text-right" style={{ color: green, fontWeight: 700 }}>R$ {s.receita}</span>
                  <div className="flex items-center justify-end gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', maxWidth: 80 }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.pct}%` }}
                        transition={{ duration: 0.8, delay: 0.55 + i * 0.06 }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${greenBright}80, ${greenBright})` }}
                      />
                    </div>
                    <span className="text-xs w-8 text-right" style={{ color: mutedText }}>{s.pct}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}