import { Link } from 'react-router';
import { X, ShoppingCart, Trash2, ImageIcon, ArrowRight, Trash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../contexts/CartContext';
import { useTheme } from './ThemeProvider';
import { useEffect } from 'react';

export function CartDrawer() {
  const { items, removeItem, clearCart, totalItems, totalPrice, drawerOpen, closeDrawer, syncPrices } = useCart();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Sync prices with server whenever drawer opens
  useEffect(() => {
    if (drawerOpen && totalItems > 0) {
      syncPrices();
    }
  }, [drawerOpen, syncPrices, totalItems]);

  const bg = isDark ? '#0e0e1a' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.09)';
  const textColor = isDark ? '#ffffff' : '#09090B';
  const mutedColor = isDark ? 'rgba(255,255,255,0.38)' : '#71717A';
  const itemBg = isDark ? 'rgba(255,255,255,0.03)' : '#F5F5F7';
  const green = isDark ? '#86efac' : '#166534';
  const greenBright = isDark ? '#4ade80' : '#15803D';

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[190]"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={closeDrawer}
          />

          {/* Drawer Panel */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 bottom-0 z-[200] flex flex-col w-full max-w-[420px]"
            style={{
              background: bg,
              borderLeft: `1px solid ${borderColor}`,
              boxShadow: '-20px 0 60px rgba(0,0,0,0.25)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: `1px solid ${borderColor}` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.07)' }}
                >
                  <ShoppingCart className="w-4 h-4" style={{ color: green }} />
                </div>
                <div>
                  <h2
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 800,
                      fontSize: '1rem',
                      color: textColor,
                    }}
                  >
                    Meu Carrinho
                  </h2>
                  {totalItems > 0 && (
                    <p className="text-xs" style={{ color: mutedColor }}>
                      {totalItems} {totalItems === 1 ? 'foto selecionada' : 'fotos selecionadas'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {totalItems > 0 && (
                  <button
                    onClick={() => { clearCart(); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                    style={{
                      background: isDark ? 'rgba(252,165,165,0.06)' : 'rgba(220,38,38,0.05)',
                      color: isDark ? '#fca5a5' : '#dc2626',
                      fontWeight: 600,
                    }}
                    title="Esvaziar carrinho"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    Esvaziar
                  </button>
                )}
                <button
                  onClick={closeDrawer}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    color: mutedColor,
                  }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <AnimatePresence mode="popLayout">
                {totalItems === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)', border: `1px solid ${borderColor}` }}
                    >
                      <ImageIcon className="w-7 h-7" style={{ color: mutedColor }} />
                    </div>
                    <p
                      style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: textColor,
                        marginBottom: 6,
                      }}
                    >
                      Nenhuma foto ainda
                    </p>
                    <p className="text-sm" style={{ color: mutedColor, maxWidth: 220 }}>
                      Encontre suas fotos nos eventos e adicione ao carrinho.
                    </p>
                    <Link
                      to="/eventos"
                      onClick={closeDrawer}
                      className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                      style={{
                        background: isDark ? 'rgba(134,239,172,0.1)' : 'rgba(22,101,52,0.07)',
                        border: `1px solid ${isDark ? 'rgba(134,239,172,0.18)' : 'rgba(22,101,52,0.15)'}`,
                        color: green,
                        fontWeight: 700,
                      }}
                    >
                      Explorar eventos
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, i) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 p-3 rounded-2xl group"
                        style={{ background: itemBg, border: `1px solid ${borderColor}` }}
                      >
                        {/* Thumbnail */}
                        <div
                          className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                          style={{ border: `1px solid ${borderColor}` }}
                        >
                          <img
                            src={item.src}
                            alt={item.tag}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-xs uppercase tracking-widest truncate"
                            style={{ color: mutedColor, fontWeight: 600 }}
                          >
                            {item.tag}
                          </p>
                          <p
                            className="text-sm truncate mt-0.5"
                            style={{ color: textColor, fontWeight: 700 }}
                          >
                            {item.eventName}
                          </p>
                          <p
                            style={{
                              fontFamily: "'Montserrat', sans-serif",
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              color: green,
                              marginTop: 2,
                            }}
                          >
                            R$ {item.price}
                          </p>
                        </div>

                        {/* Remove */}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeItem(item.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            background: isDark ? 'rgba(252,165,165,0.08)' : 'rgba(220,38,38,0.06)',
                            color: isDark ? '#fca5a5' : '#dc2626',
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {totalItems > 0 && (
              <div
                className="px-6 py-5 space-y-3"
                style={{ borderTop: `1px solid ${borderColor}` }}
              >
                {/* Summary line */}
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: mutedColor }}>
                    Subtotal ({totalItems} {totalItems === 1 ? 'foto' : 'fotos'})
                  </span>
                  <span
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 800,
                      fontSize: '1.15rem',
                      color: textColor,
                    }}
                  >
                    R$ {totalPrice}
                  </span>
                </div>

                {/* Package hint — removed: no packages, fixed R$30/photo */}

                {/* CTA buttons */}
                <div className="flex flex-col gap-2 pt-1">
                  <Link to="/carrinho" onClick={closeDrawer}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2"
                      style={{
                        background: isDark
                          ? 'linear-gradient(135deg, rgba(22,101,52,0.95), rgba(21,128,61,0.9))'
                          : 'linear-gradient(135deg, #166534, #15803d)',
                        color: '#fff',
                        fontWeight: 800,
                        fontFamily: "'Montserrat', sans-serif",
                        letterSpacing: '-0.01em',
                      }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Finalizar Compra
                    </motion.button>
                  </Link>
                  <button
                    onClick={closeDrawer}
                    className="w-full py-2.5 rounded-2xl text-sm"
                    style={{
                      color: mutedColor,
                      fontWeight: 600,
                    }}
                  >
                    Continuar comprando
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}