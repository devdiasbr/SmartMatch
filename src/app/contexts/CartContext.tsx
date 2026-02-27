import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../lib/api';

export interface CartItem {
  id: string;
  photoId: number | string;
  src: string;
  tag: string;
  eventName: string;
  eventId: string;
  price: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  isInCart: (photoId: number | string, eventId: string) => boolean;
  totalItems: number;
  totalPrice: number;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** Sync all item prices to the current server-configured price */
  syncPrices: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

const NOOP_CART: CartContextValue = {
  items: [],
  addItem: () => {},
  removeItem: () => {},
  clearCart: () => {},
  isInCart: () => false,
  totalItems: 0,
  totalPrice: 0,
  drawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  syncPrices: async () => {},
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    setItems((prev) => {
      if (prev.some((i) => i.photoId === item.photoId && i.eventId === item.eventId)) return prev;
      return [...prev, { ...item, id: `${item.eventId}-${item.photoId}-${Date.now()}` }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const isInCart = useCallback(
    (photoId: number | string, eventId: string) =>
      items.some((i) => String(i.photoId) === String(photoId) && i.eventId === eventId),
    [items],
  );

  const totalItems = items.length;
  const totalPrice = items.reduce((sum, i) => sum + i.price, 0);

  const syncPrices = useCallback(async () => {
    try {
      const { photoPrice } = await api.getPhotoPrice();
      setItems((prev) => {
        const needsUpdate = prev.some((i) => i.price !== photoPrice);
        if (!needsUpdate) return prev;
        return prev.map((i) => ({ ...i, price: photoPrice }));
      });
    } catch (err) {
      console.error('Erro ao sincronizar preços do carrinho:', err);
    }
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        isInCart,
        totalItems,
        totalPrice,
        drawerOpen,
        openDrawer: () => setDrawerOpen(true),
        closeDrawer: () => setDrawerOpen(false),
        syncPrices,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  return ctx ?? NOOP_CART;
}