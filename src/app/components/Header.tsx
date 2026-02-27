import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Camera, ShoppingCart, Menu, X, Moon, Sun, LogOut, LogIn, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from './ThemeProvider';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';

/* ─────────────────────────────────────────────────────────────────────────
 * REGRA DE COR DO HEADER
 *
 * Todas as páginas públicas (Home, Eventos, EventDetail) têm uma seção hero
 * com imagem de estádio ESCURA como primeiro conteúdo logo abaixo do header.
 * Por isso, quando o header está transparente (não scrollado), os links e
 * ícones devem ser sempre BRANCOS — independente do tema.
 *
 * Quando scrollado (header com background sólido), as cores se adaptam ao
 * tema (dark ou light).
 * ───────────────────────────────────────────────────────────────────────── */

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalItems, openDrawer } = useCart();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin, signOut } = useAuth();
  const { branding } = useBranding();
  const isDark = theme === 'dark';

  const isAdminPage = location.pathname.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  /* Cores dependem se scrolled OU se estamos em página admin
   * Páginas admin não têm hero escuro, então usam cores de tema desde o início */
  const useThemedColors = scrolled || isAdminPage;

  const linkColor = (active: boolean) => {
    if (!useThemedColors) {
      // transparente sobre hero escuro: sempre branco
      return active ? '#ffffff' : 'rgba(255,255,255,0.6)';
    }
    // scrolled — adapta ao tema
    return active
      ? (isDark ? '#ffffff' : '#006B2B')
      : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)');
  };

  const linkBg = (active: boolean) => {
    if (!useThemedColors) {
      return active ? 'rgba(255,255,255,0.1)' : 'transparent';
    }
    return active
      ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,107,43,0.07)')
      : 'transparent';
  };

  const iconColor = useThemedColors
    ? (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')
    : 'rgba(255,255,255,0.7)';

  const iconBg = useThemedColors
    ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)')
    : 'rgba(255,255,255,0.1)';

  const publicLinks = [
    { label: 'Home', href: '/' },
    { label: 'Eventos', href: '/eventos' },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? isDark ? 'rgba(8,8,14,0.94)' : 'rgba(242,248,244,0.96)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled
            ? `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.1)'}`
            : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-2 group">
            {branding.logoUrl ? (
              /* Custom logo uploaded via Config — sem filtro para preservar cores */
              <img
                src={branding.logoUrl}
                alt={branding.appName}
                className="h-8 object-contain max-w-[160px]"
              />
            ) : (
              /* Fallback: ícone + nome */
              <>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #006B2B, #00843D)' }}
                >
                  <Camera className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <span
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '1.2rem' }}
                  className={useThemedColors
                    ? (isDark ? 'text-white' : 'text-[#0D2818]')
                    : 'text-white'}
                >
                  {/* Split appName into first word + rest for color accent */}
                  {branding.appName.includes(' ') ? (
                    <>
                      {branding.appName.split(' ')[0]}
                      <span style={{ color: useThemedColors ? (isDark ? '#86efac' : '#006B2B') : '#4ade80' }}>
                        {' '}{branding.appName.split(' ').slice(1).join(' ')}
                      </span>
                    </>
                  ) : (
                    <span style={{ color: useThemedColors ? (isDark ? '#86efac' : '#006B2B') : '#4ade80' }}>
                      {branding.appName}
                    </span>
                  )}
                </span>
              </>
            )}
          </Link>

          {/* ── Desktop Nav ── */}
          <nav className="hidden md:flex items-center gap-1">
            {publicLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="px-4 py-2 rounded-lg text-sm transition-all duration-200"
                style={{
                  color: linkColor(isActive(link.href)),
                  background: linkBg(isActive(link.href)),
                  fontWeight: isActive(link.href) ? 600 : 500,
                }}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="px-4 py-2 rounded-lg text-sm transition-all duration-200"
                style={{
                  color: linkColor(isActive('/admin')),
                  background: linkBg(isActive('/admin')),
                  fontWeight: isActive('/admin') ? 600 : 500,
                }}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* ── Right Actions (toggle SEMPRE no final) ── */}
          <div className="hidden md:flex items-center gap-2">

            {/* Admin info + logout — só em páginas admin */}
            {isAdminPage && isAdmin && (
              <>
                <span className="text-sm mr-1" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }}>
                  Administrador
                </span>
                <button
                  onClick={() => signOut()}
                  className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  style={{
                    color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              </>
            )}

            {/* Carrinho — só fora do admin */}
            {!isAdminPage && (
              <button
                onClick={openDrawer}
                className="relative p-2 rounded-lg transition-colors cursor-pointer"
                style={{ background: iconBg }}
              >
                <ShoppingCart className="w-5 h-5" style={{ color: iconColor }} />
                <AnimatePresence>
                  {totalItems > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                      style={{ background: useThemedColors
                        ? (isDark ? '#4ade80' : '#006B2B')
                        : '#4ade80', color: '#000', fontWeight: 700 }}
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )}

            {/* Login — só fora do admin e não autenticado */}
            {!isAdminPage && !isAdmin && (
              <Link to="/admin/login">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
                  style={{
                    background: useThemedColors
                      ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)')
                      : 'rgba(255,255,255,0.12)',
                    color: useThemedColors
                      ? (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)')
                      : 'rgba(255,255,255,0.85)',
                    fontWeight: 600,
                    border: `1px solid ${useThemedColors
                      ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
                      : 'rgba(255,255,255,0.18)'}`,
                  }}
                >
                  <LogIn className="w-4 h-4" />
                  Entrar
                </motion.button>
              </Link>
            )}

            {/* ── Theme toggle — SEMPRE por último ── */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{ background: iconBg, color: iconColor }}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* ── Engrenagem Config — só para admin ── */}
            {isAdmin && (
              <Link to="/admin/config">
                <button
                  className="p-2 rounded-lg transition-colors cursor-pointer"
                  style={{ background: iconBg, color: iconColor }}
                  title="Configurações"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </Link>
            )}
          </div>

          {/* ── Mobile: toggle + hamburger ── */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg cursor-pointer"
              style={{ color: useThemedColors
                ? (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)')
                : 'rgba(255,255,255,0.7)' }}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              className="p-2 rounded-lg cursor-pointer"
              style={{ color: useThemedColors
                ? (isDark ? 'white' : '#1A1A2C')
                : 'white' }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 left-0 right-0 z-40 md:hidden"
            style={{
              background: isDark ? 'rgba(8,8,14,0.97)' : 'rgba(242,248,244,0.97)',
              backdropFilter: 'blur(20px)',
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.1)'}`,
            }}
          >
            <div className="px-6 py-6 flex flex-col gap-2">
              {publicLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="px-4 py-3 rounded-xl text-base"
                  style={{
                    color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                    fontWeight: 500,
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-4 py-3 rounded-xl text-base"
                  style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)', fontWeight: 500 }}
                  onClick={() => setMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
              {!isAdmin ? (
                <Link to="/admin/login" onClick={() => setMenuOpen(false)}>
                  <button
                    className="mt-4 w-full py-3 rounded-xl text-base flex items-center justify-center gap-2 cursor-pointer"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                      fontWeight: 600,
                    }}
                  >
                    <LogIn className="w-4 h-4" />
                    Entrar como Admin
                  </button>
                </Link>
              ) : (
                <button
                  onClick={() => { signOut(); setMenuOpen(false); }}
                  className="mt-4 py-3 rounded-xl text-base flex items-center justify-center gap-2 cursor-pointer"
                  style={{
                    background: isDark ? 'rgba(252,165,165,0.08)' : 'rgba(220,38,38,0.06)',
                    color: isDark ? '#fca5a5' : '#dc2626',
                    fontWeight: 600,
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}