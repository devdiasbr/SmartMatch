import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  Camera,
  Scan,
  ShoppingBag,
  ChevronRight,
  Star,
  Shield,
  Download,
  ArrowRight,
  Play,
  Trophy,
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'motion/react';
import { useTheme } from '../components/ThemeProvider';
import { useBranding } from '../contexts/BrandingContext';
import { api } from '../lib/api';
import { AnimatedBackground } from '../components/AnimatedBackground';

/* ─── Images ─── */
const IMG_STADIUM =
  'https://images.unsplash.com/photo-1587565276758-0076cff659b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080';
const IMG_FAN_FULL =
  'https://images.unsplash.com/photo-1693517413656-d3445182b2e2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800';
const IMG_FAN_PORTRAIT =
  'https://images.unsplash.com/photo-1757773873005-bf25cc5dc45b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400';

/* ─── FaceScan Widget ─── */
function FaceScanWidget() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const accentGreen = isDark ? '#4ade80' : '#166534';
  const { branding } = useBranding();
  const scannerImg = branding.scannerImageUrl || IMG_FAN_PORTRAIT;

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
          src={scannerImg}
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
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(22,101,52,0.15)',
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
          style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(22,101,52,0.1)', width: 100 }}
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
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(22,101,52,0.15)',
          backdropFilter: 'blur(8px)',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 }}
      >
        <span style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}>Fotos encontradas: </span>
        <motion.span
          style={{ color: '#00D4FF', fontWeight: 700 }}
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
  const { branding } = useBranding();

  // Multi-tenant: resolve org from URL param
  const orgId = new URLSearchParams(window.location.search).get('org') ?? undefined;

  const [stats, setStats] = useState<{ totalEvents: number; totalPhotos: number } | null>(null);

  useEffect(() => {
    api.getPublicStats(orgId)
      .then((data) => setStats(data))
      .catch(() => {/* fail silently */});
  }, [orgId]);

  // Use branding background if available, else fallback to default stadium photo
  const heroBg = branding.backgroundUrls.length > 0 ? branding.backgroundUrls[0] : IMG_STADIUM;
  const heroBgUrls = branding.backgroundUrls;

  const statsRow = [
    {
      value: stats ? (stats.totalPhotos > 0 ? `${stats.totalPhotos.toLocaleString('pt-BR')}` : '—') : '...',
      label: 'Fotos no acervo',
      color: '#86efac',
    },
    {
      value: stats ? (stats.totalEvents > 0 ? `${stats.totalEvents}` : '—') : '...',
      label: 'Eventos cobertos',
      color: '#7dd3fc',
    },
    { value: '< 3s', label: 'Tempo de busca', color: '#fcd34d' },
    { value: '98.7%', label: 'Precisão da IA', color: '#f9a8d4' },
  ];

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image with parallax */}
      <motion.div className="absolute inset-0 z-0" style={{ y }}>
        <AnimatedBackground
          urls={heroBgUrls}
          fallback={IMG_STADIUM}
          interval={branding.bgTransitionInterval * 1000}
          filter="brightness(0.32) saturate(0.9)"
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
            'radial-gradient(ellipse at 30% 50%, rgba(22,101,52,0.12) 0%, transparent 60%)',
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
                background: 'rgba(22,101,52,0.15)',
                border: '1px solid rgba(22,101,52,0.4)',
              }}
            >
              <Trophy className="w-3.5 h-3.5" style={{ color: '#00FF7F' }} />
              <span
                className="text-xs tracking-widest"
                style={{ color: '#00FF7F', fontWeight: 700, textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif" }}
              >
                {branding.heroBadge}
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
                <span className="text-white">{branding.heroLine1}</span>
                <br />
                <span className="text-white">{branding.heroLine2}</span>
                <br />
                <span style={{ color: '#00FF7F' }}>{branding.heroLine3}</span>
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
              {branding.heroSubtitle}
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Link to="/eventos">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-3 px-7 py-4 rounded-2xl text-base"
                  style={{
                    background: 'linear-gradient(135deg, #166534, #15803d)',
                    color: '#fff',
                    fontWeight: 800,
                    fontFamily: "'Montserrat', sans-serif",
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                  }}
                >
                  <Play className="w-4 h-4" />
                  {branding.heroCTA}
                  <ChevronRight className="w-4 h-4" />
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

        {/* Stats row — real data from backend */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-0"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          {statsRow.map(({ value, label, color }, i) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center py-6 px-4"
              style={{
                borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
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
                style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}
              >
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom gradient — funde hero com o conteúdo abaixo */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 z-20 pointer-events-none"
        style={{ background: 'linear-gradient(to top, var(--background) 0%, transparent 100%)' }}
      />
    </section>
  );
}

/* ─── Marquee Strip ─── */
function MarqueeStrip() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const green = isDark ? '#00FF7F' : '#166534';

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
        background: isDark ? 'rgba(22,101,52,0.08)' : 'rgba(22,101,52,0.05)',
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
            style={{ color: isDark ? 'rgba(0,255,127,0.65)' : 'rgba(22,101,52,0.75)', fontWeight: 700 }}
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
      color: isDark ? '#86efac' : '#166534',
    },
    {
      icon: Scan,
      number: '02',
      title: 'A IA te encontra',
      desc: 'Nosso algoritmo varre todas as fotos do evento e identifica você com 98.7% de precisão.',
      color: isDark ? '#7dd3fc' : '#0284c7',
    },
    {
      icon: ShoppingBag,
      number: '03',
      title: 'Escolha e compre',
      desc: 'Selecione suas favoritas, adicione ao carrinho e faça download em alta resolução.',
      color: isDark ? '#00D4FF' : '#0369a1',
    },
  ];

  const cardBg = isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(9,9,11,0.09)';
  const headingColor = isDark ? '#ffffff' : '#09090B';
  const textColor = isDark ? 'rgba(255,255,255,0.45)' : '#71717A';
  const watermarkColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(9,9,11,0.04)';

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
            style={{ color: isDark ? '#7dd3fc' : '#0284c7', fontWeight: 600, textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif" }}
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
            <span style={{ color: isDark ? '#7dd3fc' : '#0284c7' }}>eternizar seu momento</span>
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
                boxShadow: isDark ? 'none' : 'var(--shadow-card)',
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
                  <ArrowRight className="w-6 h-6" style={{ color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(22,101,52,0.2)' }} />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Banner ─── */
function CtaBanner() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { branding } = useBranding();

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
              ? 'linear-gradient(135deg, #006B2B1A 0%, #00D4FF0D 50%, #006B2B0D 100%)'
              : 'linear-gradient(135deg, #1665341A 0%, #00D4FF0D 50%, #1665340D 100%)',
            border: `1px solid ${isDark ? 'rgba(22,101,52,0.25)' : 'rgba(22,101,52,0.15)'}`,
            padding: 'clamp(2rem, 5vw, 5rem)',
          }}
        >
          {/* BG image */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${branding.ctaBgUrl || IMG_FAN_FULL})`,
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
                ? 'radial-gradient(circle, rgba(22,101,52,0.2) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(22,101,52,0.12) 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{
                background: isDark ? 'rgba(22,101,52,0.15)' : 'rgba(22,101,52,0.07)',
                border: `1px solid ${isDark ? 'rgba(22,101,52,0.4)' : 'rgba(22,101,52,0.18)'}`,
              }}
            >
              <Trophy className="w-3.5 h-3.5" style={{ color: isDark ? '#00FF7F' : '#166534' }} />
              <span
                className="text-xs tracking-widest"
                style={{ color: isDark ? '#00FF7F' : '#166534', fontWeight: 700, textTransform: 'uppercase', fontFamily: "'Montserrat', sans-serif" }}
              >
                {branding.homeExclusiveText || 'Exclusivo Allianz Parque'}
              </span>
            </motion.div>

            <h2
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: isDark ? '#ffffff' : '#09090B',
                marginBottom: '1.5rem',
              }}
            >
              {branding.ctaTitle1 || 'Pronto para encontrar'}
              <br />
              <span style={{ color: isDark ? '#00FF7F' : '#166534' }}>{branding.ctaTitle2 || 'seus momentos?'}</span>
            </h2>

            <p
              className="text-lg mb-10"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(9,9,11,0.55)', lineHeight: 1.7 }}
            >
              {branding.ctaSubtitle || `Tire uma selfie e nossa IA encontra você em segundos entre milhares de fotos do ${branding.venueName || 'Allianz Parque'}.`}
            </p>

            <Link to="/eventos">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 px-7 py-4 rounded-2xl text-base"
                style={{
                  background: isDark
                    ? 'linear-gradient(135deg, #00FF7F, #00CC64)'
                    : 'linear-gradient(135deg, #166534, #15803d)',
                  color: isDark ? '#000' : '#fff',
                  fontWeight: 800,
                  fontFamily: "'Montserrat', sans-serif",
                  boxShadow: `0 0 40px rgba(22,101,52,0.3), 0 4px 20px rgba(0,0,0,0.15)`,
                }}
              >
                {branding.ctaButton || 'Ver eventos'}
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </Link>
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
      <CtaBanner />
    </main>
  );
}