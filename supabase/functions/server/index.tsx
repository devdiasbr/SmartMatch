import { Hono } from "npm:hono@4";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import * as faces from "./faces.ts";

const BUCKET = "make-68454e9b-eventface";
const KV = "ef:"; // Global entity prefix

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ── Supabase admin client (singleton) ────────────────────────────────────────

let _sb: ReturnType<typeof createClient> | null = null;
function sb() {
  if (!_sb) {
    _sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _sb;
}

// ── In-memory branding cache ──────────────────────────────────────────────────

interface BrandingCacheEntry { data: any; ts: number; }
const brandingCacheMap = new Map<string, BrandingCacheEntry>();
const BRANDING_TTL = 30_000; // 30 s

function bustBrandingCache() {
  brandingCacheMap.clear();
}

// ── JWT crypto helpers ────────────────────────────────────────────────────────

function base64UrlDecode(str: string): Uint8Array {
  const pad = str.length % 4;
  const padded = pad ? str + "=".repeat(4 - pad) : str;
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifySupabaseJWT(jwt: string): Promise<{ userId: string } | null> {
  try {
    const secret = Deno.env.get("SUPABASE_JWT_SECRET");
    if (!secret) {
      console.log("[adminAuth] SUPABASE_JWT_SECRET não configurado — fallback necessário");
      return null;
    }
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const message = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = base64UrlDecode(parts[2]);
    const valid = await crypto.subtle.verify({ name: "HMAC" }, key, signature, message);
    if (!valid) {
      console.log("[adminAuth] Assinatura JWT inválida");
      return null;
    }

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.log(`[adminAuth] Token expirado (exp=${payload.exp})`);
      return null;
    }

    if (!payload.sub) {
      console.log("[adminAuth] sub ausente no payload JWT");
      return null;
    }

    return { userId: payload.sub };
  } catch (err) {
    console.log("[adminAuth] Erro ao verificar JWT:", err);
    return null;
  }
}

// ── Admin auth middleware ─────────────────────────────────────────────────────
// Single-tenant: any authenticated user can access all admin routes.

async function adminAuth(c: any, next: () => Promise<void>) {
  const adminToken = c.req.header("X-Admin-Token");

  if (!adminToken) {
    console.log("adminAuth: X-Admin-Token ausente");
    return c.json({ error: "Não autorizado: token de admin ausente (X-Admin-Token)" }, 401);
  }

  // Primary: cryptographic JWT verification
  const verified = await verifySupabaseJWT(adminToken);
  if (verified?.userId) {
    const { data: { user }, error } = await sb().auth.admin.getUserById(verified.userId);
    if (error || !user) {
      console.log("adminAuth: usuário não encontrado:", error?.message);
      return c.json({ error: "Não autorizado: usuário não encontrado" }, 401);
    }
    c.set("userId", user.id);
    return await next();
  }

  // Fallback: session-based validation
  console.log("adminAuth: verificação crypto falhou, usando getUser() como fallback");
  const { data: { user }, error } = await sb().auth.getUser(adminToken);
  if (error || !user) {
    console.log("adminAuth getUser() falhou:", error?.message ?? "token inválido");
    return c.json({ error: `Não autorizado: ${error?.message ?? "token inválido"}` }, 401);
  }

  c.set("userId", user.id);
  await next();
}

// ── KV helpers ────────────────────────────────────────────────────────────────

async function getList(key: string): Promise<string[]> {
  const v = await kv.get(key);
  return Array.isArray(v) ? v : [];
}

async function appendToList(key: string, id: string) {
  const list = await getList(key);
  if (!list.includes(id)) {
    list.push(id);
    await kv.set(key, list);
  }
}

async function removeFromList(key: string, id: string) {
  const list = await getList(key);
  await kv.set(key, list.filter((i) => i !== id));
}

// ── Flatten tenant data → global (one-time repair) ────────────────────────────
// Runs once per cold start per userId. If the global ef:events:index is empty
// but the user's tenant prefix has data, copy it to global. This fixes the
// state left behind by the old multi-tenant system.
const _flattenRan = new Set<string>();

async function flattenToGlobal(userId: string): Promise<void> {
  if (_flattenRan.has(userId)) return;
  _flattenRan.add(userId);

  try {
    const globalEvents = await getList(`${KV}events:index`);
    if (globalEvents.length > 0) return; // already have global data

    const tenantPrefix = `ef:${userId}:`;
    const tenantEvents = await getList(`${tenantPrefix}events:index`);
    if (tenantEvents.length > 0) {
      await kv.set(`${KV}events:index`, tenantEvents);
      console.log(`[flattenToGlobal] Copiou ${tenantEvents.length} eventos de ${tenantPrefix}`);
    }

    const globalOrders = await getList(`${KV}orders:index`);
    if (!globalOrders.length) {
      const tenantOrders = await getList(`${tenantPrefix}orders:index`);
      if (tenantOrders.length > 0) {
        await kv.set(`${KV}orders:index`, tenantOrders);
        console.log(`[flattenToGlobal] Copiou ${tenantOrders.length} pedidos de ${tenantPrefix}`);
      }
    }

    if (!await kv.get(`${KV}config`)) {
      const tc = await kv.get(`${tenantPrefix}config`);
      if (tc) { await kv.set(`${KV}config`, tc); console.log(`[flattenToGlobal] Copiou config`); }
    }

    if (!await kv.get(`${KV}branding`)) {
      const tb = await kv.get(`${tenantPrefix}branding`);
      if (tb) { await kv.set(`${KV}branding`, tb); bustBrandingCache(); console.log(`[flattenToGlobal] Copiou branding`); }
    }
  } catch (err) {
    console.log("[flattenToGlobal] Erro:", err);
    _flattenRan.delete(userId); // allow retry
  }
}

// ── Storage init ──────────────────────────────────────────────────────────────

async function initStorage() {
  try {
    const { data: buckets } = await sb().storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET)) {
      await sb().storage.createBucket(BUCKET, { public: false });
      console.log(`Bucket ${BUCKET} criado`);
    }
  } catch (e) {
    console.log("Erro ao inicializar storage:", e);
  }
}

initStorage();

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/make-server-68454e9b/health", (c) => c.json({ status: "ok" }));

// ── Public Stats ──────────────────────────────────────────────────────────────

app.get("/make-server-68454e9b/stats/public", async (c) => {
  try {
    const eventIds = await getList(`${KV}events:index`);
    const events: any[] = (
      await Promise.all(eventIds.map((id) => kv.get(`${KV}event:${id}`)))
    ).filter(Boolean);

    const totalEvents = events.length;
    const totalPhotos = events.reduce((sum, e) => sum + (e.photoCount ?? 0), 0);

    return c.json({ totalEvents, totalPhotos });
  } catch (err) {
    console.log("Erro ao buscar stats públicas:", err);
    return c.json({ totalEvents: 0, totalPhotos: 0 });
  }
});

// ── Branding ──────────────────────────────────────────────────────────────────

async function brandingWithUrls(bustCache = false) {
  const cacheKey = "global";
  const now = Date.now();
  const cached = brandingCacheMap.get(cacheKey);
  if (!bustCache && cached && now - cached.ts < BRANDING_TTL) {
    return cached.data;
  }

  const b: any = (await kv.get(`${KV}branding`)) ?? {};
  console.log(`[brandingWithUrls] Branding KV:`, {
    logoPath: b.logoPath, faviconPath: b.faviconPath,
    ctaBgPath: b.ctaBgPath, scannerImagePath: b.scannerImagePath,
    backgroundPaths: b.backgroundPaths,
  });

  const pathsToSign: string[] = [
    b.logoPath, b.faviconPath, b.ctaBgPath, b.scannerImagePath,
    ...(b.backgroundPaths ?? []),
  ].filter(Boolean) as string[];

  const urlMap: Record<string, string> = {};
  if (pathsToSign.length > 0) {
    const { data: signed, error } = await sb().storage
      .from(BUCKET)
      .createSignedUrls(pathsToSign, 3600);
    console.log(`[brandingWithUrls] Signed URLs: ${signed?.length ?? 0}, error: ${error?.message}`);
    for (const item of signed ?? []) {
      if (item.signedUrl) urlMap[item.path] = item.signedUrl;
    }
  }

  const logoUrl         = b.logoPath         ? (urlMap[b.logoPath]         ?? null) : null;
  const faviconUrl      = b.faviconPath      ? (urlMap[b.faviconPath]      ?? null) : null;
  const ctaBgUrl        = b.ctaBgPath        ? (urlMap[b.ctaBgPath]        ?? null) : null;
  const scannerImageUrl = b.scannerImagePath ? (urlMap[b.scannerImagePath] ?? null) : null;
  const backgroundUrls  = (b.backgroundPaths ?? []).map((p: string) => urlMap[p]).filter(Boolean) as string[];

  const result = {
    appName: b.appName ?? "Smart Match",
    pageTitle: b.pageTitle ?? "Smart Match – Tour Palmeiras",
    watermarkText: b.watermarkText ?? "SMART MATCH",
    watermarkProducer: b.watermarkProducer ?? "EDU SANTANA PRODUÇÕES",
    watermarkPhotoTag: b.watermarkPhotoTag ?? "◆ FOTO PROTEGIDA ◆",
    watermarkTour: b.watermarkTour ?? "© TOUR PALMEIRAS",
    logoUrl, faviconUrl, backgroundUrls, ctaBgUrl, scannerImageUrl,
    hasLogo: !!b.logoPath, hasFavicon: !!b.faviconPath,
    backgroundCount: (b.backgroundPaths ?? []).length,
    updatedAt: b.updatedAt ?? null,
    venueName: b.venueName ?? "Allianz Parque",
    venueLocation: b.venueLocation ?? "São Paulo, SP",
    tourLabel: b.tourLabel ?? "Tour",
    homeExclusiveText: b.homeExclusiveText ?? "Exclusivo Allianz Parque",
    heroLine1: b.heroLine1 ?? "Você vibrou.",
    heroLine2: b.heroLine2 ?? "Você torceu.",
    heroLine3: b.heroLine3 ?? "Encontre-se.",
    heroSubtitle: b.heroSubtitle ?? "Nossa IA varre milhares de fotos do Tour do Allianz Parque e localiza você em segundos. Compre apenas o que importa — os seus momentos.",
    heroCTA: b.heroCTA ?? "Ver eventos",
    heroBadge: b.heroBadge ?? "Allianz Parque · Tour Oficial do Palmeiras",
    ctaTitle1: b.ctaTitle1 ?? "Pronto para encontrar",
    ctaTitle2: b.ctaTitle2 ?? "seus momentos?",
    ctaSubtitle: b.ctaSubtitle ?? "Tire uma selfie e nossa IA encontra você em segundos entre milhares de fotos.",
    ctaButton: b.ctaButton ?? "Ver eventos",
    eventsHeroTitle: b.eventsHeroTitle ?? "Reviva seus",
    eventsHeroTitleAccent: b.eventsHeroTitleAccent ?? "Momentos no Allianz",
    eventsHeroSubtitle: b.eventsHeroSubtitle ?? "Busca com reconhecimento facial. Encontre suas fotos pelo data e horário do tour.",
    eventsListTitle: b.eventsListTitle ?? "Tours Disponíveis",
    eventSessionTypes: (() => {
      const OLD_DEFAULTS = ["Tour", "Partida", "Confraternização", "Show", "Corporativo"];
      const stored: string[] = Array.isArray(b.eventSessionTypes) ? b.eventSessionTypes : [];
      const isOldDefault = stored.length === OLD_DEFAULTS.length && OLD_DEFAULTS.every((v, i) => stored[i] === v);
      if (stored.length === 0 || isOldDefault) return ["Tour"];
      return stored;
    })(),
    bgTransitionInterval: typeof b.bgTransitionInterval === 'number' ? b.bgTransitionInterval : 5,
  };

  brandingCacheMap.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

// Public branding (no auth)
app.get("/make-server-68454e9b/branding/public", async (c) => {
  try {
    return c.json(await brandingWithUrls(false));
  } catch (err) {
    console.log("Erro ao buscar branding público:", err);
    return c.json({
      appName: "Smart Match", pageTitle: "Smart Match – Tour Palmeiras",
      watermarkText: "SMART MATCH", watermarkProducer: "EDU SANTANA PRODUÇÕES",
      watermarkPhotoTag: "◆ FOTO PROTEGIDA ◆", watermarkTour: "© TOUR PALMEIRAS",
      logoUrl: null, faviconUrl: null, backgroundUrls: [], ctaBgUrl: null, scannerImageUrl: null,
      hasLogo: false, hasFavicon: false, backgroundCount: 0, updatedAt: null,
      venueName: "Allianz Parque", venueLocation: "São Paulo, SP",
      tourLabel: "Tour", homeExclusiveText: "Exclusivo Allianz Parque",
    });
  }
});

// Admin branding GET
app.get("/make-server-68454e9b/admin/branding", adminAuth, async (c) => {
  try {
    return c.json(await brandingWithUrls(true));
  } catch (err) {
    return c.json({ error: `Erro ao buscar branding: ${err}` }, 500);
  }
});

// Admin branding PUT (text fields only)
app.put("/make-server-68454e9b/admin/branding", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const existing: any = (await kv.get(`${KV}branding`)) ?? {};
    const updated = {
      ...existing,
      appName: body.appName ?? existing.appName,
      pageTitle: body.pageTitle ?? existing.pageTitle,
      watermarkText: body.watermarkText ?? existing.watermarkText,
      watermarkProducer: body.watermarkProducer ?? existing.watermarkProducer,
      watermarkPhotoTag: body.watermarkPhotoTag ?? existing.watermarkPhotoTag,
      watermarkTour: body.watermarkTour ?? existing.watermarkTour,
      venueName: body.venueName !== undefined ? body.venueName : existing.venueName,
      venueLocation: body.venueLocation !== undefined ? body.venueLocation : existing.venueLocation,
      tourLabel: body.tourLabel !== undefined ? body.tourLabel : existing.tourLabel,
      homeExclusiveText: body.homeExclusiveText !== undefined ? body.homeExclusiveText : existing.homeExclusiveText,
      heroLine1: body.heroLine1 !== undefined ? body.heroLine1 : existing.heroLine1,
      heroLine2: body.heroLine2 !== undefined ? body.heroLine2 : existing.heroLine2,
      heroLine3: body.heroLine3 !== undefined ? body.heroLine3 : existing.heroLine3,
      heroSubtitle: body.heroSubtitle !== undefined ? body.heroSubtitle : existing.heroSubtitle,
      heroCTA: body.heroCTA !== undefined ? body.heroCTA : existing.heroCTA,
      heroBadge: body.heroBadge !== undefined ? body.heroBadge : existing.heroBadge,
      ctaTitle1: body.ctaTitle1 !== undefined ? body.ctaTitle1 : existing.ctaTitle1,
      ctaTitle2: body.ctaTitle2 !== undefined ? body.ctaTitle2 : existing.ctaTitle2,
      ctaSubtitle: body.ctaSubtitle !== undefined ? body.ctaSubtitle : existing.ctaSubtitle,
      ctaButton: body.ctaButton !== undefined ? body.ctaButton : existing.ctaButton,
      eventsHeroTitle: body.eventsHeroTitle !== undefined ? body.eventsHeroTitle : existing.eventsHeroTitle,
      eventsHeroTitleAccent: body.eventsHeroTitleAccent !== undefined ? body.eventsHeroTitleAccent : existing.eventsHeroTitleAccent,
      eventsHeroSubtitle: body.eventsHeroSubtitle !== undefined ? body.eventsHeroSubtitle : existing.eventsHeroSubtitle,
      eventsListTitle: body.eventsListTitle !== undefined ? body.eventsListTitle : existing.eventsListTitle,
      eventSessionTypes: body.eventSessionTypes !== undefined ? body.eventSessionTypes : existing.eventSessionTypes,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`${KV}branding`, updated);
    bustBrandingCache();
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Erro ao salvar branding: ${err}` }, 500);
  }
});

// Upload logo / favicon / background
app.post("/make-server-68454e9b/admin/branding/upload", adminAuth, async (c) => {
  try {
    const { type, base64, mimeType = "image/png" } = await c.req.json();
    if (!base64 || !type) return c.json({ error: "type e base64 obrigatórios" }, 400);
    if (!["logo", "favicon", "background", "cta-background", "scanner-image"].includes(type))
      return c.json({ error: "type deve ser logo, favicon, background, cta-background ou scanner-image" }, 400);

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const extMap: Record<string, string> = {
      "image/jpeg": "jpg", "image/jpg": "jpg",
      "image/png": "png", "image/webp": "webp",
      "image/svg+xml": "svg", "image/x-icon": "ico", "image/gif": "gif",
    };
    const ext = extMap[mimeType] ?? "png";
    const ts = Date.now();
    const storagePath = type === "logo"
      ? `branding/logo-${ts}.${ext}`
      : type === "favicon"
        ? `branding/favicon-${ts}.${ext}`
        : type === "cta-background"
          ? `branding/cta-bg/cta-${ts}.${ext}`
          : type === "scanner-image"
            ? `branding/scanner/scanner-${ts}.${ext}`
            : `branding/bg/bg-${ts}.${ext}`;

    const { error: uploadError } = await sb().storage
      .from(BUCKET).upload(storagePath, bytes, { contentType: mimeType, upsert: false });
    if (uploadError) return c.json({ error: `Upload erro: ${uploadError.message}` }, 500);

    const existing: any = (await kv.get(`${KV}branding`)) ?? {};

    if (type === "logo" && existing.logoPath) {
      await sb().storage.from(BUCKET).remove([existing.logoPath]);
    } else if (type === "favicon" && existing.faviconPath) {
      await sb().storage.from(BUCKET).remove([existing.faviconPath]);
    } else if (type === "cta-background" && existing.ctaBgPath) {
      await sb().storage.from(BUCKET).remove([existing.ctaBgPath]);
    } else if (type === "scanner-image" && existing.scannerImagePath) {
      await sb().storage.from(BUCKET).remove([existing.scannerImagePath]);
    }

    const updated: any = { ...existing, updatedAt: new Date().toISOString() };
    if (type === "logo") updated.logoPath = storagePath;
    else if (type === "favicon") updated.faviconPath = storagePath;
    else if (type === "cta-background") updated.ctaBgPath = storagePath;
    else if (type === "scanner-image") updated.scannerImagePath = storagePath;
    else updated.backgroundPaths = [...(existing.backgroundPaths ?? []), storagePath];

    await kv.set(`${KV}branding`, updated);
    bustBrandingCache();

    const { data: signData } = await sb().storage.from(BUCKET).createSignedUrl(storagePath, 3600);
    return c.json({ url: signData?.signedUrl ?? null, path: storagePath });
  } catch (err) {
    return c.json({ error: `Erro no upload de branding: ${err}` }, 500);
  }
});

// Delete logo / favicon / etc.
app.delete("/make-server-68454e9b/admin/branding/asset/:asset", adminAuth, async (c) => {
  try {
    const asset = c.req.param("asset");
    if (!["logo", "favicon", "cta-background", "scanner-image"].includes(asset))
      return c.json({ error: "Asset deve ser logo, favicon, cta-background ou scanner-image" }, 400);

    const existing: any = (await kv.get(`${KV}branding`)) ?? {};
    const pathKey = asset === "logo" ? "logoPath" : asset === "favicon" ? "faviconPath" : asset === "scanner-image" ? "scannerImagePath" : "ctaBgPath";
    if (existing[pathKey]) {
      await sb().storage.from(BUCKET).remove([existing[pathKey]]);
    }
    await kv.set(`${KV}branding`, { ...existing, [pathKey]: null, updatedAt: new Date().toISOString() });
    bustBrandingCache();
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Erro ao remover asset: ${err}` }, 500);
  }
});

// Delete background by index
app.delete("/make-server-68454e9b/admin/branding/backgrounds/:index", adminAuth, async (c) => {
  try {
    const idx = parseInt(c.req.param("index"));
    const existing: any = (await kv.get(`${KV}branding`)) ?? {};
    const paths: string[] = [...(existing.backgroundPaths ?? [])];
    if (idx < 0 || idx >= paths.length) return c.json({ error: "Índice inválido" }, 400);

    const [removed] = paths.splice(idx, 1);
    await sb().storage.from(BUCKET).remove([removed]);
    await kv.set(`${KV}branding`, { ...existing, backgroundPaths: paths, updatedAt: new Date().toISOString() });
    bustBrandingCache();
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Erro ao remover background: ${err}` }, 500);
  }
});

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post("/make-server-68454e9b/auth/register", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email e senha são obrigatórios" }, 400);
    }

    const { data, error } = await sb().auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name ?? "Admin" },
      email_confirm: true,
    });

    if (error) {
      return c.json({ error: `Erro ao registrar usuário: ${error.message}` }, 400);
    }
    return c.json({ user: data.user }, 201);
  } catch (err) {
    console.log("Erro no register:", err);
    return c.json({ error: `Erro interno ao registrar: ${err}` }, 500);
  }
});

// ── Events ────────────────────────────────────────────────────────────────────

// List events for admin
app.get("/make-server-68454e9b/admin/events", adminAuth, async (c) => {
  try {
    await flattenToGlobal(c.get("userId"));
    const ids = await getList(`${KV}events:index`);
    const events = (await Promise.all(ids.map((id) => kv.get(`${KV}event:${id}`)))).filter(Boolean);
    (events as any[]).sort((a: any, b: any) => a.date.localeCompare(b.date));
    return c.json({ events });
  } catch (err) {
    console.log("Erro ao listar eventos (admin):", err);
    return c.json({ error: `Erro ao listar eventos: ${err}` }, 500);
  }
});

// List all events (public)
app.get("/make-server-68454e9b/events", async (c) => {
  try {
    const ids = await getList(`${KV}events:index`);
    const events = (await Promise.all(ids.map((id) => kv.get(`${KV}event:${id}`)))).filter(Boolean);
    (events as any[]).sort((a: any, b: any) => a.date.localeCompare(b.date));
    return c.json({ events });
  } catch (err) {
    console.log("Erro ao listar eventos:", err);
    return c.json({ error: `Erro ao listar eventos: ${err}` }, 500);
  }
});

// Get single event (public)
app.get("/make-server-68454e9b/events/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const event = await kv.get(`${KV}event:${id}`);
    if (!event) return c.json({ error: "Evento não encontrado" }, 404);
    return c.json({ event });
  } catch (err) {
    console.log("Erro ao buscar evento:", err);
    return c.json({ error: `Erro ao buscar evento: ${err}` }, 500);
  }
});

// Get current photo price (public)
app.get("/make-server-68454e9b/config/price", async (c) => {
  try {
    const cfg: any = (await kv.get(`${KV}config`)) ?? {};
    return c.json({ photoPrice: cfg.photoPrice ?? 30 });
  } catch (err) {
    console.log("Erro ao buscar preço:", err);
    return c.json({ photoPrice: 30 });
  }
});

// ── Slug helper ───────────────────────────────────────────────────────────────

function dateToSlug(dateStr: string): string {
  const d = new Date(dateStr);
  const day   = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year  = d.getFullYear().toString();
  const hours = d.getHours().toString().padStart(2, "0");
  const mins  = d.getMinutes().toString().padStart(2, "0");
  return `${day}${month}${year}${hours}${mins}`;
}

function dayOfWeekPT(date: Date): string {
  const names = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
  return names[date.getDay()] ?? "";
}

// Create event (admin) — find-or-create by slug
app.post("/make-server-68454e9b/events", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const now = new Date().toISOString();

    const dateISO = body.date ?? now;
    const slug = body.slug ?? dateToSlug(dateISO);

    let finalSlug = slug;
    const existing: any = await kv.get(`${KV}event:${slug}`);
    if (existing) {
      return c.json({ event: existing }, 200);
    }

    const d = new Date(dateISO);
    const day   = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year  = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const mins  = d.getMinutes().toString().padStart(2, "0");

    const cfg: any = (await kv.get(`${KV}config`)) ?? {};
    const photoPrice: number = cfg.photoPrice ?? 30;

    const branding: any = (await kv.get(`${KV}branding`)) ?? {};
    const defaultSessionType = Array.isArray(branding.eventSessionTypes) && branding.eventSessionTypes.length > 0
      ? branding.eventSessionTypes[0]
      : "Tour";
    const sessionType: string = body.sessionType ?? defaultSessionType;
    const venueName: string = branding.venueName ?? "Allianz Parque";
    const venueLocation: string = branding.venueLocation ?? "São Paulo, SP";
    const location = `${venueName}, ${venueLocation}`;

    const event = {
      id: finalSlug,
      name: `${sessionType} ${day}/${month}/${year}, ${hours}:${mins}`,
      slug: finalSlug,
      date: dateISO,
      endTime: body.endTime ?? "",
      location,
      sessionType,
      status: "disponivel",
      photoCount: 0,
      faceCount: 0,
      price: photoPrice,
      dayOfWeek: dayOfWeekPT(d),
      createdAt: now,
      updatedAt: now,
    };

    await kv.set(`${KV}event:${finalSlug}`, event);
    await appendToList(`${KV}events:index`, finalSlug);
    return c.json({ event }, 201);
  } catch (err) {
    console.log("Erro ao criar evento:", err);
    return c.json({ error: `Erro ao criar evento: ${err}` }, 500);
  }
});

// Update event (admin)
app.put("/make-server-68454e9b/events/:id", adminAuth, async (c) => {
  try {
    const id = c.req.param("id");
    const existing: any = await kv.get(`${KV}event:${id}`);
    if (!existing) return c.json({ error: "Evento não encontrado" }, 404);
    const body = await c.req.json();
    const updated = { ...existing, ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`${KV}event:${id}`, updated);
    return c.json({ event: updated });
  } catch (err) {
    console.log("Erro ao atualizar evento:", err);
    return c.json({ error: `Erro ao atualizar evento: ${err}` }, 500);
  }
});

// Delete event (admin)
app.delete("/make-server-68454e9b/events/:id", adminAuth, async (c) => {
  try {
    const id = c.req.param("id");
    const eventToDelete: any = await kv.get(`${KV}event:${id}`);
    if (!eventToDelete) return c.json({ error: "Evento não encontrado" }, 404);

    const photoIds = await getList(`${KV}photos:event:${id}`);
    for (const pid of photoIds) {
      const photo: any = await kv.get(`${KV}photo:${pid}`);
      if (photo?.storagePath) {
        await sb().storage.from(BUCKET).remove([photo.storagePath]);
      }
      await kv.del(`${KV}photo:${pid}`);
    }
    await kv.del(`${KV}photos:event:${id}`);
    await kv.del(`${KV}faces:event:${id}`);
    await kv.del(`${KV}event:${id}`);
    await removeFromList(`${KV}events:index`, id);

    faces.deleteFacesByEvent(id).catch((e) =>
      console.log(`pgvector deleteFacesByEvent error (non-blocking): ${e}`)
    );

    return c.json({ success: true });
  } catch (err) {
    console.log("Erro ao deletar evento:", err);
    return c.json({ error: `Erro ao deletar evento: ${err}` }, 500);
  }
});

// ── Photos ────────────────────────────────────────────────────────────────────

async function withSignedUrl(photo: any): Promise<any> {
  if (!photo?.storagePath) return photo;
  const { data } = await sb().storage
    .from(BUCKET)
    .createSignedUrl(photo.storagePath, 3600);
  return { ...photo, url: data?.signedUrl ?? null };
}

// List photos for event (public)
app.get("/make-server-68454e9b/events/:id/photos", async (c) => {
  try {
    const eventId = c.req.param("id");
    const photoIds = await getList(`${KV}photos:event:${eventId}`);

    const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10));
    const limit = Math.min(500, Math.max(1, parseInt(c.req.query("limit") ?? "20", 10)));
    const total = photoIds.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const pageIds = photoIds.slice(start, start + limit);

    const cfg: any = (await kv.get(`${KV}config`)) ?? {};
    const currentPrice: number = cfg.photoPrice ?? 30;

    const photoRecords = await Promise.all(pageIds.map((pid) => kv.get(`${KV}photo:${pid}`)));
    const validPhotos = photoRecords.filter(Boolean) as any[];
    const storagePaths = validPhotos.map((p) => p.storagePath).filter(Boolean) as string[];

    const urlMap: Record<string, string> = {};
    if (storagePaths.length > 0) {
      const { data: signed } = await sb().storage
        .from(BUCKET)
        .createSignedUrls(storagePaths, 3600);
      for (const item of signed ?? []) {
        if (item.signedUrl) urlMap[item.path] = item.signedUrl;
      }
    }

    const photos = validPhotos.map((p) => ({
      ...p,
      url: p.storagePath ? (urlMap[p.storagePath] ?? null) : null,
      price: currentPrice,
    }));
    return c.json({ photos, total, page, totalPages, limit });
  } catch (err) {
    console.log("Erro ao listar fotos:", err);
    return c.json({ error: `Erro ao listar fotos: ${err}` }, 500);
  }
});

// Upload photo (admin) — receives base64
app.post("/make-server-68454e9b/events/:id/photos", adminAuth, async (c) => {
  try {
    const eventId = c.req.param("id");
    console.log(`[Base64] Recebendo upload para evento ${eventId}`);
    let event: any = await kv.get(`${KV}event:${eventId}`);

    if (!event) {
      console.log(`[Base64] Evento ${eventId} não encontrado, tentando auto-criar`);
      if (/^\d{12}$/.test(eventId)) {
        const now = new Date().toISOString();
        const day   = eventId.slice(0, 2);
        const month = eventId.slice(2, 4);
        const year  = eventId.slice(4, 8);
        const hours = eventId.slice(8, 10);
        const mins  = eventId.slice(10, 12);
        const dateISO = `${year}-${month}-${day}T${hours}:${mins}:00`;
        const d = new Date(dateISO);
        const autoBranding: any = (await kv.get(`${KV}branding`)) ?? {};
        const autoSessionType = Array.isArray(autoBranding.eventSessionTypes) && autoBranding.eventSessionTypes.length > 0
          ? autoBranding.eventSessionTypes[0]
          : "Tour";
        const autoVenue = `${autoBranding.venueName ?? "Allianz Parque"}, ${autoBranding.venueLocation ?? "São Paulo, SP"}`;
        event = {
          id: eventId,
          name: `${autoSessionType} ${day}/${month}/${year}, ${hours}:${mins}`,
          slug: eventId, date: dateISO, endTime: "",
          location: autoVenue, sessionType: autoSessionType,
          status: "disponivel", photoCount: 0, faceCount: 0, price: 30,
          dayOfWeek: dayOfWeekPT(d), createdAt: now, updatedAt: now,
        };
        await kv.set(`${KV}event:${eventId}`, event);
        await appendToList(`${KV}events:index`, eventId);
        console.log(`[Base64] Evento ${eventId} auto-criado`);
      } else {
        console.log(`[Base64] Evento ${eventId} inválido (não é slug DDMMYYYYHHMM)`);
        return c.json({ error: "Evento não encontrado" }, 404);
      }
    }

    const body = await c.req.json();
    const { base64, fileName, mimeType = "image/jpeg", tag = "Geral" } = body;
    console.log(`[Base64] Recebendo arquivo ${fileName}, mime=${mimeType}, base64.length=${base64?.length ?? 0}`);
    if (!base64) {
      console.log(`[Base64] Erro: base64 não fornecido`);
      return c.json({ error: "Imagem base64 obrigatória" }, 400);
    }

    const photoId = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = mimeType === "image/png" ? "png" : "jpg";
    const storagePath = `events/${eventId}/${photoId}.${ext}`;

    console.log(`[Base64] Decodificando base64...`);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    console.log(`[Base64] Decodificado ${bytes.length} bytes`);

    console.log(`[Base64] Enviando para storage: ${storagePath}`);
    const { error: uploadError } = await sb().storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.log(`[Base64] Erro no upload do storage: ${uploadError.message}`);
      return c.json({ error: `Erro no upload para storage: ${uploadError.message}` }, 500);
    }

    const now = new Date().toISOString();
    const cfg: any = (await kv.get(`${KV}config`)) ?? {};
    const currentPrice: number = cfg.photoPrice ?? event.price ?? 30;

    const photo = {
      id: photoId,
      eventId,
      fileName: fileName ?? `${photoId}.${ext}`,
      storagePath,
      tag,
      price: currentPrice,
      createdAt: now,
    };

    console.log(`[Base64] Salvando foto ${photoId} no KV`);
    await kv.set(`${KV}photo:${photoId}`, photo);
    await appendToList(`${KV}photos:event:${eventId}`, photoId);

    const newCount = (event.photoCount ?? 0) + 1;
    await kv.set(`${KV}event:${eventId}`, {
      ...event,
      photoCount: newCount,
      price: currentPrice,
      updatedAt: now,
    });

    const photoWithUrl = await withSignedUrl(photo);
    console.log(`[Base64] ✓ Upload completo: ${photoId}`);
    return c.json({ photo: photoWithUrl }, 201);
  } catch (err) {
    console.log("Erro ao fazer upload de foto:", err);
    return c.json({ error: `Erro ao fazer upload: ${err}` }, 500);
  }
});

// Upload foto via multipart/form-data (streaming)
app.post("/make-server-68454e9b/events/:id/photos/stream", adminAuth, async (c) => {
  try {
    const eventId = c.req.param("id");
    console.log(`[Stream] Recebendo upload para evento ${eventId}`);
    let event: any = await kv.get(`${KV}event:${eventId}`);

    if (!event) {
      console.log(`[Stream] Evento ${eventId} não encontrado, tentando auto-criar`);
      if (/^\d{12}$/.test(eventId)) {
        const now = new Date().toISOString();
        const day = eventId.slice(0, 2), month = eventId.slice(2, 4);
        const year = eventId.slice(4, 8), hours = eventId.slice(8, 10), mins = eventId.slice(10, 12);
        const dateISO = `${year}-${month}-${day}T${hours}:${mins}:00`;
        const d = new Date(dateISO);
        const autoBranding: any = (await kv.get(`${KV}branding`)) ?? {};
        const autoSessionType = Array.isArray(autoBranding.eventSessionTypes) && autoBranding.eventSessionTypes.length > 0
          ? autoBranding.eventSessionTypes[0] : "Tour";
        const autoVenue = `${autoBranding.venueName ?? "Allianz Parque"}, ${autoBranding.venueLocation ?? "São Paulo, SP"}`;
        event = {
          id: eventId, name: `${autoSessionType} ${day}/${month}/${year}, ${hours}:${mins}`,
          slug: eventId, date: dateISO, endTime: "", location: autoVenue, sessionType: autoSessionType,
          status: "disponivel", photoCount: 0, faceCount: 0, price: 30,
          dayOfWeek: dayOfWeekPT(d), createdAt: now, updatedAt: now,
        };
        await kv.set(`${KV}event:${eventId}`, event);
        await appendToList(`${KV}events:index`, eventId);
        console.log(`[Stream] Evento ${eventId} auto-criado`);
      } else {
        console.log(`[Stream] Evento ${eventId} inválido (não é slug DDMMYYYYHHMM)`);
        return c.json({ error: "Evento não encontrado" }, 404);
      }
    }

    console.log(`[Stream] Parsing multipart body...`);
    const body = await c.req.parseBody();
    const file = body["file"] as File | null;
    const tag = (body["tag"] as string) || "Geral";
    console.log(`[Stream] File received: ${file ? `${file.name} (${file.size} bytes, ${file.type})` : 'NULL'}`);
    if (!file || file.size === 0) {
      console.log(`[Stream] Campo 'file' obrigatório ou vazio`);
      return c.json({ error: "Campo 'file' obrigatório" }, 400);
    }

    const mimeType = file.type || "image/jpeg";
    const photoId = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storagePath = `events/${eventId}/${photoId}.jpg`;

    console.log(`[Stream] Enviando para storage: ${storagePath}`);
    const { error: uploadError } = await sb().storage
      .from(BUCKET)
      .upload(storagePath, file, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.log(`[Stream] Erro no upload do storage: ${uploadError.message}`);
      return c.json({ error: `Erro storage (stream): ${uploadError.message}` }, 500);
    }

    const now = new Date().toISOString();
    const cfg: any = (await kv.get(`${KV}config`)) ?? {};
    const currentPrice: number = cfg.photoPrice ?? event.price ?? 30;
    const fileName = (file.name || `${photoId}.jpg`).replace(/\.[^.]+$/, ".jpg");

    console.log(`[Stream] Salvando foto ${photoId} no KV`);
    const photo = { id: photoId, eventId, fileName, storagePath, tag, price: currentPrice, createdAt: now };
    await kv.set(`${KV}photo:${photoId}`, photo);
    await appendToList(`${KV}photos:event:${eventId}`, photoId);
    await kv.set(`${KV}event:${eventId}`, {
      ...event, photoCount: (event.photoCount ?? 0) + 1, price: currentPrice, updatedAt: now,
    });

    const photoWithUrl = await withSignedUrl(photo);
    console.log(`[Stream] ✓ Upload completo: ${photoId}`);
    return c.json({ photo: photoWithUrl }, 201);
  } catch (err) {
    console.log("Erro no upload stream:", err);
    return c.json({ error: `Erro no upload stream: ${err}` }, 500);
  }
});

// Delete photo (admin)
app.delete(
  "/make-server-68454e9b/events/:eventId/photos/:photoId",
  adminAuth,
  async (c) => {
    try {
      const eventId = c.req.param("eventId");
      const photoId = c.req.param("photoId");
      const photo: any = await kv.get(`${KV}photo:${photoId}`);
      if (!photo) return c.json({ error: "Foto não encontrada" }, 404);

      if (photo.storagePath) {
        await sb().storage.from(BUCKET).remove([photo.storagePath]);
      }

      await kv.del(`${KV}photo:${photoId}`);
      await removeFromList(`${KV}photos:event:${eventId}`, photoId);

      faces.deleteFacesByPhoto(photoId).catch((e) =>
        console.log(`pgvector deleteFacesByPhoto error (non-blocking): ${e}`)
      );

      const facesKey = `${KV}faces:event:${eventId}`;
      const faceIndex: Record<string, number[][]> = (await kv.get(facesKey)) ?? {};
      if (faceIndex[photoId]) {
        delete faceIndex[photoId];
        if (Object.keys(faceIndex).length > 0) {
          await kv.set(facesKey, faceIndex);
        } else {
          await kv.del(facesKey);
        }
      }

      const event: any = await kv.get(`${KV}event:${eventId}`);
      if (event) {
        await kv.set(`${KV}event:${eventId}`, {
          ...event,
          photoCount: Math.max(0, (event.photoCount ?? 1) - 1),
          updatedAt: new Date().toISOString(),
        });
      }
      return c.json({ success: true });
    } catch (err) {
      console.log("Erro ao deletar foto:", err);
      return c.json({ error: `Erro ao deletar foto: ${err}` }, 500);
    }
  },
);

// ── Face Descriptors ──────────────────────────────────────────────────────────

// Save face descriptors for a photo (admin)
app.post(
  "/make-server-68454e9b/events/:eventId/photos/:photoId/faces",
  adminAuth,
  async (c) => {
    try {
      const eventId = c.req.param("eventId");
      const photoId = c.req.param("photoId");
      const { descriptors } = await c.req.json();

      if (!Array.isArray(descriptors)) {
        return c.json({ error: "descriptors deve ser um array de vetores Float32" }, 400);
      }

      const photo: any = await kv.get(`${KV}photo:${photoId}`);
      if (!photo) return c.json({ error: "Foto não encontrada" }, 404);

      await kv.set(`${KV}photo:${photoId}`, {
        ...photo,
        faceDescriptors: descriptors,
        facesProcessedAt: new Date().toISOString(),
      });

      const facesKey = `${KV}faces:event:${eventId}`;
      const faceIndex: Record<string, number[][]> = (await kv.get(facesKey)) ?? {};
      faceIndex[photoId] = descriptors;
      await kv.set(facesKey, faceIndex);

      if (descriptors.length > 0) {
        faces.indexFaces(photoId, eventId, descriptors).catch((e) =>
          console.log(`pgvector indexFaces error (non-blocking): ${e}`)
        );
      }

      if (descriptors.length > 0) {
        const event: any = await kv.get(`${KV}event:${eventId}`);
        if (event) {
          await kv.set(`${KV}event:${eventId}`, {
            ...event,
            faceCount: (event.faceCount ?? 0) + descriptors.length,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      return c.json({ success: true, facesFound: descriptors.length });
    } catch (err) {
      console.log("Erro ao salvar descritores faciais:", err);
      return c.json({ error: `Erro ao salvar descritores: ${err}` }, 500);
    }
  },
);

// Get all face descriptors for an event (public)
app.get("/make-server-68454e9b/events/:id/faces", async (c) => {
  try {
    const eventId = c.req.param("id");
    const facesKey = `${KV}faces:event:${eventId}`;

    const faceIndex: Record<string, number[][]> | null = await kv.get(facesKey);
    if (faceIndex) {
      const faces = Object.entries(faceIndex)
        .filter(([, descs]) => descs?.length > 0)
        .map(([photoId, descriptors]) => ({ photoId, descriptors }));
      return c.json({ faces });
    }

    console.log(`[faces] No aggregated index for event ${eventId}, rebuilding…`);
    const photoIds = await getList(`${KV}photos:event:${eventId}`);
    const photoRecords = await Promise.all(photoIds.map((pid) => kv.get(`${KV}photo:${pid}`)));
    const faces = (photoRecords as any[])
      .filter((p) => p?.faceDescriptors?.length > 0)
      .map((p) => ({ photoId: p.id, descriptors: p.faceDescriptors }));

    if (faces.length > 0) {
      const newIndex: Record<string, number[][]> = {};
      for (const { photoId, descriptors } of faces) newIndex[photoId] = descriptors;
      kv.set(facesKey, newIndex).catch(console.warn);
    }

    return c.json({ faces });
  } catch (err) {
    console.log("Erro ao buscar descritores faciais:", err);
    return c.json({ error: `Erro ao buscar faces: ${err}` }, 500);
  }
});

// ── Face Migration (KV → pgvector) ───────────────────────────────────────────

app.post("/make-server-68454e9b/admin/migrate-faces-pgvector", adminAuth, async (c) => {
  const startedAt = Date.now();
  const errors: string[] = [];
  let totalPhotos = 0;
  let totalFaces = 0;
  let skippedPhotos = 0;
  const eventsSeen = new Set<string>();
  const photosWithFaces: any[] = [];

  try {
    const allPhotoRecords: any[] = await kv.getByPrefix(`${KV}photo:`);
    console.log(`[migrate-faces] getByPrefix encontrou ${allPhotoRecords.length} registros ef:photo:*`);

    const fromPrefix = allPhotoRecords.filter(
      (p: any) => p && p.id && p.eventId && Array.isArray(p.faceDescriptors) && p.faceDescriptors.length > 0,
    );
    skippedPhotos = allPhotoRecords.length - fromPrefix.length;
    photosWithFaces.push(...fromPrefix);
    console.log(`[migrate-faces] ${fromPrefix.length} com descritores, ${skippedPhotos} sem`);

    let usedFallback = false;
    if (allPhotoRecords.length === 0) {
      usedFallback = true;
      console.log("[migrate-faces] prefix scan vazio — fallback via events:index");
      const eventIds: string[] = await getList(`${KV}events:index`);
      console.log(`[migrate-faces] ef:events:index tem ${eventIds.length} eventos`);

      for (const eventId of eventIds) {
        eventsSeen.add(eventId);
        const faceIndex: Record<string, number[][]> | null = await kv.get(`${KV}faces:event:${eventId}`);
        if (faceIndex && Object.keys(faceIndex).length > 0) {
          for (const [photoId, descriptors] of Object.entries(faceIndex)) {
            if (Array.isArray(descriptors) && descriptors.length > 0)
              photosWithFaces.push({ id: photoId, eventId, faceDescriptors: descriptors });
          }
        } else {
          const photoIds: string[] = await getList(`${KV}photos:event:${eventId}`);
          const records = await Promise.all(photoIds.map((pid) => kv.get(`${KV}photo:${pid}`)));
          for (const p of records as any[]) {
            if (p?.faceDescriptors?.length > 0) photosWithFaces.push(p);
            else skippedPhotos++;
          }
        }
      }
    }

    for (const photo of photosWithFaces) {
      const photoId: string = photo.id;
      const eventId: string = photo.eventId;
      const descriptors: number[][] = photo.faceDescriptors;
      eventsSeen.add(eventId);
      try {
        await faces.indexFaces(photoId, eventId, descriptors);
        totalPhotos++;
        totalFaces += descriptors.length;
      } catch (e: any) {
        errors.push(`evento=${eventId} foto=${photoId}: ${e.message}`);
      }
    }

    const elapsedMs = Date.now() - startedAt;
    const totalEvents = eventsSeen.size;
    console.log(`[migrate-faces] done — ${totalEvents} eventos, ${totalPhotos} fotos, ${totalFaces} faces em ${elapsedMs}ms`);
    return c.json({
      success: true,
      stats: { totalEvents, totalPhotos, totalFaces, skippedPhotos, elapsedMs, errors, usedFallback },
    });
  } catch (err) {
    console.log("Erro na migração de faces:", err);
    return c.json({ error: `Erro na migração: ${err}` }, 500);
  }
});

// ── Reindex Single Event (pgvector) ───────────────────────────────────────────

app.post("/make-server-68454e9b/admin/reindex-event", adminAuth, async (c) => {
  const startedAt = Date.now();
  const errors: string[] = [];
  let totalPhotos = 0;
  let totalFaces = 0;
  let noFacePhotos = 0;
  let notFoundPhotos = 0;
  let processedPhotos = 0;

  try {
    const body = await c.req.json();
    const eventId = body.eventId as string;

    if (!eventId) {
      return c.json({ error: "eventId é obrigatório" }, 400);
    }

    const event: any = await kv.get(`${KV}event:${eventId}`);
    if (!event) return c.json({ error: "Evento não encontrado" }, 404);

    console.log(`[reindex-event] Iniciando reindexação do evento ${eventId}`);

    const photoIds: string[] = await getList(`${KV}photos:event:${eventId}`);
    console.log(`[reindex-event] Evento ${eventId} tem ${photoIds.length} fotos`);

    if (photoIds.length === 0) {
      return c.json({
        success: false,
        error: `Nenhuma foto encontrada para o evento ${eventId}`,
        stats: { totalPhotos: 0, totalFaces: 0, skippedPhotos: 0, processedPhotos: 0, elapsedMs: 0, errors: [] },
      });
    }

    for (const photoId of photoIds) {
      processedPhotos++;
      const photo: any = await kv.get(`${KV}photo:${photoId}`);

      if (!photo) {
        notFoundPhotos++;
        console.log(`[reindex-event] ✗ Foto ${photoId} não encontrada no KV`);
        continue;
      }

      const rawDesc = photo.faceDescriptors;
      const hasDescriptors =
        rawDesc != null &&
        (Array.isArray(rawDesc)
          ? rawDesc.length > 0
          : Object.keys(rawDesc).length > 0);

      if (!hasDescriptors) {
        noFacePhotos++;
        console.log(`[reindex-event] ○ Foto ${photoId} sem descritor facial (normal)`);
        continue;
      }

      try {
        await faces.indexFaces(photoId, eventId, rawDesc);
        totalPhotos++;
        const faceCount = Array.isArray(rawDesc) ? rawDesc.length : Object.keys(rawDesc).length;
        totalFaces += faceCount;
        console.log(`[reindex-event] ✓ Foto ${photoId}: ${faceCount} faces indexadas`);
      } catch (e: any) {
        errors.push(`foto=${photoId}: ${e.message}`);
        console.log(`[reindex-event] ✗ Erro ao indexar foto ${photoId}:`, e.message);
      }
    }

    const elapsedMs = Date.now() - startedAt;
    console.log(`[reindex-event] ✅ Evento ${eventId} concluído — ${totalPhotos} fotos, ${totalFaces} faces em ${elapsedMs}ms`);

    return c.json({
      success: true,
      stats: { totalPhotos, totalFaces, noFacePhotos, notFoundPhotos, skippedPhotos: noFacePhotos + notFoundPhotos, processedPhotos, elapsedMs, errors },
    });
  } catch (err) {
    console.log("Erro ao reindexar evento:", err);
    return c.json({ error: `Erro ao reindexar evento: ${err}` }, 500);
  }
});

// ── Photo IDs for an event ────────────────────────────────────────────────────

app.get("/make-server-68454e9b/admin/events/:id/photo-ids", adminAuth, async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return c.json({ error: "id do evento é obrigatório" }, 400);
    const event: any = await kv.get(`${KV}event:${id}`);
    if (!event) return c.json({ error: "Evento não encontrado" }, 404);
    const photoIds: string[] = await getList(`${KV}photos:event:${id}`);
    console.log(`[photo-ids] Evento ${id}: ${photoIds.length} fotos`);
    return c.json({ photoIds, total: photoIds.length });
  } catch (err) {
    console.log("Erro ao buscar IDs de fotos:", err);
    return c.json({ photoIds: [], total: 0, warning: `Erro ao buscar lista: ${err}` });
  }
});

// ── Reindex Single Photo (pgvector) ───────────────────────────────────────────

app.post("/make-server-68454e9b/admin/reindex-photo", adminAuth, async (c) => {
  try {
    const { eventId, photoId } = await c.req.json();
    if (!eventId || !photoId) {
      return c.json({ error: "eventId e photoId são obrigatórios" }, 400);
    }

    const photo: any = await kv.get(`${KV}photo:${photoId}`);

    if (!photo) {
      console.log(`[reindex-photo] ✗ Foto ${photoId} não encontrada no KV`);
      return c.json({ success: false, notFound: true, noFace: false, faces: 0 });
    }

    const rawDesc = photo.faceDescriptors;
    const hasDescriptors =
      rawDesc != null &&
      (Array.isArray(rawDesc)
        ? rawDesc.length > 0
        : Object.keys(rawDesc).length > 0);

    if (!hasDescriptors) {
      return c.json({ success: true, notFound: false, noFace: true, faces: 0, fileName: photo.fileName ?? photoId });
    }

    await faces.indexFaces(photoId, eventId, rawDesc);

    const faceCount = Array.isArray(rawDesc) ? rawDesc.length : Object.keys(rawDesc).length;
    console.log(`[reindex-photo] ✓ ${photo.fileName ?? photoId}: ${faceCount} face(s)`);
    return c.json({
      success: true, notFound: false, noFace: false,
      faces: faceCount,
      fileName: photo.fileName ?? photoId,
    });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.log(`[reindex-photo] ✗ Erro: ${msg}`);
    return c.json({ success: false, notFound: false, noFace: false, faces: 0, error: msg });
  }
});

// ── KV Diagnostic ─────────────────────────────────────────────────────────────

app.get("/make-server-68454e9b/admin/diagnose-kv", adminAuth, async (c) => {
  try {
    const { count: total, error: countErr } = await sb()
      .from("kv_store_68454e9b")
      .select("*", { count: "exact", head: true });
    if (countErr) throw new Error(`count error: ${countErr.message}`);

    const { data: rows, error: rowsErr } = await sb()
      .from("kv_store_68454e9b")
      .select("key")
      .order("key")
      .limit(200);
    if (rowsErr) throw new Error(`rows error: ${rowsErr.message}`);

    const prefixCounts: Record<string, number> = {};
    for (const row of rows ?? []) {
      const parts = (row.key as string).split(":");
      const prefix = parts.slice(0, 2).join(":");
      prefixCounts[prefix] = (prefixCounts[prefix] ?? 0) + 1;
    }
    const sampleKeys = (rows ?? []).slice(0, 30).map((r: any) => r.key as string);

    const eventIds: string[] = await getList(`${KV}events:index`);
    console.log(`[diagnose-kv] Encontrados ${eventIds.length} eventos na lista events:index`);
    const events: Array<{ id: string; name: string; photoCount: number; photosKey: string; hasList: boolean }> = [];

    for (const eventId of eventIds.slice(0, 20)) {
      const event: any = await kv.get(`${KV}event:${eventId}`);
      const photosKey = `${KV}photos:event:${eventId}`;
      const photoIds = await getList(photosKey);

      console.log(`[diagnose-kv] Evento ${eventId}: ${photoIds.length} fotos na chave ${photosKey}`);

      events.push({
        id: eventId,
        name: event?.name ?? "N/A",
        photoCount: photoIds.length,
        photosKey,
        hasList: photoIds.length > 0,
      });
    }

    console.log(`[diagnose-kv] Retornando ${events.length} eventos, ${events.filter(e => e.photoCount > 0).length} com fotos`);

    return c.json({
      total: total ?? 0,
      prefixCounts,
      sampleKeys,
      events: events.sort((a, b) => b.photoCount - a.photoCount),
    });
  } catch (err) {
    console.log("Erro no diagnóstico KV:", err);
    return c.json({ error: `Erro: ${err}` }, 500);
  }
});

// ── List Photo Keys Diagnostic ────────────────────────────────────────────────

app.get("/make-server-68454e9b/admin/diagnose-photo-keys", adminAuth, async (c) => {
  try {
    const { data: rows, error } = await sb()
      .from("kv_store_68454e9b")
      .select("key")
      .ilike("key", "ef:photos:event:%")
      .order("key")
      .limit(100);

    if (error) throw new Error(`query error: ${error.message}`);

    const photoKeys = (rows ?? []).map((r: any) => r.key as string);
    console.log(`[diagnose-photo-keys] Encontradas ${photoKeys.length} chaves de fotos`);

    return c.json({ photoKeys, total: photoKeys.length });
  } catch (err) {
    console.log("Erro ao listar chaves de fotos:", err);
    return c.json({ error: `Erro: ${err}` }, 500);
  }
});

// ── pgvector Diagnostic ───────────────────────────────────────────────────────

app.get("/make-server-68454e9b/admin/diagnose-pgvector", adminAuth, async (c) => {
  try {
    const { count: totalEmbeddings, error: countErr } = await sb()
      .from("face_embeddings_68454e9b")
      .select("*", { count: "exact", head: true });
    if (countErr) throw new Error(`count error: ${countErr.message}`);

    const { data: uniquePhotos, error: photosErr } = await sb()
      .from("face_embeddings_68454e9b")
      .select("photo_id")
      .limit(10000);
    if (photosErr) throw new Error(`photos error: ${photosErr.message}`);

    const uniquePhotoIds = new Set((uniquePhotos ?? []).map((r: any) => r.photo_id));
    const totalPhotos = uniquePhotoIds.size;

    const { data: uniqueEvents, error: eventsErr } = await sb()
      .from("face_embeddings_68454e9b")
      .select("event_id")
      .limit(10000);
    if (eventsErr) throw new Error(`events error: ${eventsErr.message}`);

    const uniqueEventIds = new Set((uniqueEvents ?? []).map((r: any) => r.event_id));
    const totalEvents = uniqueEventIds.size;

    const { data: samplePhotos, error: sampleErr } = await sb()
      .from("face_embeddings_68454e9b")
      .select("photo_id, event_id")
      .order("created_at", { ascending: false })
      .limit(10);
    if (sampleErr) throw new Error(`sample error: ${sampleErr.message}`);

    return c.json({
      totalEmbeddings: totalEmbeddings ?? 0,
      totalPhotos,
      totalEvents,
      eventIds: Array.from(uniqueEventIds).slice(0, 10),
      samplePhotos: samplePhotos ?? [],
    });
  } catch (err) {
    console.log("Erro no diagnóstico pgvector:", err);
    return c.json({ error: `Erro: ${err}` }, 500);
  }
});

// ── Face Stats ────────────────────────────────────────────────────────────────

app.get("/make-server-68454e9b/admin/events/:eventId/face-stats", adminAuth, async (c) => {
  try {
    const eventId = c.req.param("eventId");
    const event: any = await kv.get(`${KV}event:${eventId}`);
    if (!event) return c.json({ error: "Evento não encontrado" }, 404);
    const photoIds: string[] = await getList(`${KV}photos:event:${eventId}`);

    const stats = {
      totalPhotos: photoIds.length,
      photosWithFaces: 0,
      photosWithoutFaces: 0,
      totalFaces: 0,
      photos: [] as Array<{ id: string; fileName: string; faceCount: number }>,
    };

    for (const photoId of photoIds) {
      const photo: any = await kv.get(`${KV}photo:${photoId}`);
      if (photo) {
        const faceCount = Array.isArray(photo.faceDescriptors) ? photo.faceDescriptors.length : 0;
        if (faceCount > 0) {
          stats.photosWithFaces++;
          stats.totalFaces += faceCount;
        } else {
          stats.photosWithoutFaces++;
        }
        stats.photos.push({ id: photo.id, fileName: photo.fileName, faceCount });
      }
    }

    return c.json(stats);
  } catch (err) {
    console.log("Erro ao buscar estatísticas de faces:", err);
    return c.json({ error: `Erro: ${err}` }, 500);
  }
});

// ── Reindex faces for an event (client-side) ──────────────────────────────────

app.post("/make-server-68454e9b/admin/events/:eventId/reindex-faces", adminAuth, async (c) => {
  try {
    const eventId = c.req.param("eventId");
    const event: any = await kv.get(`${KV}event:${eventId}`);
    if (!event) return c.json({ error: "Evento não encontrado" }, 404);
    const photosKey = `${KV}photos:event:${eventId}`;
    console.log(`[reindex-faces] Buscando fotos para evento ${eventId} na chave ${photosKey}`);

    const photoIds: string[] = await getList(photosKey);
    console.log(`[reindex-faces] Encontradas ${photoIds.length} fotos na lista`);

    const photos: Array<{ id: string; url: string; fileName: string }> = [];
    for (const photoId of photoIds) {
      const photo: any = await kv.get(`${KV}photo:${photoId}`);
      if (photo?.url) {
        photos.push({ id: photo.id, url: photo.url, fileName: photo.fileName });
      } else if (photo) {
        console.log(`[reindex-faces] Foto ${photoId} sem URL, gerando do storage: ${photo.storagePath}`);
        if (photo.storagePath) {
          const { data: signedData } = await sb().storage
            .from("make-68454e9b-eventface")
            .createSignedUrl(photo.storagePath, 3600);
          if (signedData?.signedUrl) {
            photos.push({ id: photo.id, url: signedData.signedUrl, fileName: photo.fileName });
          }
        }
      }
    }

    console.log(`[reindex-faces] Retornando ${photos.length} fotos com URLs válidas`);
    return c.json({ eventId, photos, totalPhotos: photos.length });
  } catch (err) {
    console.log("Erro ao preparar reindexação:", err);
    return c.json({ error: `Erro: ${err}` }, 500);
  }
});

// ── Face Search (pgvector ANN) ────────────────────────────────────────────────

app.post("/make-server-68454e9b/faces/search", async (c) => {
  try {
    const body = await c.req.json();
    const { eventId, embedding, threshold } = body;

    if (!eventId || !Array.isArray(embedding) || embedding.length === 0) {
      return c.json({ error: "eventId e embedding são obrigatórios" }, 400);
    }

    console.log(`[faces/search] Buscando faces para evento ${eventId}, embedding length: ${embedding.length}, threshold: ${threshold ?? 0.78}`);

    const searchThreshold = typeof threshold === "number" ? threshold : 0.78;
    const matches = await faces.searchFaces(embedding, eventId, searchThreshold);

    console.log(`[faces/search] ✓ Encontrados ${matches.length} matches para evento ${eventId}`);
    return c.json({ matches });
  } catch (err) {
    console.log("Erro na busca facial por pgvector:", err);
    return c.json({ error: `Erro na busca facial: ${err}` }, 500);
  }
});

// ── Orders ────────────────────────────────────────────────────────────────────

// Create order (public)
app.post("/make-server-68454e9b/orders", async (c) => {
  try {
    const body = await c.req.json();
    const { items, customerEmail, customerName, paymentMethod = "pix" } = body;

    if (!items?.length) return c.json({ error: "Itens do pedido são obrigatórios" }, 400);
    if (!customerEmail) return c.json({ error: "Email do cliente é obrigatório" }, 400);

    const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const total = items.reduce((sum: number, item: any) => sum + Number(item.price ?? 0), 0);
    const now = new Date().toISOString();

    const order = {
      id: orderId,
      customerEmail,
      customerName: customerName ?? "",
      items,
      total,
      paymentMethod,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    await kv.set(`${KV}order:${orderId}`, order);
    await appendToList(`${KV}orders:index`, orderId);

    const dateKey = now.slice(0, 10);
    const dayRevenue = ((await kv.get(`${KV}daily:revenue:${dateKey}`)) as number) ?? 0;
    const dayCount = ((await kv.get(`${KV}daily:count:${dateKey}`)) as number) ?? 0;
    await kv.set(`${KV}daily:revenue:${dateKey}`, dayRevenue + total);
    await kv.set(`${KV}daily:count:${dateKey}`, dayCount + items.length);

    return c.json({ order }, 201);
  } catch (err) {
    console.log("Erro ao criar pedido:", err);
    return c.json({ error: `Erro ao criar pedido: ${err}` }, 500);
  }
});

// List orders (admin)
app.get("/make-server-68454e9b/orders", adminAuth, async (c) => {
  try {
    await flattenToGlobal(c.get("userId"));
    const ids = await getList(`${KV}orders:index`);
    const orders = (await Promise.all(ids.map((id) => kv.get(`${KV}order:${id}`))))
      .filter(Boolean)
      .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
    return c.json({ orders });
  } catch (err) {
    console.log("Erro ao listar pedidos:", err);
    return c.json({ error: `Erro ao listar pedidos: ${err}` }, 500);
  }
});

// Get single order
app.get("/make-server-68454e9b/orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const order = await kv.get(`${KV}order:${id}`);
    if (!order) return c.json({ error: "Pedido não encontrado" }, 404);
    return c.json({ order });
  } catch (err) {
    console.log("Erro ao buscar pedido:", err);
    return c.json({ error: `Erro ao buscar pedido: ${err}` }, 500);
  }
});

// Download a purchased photo (public)
app.get("/make-server-68454e9b/orders/:orderId/photos/:photoId/download", async (c) => {
  try {
    const orderId = c.req.param("orderId");
    const photoId = c.req.param("photoId");

    const order: any = await kv.get(`${KV}order:${orderId}`);
    if (!order) return c.json({ error: "Pedido não encontrado" }, 404);

    const hasPhoto = order.items?.some(
      (item: any) => String(item.photoId) === String(photoId),
    );
    if (!hasPhoto) {
      return c.json({ error: "Foto não pertence a este pedido" }, 403);
    }

    const photo: any = await kv.get(`${KV}photo:${photoId}`);
    if (!photo?.storagePath) {
      return c.json({ error: "Foto não encontrada no storage" }, 404);
    }

    const fileName = photo.fileName ?? `foto-${photoId}.jpg`;

    const { data: blob, error: dlErr } = await sb()
      .storage
      .from(BUCKET)
      .download(photo.storagePath);

    if (dlErr || !blob) {
      console.log("[download] Erro ao buscar arquivo do storage:", dlErr?.message);
      const { data: signData } = await sb().storage
        .from(BUCKET)
        .createSignedUrl(photo.storagePath, 3600, { download: fileName });
      if (signData?.signedUrl) return c.redirect(signData.signedUrl, 302);
      return c.json({ error: `Erro ao baixar foto: ${dlErr?.message}` }, 500);
    }

    const contentType = blob.type || "image/jpeg";
    console.log(`[download] ✓ Streaming ${fileName} (${blob.size} bytes, ${contentType})`);

    return c.body(blob.stream() as ReadableStream, 200, {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    });
  } catch (err) {
    console.log("Erro ao baixar foto:", err);
    return c.json({ error: `Erro ao gerar download: ${err}` }, 500);
  }
});

// Return signed URL as JSON (MinhaFoto page)
app.get("/make-server-68454e9b/orders/:orderId/photos/:photoId/signed-url", async (c) => {
  try {
    const orderId = c.req.param("orderId");
    const photoId = c.req.param("photoId");

    console.log(`[signed-url] orderId=${orderId} photoId=${photoId}`);

    const order: any = await kv.get(`${KV}order:${orderId}`);
    if (!order) {
      console.log(`[signed-url] Pedido não encontrado: ${orderId}`);
      return c.json({ error: "Pedido não encontrado" }, 404);
    }

    const hasPhoto = order.items?.some(
      (item: any) => String(item.photoId) === String(photoId),
    );
    if (!hasPhoto) {
      console.log(`[signed-url] Foto ${photoId} não pertence ao pedido ${orderId}.`);
      return c.json({ error: "Foto não pertence a este pedido" }, 403);
    }

    const photo: any = await kv.get(`${KV}photo:${photoId}`);
    if (!photo?.storagePath) return c.json({ error: "Foto não encontrada no storage" }, 404);

    const { data: viewData, error: viewErr } = await sb()
      .storage
      .from(BUCKET)
      .createSignedUrl(photo.storagePath, 604800);

    const { data: dlData } = await sb()
      .storage
      .from(BUCKET)
      .createSignedUrl(photo.storagePath, 604800, {
        download: photo.fileName ?? `foto-${photoId}.jpg`,
      });

    if (viewErr || !viewData?.signedUrl) {
      return c.json({ error: `Erro ao gerar URL: ${viewErr?.message}` }, 500);
    }

    return c.json({
      viewUrl: viewData.signedUrl,
      downloadUrl: dlData?.signedUrl ?? viewData.signedUrl,
      fileName: photo.fileName ?? `foto-${photoId}.jpg`,
    });
  } catch (err) {
    console.log("Erro ao gerar signed-url:", err);
    return c.json({ error: `Erro ao gerar signed-url: ${err}` }, 500);
  }
});

// Update order status (admin)
app.put("/make-server-68454e9b/orders/:id", adminAuth, async (c) => {
  try {
    const id = c.req.param("id");
    const order: any = await kv.get(`${KV}order:${id}`);
    if (!order) return c.json({ error: "Pedido não encontrado" }, 404);
    const body = await c.req.json();
    const updated = { ...order, ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`${KV}order:${id}`, updated);
    if (body.status === "paid" && order.status !== "paid") {
      sendOrderConfirmationEmail(updated).catch(console.log);
    }
    return c.json({ order: updated });
  } catch (err) {
    console.log("Erro ao atualizar pedido:", err);
    return c.json({ error: `Erro ao atualizar pedido: ${err}` }, 500);
  }
});

// Cancel order (admin)
app.post("/make-server-68454e9b/orders/:id/cancel", adminAuth, async (c) => {
  try {
    const id = c.req.param("id");
    const order: any = await kv.get(`${KV}order:${id}`);
    if (!order) return c.json({ error: "Pedido não encontrado" }, 404);
    if (order.status === "cancelled") return c.json({ error: "Pedido já cancelado" }, 400);

    const body = await c.req.json().catch(() => ({}));
    const reason = body.reason ?? "Cancelado pelo admin";
    const now = new Date().toISOString();

    let refundResult: any = null;
    if (order.mpPaymentId && order.status === "paid") {
      const mpToken = await getMpToken();
      if (mpToken) {
        try {
          const refundRes = await fetch(
            `https://api.mercadopago.com/v1/payments/${order.mpPaymentId}/refunds`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${mpToken}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": `refund-${id}-${Date.now()}`,
              },
              body: JSON.stringify({}),
            },
          );
          refundResult = await refundRes.json();
          console.log("Refund result:", JSON.stringify(refundResult));
        } catch (refundErr) {
          console.log("Refund error (non-blocking):", refundErr);
          refundResult = { error: String(refundErr) };
        }
      }
    }

    const updated = {
      ...order,
      status: "cancelled",
      cancelledAt: now,
      cancelReason: reason,
      refundResult,
      updatedAt: now,
    };
    await kv.set(`${KV}order:${id}`, updated);

    if (order.status === "paid" && order.total) {
      const dateKey = order.createdAt?.slice(0, 10) ?? now.slice(0, 10);
      const dayRevenue = ((await kv.get(`${KV}daily:revenue:${dateKey}`)) as number) ?? 0;
      const dayCount = ((await kv.get(`${KV}daily:count:${dateKey}`)) as number) ?? 0;
      await kv.set(`${KV}daily:revenue:${dateKey}`, Math.max(0, dayRevenue - order.total));
      await kv.set(`${KV}daily:count:${dateKey}`, Math.max(0, dayCount - (order.items?.length ?? 0)));
    }

    return c.json({ order: updated, refundResult });
  } catch (err) {
    console.log("Erro ao cancelar pedido:", err);
    return c.json({ error: `Erro ao cancelar pedido: ${err}` }, 500);
  }
});

// Create POS order (admin — direct sale at venue)
app.post("/make-server-68454e9b/orders/pos", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { items, customerName, paymentMethod = "dinheiro", operatorId } = body;

    if (!items?.length) return c.json({ error: "Itens do pedido são obrigatórios" }, 400);

    const orderId = `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const total = items.reduce((sum: number, item: any) => sum + Number(item.price ?? 0), 0);
    const now = new Date().toISOString();

    const order = {
      id: orderId,
      customerEmail: "",
      customerName: customerName ?? "Cliente presencial",
      items,
      total,
      paymentMethod,
      status: "paid",
      channel: "pos",
      operatorId: operatorId ?? c.get("userId"),
      createdAt: now,
      updatedAt: now,
    };

    await kv.set(`${KV}order:${orderId}`, order);
    await appendToList(`${KV}orders:index`, orderId);

    const dateKey = now.slice(0, 10);
    const dayRevenue = ((await kv.get(`${KV}daily:revenue:${dateKey}`)) as number) ?? 0;
    const dayCount = ((await kv.get(`${KV}daily:count:${dateKey}`)) as number) ?? 0;
    await kv.set(`${KV}daily:revenue:${dateKey}`, dayRevenue + total);
    await kv.set(`${KV}daily:count:${dateKey}`, dayCount + items.length);

    return c.json({ order }, 201);
  } catch (err) {
    console.log("Erro ao criar pedido PDV:", err);
    return c.json({ error: `Erro ao criar pedido PDV: ${err}` }, 500);
  }
});

// ── Admin Stats ───────────────────────────────────────────────────────────────

app.get("/make-server-68454e9b/admin/stats", adminAuth, async (c) => {
  try {
    await flattenToGlobal(c.get("userId"));

    const [orderIds, eventIds] = await Promise.all([
      getList(`${KV}orders:index`),
      getList(`${KV}events:index`),
    ]);

    const orders: any[] = (
      await Promise.all(orderIds.map((id) => kv.get(`${KV}order:${id}`)))
    ).filter(Boolean);

    const activeOrders = orders.filter((o) => o.status !== "cancelled");
    const paidOrders   = activeOrders.filter((o) => o.status === "paid" || o.status === "delivered");

    const totalRevenue  = paidOrders.reduce((s, o) => s + (o.total ?? 0), 0);
    const totalPhotos   = paidOrders.reduce((s, o) => s + (o.items?.length ?? 0), 0);
    const pendingOrders = activeOrders.filter((o) => o.status === "pending").length;

    const dailyMeta = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const dateKey = d.toISOString().slice(0, 10);
      const dayLabel = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      return { dateKey, dayLabel };
    });
    const [dailyRevenues, dailyCounts] = await Promise.all([
      Promise.all(dailyMeta.map(({ dateKey }) => kv.get(`${KV}daily:revenue:${dateKey}`))),
      Promise.all(dailyMeta.map(({ dateKey }) => kv.get(`${KV}daily:count:${dateKey}`))),
    ]);
    const daily = dailyMeta.map(({ dayLabel }, i) => ({
      day: dayLabel,
      receita: (dailyRevenues[i] as number) ?? 0,
      fotos:   (dailyCounts[i]   as number) ?? 0,
    }));

    const recentOrders = orders.slice(0, 10);

    return c.json({
      totalRevenue,
      totalOrders: activeOrders.length,
      totalPhotos,
      totalEvents: eventIds.length,
      pendingOrders,
      daily,
      recentOrders,
    });
  } catch (err) {
    console.log("Erro ao buscar stats:", err);
    return c.json({ error: `Erro ao buscar stats: ${err}` }, 500);
  }
});

// ── MP Token helper ───────────────────────────────────────────────────────────

async function getMpToken(): Promise<string | null> {
  const cfg = (await kv.get(`${KV}config`)) as any ?? {};
  return cfg.mpToken ?? null;
}

// ── Admin Config ──────────────────────────────────────────────────────────────

app.get("/make-server-68454e9b/admin/config", adminAuth, async (c) => {
  try {
    const cfg = (await kv.get(`${KV}config`)) as any ?? {};
    const kvToken: string | undefined = cfg.mpToken;

    const raw = kvToken ?? "";
    const mpTokenPreview = raw.length > 12
      ? `${raw.slice(0, 10)}${"•".repeat(8)}${raw.slice(-4)}`
      : raw.length > 0 ? "•".repeat(raw.length) : null;

    return c.json({
      photoPrice: cfg.photoPrice ?? 30,
      coupons: cfg.coupons ?? [{ code: "ALLIANZ10", discount: 10, active: true }],
      mpConfigured: !!kvToken,
      mpTokenSource: kvToken ? "kv" : null,
      mpTokenPreview,
    });
  } catch (err) {
    return c.json({ error: `Erro ao buscar config: ${err}` }, 500);
  }
});

app.put("/make-server-68454e9b/admin/config", adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const existing = (await kv.get(`${KV}config`)) as any ?? {};

    const updated: any = { ...existing, updatedAt: new Date().toISOString() };
    if (body.photoPrice !== undefined) updated.photoPrice = body.photoPrice;
    if (body.coupons    !== undefined) updated.coupons    = body.coupons;
    if (typeof body.mpToken === "string" && body.mpToken.trim()) {
      updated.mpToken = body.mpToken.trim();
    }
    if (body.mpToken === "") {
      delete updated.mpToken;
    }

    await kv.set(`${KV}config`, updated);

    const kvToken: string | undefined = updated.mpToken;
    const raw = kvToken ?? "";
    const mpTokenPreview = raw.length > 12
      ? `${raw.slice(0, 10)}${"•".repeat(8)}${raw.slice(-4)}`
      : raw.length > 0 ? "•".repeat(raw.length) : null;

    return c.json({
      config: {
        photoPrice: updated.photoPrice ?? 30,
        coupons: updated.coupons ?? [],
        mpConfigured: !!kvToken,
        mpTokenSource: kvToken ? "kv" : null,
        mpTokenPreview,
      },
    });
  } catch (err) {
    return c.json({ error: `Erro ao salvar config: ${err}` }, 500);
  }
});

// ── Payments (Mercado Pago) ───────────────────────────────────────────────────

app.post("/make-server-68454e9b/payments/pix", async (c) => {
  try {
    const body = await c.req.json();
    const { amount, customerEmail, customerName, orderId, cpf } = body;

    if (!amount || !customerEmail || !orderId) {
      return c.json({ error: "amount, customerEmail e orderId são obrigatórios" }, 400);
    }

    const mpToken = await getMpToken();
    if (!mpToken) {
      return c.json({ error: "MP_ACCESS_TOKEN não configurado. Configure-o na área Financeiro do admin." }, 500);
    }

    const nameParts = (customerName || customerEmail).split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || firstName;

    const paymentBody: any = {
      transaction_amount: Number(amount),
      description: "Smart Match – Fotos Tour Palmeiras Allianz Parque",
      payment_method_id: "pix",
      payer: {
        email: customerEmail,
        first_name: firstName,
        last_name: lastName,
      },
    };

    if (cpf) {
      paymentBody.payer.identification = {
        type: "CPF",
        number: cpf.replace(/\D/g, ""),
      };
    }

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": orderId,
      },
      body: JSON.stringify(paymentBody),
    });

    const data = await res.json();

    if (!res.ok) {
      console.log("MP PIX error:", JSON.stringify(data));
      return c.json({ error: `Erro MP PIX: ${data.message ?? JSON.stringify(data.cause ?? data)}` }, 500);
    }

    const qrCode = data.point_of_interaction?.transaction_data?.qr_code ?? "";
    const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64 ?? "";
    const ticketUrl = data.point_of_interaction?.transaction_data?.ticket_url ?? "";

    const pixOrder: any = await kv.get(`${KV}order:${orderId}`);
    if (pixOrder) {
      await kv.set(`${KV}order:${orderId}`, {
        ...pixOrder,
        mpPaymentId: data.id,
        updatedAt: new Date().toISOString(),
      });
    }

    return c.json({ paymentId: data.id, status: data.status, qrCode, qrCodeBase64, ticketUrl });
  } catch (err) {
    console.log("Erro ao criar pagamento PIX:", err);
    return c.json({ error: `Erro ao criar pagamento PIX: ${err}` }, 500);
  }
});

app.post("/make-server-68454e9b/payments/preference", async (c) => {
  try {
    const body = await c.req.json();
    const { amount, customerEmail, orderId, successUrl, failureUrl, pendingUrl, installments } = body;

    if (!amount || !customerEmail || !orderId) {
      return c.json({ error: "amount, customerEmail e orderId são obrigatórios" }, 400);
    }

    const mpToken = await getMpToken();
    if (!mpToken) {
      return c.json({ error: "MP_ACCESS_TOKEN não configurado. Configure-o na área Financeiro do admin." }, 500);
    }

    const maxInstallments = Math.min(12, Math.max(1, parseInt(installments ?? "1", 10)));

    const preferenceBody: any = {
      items: [
        {
          title: "Smart Match – Fotos Tour Palmeiras",
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(amount),
        },
      ],
      payer: { email: customerEmail },
      payment_methods: { installments: maxInstallments },
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      auto_return: "approved",
      external_reference: orderId,
      statement_descriptor: "SmartMatch Fotos",
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceBody),
    });

    const data = await res.json();

    if (!res.ok) {
      console.log("MP Preference error:", JSON.stringify(data));
      return c.json({ error: `Erro MP Preference: ${data.message ?? JSON.stringify(data)}` }, 500);
    }

    const prefOrder: any = await kv.get(`${KV}order:${orderId}`);
    if (prefOrder) {
      await kv.set(`${KV}order:${orderId}`, {
        ...prefOrder,
        mpPreferenceId: data.id,
        updatedAt: new Date().toISOString(),
      });
    }

    const isTest = mpToken.startsWith("TEST-") || mpToken.startsWith("APP_USR-") === false;
    const checkoutUrl = isTest
      ? (data.sandbox_init_point ?? data.init_point)
      : (data.init_point ?? data.sandbox_init_point);

    return c.json({ preferenceId: data.id, checkoutUrl, sandboxUrl: data.sandbox_init_point, initPoint: data.init_point });
  } catch (err) {
    console.log("Erro ao criar preferência:", err);
    return c.json({ error: `Erro ao criar preferência de cartão: ${err}` }, 500);
  }
});

// ── Email — Resend ─────────────────────────────────────────────────────────────

function buildOrderEmailHtml(order: any, photos: { tag: string; eventName: string; viewUrl: string; downloadUrl: string; fileName: string }[]): string {
  const green = "#00843D";
  const darkGreen = "#006B2B";
  const textDark = "#111827";
  const textMid = "#374151";
  const textLight = "#6B7280";
  const border = "#E5E7EB";
  const bg = "#F9FAFB";

  const photoCards = photos.map((p, i) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${border};">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="72" style="vertical-align:top;padding-right:16px;">
              <img src="${p.viewUrl}" width="72" height="72"
                style="border-radius:8px;object-fit:cover;display:block;border:1px solid ${border};"
                alt="Foto ${i + 1}" />
            </td>
            <td style="vertical-align:middle;">
              <div style="font-size:13px;font-weight:600;color:${textDark};margin-bottom:2px;">${p.tag || "Foto"} ${i + 1}</div>
              <div style="font-size:12px;color:${textLight};margin-bottom:10px;">${p.eventName || "Tour Palmeiras"}</div>
              <a href="${p.downloadUrl}"
                style="display:inline-block;background:${green};color:#fff;font-size:12px;font-weight:700;
                       text-decoration:none;padding:7px 18px;border-radius:6px;letter-spacing:0.3px;">
                ⬇ Baixar foto
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join("");

  const totalStr = `R$ ${Number(order.total ?? 0).toFixed(2).replace(".", ",")}`;
  const photosWord = photos.length === 1 ? "foto" : "fotos";
  const dataPedido = new Date(order.createdAt ?? Date.now())
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${bg};font-family:Arial,Helvetica,sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background:${bg};padding:32px 16px;">
    <tr><td align="center">
      <table cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;border:1px solid ${border};">

        <!-- Header -->
        <tr>
          <td style="background:${darkGreen};padding:28px 32px;text-align:center;">
            <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">
              ⚽ Smart Match
            </div>
            <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;">
              Tour Palmeiras · Allianz Parque
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;">
            <h1 style="margin:0 0 8px;font-size:20px;font-weight:800;color:${textDark};">
              📸 Suas ${photosWord} estão prontas!
            </h1>
            <p style="margin:0 0 24px;font-size:14px;color:${textMid};line-height:1.6;">
              Olá${order.customerName ? `, <strong>${order.customerName}</strong>` : ""}! Seu pagamento foi confirmado e suas
              ${photos.length} ${photosWord} já estão disponíveis para download. Os links são válidos por <strong>7 dias</strong>.
            </p>

            <!-- Order summary -->
            <table cellpadding="0" cellspacing="0" width="100%"
              style="background:${bg};border-radius:8px;border:1px solid ${border};margin-bottom:24px;">
              <tr>
                <td style="padding:14px 18px;">
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="font-size:12px;color:${textLight};">Pedido</td>
                      <td align="right" style="font-size:12px;color:${textLight};">Data</td>
                    </tr>
                    <tr>
                      <td style="font-size:13px;font-weight:700;color:${textDark};font-family:monospace;">
                        #${(order.id ?? "").slice(-8).toUpperCase()}
                      </td>
                      <td align="right" style="font-size:13px;font-weight:600;color:${textDark};">
                        ${dataPedido}
                      </td>
                    </tr>
                    <tr><td colspan="2" style="padding-top:10px;border-top:1px solid ${border};"></td></tr>
                    <tr>
                      <td style="font-size:12px;color:${textLight};">${photos.length} ${photosWord}</td>
                      <td align="right" style="font-size:14px;font-weight:800;color:${green};">${totalStr}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Photos -->
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:${textDark};text-transform:uppercase;letter-spacing:0.5px;">
              Suas fotos
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              ${photoCards}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${border};text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:${textLight};">
              Dúvidas? Fale conosco pelo Instagram
              <a href="https://instagram.com/smartmatch.foto" style="color:${green};text-decoration:none;">@smartmatch.foto</a>
            </p>
            <p style="margin:0;font-size:11px;color:#9CA3AF;">
              © ${new Date().getFullYear()} Smart Match · Allianz Parque, São Paulo
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendOrderConfirmationEmail(order: any): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.log("sendOrderConfirmationEmail: RESEND_API_KEY não configurado, e-mail ignorado.");
    return;
  }
  if (!order?.customerEmail) {
    console.log("sendOrderConfirmationEmail: pedido sem e-mail de cliente, ignorado.");
    return;
  }
  if (order.emailSentAt) {
    console.log("sendOrderConfirmationEmail: e-mail já enviado para", order.id);
    return;
  }

  try {
    const photos: { tag: string; eventName: string; viewUrl: string; downloadUrl: string; fileName: string }[] = [];

    for (const item of (order.items ?? [])) {
      const photo: any = await kv.get(`${KV}photo:${item.photoId}`);
      if (!photo?.storagePath) continue;

      const [viewResult, dlResult] = await Promise.all([
        sb().storage.from(BUCKET).createSignedUrl(photo.storagePath, 7 * 24 * 3600),
        sb().storage.from(BUCKET).createSignedUrl(photo.storagePath, 7 * 24 * 3600, {
          download: photo.fileName ?? `foto-${item.photoId}.jpg`,
        }),
      ]);

      if (!viewResult.data?.signedUrl) continue;

      photos.push({
        tag: item.tag ?? "Foto",
        eventName: item.eventName ?? "",
        viewUrl: viewResult.data.signedUrl,
        downloadUrl: dlResult.data?.signedUrl ?? viewResult.data.signedUrl,
        fileName: photo.fileName ?? `foto-${item.photoId}.jpg`,
      });
    }

    if (!photos.length) {
      console.log("sendOrderConfirmationEmail: nenhuma foto com URL válida, e-mail não enviado.");
      return;
    }

    const html = buildOrderEmailHtml(order, photos);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Smart Match <onboarding@resend.dev>",
        to: [order.customerEmail],
        subject: `📸 Suas fotos do Tour Palmeiras estão prontas! (#${(order.id ?? "").slice(-8).toUpperCase()})`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.log("Resend API erro:", emailRes.status, errBody);
      return;
    }

    await kv.set(`${KV}order:${order.id}`, {
      ...order,
      emailSentAt: new Date().toISOString(),
    });
    console.log("E-mail de confirmação enviado para:", order.customerEmail);
  } catch (err) {
    console.log("Erro ao enviar e-mail de confirmação:", err);
  }
}

// MP Webhook (payment status update)
app.post("/make-server-68454e9b/payments/webhook", async (c) => {
  try {
    const body = await c.req.json();
    const action = body.action;
    const paymentId = body.data?.id;

    if ((action === "payment.updated" || action === "payment.created") && paymentId) {
      const mpToken = await getMpToken();
      if (!mpToken) {
        console.log("Webhook: MP token não configurado");
        return c.json({ received: true });
      }
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      });
      const payment = await res.json();

      if (payment.status === "approved" && payment.external_reference) {
        const orderId = payment.external_reference;
        const order: any = await kv.get(`${KV}order:${orderId}`);
        if (order) {
          const now = new Date().toISOString();
          const updatedOrder = { ...order, status: "paid", updatedAt: now };
          await kv.set(`${KV}order:${orderId}`, updatedOrder);
          const dateKey = now.slice(0, 10);
          const dayRevenue = ((await kv.get(`${KV}daily:revenue:${dateKey}`)) as number) ?? 0;
          await kv.set(`${KV}daily:revenue:${dateKey}`, dayRevenue + (order.total ?? 0));
          sendOrderConfirmationEmail(updatedOrder).catch(console.log);
        }
      }
    }
    return c.json({ received: true });
  } catch (err) {
    console.log("Webhook error:", err);
    return c.json({ error: `Webhook error: ${err}` }, 500);
  }
});

// ── Sync Storage → KV ─────────────────────────────────────────────────────────

app.post("/make-server-68454e9b/admin/sync-storage", adminAuth, async (c) => {
  const startedAt = Date.now();
  const errors: string[] = [];
  let eventsCreated = 0;
  let photosImported = 0;
  let eventsSkipped = 0;
  let photosSkipped = 0;
  const skipComplete = c.req.query("skipComplete") === "true";

  try {
    console.log(`[Sync] Iniciando sincronização do Storage... (skipComplete=${skipComplete})`);

    const { data: eventFolders, error: listErr } = await sb().storage
      .from(BUCKET)
      .list("events", { limit: 500 });

    if (listErr) {
      console.log(`[Sync] Erro ao listar bucket: ${listErr.message}`);
      return c.json({ error: `Erro ao listar bucket: ${listErr.message}` }, 500);
    }

    if (!eventFolders || eventFolders.length === 0) {
      console.log(`[Sync] Nenhuma pasta encontrada no Storage`);
      return c.json({
        success: true,
        message: "Nenhuma pasta de evento encontrada no Storage.",
        stats: { eventsCreated: 0, photosImported: 0, eventsSkipped: 0, photosSkipped: 0, elapsedMs: Date.now() - startedAt, errors },
      });
    }

    const folderNames = eventFolders
      .filter((item: any) => !item.metadata?.mimetype)
      .map((item: any) => item.name);

    console.log(`[Sync] ✓ Encontradas ${folderNames.length} pastas de eventos: ${folderNames.join(", ")}`);

    const cfg: any = (await kv.get(`${KV}config`)) ?? {};
    const currentPrice: number = cfg.photoPrice ?? 30;
    const branding: any = (await kv.get(`${KV}branding`)) ?? {};
    const defaultSessionType = Array.isArray(branding.eventSessionTypes) && branding.eventSessionTypes.length > 0
      ? branding.eventSessionTypes[0] : "Tour";
    const autoVenue = `${branding.venueName ?? "Allianz Parque"}, ${branding.venueLocation ?? "São Paulo, SP"}`;

    for (const eventSlug of folderNames) {
      try {
        const { data: files, error: filesErr } = await sb().storage
          .from(BUCKET)
          .list(`events/${eventSlug}`, { limit: 1000 });

        if (filesErr) {
          console.log(`[Sync] Erro listando ${eventSlug}: ${filesErr.message}`);
          errors.push(`Erro listando eventos/${eventSlug}: ${filesErr.message}`);
          continue;
        }
        if (!files || files.length === 0) {
          console.log(`[Sync] Nenhuma foto em ${eventSlug}`);
          continue;
        }

        const imageFiles = files.filter(
          (f: any) => f.name && f.metadata && /\.(jpg|jpeg|png|webp)$/i.test(f.name)
        );
        const storagePhotoCount = imageFiles.length;

        const existingPhotoIds = await getList(`${KV}photos:event:${eventSlug}`);
        const kvPhotoCount = existingPhotoIds.length;
        const syncPercentage = storagePhotoCount > 0 ? Math.round((kvPhotoCount / storagePhotoCount) * 100) : 0;

        console.log(`[Sync] Evento ${eventSlug}: ${kvPhotoCount}/${storagePhotoCount} fotos (${syncPercentage}%)`);

        if (skipComplete && syncPercentage >= 100) {
          console.log(`[Sync] ⏭ Pulando ${eventSlug} (100% sincronizado)`);
          eventsSkipped++;
          continue;
        }

        let event: any = await kv.get(`${KV}event:${eventSlug}`);
        const isNewEvent = !event;

        if (isNewEvent) {
          const now = new Date().toISOString();
          if (/^\d{12}$/.test(eventSlug)) {
            const day = eventSlug.slice(0, 2), month = eventSlug.slice(2, 4);
            const year = eventSlug.slice(4, 8), hours = eventSlug.slice(8, 10), mins = eventSlug.slice(10, 12);
            const dateISO = `${year}-${month}-${day}T${hours}:${mins}:00`;
            const d = new Date(dateISO);
            event = {
              id: eventSlug, name: `${defaultSessionType} ${day}/${month}/${year}, ${hours}:${mins}`,
              slug: eventSlug, date: dateISO, endTime: "", location: autoVenue,
              sessionType: defaultSessionType, status: "disponivel", photoCount: 0, faceCount: 0,
              price: currentPrice, dayOfWeek: dayOfWeekPT(d), createdAt: now, updatedAt: now,
            };
          } else {
            event = {
              id: eventSlug, name: eventSlug, slug: eventSlug, date: new Date().toISOString(),
              endTime: "", location: autoVenue, sessionType: defaultSessionType,
              status: "disponivel", photoCount: 0, faceCount: 0, price: currentPrice,
              dayOfWeek: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            };
          }
          await kv.set(`${KV}event:${eventSlug}`, event);
          await appendToList(`${KV}events:index`, eventSlug);
          eventsCreated++;
          console.log(`[Sync] ✓ Criado evento: ${eventSlug}`);
        } else {
          eventsSkipped++;
          console.log(`[Sync] → Evento ${eventSlug} já existe`);
        }

        const existingPaths = new Set<string>();
        const existingIdSet = new Set(existingPhotoIds);
        if (existingPhotoIds.length > 0) {
          const recs = await Promise.all(existingPhotoIds.map((pid) => kv.get(`${KV}photo:${pid}`)));
          for (const rec of recs) { if ((rec as any)?.storagePath) existingPaths.add((rec as any).storagePath); }
        }

        let newPhotosForEvent = 0;
        console.log(`[Sync] Processando ${storagePhotoCount} imagens em ${eventSlug}...`);
        for (const file of imageFiles) {
          const storagePath = `events/${eventSlug}/${file.name}`;
          const photoId = file.name.replace(/\.[^.]+$/, "");
          if (existingPaths.has(storagePath) || existingIdSet.has(photoId)) {
            photosSkipped++;
            continue;
          }

          const now = new Date().toISOString();
          const photo = { id: photoId, eventId: eventSlug, fileName: file.name, storagePath, tag: "Geral", price: currentPrice, createdAt: file.created_at ?? now };
          await kv.set(`${KV}photo:${photoId}`, photo);
          await appendToList(`${KV}photos:event:${eventSlug}`, photoId);
          photosImported++;
          newPhotosForEvent++;
        }
        if (newPhotosForEvent > 0) {
          console.log(`[Sync] ✓ Importadas ${newPhotosForEvent} fotos novas para ${eventSlug}`);
        }

        if (newPhotosForEvent > 0 || isNewEvent) {
          const allPhotoIds = await getList(`${KV}photos:event:${eventSlug}`);
          await kv.set(`${KV}event:${eventSlug}`, { ...event, photoCount: allPhotoIds.length, updatedAt: new Date().toISOString() });
        }
      } catch (e: any) {
        errors.push(`evento=${eventSlug}: ${e.message}`);
      }
    }

    const elapsedMs = Date.now() - startedAt;
    console.log(`[Sync] ✓ CONCLUÍDO — ${eventsCreated} eventos criados, ${photosImported} fotos importadas, ${eventsSkipped} eventos pulados, ${photosSkipped} fotos já existiam (${elapsedMs}ms)`);
    if (errors.length > 0) {
      console.log(`[Sync] ⚠ ${errors.length} erro(s):`, errors);
    }
    return c.json({ success: true, stats: { eventsCreated, photosImported, eventsSkipped, photosSkipped, elapsedMs, errors } });
  } catch (err) {
    console.log("[Sync] ✗ ERRO:", err);
    return c.json({ error: `Erro no sync: ${err}` }, 500);
  }
});

// ── List Storage Contents (diagnostic) ────────────────────────────────────────

app.get("/make-server-68454e9b/admin/storage-list", adminAuth, async (c) => {
  try {
    const { data: eventFolders, error: err1 } = await sb().storage.from(BUCKET).list("events", { limit: 200 });
    if (err1) return c.json({ error: `Erro ao listar bucket: ${err1.message}` }, 500);

    const folders: { name: string; fileCount: number; files: string[] }[] = [];
    for (const folder of eventFolders ?? []) {
      if ((folder as any).metadata?.mimetype) continue;
      const { data: files } = await sb().storage.from(BUCKET).list(`events/${folder.name}`, { limit: 100 });
      const imageFiles = (files ?? []).filter((f: any) => f.name && /\.(jpg|jpeg|png|webp)$/i.test(f.name));
      folders.push({ name: folder.name, fileCount: imageFiles.length, files: imageFiles.slice(0, 10).map((f: any) => f.name) });
    }
    return c.json({ bucket: BUCKET, folders, totalFolders: folders.length });
  } catch (err) {
    console.log("Erro no storage-list:", err);
    return c.json({ error: `Erro: ${err}` }, 500);
  }
});

// ── Flatten tenant data → global (manual trigger) ─────────────────────────────
// POST /admin/flatten-to-global
// Use this once to migrate data from any tenant-prefixed KV keys to global ef: keys.
// Scans the kv_store table directly to find all tenant indexes.
app.post("/make-server-68454e9b/admin/flatten-to-global", adminAuth, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const fromUserId: string | undefined = body.fromUserId?.trim();

    const migrated: string[] = [];

    // Find all keys matching tenant event/order indexes
    const { data: rows, error: rowsErr } = await sb()
      .from("kv_store_68454e9b")
      .select("key")
      .or("key.ilike.ef:%:events:index,key.ilike.ef:%:orders:index,key.ilike.ef:%:config,key.ilike.ef:%:branding")
      .limit(200);

    if (rowsErr) throw new Error(`query error: ${rowsErr.message}`);

    const tenantKeys = (rows ?? []).map((r: any) => r.key as string).filter((k: string) => {
      // Only include real tenant keys (not global ef:events:index, ef:config, etc.)
      const parts = k.split(":");
      return parts.length >= 3; // ef:{userId}:... has at least 3 parts
    });

    console.log(`[flatten-to-global] Chaves tenant encontradas: ${tenantKeys.join(", ")}`);

    // If fromUserId specified, only process that user's data
    const keysToProcess = fromUserId
      ? tenantKeys.filter(k => k.startsWith(`ef:${fromUserId}:`))
      : tenantKeys;

    // Process events:index
    const globalEvents = await getList(`${KV}events:index`);
    const eventSet = new Set(globalEvents);
    let newEvents = 0;
    for (const key of keysToProcess.filter(k => k.endsWith(":events:index"))) {
      const list = await getList(key);
      for (const id of list) {
        if (!eventSet.has(id)) { eventSet.add(id); newEvents++; }
      }
    }
    if (newEvents > 0) {
      await kv.set(`${KV}events:index`, Array.from(eventSet));
      migrated.push(`events:index (+${newEvents} eventos)`);
    }

    // Process orders:index
    const globalOrders = await getList(`${KV}orders:index`);
    const orderSet = new Set(globalOrders);
    let newOrders = 0;
    for (const key of keysToProcess.filter(k => k.endsWith(":orders:index"))) {
      const list = await getList(key);
      for (const id of list) {
        if (!orderSet.has(id)) { orderSet.add(id); newOrders++; }
      }
    }
    if (newOrders > 0) {
      await kv.set(`${KV}orders:index`, Array.from(orderSet));
      migrated.push(`orders:index (+${newOrders} pedidos)`);
    }

    // Process config (first one found wins if global is empty)
    if (!await kv.get(`${KV}config`)) {
      for (const key of keysToProcess.filter(k => k.endsWith(":config"))) {
        const cfg = await kv.get(key);
        if (cfg) {
          await kv.set(`${KV}config`, cfg);
          migrated.push("config");
          break;
        }
      }
    }

    // Process branding (first one found wins if global is empty)
    if (!await kv.get(`${KV}branding`)) {
      for (const key of keysToProcess.filter(k => k.endsWith(":branding"))) {
        const brand = await kv.get(key);
        if (brand) {
          await kv.set(`${KV}branding`, brand);
          bustBrandingCache();
          migrated.push("branding");
          break;
        }
      }
    }

    // Reset flatten cache so auto-flatten runs again cleanly
    _flattenRan.clear();

    const msg = migrated.length > 0
      ? `Migração concluída: ${migrated.join(", ")}`
      : "Nada para migrar — dados globais já estão corretos.";

    console.log(`[flatten-to-global] ${msg}`);
    return c.json({ success: true, migrated, tenantKeysFound: tenantKeys, message: msg });
  } catch (err) {
    console.log("Erro no flatten-to-global:", err);
    return c.json({ error: `Erro: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);
