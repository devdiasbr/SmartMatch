import { useLocation, Outlet } from 'react-router';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from './CartDrawer';
import { FaceQueueToast } from './FaceQueueToast';
import { useEffect } from 'react';
import { useTheme } from './ThemeProvider';

export function Root() {
  const { pathname } = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const isDark = theme === 'dark';
  const isAdminLogin = pathname === '/admin/login';

  return (
    <div
      className="relative transition-colors duration-300"
      style={{
        background: isDark ? '#08080E' : '#F2F8F4',
        minHeight: '100vh',
        color: isDark ? 'white' : '#0D2818',
        fontFamily: "'Inter', sans-serif",
        overflowX: 'hidden',
      }}
    >
      {/* Global dot-grid texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)'
            : 'radial-gradient(circle, rgba(0,107,43,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      {!isAdminLogin && <Header />}
      {!isAdminLogin && <CartDrawer />}
      <FaceQueueToast />
      <main className="relative z-10">
        <Outlet />
      </main>
      {!isAdminLogin && <Footer />}
    </div>
  );
}