import { useState } from 'react';
import { useLocation, Link } from 'react-router';
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
  Upload,
  Plus,
  Download,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ImageIcon,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { TabNav } from '../components/TabNav';

/* ─── Mock Data ─── */
const REVENUE_DATA = [
  { day: '13/02', receita: 0, fotos: 0 },
  { day: '14/02', receita: 180, fotos: 6 },
  { day: '15/02', receita: 0, fotos: 0 },
  { day: '16/02', receita: 420, fotos: 14 },
  { day: '17/02', receita: 90, fotos: 3 },
  { day: '18/02', receita: 0, fotos: 0 },
  { day: '19/02', receita: 630, fotos: 21 },
  { day: '20/02', receita: 270, fotos: 9 },
  { day: '21/02', receita: 0, fotos: 0 },
  { day: '22/02', receita: 750, fotos: 25 },
  { day: '23/02', receita: 180, fotos: 6 },
  { day: '24/02', receita: 360, fotos: 12 },
  { day: '25/02', receita: 210, fotos: 7 },
  { day: '26/02', receita: 120, fotos: 4 },
];

const SESSIONS_BAR = [
  { nome: '22/02 15h', fotos: 25, vendas: 8 },
  { nome: '23/02 13h', fotos: 0, vendas: 0 },
  { nome: '23/02 15h', fotos: 6, vendas: 2 },
  { nome: '24/02 10h', fotos: 0, vendas: 0 },
  { nome: '24/02 14h', fotos: 12, vendas: 4 },
  { nome: '25/02 11h', fotos: 7, vendas: 3 },
  { nome: '26/02 09h', fotos: 4, vendas: 1 },
];

const RECENT_ACTIVITY = [
  { id: 1, type: 'purchase', user: 'Carlos M.', event: 'Tour 22/02 – 15h30', amount: 90, time: '2 min atrás', status: 'success' },
  { id: 2, type: 'upload', user: 'Sistema', event: 'Tour 24/02 – 14h00', amount: null, count: 12, time: '18 min atrás', status: 'success' },
  { id: 3, type: 'purchase', user: 'Beatriz S.', event: 'Tour 22/02 – 15h30', amount: 30, time: '34 min atrás', status: 'success' },
  { id: 4, type: 'purchase', user: 'Rafael O.', event: 'Tour 24/02 – 14h00', amount: 60, time: '1h atrás', status: 'success' },
  { id: 5, type: 'upload', user: 'Sistema', event: 'Tour 25/02 – 11h00', amount: null, count: 7, time: '3h atrás', status: 'success' },
  { id: 6, type: 'purchase', user: 'Mariana L.', event: 'Tour 23/02 – 15h00', amount: 30, time: '5h atrás', status: 'pending' },
];

const UPCOMING_SESSIONS = [
  { id: 'u1', date: '01/03', time: '11:00', weekday: 'dom', slots: 20, registered: 0, status: 'scheduled' },
  { id: 'u2', date: '01/03', time: '16:00', weekday: 'dom', slots: 20, registered: 0, status: 'scheduled' },
  { id: 'u3', date: '07/03', time: '13:00', weekday: 'sáb', slots: 20, registered: 0, status: 'scheduled' },
];

const TOP_SESSIONS = [
  { name: 'Tour 22/02 – 15h30', fotos: 25, vendas: 8, receita: 750, pct: 100 },
  { name: 'Tour 24/02 – 14h00', fotos: 12, vendas: 4, receita: 360, pct: 48 },
  { name: 'Tour 25/02 – 11h00', fotos: 7, vendas: 3, receita: 210, pct: 28 },
  { name: 'Tour 23/02 – 15h00', fotos: 6, vendas: 2, receita: 180, pct: 24 },
  { name: 'Tour 26/02 – 09h00', fotos: 4, vendas: 1, receita: 120, pct: 16 },
];

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
      style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
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
                ? isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.07)'
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

/* ─── Custom Tooltip ─── */
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
  const isOnDashboard = location.pathname === '/admin' || location.pathname === '/admin/';

  const [chartView, setChartView] = useState<'receita' | 'fotos'>('receita');

  /* Colors */
  const bg = isDark ? '#08080E' : '#F2F8F4';
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.1)';
  const mutedText = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,40,20,0.42)';
  const textColor = isDark ? '#ffffff' : '#0D2818';
  const green = isDark ? '#86efac' : '#006B2B';
  const greenBright = isDark ? '#4ade80' : '#00843D';
  const cyan = isDark ? '#7dd3fc' : '#0284c7';
  const violet = isDark ? '#c4b5fd' : '#7c3aed';
  const rose = isDark ? '#fda4af' : '#be185d';

  /* KPI computed */
  const totalRevenue = REVENUE_DATA.reduce((s, d) => s + d.receita, 0);
  const totalFotos = SESSIONS_BAR.reduce((s, d) => s + d.fotos, 0);
  const totalVendas = SESSIONS_BAR.reduce((s, d) => s + d.vendas, 0);
  const sessionsWithPhotos = SESSIONS_BAR.filter((s) => s.fotos > 0).length;
  const convRate = totalFotos > 0 ? ((totalVendas / totalFotos) * 100).toFixed(1) : '0';
  const avgTicket = totalVendas > 0 ? (totalRevenue / totalVendas).toFixed(0) : '0';

  const gridBorder = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,107,43,0.06)';

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
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,107,43,0.07)',
                border: `1px solid ${cardBorder}`,
                color: mutedText,
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Exportar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
              style={{
                background: isDark ? 'rgba(134,239,172,0.12)' : 'rgba(0,107,43,0.1)',
                border: `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(0,107,43,0.18)'}`,
                color: green,
                fontWeight: 700,
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Evento
            </motion.button>
          </div>
        </motion.div>

        {/* ── Tab Switcher ── */}
        <TabNav
          className="mb-8"
          active={isOnDashboard ? 'dashboard' : 'eventos'}
          tabs={[
            { key: 'dashboard', label: 'Dashboard',           icon: BarChart3,    to: '/admin' },
            { key: 'eventos',   label: 'Controle de Eventos', icon: CalendarDays, to: '/admin/eventos' },
          ]}
        />

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard
            icon={DollarSign}
            label="Receita Total"
            value={`R$ ${totalRevenue.toLocaleString('pt-BR')}`}
            sub="últimos 14 dias"
            trend="+18%"
            trendUp={true}
            color={green}
            iconBg={isDark ? 'rgba(134,239,172,0.1)' : 'rgba(0,107,43,0.08)'}
            delay={0.05}
            isDark={isDark}
            cardBg={cardBg}
            cardBorder={cardBorder}
            mutedText={mutedText}
            textColor={textColor}
          />
          <KpiCard
            icon={Camera}
            label="Fotos Registradas"
            value={String(totalFotos)}
            sub={`${sessionsWithPhotos} sessões com fotos`}
            trend="+32%"
            trendUp={true}
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
            label="Taxa de Conversão"
            value={`${convRate}%`}
            sub={`${totalVendas} vendas realizadas`}
            trend="+4.2%"
            trendUp={true}
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
            trend="-3%"
            trendUp={false}
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
                        ? isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,107,43,0.12)'
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

            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={REVENUE_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
          </motion.div>

          {/* Upcoming Sessions */}
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
                <p className="text-xs mt-0.5" style={{ color: mutedText }}>Agendadas</p>
              </div>
              <Link to="/admin/eventos">
                <ArrowRight className="w-4 h-4" style={{ color: mutedText }} />
              </Link>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              {UPCOMING_SESSIONS.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.07 }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,107,43,0.04)',
                    border: `1px solid ${gridBorder}`,
                  }}
                >
                  <div
                    className="flex flex-col items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
                    style={{ background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.08)' }}
                  >
                    <span style={{ fontSize: '0.65rem', color: green, fontWeight: 800, lineHeight: 1 }}>{s.date}</span>
                    <span style={{ fontSize: '0.6rem', color: mutedText, lineHeight: 1.4 }}>{s.weekday}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: textColor }}>{s.time}</p>
                    <p style={{ fontSize: '0.7rem', color: mutedText }}>Tour Allianz Parque</p>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: isDark ? 'rgba(125,211,252,0.6)' : '#0284c7' }}
                  />
                </motion.div>
              ))}

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,107,43,0.06)',
                  border: `1px solid ${cardBorder}`,
                  color: mutedText,
                  fontWeight: 600,
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Sessão
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* ── Bottom Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Bar Chart – Fotos por Sessão */}
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
                <p className="text-xs mt-0.5" style={{ color: mutedText }}>Todas as sessões recentes</p>
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

            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={SESSIONS_BAR} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'} vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 9, fill: mutedText }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: mutedText }} tickLine={false} axisLine={false} />
                <Tooltip content={(props) => <CustomTooltipBar {...props} isDark={isDark} />} />
                <Bar dataKey="fotos" fill={greenBright} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="vendas" fill={cyan} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Recent Activity */}
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
                  Atividade Recente
                </h3>
                <p className="text-xs mt-0.5" style={{ color: mutedText }}>Compras e uploads</p>
              </div>
              <Zap className="w-4 h-4" style={{ color: isDark ? '#fbbf24' : '#d97706' }} />
            </div>

            <div className="flex flex-col gap-3">
              {RECENT_ACTIVITY.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: item.type === 'purchase'
                        ? isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.07)'
                        : isDark ? 'rgba(125,211,252,0.08)' : 'rgba(2,132,199,0.07)',
                    }}
                  >
                    {item.type === 'purchase'
                      ? <DollarSign className="w-3.5 h-3.5" style={{ color: green }} />
                      : <Upload className="w-3.5 h-3.5" style={{ color: cyan }} />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.type === 'purchase' ? item.user : 'Upload automático'}
                      </p>
                      {item.type === 'purchase' && item.amount != null && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: green, whiteSpace: 'nowrap' }}>
                          R$ {item.amount}
                        </span>
                      )}
                      {item.type === 'upload' && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: cyan, whiteSpace: 'nowrap' }}>
                          +{item.count} fotos
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.7rem', color: mutedText, marginTop: 1 }} className="truncate">
                      {item.event}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {item.status === 'success'
                        ? <CheckCircle2 className="w-2.5 h-2.5" style={{ color: isDark ? 'rgba(134,239,172,0.5)' : 'rgba(0,107,43,0.5)' }} />
                        : item.status === 'pending'
                        ? <Clock className="w-2.5 h-2.5" style={{ color: isDark ? 'rgba(252,211,77,0.6)' : '#d97706' }} />
                        : <AlertCircle className="w-2.5 h-2.5" style={{ color: 'rgba(252,165,165,0.6)' }} />}
                      <span style={{ fontSize: '0.65rem', color: mutedText }}>{item.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── Top Sessions Table ── */}
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

            {TOP_SESSIONS.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.06 }}
                className="grid items-center px-3 py-2.5 rounded-xl"
                style={{
                  gridTemplateColumns: '1fr 80px 80px 90px 120px',
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,107,43,0.03)',
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center text-xs flex-shrink-0"
                    style={{
                      background: i === 0
                        ? isDark ? 'rgba(134,239,172,0.15)' : 'rgba(0,107,43,0.12)'
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
        </motion.div>

      </div>
    </div>
  );
}