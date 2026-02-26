import { createBrowserRouter } from 'react-router';
import { Root } from './components/Root';
import { Home } from './pages/Home';
import { Events } from './pages/Events';
import { EventDetail } from './pages/EventDetail';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminEvents } from './pages/AdminEvents';
import { Cart } from './pages/Cart';

export const router = createBrowserRouter([
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
    ],
  },
]);