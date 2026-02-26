import { useRef } from 'react';
import { Link } from 'react-router';
import {
  Camera,
  Scan,
  ShoppingBag,
  ChevronRight,
  Star,
  Shield,
  Zap,
  Download,
  CheckCircle2,
  ArrowRight,
  Play,
  Users,
  Image,
  Clock,
  Trophy,
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';

/* ─── Images ─── */
const IMG_STADIUM =
  'https://images.unsplash.com/photo-1587565276758-0076cff659b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080';
const IMG_CONCERT =
  'https://images.unsplash.com/photo-1771865107543-3e6b77bee2e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080';
const IMG_TRAIL =
  'https://images.unsplash.com/photo-1762375212814-21dfcb0bfb38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080';
const IMG_CYCLING =
  'https://images.unsplash.com/photo-1753516231269-2a676b28f6fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080';
const IMG_MARATHON =
  'https://images.unsplash.com/photo-1745818016652-a890846ed361?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080';
const IMG_FAN_FULL =
  'https://images.unsplash.com/photo-1693517413656-d3445182b2e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800';
const IMG_FAN_PORTRAIT =
  'https://images.unsplash.com/photo-1757773873005-bf25cc5dc45b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400';
const IMG_TRIATHLON =
  'https://images.unsplash.com/photo-1508730328641-47c1616341b7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080';

/* ─── FaceScan Widget ─── */
function FaceScanWidget() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const accentGreen = isDark ? '#4ade80' : '#006B2B';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 300, height: 340 }}>
      {/* Outer pulse ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 280,
          height: 280,
          border: `1px solid ${accentGreen}26`,
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.15, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 250,
          height: 250,
          border: `1px solid ${accentGreen}40`,
        }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.6, 0.2, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />

      {/* Main frame */}
      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: 220,
          height: 220,
          border: `1.5px solid ${accentGreen}55`,
          background: isDark ? 'rgba(10,10,20,0.9)' : 'rgba(230,242,235,0.95)',
        }}
      >
        {/* Fan image */}
        <img
          src={IMG_FAN_PORTRAIT}
          alt="Face scan"
          className="w-full h-full object-cover"
          style={{ filter: 'saturate(0.7) brightness(0.75)' }}
        />

        {/* Scan line */}
        <motion.div
          className="absolute inset-x-0"
          style={{
            height: 1.5,
            background: `linear-gradient(90deg, transparent, ${accentGreen}99, transparent)`,
          }}
          animate={{ top: ['5%', '95%', '5%'] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
        />

        {/* Detection box */}
        <motion.div
          className="absolute"
          style={{
            top: '20%',
            left: '22%',
            width: '56%',
            height: '60%',
            border: `1.5px solid ${accentGreen}99`,
            borderRadius: 4,
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* Corner markers */}
        {[
          { top: '18%', left: '20%', borderTop: true, borderLeft: true },
          { top: '18%', right: '20%', borderTop: true, borderRight: true },
          { bottom: '18%', left: '20%', borderBottom: true, borderLeft: true },
          { bottom: '18%', right: '20%', borderBottom: true, borderRight: true },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute w-3 h-3"
            style={{
              top: pos.top,
              left: pos.left,
              right: pos.right,
              bottom: pos.bottom,
              borderTop: pos.borderTop ? `2px solid ${accentGreen}` : 'none',
              borderBottom: pos.borderBottom ? `2px solid ${accentGreen}` : 'none',
              borderLeft: pos.borderLeft ? `2px solid ${accentGreen}` : 'none',
              borderRight: pos.borderRight ? `2px solid ${accentGreen}` : 'none',
            }}
          />
        ))}

        {/* Scan overlay gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, ${accentGreen}0D 0%, transparent 50%, ${accentGreen}0D 100%)`,
          }}
        />
      </div>

      {/* Status badges */}
      <motion.div
        className="absolute -top-2 -right-4 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5"
        style={{
          background: isDark ? 'rgba(74,222,128,0.1)' : `${accentGreen}15`,
          border: `1px solid ${accentGreen}30`,
          color: accentGreen,
          backdropFilter: 'blur(8px)',
          fontWeight: 600,
          fontFamily: "'Montserrat', sans-serif",
        }}
        animate={{ opacity: [1, 0.7, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentGreen }} />
        ANALISANDO
      </motion.div>

      <motion.div
        className="absolute -bottom-4 -left-4 px-3 py-2 rounded-xl text-xs"
        style={{
          background: isDark ? 'rgba(10,10,20,0.9)' : 'rgba(255,255,255,0.95)',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,107,43,0.15)',
          backdropFilter: 'blur(8px)',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-1 rounded-full" style={{ background: accentGreen }} />
          <span style={{ color: accentGreen, fontWeight: 600 }}>Confiança: 98.7%</span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,107,43,0.1)', width: 100 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accentGreen}, #7dd3fc)` }}
            initial={{ width: 0 }}
            animate={{ width: '98.7%' }}
            transition={{ delay: 1.8, duration: 1.2 }}
          />
        </div>
      </motion.div>

      <motion.div
        className="absolute -bottom-4 right-4 px-3 py-2 rounded-xl text-xs"
        style={{
          background: isDark ? 'rgba(10,10,20,0.9)' : 'rgba(255,255,255,0.95)',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,107,43,0.15)',
          backdropFilter: 'blur(8px)',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 }}
      >
        <span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>Fotos encontradas: </span>
        <motion.span
          style={{ color: '#FFB800', fontWeight: 700 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
        >
          47
        </motion.span>
      </motion.div>
    </div>
  );
}

/* ─── Hero Section ─── */
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image with parallax — Allianz Parque */}
      <motion.div className="absolute inset-0 z-0" style={{ y }}>
        <img
          src={IMG_STADIUM}
          alt="Allianz Parque"
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.32) saturate(0.9)' }}
        />
      </motion.div>

      {/* Overlays */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            'linear-gradient(135deg, rgba(8,8,14,0.96) 0%, rgba(8,8,14,0.72) 50%, rgba(8,8,14,0.88) 100%)',
        }}
      />
      {/* Palmeiras green glow */}
      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            'radial-gradient(ellipse at 30% 50%, rgba(0,107,43,0.12) 0%, transparent 60%)',
        }}
      />

      <motion.div
        className="relative z-20 max-w-7xl mx-auto px-6 pt-28 pb-20 w-full"
        style={{ opacity }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div>
            {/* Label */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
              style={{
                background: 'rgba(0,107,43,0.15)',
                border: '1px solid rgba(0,107,43,0.4)',
              }}
            >
              <Trophy className="w-3.5 h-3.5" style={{ color: '#00FF7F' }} />
              <span
                className="text-xs tracking-widest"
                style={{ color: '#00FF7F', fontWeight: 700, textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif" }}
              >
                Allianz Parque · Tour Oficial do Palmeiras
              </span>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <h1
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 'clamp(3rem, 7vw, 5.5rem)',
                  fontWeight: 900,
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                }}
              >
                <span className="text-white">Você vibrou.</span>
                <br />
                <span className="text-white">Você torceu.</span>
                <br />
                <span style={{ color: '#00FF7F' }}>Encontre-se.</span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-6 text-lg max-w-md"
              style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}
            >
              Nossa IA varre milhares de fotos do Tour do Allianz Parque e localiza você em segundos. Compre apenas o que importa — os seus momentos.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 px-7 py-4 rounded-2xl text-base"
                style={{
                  background: 'linear-gradient(135deg, #006B2B, #00843D)',
                  color: '#fff',
                  fontWeight: 800,
                  fontFamily: "'Montserrat', sans-serif",
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}
              >
                <Camera className="w-5 h-5" />
                Encontrar minhas fotos
                <ChevronRight className="w-4 h-4" />
              </motion.button>

              <Link to="/eventos">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-3 px-7 py-4 rounded-2xl text-base"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.85)',
                    fontWeight: 600,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Play className="w-4 h-4" />
                  Ver eventos
                </motion.button>
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap items-center gap-6 mt-10"
            >
              {[
                { icon: Shield, label: 'Pagamento seguro' },
                { icon: Download, label: 'Download imediato' },
                { icon: Star, label: '4.9 estrelas' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: 'rgba(134,239,172,0.7)' }} />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Face Scan Widget */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:flex justify-center items-center"
          >
            <FaceScanWidget />
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-0"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          {[
            { value: '2.3M+', label: 'Fotos entregues', color: '#86efac' },
            { value: '847', label: 'Eventos cobertos', color: '#7dd3fc' },
            { value: '< 3s', label: 'Tempo de busca', color: '#fcd34d' },
            { value: '98.7%', label: 'Precisão da IA', color: '#f9a8d4' },
          ].map(({ value, label, color }, i) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center py-6 px-4"
              style={{
                borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '2rem',
                  fontWeight: 800,
                  color,
                  lineHeight: 1,
                }}
              >
                {value}
              </span>
              <span
                className="text-xs mt-1.5 text-center"
                style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}
              >
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 z-20"
        style={{ background: 'linear-gradient(to top, var(--background), transparent)' }}
      />
    </section>
  );
}

/* ─── Marquee Strip ─── */
function MarqueeStrip() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const green = isDark ? '#00FF7F' : '#006B2B';

  const items = [
    'TOUR DO PALMEIRAS · ALLIANZ PARQUE',
    'DERBY PAULISTA 2024',
    'BRASILEIRÃO SÉRIE A',
    'LIBERTADORES 2024',
    'MARATONA DE SP',
    'ROCK IN RIO',
    'IRONMAN BRASIL',
    'COPA DO BRASIL',
  ];

  return (
    <div
      className="relative overflow-hidden py-4"
      style={{
        background: isDark ? 'rgba(0,107,43,0.08)' : 'rgba(0,107,43,0.06)',
        borderTop: `1px solid ${green}1A`,
        borderBottom: `1px solid ${green}1A`,
      }}
    >
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 text-xs tracking-widest"
            style={{ color: isDark ? 'rgba(0,255,127,0.65)' : 'rgba(0,107,43,0.7)', fontWeight: 700 }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: green, flexShrink: 0 }}
            />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── How It Works ─── */
function HowItWorks() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const steps = [
    {
      icon: Camera,
      number: '01',
      title: 'Tire uma selfie',
      desc: 'Abra a câmera do celular e capture seu rosto. A IA começa a trabalhar imediatamente.',
      color: isDark ? '#86efac' : '#006B2B',
    },
    {
      icon: Scan,
      number: '02',
      title: 'A IA te encontra',
      desc: 'Nosso algoritmo varre todas as fotos do evento e identifica você com 98.7% de precisão.',
      color: isDark ? '#7dd3fc' : '#0369a1',
    },
    {
      icon: ShoppingBag,
      number: '03',
      title: 'Escolha e compre',
      desc: 'Selecione suas favoritas, adicione ao carrinho e faça download em alta resolução.',
      color: '#FFB800',
    },
  ];

  const cardBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.8)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,107,43,0.1)';
  const headingColor = isDark ? '#ffffff' : '#0D2818';
  const textColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(13,40,24,0.55)';
  const watermarkColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,107,43,0.04)';

  return (
    <section id="como-funciona" className="py-32 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span
            className="text-xs tracking-widest"
            style={{ color: isDark ? '#7dd3fc' : '#0369a1', fontWeight: 600, textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif" }}
          >
            Como funciona
          </span>
          <h2
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginTop: '0.5rem',
              color: headingColor,
            }}
          >
            Três passos para
            <br />
            <span style={{ color: isDark ? '#7dd3fc' : '#0369a1' }}>eternizar seu momento</span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="relative group cursor-default"
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: 24,
                padding: '2.5rem',
                transition: 'border-color 0.3s, box-shadow 0.3s',
                backdropFilter: isDark ? 'none' : 'blur(8px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${step.color}4D`;
                e.currentTarget.style.boxShadow = `0 0 40px ${step.color}1A`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = cardBorder;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Number watermark */}
              <span
                className="absolute top-6 right-8"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '4rem',
                  fontWeight: 900,
                  color: watermarkColor,
                  lineHeight: 1,
                  userSelect: 'none',
                }}
              >
                {step.number}
              </span>

              {/* Icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{
                  background: `${step.color}1F`,
                  border: `1px solid ${step.color}4D`,
                }}
              >
                <step.icon className="w-6 h-6" style={{ color: step.color }} />
              </div>

              <h3
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: headingColor,
                  marginBottom: '0.75rem',
                }}
              >
                {step.title}
              </h3>
              <p className="text-sm" style={{ color: textColor, lineHeight: 1.7 }}>
                {step.desc}
              </p>

              {/* Connector arrow */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-6 h-6" style={{ color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,107,43,0.2)' }} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Featured Events ─── */
const EVENTS = [
  {
    id: 'tour-allianz-parque',
    title: 'Tour Oficial do Palmeiras · Allianz Parque',
    date: '15 Mar 2025',
    location: 'São Paulo, SP',
    photos: 18400,
    price: 39,
    tag: 'TOUR',
    tagColor: '#00FF7F',
    image: IMG_STADIUM,
    large: true,
  },
  {
    id: 'ultra-trail-mantiqueira',
    title: 'Ultra Trail Mantiqueira',
    date: '25 Jun 2024',
    location: 'Campos do Jordão, SP',
    photos: 8640,
    price: 39,
    tag: 'TRAIL',
    tagColor: '#00D4FF',
    image: IMG_TRAIL,
    large: false,
  },
  {
    id: 'ironman-floripa',
    title: 'IRONMAN Florianópolis',
    date: '03 Ago 2024',
    location: 'Florianópolis, SC',
    photos: 15200,
    price: 49,
    tag: 'TRIATHLON',
    tagColor: '#FFB800',
    image: IMG_TRIATHLON,
    large: false,
  },
  {
    id: 'rock-in-rio-2024',
    title: 'Rock in Rio 2024',
    date: '14-22 Set 2024',
    location: 'Rio de Janeiro, RJ',
    photos: 28900,
    price: 59,
    tag: 'FESTIVAL',
    tagColor: '#FF6B9D',
    image: IMG_CONCERT,
    large: false,
  },
  {
    id: 'maratona-sp-2024',
    title: 'Maratona de São Paulo 2024',
    date: '12 Mai 2024',
    location: 'São Paulo, SP',
    photos: 12480,
    price: 29,
    tag: 'CORRIDA',
    tagColor: '#A78BFA',
    image: IMG_MARATHON,
    large: false,
  },
];

function EventCard({
  event,
  large = false,
}: {
  event: (typeof EVENTS)[0];
  large?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ scale: large ? 1.01 : 1.03 }}
      transition={{ duration: 0.3 }}
      className="relative group overflow-hidden cursor-pointer"
      style={{
        borderRadius: 20,
        gridRow: large ? 'span 2' : 'span 1',
        minHeight: large ? 480 : 220,
      }}
    >
      {/* Image */}
      <img
        src={event.image}
        alt={event.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        style={{ filter: 'brightness(0.6) saturate(0.85)' }}
      />

      {/* Overlays */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(ellipse at center, ${event.tagColor}14 0%, transparent 70%)` }}
      />

      {/* Tags top */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <span
          className="px-3 py-1 rounded-full text-[10px] tracking-widest"
          style={{
            background: `${event.tagColor}33`,
            border: `1px solid ${event.tagColor}80`,
            color: event.tagColor,
            fontWeight: 700,
            backdropFilter: 'blur(10px)',
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          {event.tag}
        </span>
        <span
          className="px-3 py-1 rounded-full text-xs"
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Image className="w-3 h-3 inline mr-1" />
          {event.photos.toLocaleString('pt-BR')} fotos
        </span>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3
          className="text-white mb-1"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: large ? '1.5rem' : '1.05rem',
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {event.title}
        </h3>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {event.date}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {event.location}
          </span>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              a partir de{' '}
            </span>
            <span
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '1.2rem',
                fontWeight: 700,
                color: '#FFB800',
              }}
            >
              R$ {event.price}
            </span>
          </div>

          <Link to={`/eventos/${event.id}`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                backdropFilter: 'blur(10px)',
              }}
            >
              Ver fotos
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function FeaturedEvents() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
        >
          <div>
            <span
              className="text-xs tracking-widest"
              style={{ color: isDark ? '#00FF7F' : '#006B2B', fontWeight: 700, textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif" }}
            >
              Eventos em destaque
            </span>
            <h2
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                marginTop: '0.5rem',
                color: isDark ? '#ffffff' : '#0D2818',
              }}
            >
              Seus próximos
              <br />
              <span style={{ color: isDark ? '#00FF7F' : '#006B2B' }}>momentos épicos</span>
            </h2>
          </div>
          <Link to="/eventos">
            <motion.button
              whileHover={{ scale: 1.04 }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm"
              style={{
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,107,43,0.2)'}`,
                color: isDark ? 'rgba(255,255,255,0.6)' : '#006B2B',
                fontWeight: 600,
              }}
            >
              Ver todos os eventos
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </motion.div>

        {/* Mosaic grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{ gridAutoRows: '220px' }}
        >
          <EventCard event={EVENTS[0]} large />
          <EventCard event={EVENTS[1]} />
          <EventCard event={EVENTS[2]} />
          <EventCard event={EVENTS[3]} />
          <EventCard event={EVENTS[4]} />
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Photo Packages ─── */
function PhotoPackages() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const headingColor = isDark ? '#ffffff' : '#0D2818';
  const bodyColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(13,40,24,0.5)';

  const packages = [
    {
      name: 'Digital',
      price: 29,
      perks: '1 foto em alta resolução',
      features: [
        'Download imediato',
        'Uso pessoal',
        'Até 5000px resolução',
        'Formato JPG',
      ],
      cta: 'Comprar foto',
      highlight: false,
      color: '#00D4FF',
      bgImage: IMG_FAN_FULL,
    },
    {
      name: 'Coleção',
      price: 79,
      perks: 'Até 6 fotos selecionadas',
      features: [
        'Download imediato',
        'Uso pessoal e redes sociais',
        'Resolução máxima',
        'JPG + PNG',
        'Sem marca d\'água',
      ],
      cta: 'Mais popular',
      highlight: true,
      color: isDark ? '#00FF7F' : '#006B2B',
      bgImage: IMG_TRIATHLON,
    },
    {
      name: 'Álbum Premium',
      price: 149,
      perks: 'Fotos ilimitadas do evento',
      features: [
        'Download ilimitado',
        'Uso comercial permitido',
        'Resolução máxima',
        'Todos os formatos',
        'Álbum digital exclusivo',
        'Suporte prioritário',
      ],
      cta: 'Ter tudo',
      highlight: false,
      color: '#FFB800',
      bgImage: IMG_STADIUM,
    },
  ];

  return (
    <section id="precos" className="py-32 px-6 relative">
      {/* BG gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 50% 0%, rgba(0,107,43,0.06) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(0,107,43,0.04) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span
            className="text-xs tracking-widest"
            style={{ color: '#FFB800', fontWeight: 700, textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif" }}
          >
            Pacotes de fotos
          </span>
          <h2
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginTop: '0.5rem',
              color: headingColor,
            }}
          >
            Sua torcida merece
            <br />
            <span style={{ color: '#FFB800' }}>ser lembrada</span>
          </h2>
          <p
            className="mt-4 text-base max-w-md mx-auto"
            style={{ color: bodyColor }}
          >
            Escolha o pacote ideal e leve suas fotos em alta resolução para sempre.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg, i) => (
            <motion.div
              key={pkg.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              whileHover={{ y: -8, scale: 1.01 }}
              className="relative overflow-hidden group"
              style={{
                borderRadius: 24,
                border: pkg.highlight
                  ? `2px solid ${pkg.color}80`
                  : `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.12)'}`,
                background: pkg.highlight
                  ? isDark ? `rgba(0,107,43,0.06)` : 'rgba(0,107,43,0.04)'
                  : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.8)',
                boxShadow: pkg.highlight ? `0 0 60px ${pkg.color}1A` : 'none',
              }}
            >
              {/* Background image subtle */}
              <div
                className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500"
                style={{
                  backgroundImage: `url(${pkg.bgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: isDark
                    ? pkg.highlight
                      ? 'linear-gradient(to bottom, rgba(8,8,14,0.8), rgba(8,8,14,0.95))'
                      : 'linear-gradient(to bottom, rgba(8,8,14,0.85), rgba(8,8,14,0.97))'
                    : pkg.highlight
                      ? 'linear-gradient(to bottom, rgba(242,248,244,0.85), rgba(242,248,244,0.97))'
                      : 'linear-gradient(to bottom, rgba(255,255,255,0.85), rgba(255,255,255,0.97))',
                }}
              />

              {/* Popular badge */}
              {pkg.highlight && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0 px-5 py-1 text-xs rounded-b-xl"
                  style={{
                    background: isDark
                      ? 'linear-gradient(135deg, #00FF7F, #00CC64)'
                      : 'linear-gradient(135deg, #006B2B, #00843D)',
                    color: '#fff',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  MAIS POPULAR
                </div>
              )}

              <div className="relative z-10 p-8 pt-10">
                {/* Name */}
                <div
                  className="inline-block px-3 py-1 rounded-full text-xs mb-4"
                  style={{
                    background: `${pkg.color}26`,
                    border: `1px solid ${pkg.color}4D`,
                    color: pkg.color,
                    fontWeight: 700,
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  {pkg.name}
                </div>

                {/* Price */}
                <div className="mb-2">
                  <span
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: '3.5rem',
                      fontWeight: 900,
                      color: pkg.color,
                      lineHeight: 1,
                    }}
                  >
                    R$ {pkg.price}
                  </span>
                </div>
                <p className="text-sm mb-8" style={{ color: bodyColor }}>
                  {pkg.perks}
                </p>

                {/* CTA */}
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="w-full py-3 rounded-xl text-sm mb-8"
                  style={{
                    background: pkg.highlight
                      ? isDark
                        ? 'linear-gradient(135deg, #00FF7F, #00CC64)'
                        : 'linear-gradient(135deg, #006B2B, #00843D)'
                      : `${pkg.color}26`,
                    border: pkg.highlight ? 'none' : `1px solid ${pkg.color}4D`,
                    color: pkg.highlight ? '#fff' : pkg.color,
                    fontWeight: 700,
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  {pkg.cta}
                </motion.button>

                {/* Features */}
                <ul className="flex flex-col gap-3">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <CheckCircle2
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: pkg.color }}
                      />
                      <span style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(13,40,24,0.65)' }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Social Proof ─── */
function Testimonials() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const headingColor = isDark ? '#ffffff' : '#0D2818';
  const cardBg = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.85)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,107,43,0.1)';

  const testimonials = [
    {
      quote:
        '"Fiz o Tour do Allianz Parque com minha filha e encontramos nossas fotos em segundos. A qualidade é absurda — até o gramado aparece com uma nitidez incrível. Vale cada centavo!"',
      name: 'Fernanda Luz',
      role: 'Torcedora Palmeirense · Tour Allianz Parque',
      stars: 5,
    },
    {
      quote:
        '"Organizamos o Tour com mais de 12 mil fotos. A plataforma indexou tudo automaticamente e os visitantes ficaram encantados com a rapidez. Nunca mais faço evento sem o EventFace."',
      name: 'Ricardo Torres',
      role: 'Coordenador · Tour do Palmeiras Oficial',
      stars: 5,
    },
    {
      quote:
        '"Fui ao jogo do Derby e o EventFace me mandou minhas fotos da arquibancada antes mesmo de eu chegar em casa. Tecnologia incrível, fui encontrado entre 20 mil torcedores!"',
      name: 'Carlos Menezes',
      role: 'Sócio · Avanti Palmeiras',
      stars: 5,
    },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span
            className="text-xs tracking-widest"
            style={{ color: '#FF6B9D', fontWeight: 700, textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif" }}
          >
            O que dizem os torcedores
          </span>
          <h2
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginTop: '0.5rem',
              color: headingColor,
            }}
          >
            Histórias que nos
            <br />
            <span style={{ color: '#FF6B9D' }}>movem</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="flex flex-col justify-between p-8"
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: 24,
                backdropFilter: isDark ? 'none' : 'blur(8px)',
              }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {[...Array(t.stars)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-[#FFB800] text-[#FFB800]" />
                ))}
              </div>

              <p
                className="text-base mb-8"
                style={{
                  color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(13,40,24,0.65)',
                  lineHeight: 1.7,
                  fontStyle: 'italic',
                }}
              >
                {t.quote}
              </p>

              <div>
                <div
                  className="text-sm"
                  style={{ color: headingColor, fontWeight: 600 }}
                >
                  {t.name}
                </div>
                <div className="text-xs mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(13,40,24,0.4)' }}>
                  {t.role}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Aggregate stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-12 mt-16 pt-16"
          style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,107,43,0.1)'}` }}
        >
          {[
            { icon: Star, value: '4.9/5', label: 'Avaliação média', color: '#FFB800' },
            { icon: Users, value: '140K+', label: 'Torcedores satisfeitos', color: isDark ? '#00FF7F' : '#006B2B' },
            { icon: Image, value: '2.3M', label: 'Fotos vendidas', color: '#00D4FF' },
            { icon: Clock, value: '< 3s', label: 'Tempo de busca', color: '#FF6B9D' },
          ].map(({ icon: Icon, value, label, color }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <Icon className="w-5 h-5" style={{ color }} />
              <span
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '2rem',
                  fontWeight: 800,
                  color,
                  lineHeight: 1,
                }}
              >
                {value}
              </span>
              <span className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(13,40,24,0.45)' }}>
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── CTA Banner ─── */
function CtaBanner() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <section className="px-6 pb-32">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden"
          style={{
            borderRadius: 28,
            background: isDark
              ? 'linear-gradient(135deg, #006B2B1A 0%, #00D4FF0D 50%, #FFB8000D 100%)'
              : 'linear-gradient(135deg, #006B2B0F 0%, #00843D0A 50%, #FFB8000A 100%)',
            border: `1px solid ${isDark ? 'rgba(0,107,43,0.25)' : 'rgba(0,107,43,0.18)'}`,
            padding: 'clamp(2rem, 5vw, 5rem)',
          }}
        >
          {/* BG image */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${IMG_FAN_FULL})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center right',
              opacity: isDark ? 0.08 : 0.06,
            }}
          />

          {/* Glow */}
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(0,107,43,0.2) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(0,107,43,0.12) 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{
                background: isDark ? 'rgba(0,107,43,0.15)' : 'rgba(0,107,43,0.08)',
                border: `1px solid ${isDark ? 'rgba(0,107,43,0.4)' : 'rgba(0,107,43,0.2)'}`,
              }}
            >
              <Trophy className="w-3.5 h-3.5" style={{ color: isDark ? '#00FF7F' : '#006B2B' }} />
              <span
                className="text-xs tracking-widest"
                style={{ color: isDark ? '#00FF7F' : '#006B2B', fontWeight: 700, textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif" }}
              >
                Exclusivo Allianz Parque
              </span>
            </motion.div>

            <h2
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: isDark ? '#ffffff' : '#0D2818',
                marginBottom: '1.5rem',
              }}
            >
              Pronto para encontrar
              <br />
              <span style={{ color: isDark ? '#00FF7F' : '#006B2B' }}>seus momentos?</span>
            </h2>

            <p
              className="text-lg mb-10"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(13,40,24,0.55)', lineHeight: 1.7 }}
            >
              Tire uma selfie e nossa IA encontra você em segundos entre milhares de fotos do Tour do Allianz Parque.
            </p>

            <div className="flex flex-wrap gap-4">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 px-7 py-4 rounded-2xl text-base"
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, #00FF7F, #00CC64)'
                    : 'linear-gradient(135deg, #006B2B, #00843D)',
                  color: isDark ? '#000' : '#fff',
                  fontWeight: 800,
                  fontFamily: "'Montserrat', sans-serif",
                  boxShadow: `0 0 40px rgba(0,107,43,0.35), 0 4px 20px rgba(0,0,0,0.15)`,
                }}
              >
                <Camera className="w-5 h-5" />
                Começar agora
                <ChevronRight className="w-4 h-4" />
              </motion.button>

              <Link to="/eventos">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-3 px-7 py-4 rounded-2xl text-base"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,107,43,0.06)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,107,43,0.15)'}`,
                    color: isDark ? 'rgba(255,255,255,0.7)' : '#006B2B',
                    fontWeight: 600,
                  }}
                >
                  Ver eventos
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Page ─── */
export function Home() {
  return (
    <main>
      <HeroSection />
      <MarqueeStrip />
      <HowItWorks />
      <FeaturedEvents />
      <PhotoPackages />
      <Testimonials />
      <CtaBanner />
    </main>
  );
}