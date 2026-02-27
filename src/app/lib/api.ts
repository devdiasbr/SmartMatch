import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-68454e9b`;

// ── Core fetch helpers ────────────────────────────────────────────────────────

/**
 * PUBLIC request — always sends the anon key as Authorization so the Supabase
 * edge-function gateway accepts the call. No user auth required.
 */
async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${publicAnonKey}`,
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data as T;
}

/**
 * ADMIN request — sends anon key as Authorization (for the Supabase gateway)
 * AND the user's JWT as X-Admin-Token (for our adminAuth middleware).
 * This permanently fixes the "HTTP 401" caused by the gateway rejecting user JWTs.
 */
async function adminRequest<T = any>(
  path: string,
  options: RequestInit = {},
  token: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${publicAnonKey}`,   // ← gateway auth
    'X-Admin-Token': token,                      // ← our middleware auth
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data as T;
}

// ── Typed shorthand ───────────────────────────────────────────────────────────

const get  = <T>(path: string) => request<T>(path, { method: 'GET' });
const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

const aGet  = <T>(path: string, token: string) =>
  adminRequest<T>(path, { method: 'GET' }, token);
const aPost = <T>(path: string, body: unknown, token: string) =>
  adminRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }, token);
const aPut  = <T>(path: string, body: unknown, token: string) =>
  adminRequest<T>(path, { method: 'PUT', body: JSON.stringify(body) }, token);
const aDel  = <T>(path: string, token: string) =>
  adminRequest<T>(path, { method: 'DELETE' }, token);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EventRecord {
  id: string;
  name: string;
  slug: string;
  date: string;
  endTime: string;
  location: string;
  status: 'disponivel' | 'encerrado';
  photoCount: number;
  faceCount: number;
  price: number;
  dayOfWeek: string;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoRecord {
  id: string;
  eventId: string;
  fileName: string;
  storagePath?: string;
  url?: string;
  tag: string;
  price: number;
  createdAt: string;
}

export interface OrderItem {
  photoId: string | number;
  eventId: string;
  eventName: string;
  tag: string;
  price: number;
  src?: string;
}

export interface OrderRecord {
  id: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  paymentMethod: 'pix' | 'card' | 'dinheiro' | 'debito' | 'credito';
  status: 'pending' | 'paid' | 'delivered' | 'cancelled';
  channel?: 'online' | 'pos';
  operatorId?: string;
  cancelledAt?: string;
  cancelReason?: string;
  mpPaymentId?: number;
  mpPreferenceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  totalPhotos: number;
  totalEvents: number;
  pendingOrders: number;
  daily: { day: string; receita: number; fotos: number }[];
  recentOrders: OrderRecord[];
}

export interface Coupon {
  code: string;
  discount: number; // percentage, e.g. 10 = 10%
  active: boolean;
}

export interface AdminConfig {
  photoPrice: number;
  coupons: Coupon[];
  mpConfigured: boolean;
  /** 'env' = Supabase Secret (priority), 'kv' = saved via admin UI, null = not set */
  mpTokenSource: 'env' | 'kv' | null;
  /** Masked preview, e.g. "TEST-12345678••••••••abcd" */
  mpTokenPreview: string | null;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {
  // ── Events (public) ──────────────────────────────────────────────────────

  getEvents: () =>
    get<{ events: EventRecord[] }>('/events'),

  getEvent: (id: string) =>
    get<{ event: EventRecord }>(`/events/${id}`),

  // ── Public Config ────────────────────────────────────────────────────────

  getPhotoPrice: () =>
    get<{ photoPrice: number }>('/config/price'),

  getPublicStats: () =>
    get<{ totalEvents: number; totalPhotos: number }>('/stats/public'),

  // ── Events (admin) ───────────────────────────────────────────────────────

  /** find-or-create by date slug */
  createEvent: (data: Partial<EventRecord>, token: string) =>
    aPost<{ event: EventRecord }>('/events', data, token),

  updateEvent: (id: string, data: Partial<EventRecord>, token: string) =>
    aPut<{ event: EventRecord }>(`/events/${id}`, data, token),

  deleteEvent: (id: string, token: string) =>
    aDel<{ success: boolean }>(`/events/${id}`, token),

  // ── Photos (public) ──────────────────────────────────────────────────────

  getEventPhotos: (eventId: string) =>
    get<{ photos: PhotoRecord[] }>(`/events/${eventId}/photos`),

  // ── Photos (admin) ───────────────────────────────────────────────────────

  uploadPhoto: (
    eventId: string,
    data: { base64: string; fileName: string; mimeType: string; tag: string },
    token: string,
  ) => aPost<{ photo: PhotoRecord }>(`/events/${eventId}/photos`, data, token),

  deletePhoto: (eventId: string, photoId: string, token: string) =>
    aDel<{ success: boolean }>(`/events/${eventId}/photos/${photoId}`, token),

  // ── Orders ───────────────────────────────────────────────────────────────

  createOrder: (data: {
    items: OrderItem[];
    customerEmail: string;
    customerName: string;
    paymentMethod: 'pix' | 'card';
  }) => post<{ order: OrderRecord }>('/orders', data),

  getOrders: (token: string) =>
    aGet<{ orders: OrderRecord[] }>('/orders', token),

  getOrder: (id: string) =>
    get<{ order: OrderRecord }>(`/orders/${id}`),

  updateOrderStatus: (id: string, data: { status: string }, token: string) =>
    aPut<{ order: OrderRecord }>(`/orders/${id}`, data, token),

  cancelOrder: (id: string, reason: string, token: string) =>
    aPost<{ order: OrderRecord; refundResult?: any }>(`/orders/${id}/cancel`, { reason }, token),

  createPosOrder: (data: {
    items: OrderItem[];
    customerName: string;
    paymentMethod: string;
  }, token: string) =>
    aPost<{ order: OrderRecord }>('/orders/pos', data, token),

  // ── Admin Stats ──────────────────────────────────────────────────────

  getAdminStats: (token: string) =>
    aGet<AdminStats>('/admin/stats', token),

  // ── Admin Config ─────────────────────────────────────────────────────────

  getAdminConfig: (token: string) =>
    aGet<AdminConfig>('/admin/config', token),

  updateAdminConfig: (data: Partial<AdminConfig> & { mpToken?: string }, token: string) =>
    aPut<{ config: AdminConfig }>('/admin/config', data, token),

  // ── Payments (Mercado Pago) ───────────────────────────────────────────────

  createPixPayment: (data: {
    amount: number;
    customerEmail: string;
    customerName: string;
    orderId: string;
    cpf?: string;
  }) =>
    post<{ paymentId: number; qrCode: string; qrCodeBase64: string; ticketUrl?: string; status: string }>(
      '/payments/pix',
      data,
    ),

  createCardPreference: (data: {
    amount: number;
    customerEmail: string;
    orderId: string;
    successUrl: string;
    failureUrl: string;
    pendingUrl: string;
  }) =>
    post<{ preferenceId: string; checkoutUrl: string; sandboxUrl: string }>(
      '/payments/preference',
      data,
    ),

  // ── Face Descriptors ─────────────────────────────────────────────────────

  /** Salva descritores faciais de uma foto (chamado pelo admin após upload) */
  saveFaceDescriptors: (
    eventId: string,
    photoId: string,
    descriptors: number[][],
    token: string,
  ) =>
    aPost<{ success: boolean }>(
      `/events/${eventId}/photos/${photoId}/faces`,
      { descriptors },
      token,
    ),

  /** Busca todos os descritores do evento para comparação client-side */
  getEventFaces: (eventId: string) =>
    get<{ faces: { photoId: string; descriptors: number[][] }[] }>(
      `/events/${eventId}/faces`,
    ),

  // ── Auth ─────────────────────────────────────────────────────────────────

  registerAdmin: (data: { email: string; password: string; name: string }) =>
    post<{ user: any }>('/auth/register', data),
};