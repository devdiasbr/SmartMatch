import { createBrowserRouter } from 'react-router';
import { Root } from './components/Root';
import { Home } from './pages/Home';
import { Events } from './pages/Events';
import { EventDetail } from './pages/EventDetail';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminEvents } from './pages/AdminEvents';
import { AdminFinanceiro } from './pages/AdminFinanceiro';
import { AdminPDV } from './pages/AdminPDV';
import { AdminPedidos } from './pages/AdminPedidos';
import { AdminConfig } from './pages/AdminConfig';
import { Cart } from './pages/Cart';
import { AdminLogin } from './pages/AdminLogin';
import { MinhaFoto } from './pages/MinhaFoto';

import { PitchDeck } from './pages/PitchDeck';

export const router = createBrowserRouter([
  // Rotas standalone (sem layout Root — sem Header/Footer)
  {
    path: '/pitch',
    Component: PitchDeck,
  },
  {
    path: '/minha-foto/:orderId/:photoId',
    Component: MinhaFoto,
  },
  // App principal com layout
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: 'eventos', Component: Events },
      { path: 'eventos/:id', Component: EventDetail },
      { path: 'carrinho', Component: Cart },
      { path: 'admin', Component: AdminDashboard },
      { path: 'admin/eventos', Component: AdminEvents },
      { path: 'admin/financeiro', Component: AdminFinanceiro },
      { path: 'admin/pedidos', Component: AdminPedidos },
      { path: 'admin/pdv', Component: AdminPDV },
      { path: 'admin/config', Component: AdminConfig },
      { path: 'admin/login', Component: AdminLogin },
    ],
  },
]);