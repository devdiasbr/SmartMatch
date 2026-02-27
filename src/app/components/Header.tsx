import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Camera, ShoppingCart, Menu, X, Moon, Sun, User, LogOut, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from './ThemeProvider';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalItems, openDrawer } = useCart();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin, signOut } = useAuth();
  const isDark = theme === 'dark';

  const isAdminPage = location.pathname.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

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
              Smart
              <span style={{ color: isDark ? '#86efac' : '#006B2B' }}>Match</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {publicLinks.map((link) => (
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
            {/* Admin link — only when authenticated */}
            {isAdmin && (
              <Link
                to="/admin"
                className="px-4 py-2 rounded-lg text-sm transition-all duration-200"
                style={{
                  color: isActive('/admin')
                    ? isDark ? '#ffffff' : '#006B2B'
                    : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                  background: isActive('/admin')
                    ? isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,107,43,0.07)'
                    : 'transparent',
                  fontWeight: isActive('/admin') ? 600 : 500,
                }}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAdminPage && isAdmin && (
              <>
                <div className="flex items-center gap-2 text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)' }}>
                  <User className="w-4 h-4" />
                  Administrador
                </div>
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

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
              }}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {!isAdminPage && (
              <>
                {/* Cart */}
                <button
                  onClick={openDrawer}
                  className="relative p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
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

                {/* Login button (when not admin) */}
                {!isAdmin && (
                  <Link to="/admin/login">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                        fontWeight: 600,
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      }}
                    >
                      <LogIn className="w-4 h-4" />
                      Entrar
                    </motion.button>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg cursor-pointer"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              className="p-2 rounded-lg cursor-pointer"
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