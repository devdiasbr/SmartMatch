import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Image, MapPin, Calendar, ChevronRight, Search, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { api, type EventRecord } from '../lib/api';

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
    eventType: 'Tour',
    fullDate: `${day}/${month}/${year}, ${hours}:${mins}`,
    dayOfWeek: e.dayOfWeek || '',
    shortDate: `${day}.${month}.${String(year).slice(2)}`,
    startTime: `${hours}:${mins}`,
    endTime: e.endTime || '',
    location: e.location,
    photos: e.photoCount,
  };
}

function SessionCard({ session, index }: { session: TourSession; index: number }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const hasPhotos = session.photos > 0;

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
                {session.eventType}
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

  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState<TourSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getEvents()
      .then(({ events }) => setSessions(events.map(transformEvent)))
      .catch((err) => console.error('Failed to fetch events:', err))
      .finally(() => setLoading(false));
  }, []);

  // Search: strip non-digits for slug matching + text matching
  const filtered = sessions.filter((s) => {
    if (!search) return true;
    const digits = search.replace(/\D/g, '');
    const slugMatch = digits && s.slug.includes(digits);
    const nameMatch = s.fullDate.toLowerCase().includes(search.toLowerCase()) ||
      s.dayOfWeek.toLowerCase().includes(search.toLowerCase());
    return slugMatch || nameMatch;
  });

  const totalPhotos = sessions.reduce((a, s) => a + s.photos, 0);

  const headingColor = isDark ? '#ffffff' : '#0D2818';
  const subtitleColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(13,40,24,0.5)';
  const sectionBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)';
  const sectionBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,107,43,0.1)';
  const accentGreen = isDark ? '#86efac' : '#006B2B';

  const IMG_STADIUM = 'https://images.unsplash.com/photo-1587565276758-0076cff659b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080';

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative pt-28 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={IMG_STADIUM}
            alt="Allianz Parque"
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.25) saturate(0.7)' }}
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
              Allianz Parque · Tour Oficial Palmeiras
            </span>
            <h1
              className="mt-4 text-white"
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 'clamp(2.2rem, 5.5vw, 4rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.025em' }}
            >
              Reviva seus{' '}
              <span style={{ color: isDark ? '#86efac' : '#4ade80' }}>Momentos no Allianz</span>
            </h1>
            <p className="mt-5 mx-auto max-w-md" style={{ color: 'rgba(255,255,255,0.42)', lineHeight: 1.75 }}>
              Busca com reconhecimento facial. Encontre suas fotos pelo data e horário do tour.
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
                    Tours Disponíveis
                  </h2>
                </div>
                <p className="text-sm" style={{ color: subtitleColor }}>
                  Selecione o tour para ver as fotos · slug = DDMMYYYYHHMM
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: accentGreen, lineHeight: 1 }}>
                    {sessions.length}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: subtitleColor }}>tours</div>
                </div>
                <div className="w-px h-8" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                <div className="text-center">
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: accentGreen, lineHeight: 1 }}>
                    {totalPhotos}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: subtitleColor }}>fotos</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Cards grid */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-24">
                <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin" style={{ color: subtitleColor }} />
                <p style={{ color: subtitleColor }}>Carregando tours...</p>
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-24">
                <Search className="w-10 h-10 mx-auto mb-4" style={{ color: subtitleColor }} />
                <p style={{ color: subtitleColor }}>
                  Nenhum tour encontrado
                  {search && <> para <strong style={{ color: headingColor }}>"{search}"</strong></>}
                </p>
                <button
                  onClick={() => setSearch('')}
                  className="mt-4 text-sm underline"
                  style={{ color: subtitleColor }}
                >
                  Limpar busca
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filtered.map((session, i) => (
                  <SessionCard key={session.id} session={session} index={i} />
                ))}
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