import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Image, MapPin, Calendar, Search, X, Loader2, SlidersHorizontal, Images } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { useBranding } from '../contexts/BrandingContext';
import { useAuth } from '../contexts/AuthContext';
import { api, type EventRecord } from '../lib/api';
import { AnimatedBackground } from '../components/AnimatedBackground';

/* ── Transform API EventRecord to local session format ── */
interface TourSession {
  id: string;
  slug: string;
  eventType: string;
  name: string;
  fullDate: string;
  dayOfWeek: string;
  shortDate: string;
  startTime: string;
  endTime: string;
  location: string;
  photos: number;
  rawDate: string;
  coverUrl?: string;
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
    name: e.name,
    fullDate: `${day}/${month}/${year}, ${hours}:${mins}`,
    dayOfWeek: e.dayOfWeek || '',
    shortDate: `${day}/${month}`,
    startTime: `${hours}:${mins}h`,
    endTime: e.endTime || '',
    location: e.location,
    photos: e.photoCount,
    rawDate: `${year}-${month}-${day}`,
    coverUrl: e.coverUrl,
  };
}

const IMG_STADIUM_FALLBACK = 'https://images.unsplash.com/photo-1587565276758-0076cff659b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800';

/* ── SessionCard ── */
function SessionCard({
  session, index, orgId, coverUrl,
}: { session: TourSession; index: number; orgId?: string; coverUrl: string }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { branding } = useBranding();
  const hasPhotos = session.photos > 0;

  const displayName = session.name || (session.eventType !== 'Tour' ? session.eventType : (branding.tourLabel || session.eventType));

  const cardBg    = isDark ? '#111118' : '#FFFFFF';
  const cardBorder= isDark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.09)';
  const titleColor= isDark ? '#ffffff' : '#09090B';
  const metaColor = isDark ? 'rgba(255,255,255,0.45)' : '#71717A';
  const green     = isDark ? '#86efac' : '#166534';
  const greenBg   = isDark ? 'rgba(134,239,172,0.14)' : 'rgba(22,101,52,0.09)';
  const greenBorder= isDark ? 'rgba(134,239,172,0.28)' : 'rgba(22,101,52,0.22)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
    >
      <Link to={`/eventos/${session.id}${orgId ? `?org=${orgId}` : ''}`}>
        <motion.div
          whileHover={{ y: -5, scale: 1.013 }}
          transition={{ duration: 0.22 }}
          className="group relative overflow-hidden flex flex-col cursor-pointer"
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 18,
            boxShadow: isDark
              ? '0 2px 12px rgba(0,0,0,0.35)'
              : '0 2px 12px rgba(0,0,0,0.06)',
            transition: 'border-color 0.25s, box-shadow 0.25s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = isDark ? 'rgba(134,239,172,0.22)' : 'rgba(22,101,52,0.22)';
            e.currentTarget.style.boxShadow = isDark
              ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(134,239,172,0.06)'
              : '0 8px 28px rgba(0,0,0,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = cardBorder;
            e.currentTarget.style.boxShadow = isDark
              ? '0 2px 12px rgba(0,0,0,0.35)'
              : '0 2px 12px rgba(0,0,0,0.06)';
          }}
        >
          {/* ── Cover image ── */}
          <div className="relative overflow-hidden" style={{ aspectRatio: '16/10', borderRadius: '18px 18px 0 0' }}>
            <img
              src={session.coverUrl || coverUrl}
              alt={displayName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              onError={(e) => { (e.target as HTMLImageElement).src = IMG_STADIUM_FALLBACK; }}
            />
            {/* Overlay gradient */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.42) 100%)' }}
            />

            {/* Date badge */}
            <div
              className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <Calendar className="w-3 h-3" style={{ color: green }} />
              <span className="text-[11px] font-bold text-white">{session.shortDate}</span>
            </div>

            {/* "Sem fotos" badge */}
            {!hasPhotos && (
              <div
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                Em breve
              </div>
            )}
          </div>

          {/* ── Card body ── */}
          <div className="p-4 flex flex-col gap-3 flex-1">
            {/* Event name */}
            <h3
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '1rem',
                fontWeight: 800,
                color: titleColor,
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
              }}
            >
              {displayName}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-xs" style={{ color: metaColor }}>
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{session.location}</span>
            </div>

            {/* Time + Photo button row */}
            <div className="flex items-center justify-between mt-auto pt-1">
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: metaColor, fontWeight: 600, fontFamily: "'Montserrat', sans-serif" }}>
                  Início
                </p>
                <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: titleColor, fontSize: '0.95rem' }}>
                  {session.startTime}
                </p>
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
                style={{
                  background: hasPhotos
                    ? 'linear-gradient(135deg, #166534, #15803d)'
                    : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(9,9,11,0.04)',
                  border: hasPhotos
                    ? 'none'
                    : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.08)'}`,
                  color: hasPhotos ? '#ffffff' : metaColor,
                  fontWeight: 700,
                  fontFamily: "'Montserrat', sans-serif",
                  letterSpacing: '0.02em',
                  boxShadow: hasPhotos ? '0 4px 12px rgba(22,101,52,0.35)' : 'none',
                }}
              >
                <Images className="w-3.5 h-3.5" />
                {hasPhotos
                  ? `${session.photos} ${session.photos === 1 ? 'foto' : 'fotos'}`.toUpperCase()
                  : 'Em breve'}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ── FilterChip ── */
function FilterChip({
  label, active, onClick, isDark,
}: { label: string; active: boolean; onClick: () => void; isDark: boolean }) {
  const green = isDark ? '#86efac' : '#166534';
  return (
    <button
      onClick={onClick}
      className="relative px-4 py-2 text-sm transition-all duration-200 flex-shrink-0"
      style={{
        color: active ? green : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(9,9,11,0.5)',
        fontWeight: active ? 700 : 500,
        fontFamily: "'Montserrat', sans-serif",
        background: 'none',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {label}
      {active && (
        <motion.div
          layoutId="filter-underline"
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
          style={{ background: green }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  );
}

/* ── Main Component ── */
export function Events() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { branding } = useBranding();
  const { user } = useAuth();

  const orgId = user?.id ?? new URLSearchParams(window.location.search).get('org') ?? undefined;

  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState<TourSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionTypeFilter, setSessionTypeFilter] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);
  const [dateFilter, setDateFilter] = useState('');

  const PAGE_SIZE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    api.getEvents(orgId)
      .then(({ events }) => setSessions(events.map(transformEvent)))
      .catch((err) => console.error('Failed to fetch events:', err))
      .finally(() => setLoading(false));
  }, [orgId]);

  const filtered = sessions.filter((s) => {
    if (sessionTypeFilter && s.eventType !== sessionTypeFilter) return false;
    if (dateFilter && s.rawDate !== dateFilter) return false;
    if (!search) return true;
    const digits = search.replace(/\D/g, '');
    const slugMatch = digits && s.slug.includes(digits);
    const nameMatch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.fullDate.toLowerCase().includes(search.toLowerCase()) ||
      s.dayOfWeek.toLowerCase().includes(search.toLowerCase()) ||
      s.eventType.toLowerCase().includes(search.toLowerCase());
    return slugMatch || nameMatch;
  });

  useEffect(() => { setCurrentPage(1); }, [dateFilter, search, sessionTypeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(0, currentPage * PAGE_SIZE);
  const hasMore = currentPage < totalPages;

  const todayHasEvents = sessions.some((s) => s.rawDate === todayStr);

  /* Color tokens */
  const headingColor  = isDark ? '#ffffff' : '#09090B';
  const subtitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(9,9,11,0.45)';
  const accentGreen   = isDark ? '#86efac' : '#166534';
  const borderColor   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.09)';
  const inputBg       = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const inputBorder   = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(9,9,11,0.09)';

  const coverUrl = (branding.backgroundUrls && branding.backgroundUrls.length > 0)
    ? branding.backgroundUrls[0]
    : IMG_STADIUM_FALLBACK;

  const totalPhotos = sessions.reduce((a, s) => a + s.photos, 0);

  /* Chips fixos: apenas "Todos" e "Hoje" (se houver eventos hoje) */
  const dateChips: { key: string; label: string }[] = [
    { key: '', label: 'Todos' },
    ...(todayHasEvents ? [{ key: todayStr, label: 'Hoje' }] : []),
  ];

  return (
    <div className="min-h-screen" style={{ background: isDark ? '#09090F' : '#F8F8FB' }}>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ minHeight: 400
        , maxHeight: 600 }}>
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <AnimatedBackground
            urls={branding.backgroundUrls}
            fallback={IMG_STADIUM_FALLBACK}
            interval={branding.bgTransitionInterval * 1000}
            filter="brightness(0.28) saturate(0.6)"
          />
        </div>
        <div
          className="absolute inset-0 z-10"
          style={{
            background: 'linear-gradient(to bottom, rgba(8,8,14,0.5) 0%, rgba(8,8,14,0.8) 60%, rgba(8,8,14,0.98) 100%)',
          }}
        />

        <div className="max-w-5xl mx-auto px-6 relative z-20 pt-32 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Eyebrow */}
            <span
              className="text-xs uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.18em' }}
            >
              {branding.heroBadge}
            </span>

            {/* H1 */}
            <h1
              className="mt-4 text-white"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 'clamp(2.8rem, 7vw, 5rem)',
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
              }}
            >
              {branding.eventsHeroTitle}{' '}
              <br />
              <span style={{ color: isDark ? '#00FF7F' : '#4ade80' }}>
                {branding.eventsHeroTitleAccent}
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="mt-5 mx-auto max-w-md"
              style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, fontSize: '0.95rem' }}
            >
              {branding.eventsHeroSubtitle}
            </p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
              className="mt-8"
            >
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => document.getElementById('events-grid')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm"
                style={{
                  background: 'linear-gradient(135deg, #166534, #15803d)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontFamily: "'Montserrat', sans-serif",
                  letterSpacing: '0.04em',
                  boxShadow: '0 4px 24px rgba(22,101,52,0.45)',
                }}
              >
                <Images className="w-4 h-4" />
                VER GALERIA COMPLETA
              </motion.button>
            </motion.div>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.28 }}
              className="max-w-xl mx-auto mt-7"
            >
              <div
                className="flex items-center gap-3 px-5 py-3.5 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.13)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  placeholder="Pesquisar por evento, artista ou data..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/30"
                />
                {search ? (
                  <button onClick={() => setSearch('')}>
                    <X className="w-3.5 h-3.5 text-white/40" />
                  </button>
                ) : (
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(134,239,172,0.15)', border: '1px solid rgba(134,239,172,0.25)' }}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: '#86efac' }} />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Content ── */}
      <section id="events-grid" className="py-10 px-6">
        <div className="max-w-5xl mx-auto space-y-7">

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl px-8 py-5 flex items-center gap-8"
            style={{
              background: isDark ? '#111118' : '#FFFFFF',
              border: `1px solid ${borderColor}`,
              boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.08)' }}
              >
                <Calendar className="w-5 h-5" style={{ color: accentGreen }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: subtitleColor, fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>
                  Eventos
                </p>
                <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '1.6rem', color: headingColor, lineHeight: 1 }}>
                  {loading ? '—' : sessions.length}
                </p>
              </div>
            </div>

            <div className="w-px h-10" style={{ background: borderColor }} />

            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.08)' }}
              >
                <Image className="w-5 h-5" style={{ color: accentGreen }} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: subtitleColor, fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>
                  Fotos
                </p>
                <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: '1.6rem', color: headingColor, lineHeight: 1 }}>
                  {loading ? '—' : totalPhotos}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Filter tabs row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="flex items-center gap-1 flex-wrap"
          >
            {/* Date chips */}
            <div className="flex items-center flex-wrap relative">
              {dateChips.map((chip) => (
                <FilterChip
                  key={chip.key}
                  label={chip.label}
                  active={dateFilter === chip.key}
                  onClick={() => setDateFilter(chip.key)}
                  isDark={isDark}
                />
              ))}
            </div>

            {/* Date picker on right */}
            <div className="ml-auto">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs outline-none"
                style={{
                  background: inputBg,
                  border: `1px solid ${inputBorder}`,
                  color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(9,9,11,0.55)',
                  colorScheme: isDark ? 'dark' : 'light',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 500,
                }}
              />
            </div>
          </motion.div>

          {/* Separator */}
          <div style={{ height: 1, background: borderColor }} />

          {/* Cards grid */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-24"
              >
                <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin" style={{ color: subtitleColor }} />
                <p style={{ color: subtitleColor, fontFamily: "'Montserrat', sans-serif" }}>Carregando eventos...</p>
              </motion.div>

            ) : filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-24"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(22,101,52,0.06)', border: `1px solid ${borderColor}` }}
                >
                  <Calendar className="w-8 h-8" style={{ color: subtitleColor }} />
                </div>
                <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, color: headingColor, fontSize: '1rem', marginBottom: 6 }}>
                  Nenhum evento encontrado
                </p>
                <p className="text-sm mb-6" style={{ color: subtitleColor }}>
                  {dateFilter === todayStr && 'Não há eventos hoje.'}
                  {dateFilter && dateFilter !== todayStr && `Sem eventos em ${dateFilter.split('-').reverse().join('/')}.`}
                  {search && `Nenhum resultado para "${search}".`}
                  {!dateFilter && !search && 'Nenhum evento disponível.'}
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {dateFilter && (
                    <button
                      onClick={() => setDateFilter('')}
                      className="text-sm px-5 py-2.5 rounded-xl"
                      style={{
                        background: isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.06)',
                        border: `1px solid ${isDark ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.15)'}`,
                        color: accentGreen,
                        fontWeight: 700,
                        fontFamily: "'Montserrat', sans-serif",
                      }}
                    >
                      Ver todos
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paginated.map((session, i) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      index={i}
                      orgId={orgId}
                      coverUrl={coverUrl}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-10">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm"
                      style={{
                        background: isDark ? '#111118' : '#FFFFFF',
                        border: `1px solid ${borderColor}`,
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

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs pt-4"
            style={{ color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)' }}
          >
            Fotos processadas em até 48h após o evento · Reconhecimento facial com 98.7% de precisão
          </motion.p>
        </div>
      </section>
    </div>
  );
}
