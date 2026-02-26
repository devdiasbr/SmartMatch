import { useState, useRef } from 'react';
import { Link } from 'react-router';
import {
  CalendarDays,
  Plus,
  Copy,
  Share2,
  Eye,
  Pencil,
  Trash2,
  Camera,
  Upload,
  Clock,
  Filter,
  ArrowUpDown,
  Search,
  BarChart3,
  Image as ImageIcon,
  X,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { TabNav } from '../components/TabNav';

/* ─── Mock Photos ─── */
const MOCK_PHOTO_URLS = [
  'https://images.unsplash.com/photo-1668179398280-653a85c15ad0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1543191219-92c8ed3d8cfd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1770364292921-5e30436dcf26?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1762708590808-c453c0e4fb0f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1770964211672-8d85fd3b033c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1764148775389-b8320dbdb6f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1658265071597-61f7371de3d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1671197729465-57f9658510fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1543191219-92c8ed3d8cfd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1770364292921-5e30436dcf26?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1762708590808-c453c0e4fb0f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1668179398280-653a85c15ad0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1770964211672-8d85fd3b033c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1764148775389-b8320dbdb6f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1658265071597-61f7371de3d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1671197729465-57f9658510fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1543191219-92c8ed3d8cfd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1770364292921-5e30436dcf26?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1762708590808-c453c0e4fb0f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1668179398280-653a85c15ad0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1770964211672-8d85fd3b033c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1764148775389-b8320dbdb6f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1658265071597-61f7371de3d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1671197729465-57f9658510fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  'https://images.unsplash.com/photo-1543191219-92c8ed3d8cfd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
];

interface EventItem {
  id: string;
  name: string;
  slug: string;
  date: string;
  dateRaw: string;
  photos: number;
  faces: number;
}

const INITIAL_EVENTS: EventItem[] = [
  {
    id: '1',
    name: 'Tour 23/02/2026, 13:50:00',
    slug: '20260223T1350',
    date: '2026-02-23 13:50',
    dateRaw: '2026-02-23',
    photos: 0,
    faces: 0,
  },
  {
    id: '2',
    name: 'Tour 23/02/2026, 15:00:00',
    slug: '20260223T1500',
    date: '2026-02-23 15:00',
    dateRaw: '2026-02-23',
    photos: 0,
    faces: 0,
  },
  {
    id: '3',
    name: 'Tour 22/02/2026, 15:50:00',
    slug: '20260222T1550',
    date: '2026-02-22 15:30',
    dateRaw: '2026-02-22',
    photos: 25,
    faces: 35,
  },
];

export function AdminEvents() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [events, setEvents] = useState<EventItem[]>(INITIAL_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [showNewForm, setShowNewForm] = useState(true);
  const [newDate, setNewDate] = useState('26/02/2026');
  const [newTime, setNewTime] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [orderBy, setOrderBy] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.1)';
  const mutedText = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,40,20,0.42)';
  const textColor = isDark ? '#fff' : '#0D2818';
  const green = isDark ? '#86efac' : '#006B2B';
  const cyan = isDark ? '#7dd3fc' : '#0284c7';

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(`eventface.com/tour/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleCreateEvent = () => {
    if (!newTime) return;
    const id = String(Date.now());
    const name = `Tour ${newDate}, ${newTime}:00`;
    const slug = newDate.split('/').reverse().join('') + 'T' + newTime.replace(':', '');
    setEvents([
      {
        id,
        name,
        slug,
        date: `${newDate.split('/').reverse().join('-')} ${newTime}`,
        dateRaw: newDate.split('/').reverse().join('-'),
        photos: 0,
        faces: 0,
      },
      ...events,
    ]);
    setNewTime('');
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter((e) => e.id !== id));
    if (selectedEvent?.id === id) setSelectedEvent(null);
  };

  const handleSelectAll = () => {
    if (selectedPhotos.size === MOCK_PHOTO_URLS.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(MOCK_PHOTO_URLS.map((_, i) => i)));
    }
  };

  const handleTogglePhoto = (index: number) => {
    const next = new Set(selectedPhotos);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedPhotos(next);
  };

  const filteredEvents = events.filter((e) => {
    if (searchQuery) {
      return (
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.slug.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="pt-20 pb-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 700,
              fontStyle: 'italic',
              color: textColor,
            }}
          >
            Central do Allianz
          </h1>
          <p className="mt-2 text-sm" style={{ color: mutedText }}>
            Gestao completa de eventos e fotos do estadio
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <TabNav
          className="mb-10"
          active="eventos"
          tabs={[
            { key: 'dashboard', label: 'Dashboard',           icon: BarChart3,    to: '/admin' },
            { key: 'eventos',   label: 'Controle de Eventos', icon: CalendarDays, to: '/admin/eventos' },
          ]}
        />

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: '1.5rem',
                fontWeight: 700,
                color: textColor,
              }}
            >
              Gerenciar Eventos
            </h2>
            <p className="text-sm mt-1" style={{ color: mutedText }}>
              Crie, edite e organize eventos do estadio
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowNewForm(!showNewForm)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm"
            style={{
              background: isDark ? 'rgba(22,101,52,0.85)' : 'linear-gradient(135deg, #006B2B, #00843D)',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            <Plus className="w-4 h-4" />
            Novo Evento
          </motion.button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl mb-8"
          style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs mb-2" style={{ color: mutedText, fontFamily: "'Inter', sans-serif" }}>
                <Filter className="w-3 h-3" style={{ color: green }} />
                FILTRAR POR DATA
              </label>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm appearance-none cursor-pointer"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${cardBorder}`,
                  color: textColor,
                  outline: 'none',
                }}
              >
                <option value="all">Todos os periodos</option>
                <option value="week">Ultima semana</option>
                <option value="month">Ultimo mes</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs mb-2" style={{ color: mutedText, fontFamily: "'Inter', sans-serif" }}>
                <ArrowUpDown className="w-3 h-3" style={{ color: green }} />
                ORDENAR
              </label>
              <select
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm appearance-none cursor-pointer"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${cardBorder}`,
                  color: textColor,
                  outline: 'none',
                }}
              >
                <option value="recent">Mais recente</option>
                <option value="oldest">Mais antigo</option>
                <option value="photos">Mais fotos</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs mb-2" style={{ color: mutedText, fontFamily: "'Inter', sans-serif" }}>
                <Search className="w-3 h-3" style={{ color: green }} />
                BUSCAR
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nome ou slug do evento..."
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${cardBorder}`,
                  color: textColor,
                  outline: 'none',
                }}
              />
            </div>
            <div className="flex items-end gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{
                  background: isDark ? 'rgba(22,101,52,0.85)' : 'linear-gradient(135deg, #006B2B, #00843D)',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                Aplicar
              </motion.button>
              <button
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${cardBorder}`,
                  color: mutedText,
                }}
                onClick={() => {
                  setSearchQuery('');
                  setFilterDate('all');
                  setOrderBy('recent');
                }}
              >
                Limpar
              </button>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Event List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 p-6 rounded-2xl"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-4 h-4" style={{ color: green }} />
              <h3
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: textColor,
                }}
              >
                Lista de Eventos
              </h3>
            </div>
            <p className="text-xs mb-6" style={{ color: mutedText }}>
              {filteredEvents.length} eventos
            </p>

            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-xl transition-all cursor-pointer ${selectedEvent?.id === event.id ? 'ring-1' : ''}`}
                  style={{
                    background: selectedEvent?.id === event.id
                      ? isDark ? 'rgba(0,255,127,0.04)' : 'rgba(0,204,100,0.04)'
                      : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${selectedEvent?.id === event.id
                      ? isDark ? 'rgba(0,255,127,0.2)' : 'rgba(0,204,100,0.2)'
                      : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                    ringColor: isDark ? 'rgba(0,255,127,0.3)' : 'rgba(0,204,100,0.3)',
                  }}
                  onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm truncate" style={{ color: textColor, fontWeight: 600 }}>
                        {event.name}
                      </p>
                      <p className="text-xs mt-1" style={{ color: mutedText }}>
                        {event.date}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            background: `${cyan}15`,
                            border: `1px solid ${cyan}30`,
                            color: cyan,
                            fontWeight: 600,
                          }}
                        >
                          Slug: {event.slug}
                        </span>
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: mutedText }}>
                          <Camera className="w-3 h-3" /> {event.photos}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyLink(event.slug); }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] transition-colors"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                          color: copiedSlug === event.slug ? green : mutedText,
                          fontWeight: 500,
                        }}
                      >
                        {copiedSlug === event.slug ? 'Copiado!' : 'Copiar Link'}
                      </button>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1.5 rounded-lg text-[11px]"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                          color: mutedText,
                        }}
                      >
                        Usar
                      </button>
                      {[Eye, Pencil, Trash2].map((Icon, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (idx === 2) handleDeleteEvent(event.id);
                          }}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{
                            color: idx === 2
                              ? isDark ? 'rgba(255,69,96,0.6)' : 'rgba(255,69,96,0.7)'
                              : mutedText,
                            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                          }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Panel - New Event Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="lg:col-span-2 p-6 rounded-2xl"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <AnimatePresence mode="wait">
              {!selectedEvent ? (
                <motion.div key="new-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="w-4 h-4" style={{ color: green }} />
                    <h3
                      style={{
                        fontFamily: "'Fraunces', serif",
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: textColor,
                      }}
                    >
                      Criar Novo Evento
                    </h3>
                  </div>
                  <p className="text-xs mb-6" style={{ color: mutedText }}>
                    Configure um novo tour do estadio
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-2 text-xs mb-2" style={{ color: mutedText, fontFamily: "'Inter', sans-serif" }}>
                        <CalendarDays className="w-3 h-3" style={{ color: green }} />
                        Data do Tour
                      </label>
                      <input
                        type="text"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-sm"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          border: `1px solid ${cardBorder}`,
                          color: textColor,
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs mb-2" style={{ color: mutedText, fontFamily: "'Inter', sans-serif" }}>
                        <Clock className="w-3 h-3" style={{ color: green }} />
                        Horario
                      </label>
                      <input
                        type="text"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        placeholder="HH:mm"
                        className="w-full px-4 py-2.5 rounded-xl text-sm"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          border: `1px solid ${cardBorder}`,
                          color: textColor,
                          outline: 'none',
                        }}
                      />
                    </div>
                    <p className="text-xs" style={{ color: mutedText }}>
                      Informe o horario para criar um novo tour. O evento sera criado automaticamente.
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreateEvent}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm"
                      style={{
                        background: isDark ? 'rgba(22,101,52,0.85)' : 'linear-gradient(135deg, #006B2B, #00843D)',
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Criar Evento
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="event-selected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateEvent}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm mb-4"
                    style={{
                      background: isDark ? 'rgba(22,101,52,0.85)' : 'linear-gradient(135deg, #006B2B, #00843D)',
                      color: '#fff',
                      fontWeight: 700,
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Criar Evento
                  </motion.button>
                  <p className="text-xs mb-4" style={{ color: mutedText }}>
                    Evento selecionado. Configure as acoes abaixo.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Selected Event Detail */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 p-6 rounded-2xl"
              style={{
                background: cardBg,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,107,43,0.15)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4" style={{ color: green }} />
                <h3
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: textColor,
                  }}
                >
                  Detalhes do Evento
                </h3>
              </div>

              {/* Event Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs mb-1" style={{ color: mutedText }}>Nome</p>
                  <p className="text-sm" style={{ color: textColor, fontWeight: 500 }}>{selectedEvent.name}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: mutedText }}>Data/Hora</p>
                  <p className="text-sm" style={{ color: textColor, fontWeight: 500 }}>{selectedEvent.date}</p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: mutedText }}>Fotos</p>
                  <p className="text-sm flex items-center gap-1" style={{ color: textColor, fontWeight: 500 }}>
                    <Camera className="w-3.5 h-3.5" style={{ color: green }} />
                    {selectedEvent.photos}
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: mutedText }}>Slug</p>
                  <p className="text-sm" style={{ color: cyan, fontWeight: 500 }}>
                    {selectedEvent.slug}
                  </p>
                </div>
              </div>

              {/* Photo Gallery (only if photos > 0) */}
              {selectedEvent.photos > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs" style={{ color: mutedText }}>
                      Fotos recentes
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                          color: textColor,
                          fontWeight: 500,
                        }}
                      >
                        {selectedPhotos.size === MOCK_PHOTO_URLS.length ? 'Desmarcar todas' : 'Selecionar todas'}
                      </button>
                      {selectedPhotos.size > 0 && (
                        <button
                          className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1"
                          style={{
                            background: 'rgba(255,69,96,0.1)',
                            border: '1px solid rgba(255,69,96,0.2)',
                            color: '#FF4560',
                            fontWeight: 500,
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                          Excluir selecionadas
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-2">
                    {MOCK_PHOTO_URLS.map((url, i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                        style={{
                          border: selectedPhotos.has(i)
                            ? `2px solid ${green}`
                            : `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                        }}
                        onClick={() => handleTogglePhoto(i)}
                      >
                        <img
                          src={url}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        {selectedPhotos.has(i) && (
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ background: 'rgba(0,255,127,0.2)' }}
                          >
                            <CheckCircle2 className="w-5 h-5" style={{ color: green }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Zone */}
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="w-4 h-4" style={{ color: green }} />
                  <p className="text-sm" style={{ color: textColor, fontWeight: 600 }}>
                    Adicionar Fotos
                  </p>
                </div>
                <div
                  className="relative rounded-2xl p-10 text-center cursor-pointer transition-all"
                  style={{
                    background: dragOver
                      ? isDark ? 'rgba(0,255,127,0.06)' : 'rgba(0,204,100,0.06)'
                      : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                    border: `2px dashed ${dragOver
                      ? isDark ? 'rgba(0,255,127,0.4)' : 'rgba(0,204,100,0.4)'
                      : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                  }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                  />
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{
                      background: isDark ? 'rgba(0,212,255,0.1)' : 'rgba(0,168,204,0.1)',
                      border: `1px solid ${isDark ? 'rgba(0,212,255,0.2)' : 'rgba(0,168,204,0.2)'}`,
                    }}
                  >
                    <Camera className="w-6 h-6" style={{ color: cyan }} />
                  </div>
                  <p className="text-sm mb-1" style={{ color: textColor, fontWeight: 600 }}>
                    Arraste fotos aqui ou clique para selecionar
                  </p>
                  <p className="text-xs" style={{ color: mutedText }}>
                    Suporta multiplas imagens (JPG, PNG, WEBP)
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}