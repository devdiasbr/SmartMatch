import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Image, MapPin, Calendar, ChevronRight, Search, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { useBranding } from '../contexts/BrandingContext';
import { api, type EventRecord } from '../lib/api';
import { AnimatedBackground } from '../components/AnimatedBackground';

/* ── Transform API EventRecord to local session format ── */
interface TourSession {
  id: string;
  slug: string;
  eventType: string;
  fullDate: string;
  dayOfWeek: string;
  shortDate: string;
  startTime: string;
  endTime: string;
  location: string;
  photos: number;
  rawDate: string; // ISO date for filtering
}

function transformEvent(e: EventRecord): TourSession {
  const d = new Date(e.date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return {
    id: e.id,
    slug: e.slug ?? e.id,
    eventType: e.sessionType || 'Tour',
    fullDate: `${day}/${month}/${year}, ${hours}:${mins}`,
    dayOfWeek: e.dayOfWeek || '',
    shortDate: `${day}.${month}.${String(year).slice(2)}`,
    startTime: `${hours}:${mins}`,
    endTime: e.endTime || '',
    location: e.location,
    photos: e.photoCount,
    rawDate: `${year}-${month}-${day}`,
  };
}

function SessionCard({ session, index }: { session: TourSession; index: number }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { branding } = useBranding();
  const hasPhotos = session.photos > 0;
  // If event has a specific sessionType set, use it; otherwise fall back to branding tourLabel
  const displayEventType = session.eventType !== 'Tour' ? session.eventType : (branding.tourLabel || session.eventType);

  const accentColor = hasPhotos
    ? isDark ? '#86efac' : '#006B2B'
    : isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,40,20,0.35)';
  const accentBarColor = hasPhotos
    ? isDark
      ? 'linear-gradient(90deg, #166534, #15803d)'
      : 'linear-gradient(90deg, #006B2B, #00843D)'
    : isDark
      ? 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'
      : 'linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0.03))';
  const cardBg = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.1)';
  const titleColor = isDark ? '#ffffff' : '#0D2818';
  const subtitleColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(13,40,24,0.45)';
  const metaColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(13,40,24,0.55)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
    >
      <Link to={`/eventos/${session.id}`}>
        <motion.div
          whileHover={{ y: -4, scale: 1.012 }}
          transition={{ duration: 0.22 }}
          className="group relative overflow-hidden cursor-pointer flex flex-col"
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 18,
            backdropFilter: isDark ? 'none' : 'blur(8px)',
            transition: 'border-color 0.25s, box-shadow 0.25s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,107,43,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = cardBorder;
          }}
        >
          {/* Top accent bar */}
          <div style={{ height: 3, borderRadius: '18px 18px 0 0', background: accentBarColor }} />

          {/* Card body */}
          <div className="p-5 flex flex-col gap-4 flex-1">
            <div>
              <span
                className="text-xs tracking-widest"
                style={{ color: subtitleColor, fontWeight: 600, textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif" }}
              >
                {displayEventType}
              </span>
              <h3
                className="mt-1"
                style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.05rem', fontWeight: 800, color: titleColor, lineHeight: 1.25 }}
              >
                {session.fullDate}
              </h3>
              <p className="mt-0.5 text-xs" style={{ color: subtitleColor, fontWeight: 500 }}>
                {session.dayOfWeek}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs" style={{ color: metaColor }}>
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  {session.shortDate}
                  <span className="mx-1.5" style={{ color: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}>·</span>
                  {session.startTime}{session.endTime ? ` – ${session.endTime}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: metaColor }}>
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="uppercase tracking-wider" style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                  {session.location}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-1">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                style={{
                  background: hasPhotos
                    ? isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.07)'
                    : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  border: hasPhotos
                    ? isDark ? '1px solid rgba(134,239,172,0.2)' : '1px solid rgba(0,107,43,0.15)'
                    : isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
                  color: accentColor,
                  fontWeight: 600,
                }}
              >
                <Image className="w-3 h-3" />
                {hasPhotos ? (
                  <>{session.photos} {session.photos === 1 ? 'foto' : 'fotos'} <ChevronRight className="w-3 h-3 ml-0.5" /></>
                ) : (
                  'Fotos em breve'
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export function Events() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { branding } = useBranding();

  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState<TourSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Session type filter
  const [sessionTypeFilter, setSessionTypeFilter] = useState('');

  // Date filter: default to today (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);
  const [dateFilter, setDateFilter] = useState(todayStr);

  // Pagination
  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    api.getEvents()
      .then(({ events }) => setSessions(events.map(transformEvent)))
      .catch((err) => console.error('Failed to fetch events:', err))
      .finally(() => setLoading(false));
  }, []);

  // Filter: session type + date + search text
  const filtered = sessions.filter((s) => {
    // Session type filter
    if (sessionTypeFilter && s.eventType !== sessionTypeFilter) return false;
    // Date filter
    if (dateFilter && s.rawDate !== dateFilter) return false;
    // Text search
    if (!search) return true;
    const digits = search.replace(/\D/g, '');
    const slugMatch = digits && s.slug.includes(digits);
    const nameMatch = s.fullDate.toLowerCase().includes(search.toLowerCase()) ||
      s.dayOfWeek.toLowerCase().includes(search.toLowerCase()) ||
      s.eventType.toLowerCase().includes(search.toLowerCase());
    return slugMatch || nameMatch;
  });

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [dateFilter, search, sessionTypeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(0, currentPage * PAGE_SIZE);
  const hasMore = currentPage < totalPages;

  // Check if today has any events
  const todayHasEvents = sessions.some((s) => s.rawDate === todayStr);

  // Unique dates that have events (for quick-access chips)
  const availableDates = [...new Set(sessions.map(s => s.rawDate))].sort().reverse();

  const headingColor = isDark ? '#ffffff' : '#0D2818';
  const subtitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(13,40,24,0.5)';
  const sectionBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)';
  const sectionBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,107,43,0.1)';
  const accentGreen = isDark ? '#86efac' : '#006B2B';
  const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,107,43,0.12)';

  // Dynamic unit label for the counter: filtered type or generic "eventos"
  const unitLabel = sessionTypeFilter ? sessionTypeFilter.toLowerCase() : 'eventos';

  const IMG_STADIUM_FALLBACK = 'https://images.unsplash.com/photo-1587565276758-0076cff659b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080';

  // Format a YYYY-MM-DD into readable label
  const formatDateLabel = (d: string) => {
    if (d === todayStr) return 'Hoje';
    const dt = new Date(d + 'T12:00:00');
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <AnimatedBackground
            urls={branding.backgroundUrls}
            fallback={IMG_STADIUM_FALLBACK}
            interval={branding.bgTransitionInterval * 1000}
            filter="brightness(0.25) saturate(0.7)"
          />
        </div>
        <div
          className="absolute inset-0 z-10"
          style={{
            background: isDark
              ? 'linear-gradient(to bottom, rgba(8,8,14,0.55) 0%, rgba(8,8,14,0.85) 70%, rgba(8,8,14,1) 100%)'
              : 'linear-gradient(to bottom, rgba(0,30,15,0.6) 0%, rgba(0,30,15,0.92) 70%, #F2F8F4 100%)',
          }}
        />

        <div className="max-w-5xl mx-auto relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span
              className="text-xs tracking-widest uppercase"
              style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600, fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.15em' }}
            >
              {branding.heroBadge}
            </span>
            <h1
              className="mt-4 text-white"
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.025em' }}
            >
              {branding.eventsHeroTitle}{' '}
              <span style={{ color: isDark ? '#86efac' : '#4ade80' }}>{branding.eventsHeroTitleAccent}</span>
            </h1>
            <p className="mt-5 mx-auto max-w-md" style={{ color: 'rgba(255,255,255,0.42)', lineHeight: 1.75 }}>
              {branding.eventsHeroSubtitle}
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="max-w-xl mx-auto mt-8"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)' }}
            >
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <input
                type="text"
                placeholder="Ex: 26022026 ou 18:00 (data ou horário do tour)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/30"
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X className="w-3.5 h-3.5 text-white/40" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Sessions listing ── */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl p-6 mb-8"
            style={{ background: sectionBg, border: `1px solid ${sectionBorder}`, backdropFilter: isDark ? 'none' : 'blur(8px)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: accentGreen }} />
                  <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.1rem', fontWeight: 800, color: headingColor }}>
                    {branding.eventsListTitle || 'Tours Disponíveis'}
                  </h2>
                </div>
                <p className="text-sm" style={{ color: subtitleColor }}>
                  Selecione o evento para ver as fotos
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: accentGreen, lineHeight: 1 }}>
                    {filtered.length}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: subtitleColor }}>{unitLabel}</div>
                </div>
                <div className="w-px h-8" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                <div className="text-center">
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: accentGreen, lineHeight: 1 }}>
                    {filtered.reduce((a, s) => a + s.photos, 0)}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: subtitleColor }}>fotos</div>
                </div>
              </div>
            </div>

            {/* Session type filter chips */}
            {(branding.eventSessionTypes ?? []).length > 1 && (
              <div className="mt-4 pt-4 flex flex-wrap items-center gap-2" style={{ borderTop: `1px solid ${sectionBorder}` }}>
                <span className="text-xs mr-1 flex-shrink-0" style={{ color: subtitleColor, fontWeight: 600 }}>Tipo:</span>

                {/* "Todos" chip */}
                <button
                  onClick={() => setSessionTypeFilter('')}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all flex-shrink-0"
                  style={{
                    background: !sessionTypeFilter
                      ? isDark ? 'rgba(134,239,172,0.12)' : 'rgba(0,107,43,0.1)'
                      : inputBg,
                    border: `1px solid ${!sessionTypeFilter
                      ? isDark ? 'rgba(134,239,172,0.3)' : 'rgba(0,107,43,0.25)'
                      : inputBorder}`,
                    color: !sessionTypeFilter ? accentGreen : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
                    fontWeight: !sessionTypeFilter ? 700 : 500,
                  }}
                >
                  Todos
                </button>

                {branding.eventSessionTypes.map((st) => {
                  const count = sessions.filter(s => s.eventType === st).length;
                  if (count === 0) return null;
                  const active = sessionTypeFilter === st;
                  return (
                    <button
                      key={st}
                      onClick={() => setSessionTypeFilter(active ? '' : st)}
                      className="px-3 py-1.5 rounded-lg text-xs transition-all flex-shrink-0 flex items-center gap-1.5"
                      style={{
                        background: active
                          ? isDark ? 'rgba(134,239,172,0.12)' : 'rgba(0,107,43,0.1)'
                          : inputBg,
                        border: `1px solid ${active
                          ? isDark ? 'rgba(134,239,172,0.3)' : 'rgba(0,107,43,0.25)'
                          : inputBorder}`,
                        color: active ? accentGreen : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
                        fontWeight: active ? 700 : 500,
                      }}
                    >
                      {st}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                        background: active ? (isDark ? 'rgba(134,239,172,0.15)' : 'rgba(0,107,43,0.1)') : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                        color: active ? accentGreen : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'),
                      }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Date filter bar */}
            <div className="mt-4 pt-4 flex flex-wrap items-center gap-2" style={{ borderTop: `1px solid ${sectionBorder}` }}>
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: subtitleColor }} />
              <span className="text-xs mr-1" style={{ color: subtitleColor, fontWeight: 600 }}>Data:</span>

              {/* "All" chip */}
              <button
                onClick={() => setDateFilter('')}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: !dateFilter
                    ? isDark ? 'rgba(134,239,172,0.12)' : 'rgba(0,107,43,0.1)'
                    : inputBg,
                  border: `1px solid ${!dateFilter
                    ? isDark ? 'rgba(134,239,172,0.3)' : 'rgba(0,107,43,0.25)'
                    : inputBorder}`,
                  color: !dateFilter ? accentGreen : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
                  fontWeight: !dateFilter ? 700 : 500,
                }}
              >
                Todos
              </button>

              {/* "Today" chip */}
              <button
                onClick={() => setDateFilter(todayStr)}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: dateFilter === todayStr
                    ? isDark ? 'rgba(134,239,172,0.12)' : 'rgba(0,107,43,0.1)'
                    : inputBg,
                  border: `1px solid ${dateFilter === todayStr
                    ? isDark ? 'rgba(134,239,172,0.3)' : 'rgba(0,107,43,0.25)'
                    : inputBorder}`,
                  color: dateFilter === todayStr ? accentGreen : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
                  fontWeight: dateFilter === todayStr ? 700 : 500,
                }}
              >
                Hoje {todayHasEvents && <span className="ml-1 w-1.5 h-1.5 rounded-full inline-block" style={{ background: accentGreen }} />}
              </button>

              {/* Recent dates with events (max 5, excluding today) */}
              {availableDates.filter(d => d !== todayStr).slice(0, 5).map((d) => (
                <button
                  key={d}
                  onClick={() => setDateFilter(d)}
                  className="px-3 py-1.5 rounded-lg text-xs transition-all"
                  style={{
                    background: dateFilter === d
                      ? isDark ? 'rgba(134,239,172,0.12)' : 'rgba(0,107,43,0.1)'
                      : inputBg,
                    border: `1px solid ${dateFilter === d
                      ? isDark ? 'rgba(134,239,172,0.3)' : 'rgba(0,107,43,0.25)'
                      : inputBorder}`,
                    color: dateFilter === d ? accentGreen : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
                    fontWeight: dateFilter === d ? 700 : 500,
                  }}
                >
                  {formatDateLabel(d)}
                </button>
              ))}

              {/* Custom date picker */}
              <div className="relative ml-auto">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-xs outline-none"
                  style={{
                    background: inputBg,
                    border: `1px solid ${inputBorder}`,
                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    colorScheme: isDark ? 'dark' : 'light',
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* Cards grid */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-24">
                <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin" style={{ color: subtitleColor }} />
                <p style={{ color: subtitleColor }}>Carregando eventos...</p>
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-24">
                <Calendar className="w-10 h-10 mx-auto mb-4" style={{ color: subtitleColor }} />
                <p style={{ color: subtitleColor }}>
                  Nenhum evento encontrado
                  {sessionTypeFilter && <> do tipo <strong style={{ color: headingColor }}>"{sessionTypeFilter}"</strong></>}
                  {dateFilter === todayStr && ' para hoje'}
                  {dateFilter && dateFilter !== todayStr && <> para <strong style={{ color: headingColor }}>{dateFilter.split('-').reverse().join('/')}</strong></>}
                  {search && <> com busca <strong style={{ color: headingColor }}>"{search}"</strong></>}
                </p>
                <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                  {sessionTypeFilter && (
                    <button
                      onClick={() => setSessionTypeFilter('')}
                      className="text-sm px-4 py-2 rounded-xl"
                      style={{
                        background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.06)',
                        border: `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(0,107,43,0.15)'}`,
                        color: accentGreen,
                        fontWeight: 600,
                      }}
                    >
                      Todos os tipos
                    </button>
                  )}
                  {dateFilter && (
                    <button
                      onClick={() => setDateFilter('')}
                      className="text-sm px-4 py-2 rounded-xl"
                      style={{
                        background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(0,107,43,0.06)',
                        border: `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(0,107,43,0.15)'}`,
                        color: accentGreen,
                        fontWeight: 600,
                      }}
                    >
                      Ver todos os eventos
                    </button>
                  )}
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="text-sm underline"
                      style={{ color: subtitleColor }}
                    >
                      Limpar busca
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`grid-${dateFilter}-${search}-${sessionTypeFilter}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginated.map((session, i) => (
                    <SessionCard key={session.id} session={session} index={i} />
                  ))}
                </div>
                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm"
                      style={{
                        background: sectionBg,
                        border: `1px solid ${sectionBorder}`,
                        color: headingColor,
                        fontWeight: 700,
                        fontFamily: "'Montserrat', sans-serif",
                      }}
                    >
                      Carregar mais ({filtered.length - paginated.length} restantes)
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs mt-12"
            style={{ color: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.22)' }}
          >
            Fotos processadas em até 48h após o evento · Reconhecimento facial com 98.7% de precisão
          </motion.p>
        </div>
      </section>
    </div>
  );
}