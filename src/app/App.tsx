import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from './components/ThemeProvider';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';

/**
 * Provider order (outer → inner):
 *  ThemeProvider → AuthProvider → CartProvider → RouterProvider
 * All routed components (Header, pages, etc.) have access to all contexts.
 */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <RouterProvider router={router} />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}