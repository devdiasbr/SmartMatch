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

  console.log(`[API] Request ${options.method ?? 'GET'} ${BASE}${path}`);
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  console.log(`[API] Response ${res.status} ${res.statusText}`);
  const data = await res.json().catch((e) => {
    console.error('[API] Erro ao parsear JSON:', e);
    return {};
  });

  if (!res.ok) {
    console.error('[API] Erro HTTP:', res.status, data);
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

/**
 * ADMIN multipart upload — envia FormData binário sem base64.
 * NÃO define Content-Type: o browser precisa definir automaticamente
 * com o boundary correto do multipart (ex: "multipart/form-data; boundary=----XYZ").
 * Definir Content-Type manualmente quebraria o parse no servidor.
 */
async function adminFormData<T = any>(path: string, body: FormData, token: string): Promise<T> {
  const headers: Record<string, string> = {
    // SEM Content-Type — browser define multipart/form-data + boundary
    Authorization: `Bearer ${publicAnonKey}`,
    'X-Admin-Token': token,
  };
  console.log(`[API] Enviando FormData para ${BASE}${path}`);
  const res = await fetch(`${BASE}${path}`, { method: 'POST', body, headers });
  console.log(`[API] Resposta: ${res.status} ${res.statusText}`);
  const data = await res.json().catch((e) => {
    console.error('[API] Erro ao parsear JSON:', e);
    return {};
  });
  if (!res.ok) {
    console.error('[API] Erro HTTP:', res.status, data);
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data as T;
}

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
  sessionType?: string;
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

export interface BrandingConfig {
  appName: string;
  pageTitle: string;
  watermarkText: string;
  watermarkProducer: string;
  watermarkPhotoTag: string;
  watermarkTour: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  backgroundUrls: string[];
  ctaBgUrl: string | null;
  scannerImageUrl: string | null;
  hasLogo: boolean;
  hasFavicon: boolean;
  backgroundCount: number;
  updatedAt: string | null;
  // Venue / tour identity
  venueName: string;
  venueLocation: string;
  tourLabel: string;
  homeExclusiveText: string;
  // Home content
  heroLine1: string;
  heroLine2: string;
  heroLine3: string;
  heroSubtitle: string;
  heroCTA: string;
  heroBadge: string;
  // Home CTA banner
  ctaTitle1: string;
  ctaTitle2: string;
  ctaSubtitle: string;
  ctaButton: string;
  // Events content
  eventsHeroTitle: string;
  eventsHeroTitleAccent: string;
  eventsHeroSubtitle: string;
  eventsListTitle: string;
  // Session types
  eventSessionTypes: string[];
  // Background slideshow
  bgTransitionInterval: number; // seconds
}

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {
  // ── Events (public) — pass org for multi-tenant ──────────────────────────

  getEvents: (org?: string) =>
    get<{ events: EventRecord[] }>(`/events${org ? `?org=${org}` : ''}`),

  getEvent: (id: string, org?: string) =>
    get<{ event: EventRecord }>(`/events/${id}${org ? `?org=${org}` : ''}`),

  // ── Public Branding ─────────────────────────────────────────────────────
  getPublicBranding: (org?: string) =>
    get<BrandingConfig>(`/branding/public${org ? `?org=${org}` : ''}`),

  // ── Public Config ────────────────────────────────────────────────────────

  getPhotoPrice: (org?: string) =>
    get<{ photoPrice: number }>(`/config/price${org ? `?org=${org}` : ''}`),

  getPublicStats: (org?: string) =>
    get<{ totalEvents: number; totalPhotos: number }>(`/stats/public${org ? `?org=${org}` : ''}`),

  // ── Events (admin) ───────────────────────────────────────────────────────

  /** List events scoped to the authenticated admin (uses JWT, no query param needed) */
  getAdminEvents: (token: string) =>
    aGet<{ events: EventRecord[] }>('/admin/events', token),

  /** find-or-create by date slug */
  createEvent: (data: Partial<EventRecord> & { sessionType?: string }, token: string) =>
    aPost<{ event: EventRecord }>('/events', data, token),

  updateEvent: (id: string, data: Partial<EventRecord>, token: string) =>
    aPut<{ event: EventRecord }>(`/events/${id}`, data, token),

  deleteEvent: (id: string, token: string) =>
    aDel<{ success: boolean }>(`/events/${id}`, token),

  // ── Photos (public) ──────────────────────────────────────────────────────

  getEventPhotos: (eventId: string, page = 1, limit = 20, org?: string) =>
    get<{ photos: PhotoRecord[]; total: number; page: number; totalPages: number; limit: number }>(
      `/events/${eventId}/photos?page=${page}&limit=${limit}${org ? `&org=${org}` : ''}`,
    ),

  // ── Photos (admin) ───────────────────────────────────────────────────────

  uploadPhoto: (
    eventId: string,
    data: { base64: string; fileName: string; mimeType: string; tag: string },
    token: string,
  ) => aPost<{ photo: PhotoRecord }>(`/events/${eventId}/photos`, data, token),

  /**
   * Upload binário via multipart/form-data — sem base64.
   * 37% menos payload, sem encode/decode, streaming zero-copy até o Storage.
   * Usa o endpoint POST /events/:id/photos/stream.
   */
  uploadPhotoStream: (
    eventId: string,
    blob: Blob,
    fileName: string,
    tag: string,
    token: string,
  ) => {
    const fd = new FormData();
    fd.append('file', blob, fileName);
    fd.append('tag', tag);
    return adminFormData<{ photo: PhotoRecord }>(`/events/${eventId}/photos/stream`, fd, token);
  },

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

  // ── Admin Stats ─────────────────────────────────────────────────────

  getAdminStats: (token: string) =>
    aGet<AdminStats>('/admin/stats', token),

  // ── Admin Branding ────────────────────────────────────────────────────────
  getAdminBranding: (token: string) =>
    aGet<BrandingConfig>('/admin/branding', token),

  updateAdminBranding: (data: Partial<Pick<BrandingConfig,
    'appName' | 'pageTitle' |
    'watermarkText' | 'watermarkProducer' | 'watermarkPhotoTag' | 'watermarkTour' |
    'venueName' | 'venueLocation' | 'tourLabel' | 'homeExclusiveText' |
    'heroLine1' | 'heroLine2' | 'heroLine3' | 'heroSubtitle' | 'heroCTA' | 'heroBadge' |
    'ctaTitle1' | 'ctaTitle2' | 'ctaSubtitle' | 'ctaButton' |
    'eventsHeroTitle' | 'eventsHeroTitleAccent' | 'eventsHeroSubtitle' | 'eventsListTitle' |
    'eventSessionTypes' | 'bgTransitionInterval'
  >>, token: string) =>
    aPut<{ success: boolean }>('/admin/branding', data, token),

  uploadBrandingAsset: (data: { type: 'logo' | 'favicon' | 'background' | 'cta-background' | 'scanner-image'; base64: string; mimeType: string }, token: string) =>
    aPost<{ url: string | null; path: string }>('/admin/branding/upload', data, token),

  deleteBrandingAsset: (asset: 'logo' | 'favicon' | 'cta-background' | 'scanner-image', token: string) =>
    aDel<{ success: boolean }>(`/admin/branding/asset/${asset}`, token),

  deleteBrandingBackground: (index: number, token: string) =>
    aDel<{ success: boolean }>(`/admin/branding/backgrounds/${index}`, token),

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
    installments?: number;
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

  /** Busca todos os descritores do evento para comparação client-side (legado) */
  getEventFaces: (eventId: string, org?: string) =>
    get<{ faces: { photoId: string; descriptors: number[][] }[] }>(
      `/events/${eventId}/faces${org ? `?org=${org}` : ''}`,
    ),

  /**
   * Busca fotos por embedding no pgvector (server-side ANN search).
   * Envia apenas 1 vetor 128-dim, recebe IDs das fotos com match.
   * Muito mais rápido que baixar todos os descritores: O(log n) vs O(n).
   */
  searchFacesByEmbedding: (
    eventId: string,
    embedding: number[],
    threshold?: number,
    org?: string,
  ) =>
    post<{ matches: { photoId: string; similarity: number }[] }>(
      '/faces/search',
      { eventId, embedding, ...(threshold !== undefined ? { threshold } : {}), ...(org ? { org } : {}) },
    ),

  // ── Sync Storage → KV ───────────────────────────────────────────────────
  syncStorage: (token: string, skipComplete = false) =>
    aPost<{ stats: { eventsCreated: number; photosImported: number; errors: string[] } }>(
      `/admin/sync-storage${skipComplete ? '?skipComplete=true' : ''}`,
      {},
      token,
    ),

  // ── KV Diagnostic ──────────────────────────────────────────────────────
  diagnoseKv: (token: string) =>
    aGet<{ total: number; events: { id: string; name: string; photoCount: number; photosKey: string; hasList: boolean }[] }>(
      '/admin/diagnose-kv',
      token,
    ),
};