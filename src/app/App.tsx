import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ThemeProvider } from './components/ThemeProvider';
import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { BrandingProvider } from './contexts/BrandingContext';

/**
 * Provider order (outer → inner):
 *  ThemeProvider → AuthProvider → BrandingProvider → CartProvider → RouterProvider
 */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrandingProvider>
          <CartProvider>
            <RouterProvider router={router} />
          </CartProvider>
        </BrandingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}