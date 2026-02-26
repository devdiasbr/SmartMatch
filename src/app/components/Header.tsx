import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Camera, ShoppingCart, Menu, X, Moon, Sun, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from './ThemeProvider';
import { useCart } from '../contexts/CartContext';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Eventos', href: '/eventos' },
  { label: 'Admin', href: '/admin' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalItems, openDrawer } = useCart();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const isAdmin = location.pathname.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? isDark ? 'rgba(8,8,14,0.94)' : 'rgba(242,248,244,0.94)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled
            ? `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`
            : '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: isDark ? 'linear-gradient(135deg, #166534, #15803d)' : 'linear-gradient(135deg, #006B2B, #00843D)' }}
            >
              <Camera className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '1.2rem' }}
              className={isDark ? 'text-white' : 'text-[#0D2818]'}
            >
              Event
              <span style={{ color: isDark ? '#86efac' : '#006B2B' }}>Face</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="px-4 py-2 rounded-lg text-sm transition-all duration-200"
                style={{
                  color: isActive(link.href)
                    ? isDark ? '#ffffff' : '#006B2B'
                    : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                  background: isActive(link.href)
                    ? isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,107,43,0.07)'
                    : 'transparent',
                  fontWeight: isActive(link.href) ? 600 : 500,
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAdmin && (
              <>
                {/* Event ID input */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,107,43,0.2)'}`,
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,107,43,0.7)',
                  }}
                >
                  Informe o Event ID
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }}>
                  <User className="w-4 h-4" />
                  Administrador
                </div>
                <button
                  className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
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

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
              }}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {!isAdmin && (
              <>
                {/* Cart */}
                <button
                  onClick={openDrawer}
                  className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }} />
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                        style={{ background: isDark ? '#4ade80' : '#006B2B', color: isDark ? '#000' : '#fff' }}
                      >
                        {totalItems}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                {/* CTA */}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
                  style={{
                    background: isDark
                      ? 'rgba(22,101,52,0.9)'
                      : 'linear-gradient(135deg, #006B2B, #00843D)',
                    color: '#fff',
                    fontWeight: 700,
                    border: isDark ? '1px solid rgba(74,222,128,0.2)' : 'none',
                  }}
                >
                  <Camera className="w-4 h-4" />
                  Encontrar fotos
                </motion.button>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg"
              style={{
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
              }}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              className="p-2 rounded-lg"
              style={{ color: isDark ? 'white' : '#1A1A2C' }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
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
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
            }}
          >
            <div className="px-6 py-6 flex flex-col gap-2">
              {navLinks.map((link) => (
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
              <button
                className="mt-4 py-3 rounded-xl text-base"
                style={{
                  background: isDark ? 'rgba(22,101,52,0.9)' : 'linear-gradient(135deg, #006B2B, #00843D)',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                Encontrar minhas fotos
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}