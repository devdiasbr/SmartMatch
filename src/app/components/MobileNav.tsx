import { Link, useLocation } from 'react-router';
import { Home, Calendar, ShoppingCart, User, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from './ThemeProvider';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  match: (path: string) => boolean;
}

export function MobileNav() {
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { totalItems, openDrawer } = useCart();
  const { isAdmin } = useAuth();

  const isAdminPage = pathname.startsWith('/admin');

  const publicItems: NavItem[] = [
    { icon: Home, label: 'Início', href: '/', match: (p) => p === '/' },
    { icon: Calendar, label: 'Eventos', href: '/eventos', match: (p) => p.startsWith('/eventos') },
  ];

  const adminItems: NavItem[] = [
    { icon: Home, label: 'Dashboard', href: '/admin', match: (p) => p === '/admin' },
    { icon: Calendar, label: 'Eventos', href: '/admin/eventos', match: (p) => p === '/admin/eventos' },
    { icon: Settings, label: 'Config', href: '/admin/config', match: (p) => p === '/admin/config' },
  ];

  const items = isAdminPage ? adminItems : publicItems;

  const bg = isDark ? 'rgba(9,9,15,0.96)' : 'rgba(255,255,255,0.97)';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(9,9,11,0.08)';
  const activeColor = isDark ? '#00FF7F' : '#166534';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.35)' : '#A1A1AA';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: bg,
        borderTop: `1px solid ${border}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {items.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl relative min-w-[60px]"
              style={{ textDecoration: 'none' }}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute -top-1.5 w-5 h-0.5 rounded-full"
                  style={{ background: activeColor }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                className="w-5 h-5"
                style={{ color: isActive ? activeColor : inactiveColor }}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className="text-[10px]"
                style={{
                  color: isActive ? activeColor : inactiveColor,
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Cart button - only on public pages */}
        {!isAdminPage && (
          <button
            onClick={openDrawer}
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl relative min-w-[60px]"
          >
            <div className="relative">
              <ShoppingCart
                className="w-5 h-5"
                style={{ color: inactiveColor }}
                strokeWidth={2}
              />
              {totalItems > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px]"
                  style={{
                    background: activeColor,
                    color: isDark ? '#000' : '#fff',
                    fontWeight: 800,
                  }}
                >
                  {totalItems}
                </motion.span>
              )}
            </div>
            <span
              className="text-[10px]"
              style={{ color: inactiveColor, fontWeight: 500 }}
            >
              Carrinho
            </span>
          </button>
        )}

        {/* Admin link - only on public pages, if admin */}
        {!isAdminPage && isAdmin && (
          <Link
            to="/admin"
            className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl min-w-[60px]"
            style={{ textDecoration: 'none' }}
          >
            <User
              className="w-5 h-5"
              style={{ color: pathname.startsWith('/admin') ? activeColor : inactiveColor }}
              strokeWidth={2}
            />
            <span
              className="text-[10px]"
              style={{ color: inactiveColor, fontWeight: 500 }}
            >
              Admin
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
