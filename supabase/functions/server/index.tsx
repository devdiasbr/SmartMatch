import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import * as faces from "./faces.ts";

const BUCKET = "make-68454e9b-eventface";
const KV = "ef:";

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
let brandingCache: BrandingCacheEntry | null = null;
const BRANDING_TTL = 30_000; // 30 s

function bustBrandingCache() { brandingCache = null; }

// ── Auth middleware ───────────────────────────────────────────────────────────

async function adminAuth(c: any, next: () => Promise<void>) {
  // Prefer X-Admin-Token (user JWT) — fallback to Authorization header.
  // We always send publicAnonKey as Authorization for Supabase gateway access,
  // so we must NOT accept the anon key as a valid admin token.
  const adminToken =
    c.req.header("X-Admin-Token") ||
    c.req.header("Authorization")?.replace("Bearer ", "");

  if (!adminToken) {
    return c.json({ error: "Não autorizado: token de admin ausente" }, 401);
  }

  const { data: { user }, error } = await sb().auth.getUser(adminToken);
  if (error || !user) {
    console.log("adminAuth falhou:", error?.message ?? "token inválido");
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

// ── Seed ──────────────────────────────────────────────────────────────────────

// Initialize on startup
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
  // Serve from in-memory cache when fresh
  const now = Date.now();
  if (!bustCache && brandingCache && now - brandingCache.ts < BRANDING_TTL) {
    return brandingCache.data;
  }

  const b: any = (await kv.get(`${KV}branding`)) ?? {};
  console.log(`[brandingWithUrls] Branding KV:`, {
    logoPath: b.logoPath,
    faviconPath: b.faviconPath,
    ctaBgPath: b.ctaBgPath,
    scannerImagePath: b.scannerImagePath,
    backgroundPaths: b.backgroundPaths,
  });

  // ── Batch-sign all storage paths in ONE round-trip ────────────────────────
  const pathsToSign: string[] = [
    b.logoPath,
    b.faviconPath,
    b.ctaBgPath,
    b.scannerImagePath,
    ...(b.backgroundPaths ?? []),
  ].filter(Boolean) as string[];

  console.log(`[brandingWithUrls] Paths para assinar (${pathsToSign.length}):`, pathsToSign);

  const urlMap: Record<string, string> = {};
  if (pathsToSign.length > 0) {
    const { data: signed, error } = await sb().storage
      .from(BUCKET)
      .createSignedUrls(pathsToSign, 3600);
    
    console.log(`[brandingWithUrls] Signed URLs result:`, {
      signed: signed?.length ?? 0,
      error: error?.message,
    });
    
    for (const item of signed ?? []) {
      if (item.signedUrl) {
        urlMap[item.path] = item.signedUrl;
        console.log(`[brandingWithUrls] ✓ ${item.path} → ${item.signedUrl.substring(0, 80)}...`);
      } else {
        console.log(`[brandingWithUrls] ✗ ${item.path} → SEM URL!`);
      }
    }
  }

  const logoUrl        = b.logoPath         ? (urlMap[b.logoPath]         ?? null) : null;
  const faviconUrl     = b.faviconPath      ? (urlMap[b.faviconPath]      ?? null) : null;
  const ctaBgUrl       = b.ctaBgPath        ? (urlMap[b.ctaBgPath]        ?? null) : null;
  const scannerImageUrl= b.scannerImagePath ? (urlMap[b.scannerImagePath] ?? null) : null;
  const backgroundUrls = (b.backgroundPaths ?? [])
    .map((p: string) => urlMap[p])
    .filter(Boolean) as string[];

  console.log(`[brandingWithUrls] URLs finais:`, {
    logoUrl: logoUrl ? '✓' : '✗',
    faviconUrl: faviconUrl ? '✓' : '✗',
    ctaBgUrl: ctaBgUrl ? '✓' : '✗',
    scannerImageUrl: scannerImageUrl ? '✓' : '✗',
    backgroundUrls: backgroundUrls.length,
  });

  const result = {
    appName: b.appName ?? "Smart Match",
    pageTitle: b.pageTitle ?? "Smart Match – Tour Palmeiras",
    watermarkText: b.watermarkText ?? "SMART MATCH",
    watermarkProducer: b.watermarkProducer ?? "EDU SANTANA PRODUÇÕES",
    watermarkPhotoTag: b.watermarkPhotoTag ?? "◆ FOTO PROTEGIDA ◆",
    watermarkTour: b.watermarkTour ?? "© TOUR PALMEIRAS",
    logoUrl,
    faviconUrl,
    backgroundUrls,
    ctaBgUrl,
    scannerImageUrl,
    hasLogo: !!b.logoPath,
    hasFavicon: !!b.faviconPath,
    backgroundCount: (b.backgroundPaths ?? []).length,
    updatedAt: b.updatedAt ?? null,
    // Venue / tour identity
    venueName: b.venueName ?? "Allianz Parque",
    venueLocation: b.venueLocation ?? "São Paulo, SP",
    tourLabel: b.tourLabel ?? "Tour",
    homeExclusiveText: b.homeExclusiveText ?? "Exclusivo Allianz Parque",
    // ── Home page content ──
    heroLine1: b.heroLine1 ?? "Você vibrou.",
    heroLine2: b.heroLine2 ?? "Você torceu.",
    heroLine3: b.heroLine3 ?? "Encontre-se.",
    heroSubtitle: b.heroSubtitle ?? "Nossa IA varre milhares de fotos do Tour do Allianz Parque e localiza você em segundos. Compre apenas o que importa — os seus momentos.",
    heroCTA: b.heroCTA ?? "Ver eventos",
    heroBadge: b.heroBadge ?? "Allianz Parque · Tour Oficial do Palmeiras",
    // ── Home CTA banner ──
    ctaTitle1: b.ctaTitle1 ?? "Pronto para encontrar",
    ctaTitle2: b.ctaTitle2 ?? "seus momentos?",
    ctaSubtitle: b.ctaSubtitle ?? "Tire uma selfie e nossa IA encontra você em segundos entre milhares de fotos.",
    ctaButton: b.ctaButton ?? "Ver eventos",
    // ── Events page content ──
    eventsHeroTitle: b.eventsHeroTitle ?? "Reviva seus",
    eventsHeroTitleAccent: b.eventsHeroTitleAccent ?? "Momentos no Allianz",
    eventsHeroSubtitle: b.eventsHeroSubtitle ?? "Busca com reconhecimento facial. Encontre suas fotos pelo data e horário do tour.",
    eventsListTitle: b.eventsListTitle ?? "Tours Disponíveis",
    eventSessionTypes: (() => {
      const OLD_DEFAULTS = ["Tour", "Partida", "Confraternização", "Show", "Corporativo"];
      const stored: string[] = Array.isArray(b.eventSessionTypes) ? b.eventSessionTypes : [];
      // If the stored list is exactly the old hardcoded defaults, migrate to ['Tour']
      const isOldDefault =
        stored.length === OLD_DEFAULTS.length &&
        OLD_DEFAULTS.every((v, i) => stored[i] === v);
      if (stored.length === 0 || isOldDefault) return ["Tour"];
      return stored;
    })(),
    bgTransitionInterval: typeof b.bgTransitionInterval === 'number' ? b.bgTransitionInterval : 5,
  };

  brandingCache = { data: result, ts: Date.now() };
  return result;
}

// Public branding (no auth)
app.get("/make-server-68454e9b/branding/public", async (c) => {
  try {
    return c.json(await brandingWithUrls());
  } catch (err) {
    console.log("Erro ao buscar branding público:", err);
    return c.json({
      appName: "Smart Match",
      pageTitle: "Smart Match – Tour Palmeiras",
      watermarkText: "SMART MATCH",
      watermarkProducer: "EDU SANTANA PRODUÇÕES",
      watermarkPhotoTag: "◆ FOTO PROTEGIDA ◆",
      watermarkTour: "© TOUR PALMEIRAS",
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
    return c.json(await brandingWithUrls(true)); // always fresh for admin
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
      // Venue / tour identity
      venueName: body.venueName !== undefined ? body.venueName : existing.venueName,
      venueLocation: body.venueLocation !== undefined ? body.venueLocation : existing.venueLocation,
      tourLabel: body.tourLabel !== undefined ? body.tourLabel : existing.tourLabel,
      homeExclusiveText: body.homeExclusiveText !== undefined ? body.homeExclusiveText : existing.homeExclusiveText,
      // Home content fields
      heroLine1: body.heroLine1 !== undefined ? body.heroLine1 : existing.heroLine1,
      heroLine2: body.heroLine2 !== undefined ? body.heroLine2 : existing.heroLine2,
      heroLine3: body.heroLine3 !== undefined ? body.heroLine3 : existing.heroLine3,
      heroSubtitle: body.heroSubtitle !== undefined ? body.heroSubtitle : existing.heroSubtitle,
      heroCTA: body.heroCTA !== undefined ? body.heroCTA : existing.heroCTA,
      heroBadge: body.heroBadge !== undefined ? body.heroBadge : existing.heroBadge,
      // Home CTA banner
      ctaTitle1: body.ctaTitle1 !== undefined ? body.ctaTitle1 : existing.ctaTitle1,
      ctaTitle2: body.ctaTitle2 !== undefined ? body.ctaTitle2 : existing.ctaTitle2,
      ctaSubtitle: body.ctaSubtitle !== undefined ? body.ctaSubtitle : existing.ctaSubtitle,
      ctaButton: body.ctaButton !== undefined ? body.ctaButton : existing.ctaButton,
      // Events page content fields
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

    // Delete old asset when replacing logo, favicon or cta-background
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

// Delete logo or favicon
app.delete("/make-server-68454e9b/admin/branding/asset/:asset", adminAuth, async (c) => {
  try {
    const asset = c.req.param("asset");
    if (asset !== "logo" && asset !== "favicon" && asset !== "cta-background" && asset !== "scanner-image")
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

// ── Auth ──────────────────────────────────���───────────────────────────────────

// Register admin user
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
      // Automatically confirm the user's email since an email server hasn't been configured.
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

// List all events (public)
app.get("/make-server-68454e9b/events", async (c) => {
  try {
    const ids = await getList(`${KV}events:index`);
    const events = await Promise.all(ids.map((id) => kv.get(`${KV}event:${id}`)));
    const valid = events.filter(Boolean).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );
    return c.json({ events: valid });
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

// Get current photo price (public — no auth required)
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
  return `${day}${month}${year}${hours}${mins}`;        // DDMMYYYYHHMM
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

    // Compute slug: prefer explicit slug, otherwise derive from date
    const dateISO = body.date ?? now;
    const slug = body.slug ?? dateToSlug(dateISO);

    // ── Find-or-create: if slug already exists, return the existing event ──
    const existing = await kv.get(`${KV}event:${slug}`);
    if (existing) {
      return c.json({ event: existing }, 200);
    }

    // Create new event
    const d = new Date(dateISO);
    const day   = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year  = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const mins  = d.getMinutes().toString().padStart(2, "0");

    // Fetch current photoPrice from admin config
    const cfg: any = (await kv.get(`${KV}config`)) ?? {};
    const photoPrice: number = cfg.photoPrice ?? 30;

    // sessionType from body, default to first in branding list or 'Tour'
    const branding: any = (await kv.get(`${KV}branding`)) ?? {};
    const defaultSessionType = Array.isArray(branding.eventSessionTypes) && branding.eventSessionTypes.length > 0
      ? branding.eventSessionTypes[0]
      : "Tour";
    const sessionType: string = body.sessionType ?? defaultSessionType;
    const venueName: string = branding.venueName ?? "Allianz Parque";
    const venueLocation: string = branding.venueLocation ?? "São Paulo, SP";
    const location = `${venueName}, ${venueLocation}`;

    const event = {
      id: slug,
      name: `${sessionType} ${day}/${month}/${year}, ${hours}:${mins}`,
      slug,
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

    await kv.set(`${KV}event:${slug}`, event);
    await appendToList(`${KV}events:index`, slug);
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
    // Delete photos from storage
    const photoIds = await getList(`${KV}photos:event:${id}`);
    for (const pid of photoIds) {
      const photo: any = await kv.get(`${KV}photo:${pid}`);
      if (photo?.storagePath) {
        await sb().storage.from(BUCKET).remove([photo.storagePath]);
      }
      await kv.del(`${KV}photo:${pid}`);
    }
    await kv.del(`${KV}photos:event:${id}`);
    await kv.del(`${KV}faces:event:${id}`); // aggregated face index
    await kv.del(`${KV}event:${id}`);
    await removeFromList(`${KV}events:index`, id);

    // Remove face embeddings from pgvector
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

    // Pagination: ?page=1&limit=20 (defaults: page 1, limit 20)
    const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10));
    const limit = Math.min(500, Math.max(1, parseInt(c.req.query("limit") ?? "20", 10))); // Aumentado de 100 para 500 para admin
    const total = photoIds.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const pageIds = photoIds.slice(start, start + limit);

    // Batch: fetch config + all photo records in parallel
    const [cfg, ...photoRecords] = await Promise.all([
      kv.get(`${KV}config`),
      ...pageIds.map((pid) => kv.get(`${KV}photo:${pid}`)),
    ]);
    const currentPrice: number = (cfg as any)?.photoPrice ?? 30;

    // Collect storage paths for a single batch sign call
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

    // Auto-create event if it doesn't exist (for direct slug uploads)
    if (!event) {
      console.log(`[Base64] Evento ${eventId} não encontrado, tentando auto-criar`);
      // Try to interpret eventId as slug DDMMYYYYHHMM
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
          slug: eventId,
          date: dateISO,
          endTime: "",
          location: autoVenue,
          sessionType: autoSessionType,
          status: "disponivel",
          photoCount: 0,
          faceCount: 0,
          price: 30,
          dayOfWeek: dayOfWeekPT(d),
          createdAt: now,
          updatedAt: now,
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

    // Decode base64 → Uint8Array
    console.log(`[Base64] Decodificando base64...`);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    console.log(`[Base64] Decodificado ${bytes.length} bytes`);

    // Upload to Supabase Storage
    console.log(`[Base64] Enviando para storage: ${storagePath}`);
    const { error: uploadError } = await sb().storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

    if (uploadError) {
      console.log(`[Base64] Erro no upload do storage: ${uploadError.message}`);
      return c.json({ error: `Erro no upload para storage: ${uploadError.message}` }, 500);
    }

    const now = new Date().toISOString();

    // Always use current configured price (not stale event price)
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

    // Update event photo count AND sync price
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

// ── Upload foto via multipart/form-data (streaming binário — sem base64) ───────
// POST /events/:id/photos/stream
// Cliente envia FormData{ file: Blob, tag: string }.
// Elimina 37% de inflate do base64 e o loop atob() char-a-char no servidor.
// O File é passado diretamente ao SDK do Supabase Storage (zero-copy).
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

    // parseBody lê multipart — campo "file" é um Web API File (Blob + nome + tipo)
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
    // Zero-copy: File passado diretamente ao SDK — sem ArrayBuffer intermediário
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

      // Remove face embeddings from pgvector
      faces.deleteFacesByPhoto(photoId).catch((e) =>
        console.log(`pgvector deleteFacesByPhoto error (non-blocking): ${e}`)
      );

      // Remove from aggregated face index
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

      // Decrement event photo count
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

// Save face descriptors for a photo (admin — called client-side after upload)
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

      // ── Atualiza índice agregado de faces do evento (1 KV → O(1) leitura) ──
      const facesKey = `${KV}faces:event:${eventId}`;
      const faceIndex: Record<string, number[][]> = (await kv.get(facesKey)) ?? {};
      faceIndex[photoId] = descriptors;
      await kv.set(facesKey, faceIndex);

      // ── Indexa no pgvector (busca ANN em O(log n), escala para milhões) ───
      if (descriptors.length > 0) {
        faces.indexFaces(photoId, eventId, descriptors).catch((e) =>
          console.log(`pgvector indexFaces error (non-blocking): ${e}`)
        );
      }

      // Atualiza contador de faces no evento
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

// Get all face descriptors for an event (public — used for client-side comparison)
// Fast path: reads ONE aggregated key. Falls back to N reads + auto-migrates legacy data.
app.get("/make-server-68454e9b/events/:id/faces", async (c) => {
  try {
    const eventId = c.req.param("id");
    const facesKey = `${KV}faces:event:${eventId}`;

    // ── Fast path: aggregated index (1 KV call) ──────────────────────────────
    const faceIndex: Record<string, number[][]> | null = await kv.get(facesKey);
    if (faceIndex) {
      const faces = Object.entries(faceIndex)
        .filter(([, descs]) => descs?.length > 0)
        .map(([photoId, descriptors]) => ({ photoId, descriptors }));
      return c.json({ faces });
    }

    // ── Legacy fallback: N KV calls + rebuild aggregated index ───────────────
    console.log(`[faces] No aggregated index for event ${eventId}, rebuilding from photo records…`);
    const photoIds = await getList(`${KV}photos:event:${eventId}`);
    const photoRecords = await Promise.all(photoIds.map((pid) => kv.get(`${KV}photo:${pid}`)));
    const faces = (photoRecords as any[])
      .filter((p) => p?.faceDescriptors?.length > 0)
      .map((p) => ({ photoId: p.id, descriptors: p.faceDescriptors }));

    // Persist aggregated index so next call is O(1)
    if (faces.length > 0) {
      const newIndex: Record<string, number[][]> = {};
      for (const { photoId, descriptors } of faces) newIndex[photoId] = descriptors;
      kv.set(facesKey, newIndex).catch(console.warn); // fire-and-forget
    }

    return c.json({ faces });
  } catch (err) {
    console.log("Erro ao buscar descritores faciais:", err);
    return c.json({ error: `Erro ao buscar faces: ${err}` }, 500);
  }
});

// ── Face Migration (KV → pgvector) ───────────────────────────────────────────

// POST /admin/migrate-faces-pgvector — admin auth
// Varre TODOS os registros ef:photo:* no KV via getByPrefix, independente do
// índice ef:events:index. Idempotente — pode ser rodado várias vezes.
app.post("/make-server-68454e9b/admin/migrate-faces-pgvector", adminAuth, async (c) => {
  const startedAt = Date.now();
  const errors: string[] = [];
  let totalPhotos = 0;
  let totalFaces = 0;
  let skippedPhotos = 0;
  const eventsSeen = new Set<string>();
  const photosWithFaces: any[] = [];

  try {
    // ── Estratégia 1: getByPrefix — varre todos os registros de foto diretamente ──
    // Não depende do ef:events:index, que pode estar desatualizado.
    const allPhotoRecords: any[] = await kv.getByPrefix(`${KV}photo:`);
    console.log(`[migrate-faces] getByPrefix encontrou ${allPhotoRecords.length} registros ef:photo:*`);

    const fromPrefix = allPhotoRecords.filter(
      (p: any) => p && p.id && p.eventId && Array.isArray(p.faceDescriptors) && p.faceDescriptors.length > 0,
    );
    skippedPhotos = allPhotoRecords.length - fromPrefix.length;
    photosWithFaces.push(...fromPrefix);
    console.log(`[migrate-faces] ${fromPrefix.length} com descritores, ${skippedPhotos} sem`);

    // ── Estratégia 2 (fallback): se prefix scan vazio, usa ef:events:index ────
    let usedFallback = false;
    if (allPhotoRecords.length === 0) {
      usedFallback = true;
      console.log("[migrate-faces] prefix scan vazio — fallback via ef:events:index");
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

    // ── Indexar no pgvector ───────────────────────────────────────────────────
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
// POST /admin/reindex-event — admin auth
// Reindexar faces de um único evento. Body: { eventId: string }
app.post("/make-server-68454e9b/admin/reindex-event", adminAuth, async (c) => {
  const startedAt = Date.now();
  const errors: string[] = [];
  let totalPhotos = 0;
  let totalFaces = 0;
  let noFacePhotos = 0;   // fotos sem descritor facial (normal — sem pessoa na foto)
  let notFoundPhotos = 0; // fotos ausentes no KV (problema real de dados)
  let processedPhotos = 0;

  try {
    const body = await c.req.json();
    const eventId = body.eventId as string;

    if (!eventId) {
      return c.json({ error: "eventId é obrigatório" }, 400);
    }

    console.log(`[reindex-event] Iniciando reindexação do evento ${eventId}`);

    // ── 1. Buscar todas as fotos do evento ────────────────────────────────────
    const photoIds: string[] = await getList(`${KV}photos:event:${eventId}`);
    console.log(`[reindex-event] Evento ${eventId} tem ${photoIds.length} fotos`);

    if (photoIds.length === 0) {
      return c.json({
        success: false,
        error: `Nenhuma foto encontrada para o evento ${eventId}`,
        stats: { totalPhotos: 0, totalFaces: 0, skippedPhotos: 0, processedPhotos: 0, elapsedMs: 0, errors: [] },
      });
    }

    // ── 2. Processar cada foto ─────────────────────────────────────────────────
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
      // noFacePhotos = sem rosto na foto (esperado); notFoundPhotos = dado faltante no KV; errors = falhas reais
      stats: { totalPhotos, totalFaces, noFacePhotos, notFoundPhotos, skippedPhotos: noFacePhotos + notFoundPhotos, processedPhotos, elapsedMs, errors },
    });
  } catch (err) {
    console.log("Erro ao reindexar evento:", err);
    return c.json({ error: `Erro ao reindexar evento: ${err}` }, 500);
  }
});

// ── Photo IDs for an event ────────────────────────────────────────────────────
// GET /admin/events/:id/photo-ids — admin auth
// Retorna a lista ordenada de IDs de fotos de um evento (sem sign URLs, rápido).
app.get("/make-server-68454e9b/admin/events/:id/photo-ids", adminAuth, async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return c.json({ error: "id do evento é obrigatório" }, 400);
    const photoIds: string[] = await getList(`${KV}photos:event:${id}`);
    console.log(`[photo-ids] Evento ${id}: ${photoIds.length} fotos`);
    return c.json({ photoIds, total: photoIds.length });
  } catch (err) {
    console.log("Erro ao buscar IDs de fotos:", err);
    // Retorna lista vazia em vez de 500 para que o frontend continue com os outros eventos
    return c.json({ photoIds: [], total: 0, warning: `Erro ao buscar lista: ${err}` });
  }
});

// ── Reindex Single Photo (pgvector) ───────────────────────────────────────────
// POST /admin/reindex-photo — admin auth
// Indexa os descritores faciais de UMA foto. Chamado pelo frontend foto a foto
// para permitir progresso granular (foto X/Y) em tempo real.
// Body: { eventId: string, photoId: string }
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

    // faceDescriptors pode ser array de arrays, array de plain objects (Float32Array
    // serializado via JSON) ou plain object de arrays — normalizeDescriptors() em
    // faces.ts trata todos esses formatos automaticamente.
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
    // Sem status 500 para que o frontend não receba "Failed to fetch"
    return c.json({ success: false, notFound: false, noFace: false, faces: 0, error: msg });
  }
});

// ── KV Diagnostic ─────────────────────────────────────────────────────────────
// GET /admin/diagnose-kv — admin auth
// Lê a tabela kv_store_68454e9b diretamente e retorna contagens por prefixo.
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

    // ─── NOVO: Diagnóstico detalhado de eventos e fotos ───
    const eventIds: string[] = await getList(`${KV}events:index`);
    console.log(`[diagnose-kv] Encontrados ${eventIds.length} eventos na lista ef:events:index`);
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
// GET /admin/diagnose-photo-keys — admin auth
// Lista TODAS as chaves que começam com ef:photos:event: para debugar
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
// GET /admin/diagnose-pgvector — admin auth
// Verifica quantos embeddings estão indexados no pgvector.
app.get("/make-server-68454e9b/admin/diagnose-pgvector", adminAuth, async (c) => {
  try {
    // Total de embeddings
    const { count: totalEmbeddings, error: countErr } = await sb()
      .from("face_embeddings_68454e9b")
      .select("*", { count: "exact", head: true });
    if (countErr) throw new Error(`count error: ${countErr.message}`);

    // Contar fotos únicas
    const { data: uniquePhotos, error: photosErr } = await sb()
      .from("face_embeddings_68454e9b")
      .select("photo_id")
      .limit(10000); // Limite razoável
    if (photosErr) throw new Error(`photos error: ${photosErr.message}`);
    
    const uniquePhotoIds = new Set((uniquePhotos ?? []).map((r: any) => r.photo_id));
    const totalPhotos = uniquePhotoIds.size;

    // Contar eventos únicos
    const { data: uniqueEvents, error: eventsErr } = await sb()
      .from("face_embeddings_68454e9b")
      .select("event_id")
      .limit(10000);
    if (eventsErr) throw new Error(`events error: ${eventsErr.message}`);
    
    const uniqueEventIds = new Set((uniqueEvents ?? []).map((r: any) => r.event_id));
    const totalEvents = uniqueEventIds.size;

    // Amostra de fotos recentes
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

// ── Face Reindex ──────────────────────────────────────────────────────────────
// GET /admin/events/:eventId/face-stats — admin auth
// Retorna estatísticas de faces detectadas em fotos de um evento
app.get("/make-server-68454e9b/admin/events/:eventId/face-stats", adminAuth, async (c) => {
  try {
    const eventId = c.req.param("eventId");
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
        stats.photos.push({
          id: photo.id,
          fileName: photo.fileName,
          faceCount,
        });
      }
    }

    return c.json(stats);
  } catch (err) {
    console.log("Erro ao buscar estatísticas de faces:", err);
    return c.json({ error: `Erro: ${err}` }, 500);
  }
});

// POST /admin/events/:eventId/reindex-faces — admin auth
// Retorna lista de fotos do evento para reindexação client-side
// O frontend baixa as fotos, detecta faces com face-api.js, e reenvia os descritores
app.post("/make-server-68454e9b/admin/events/:eventId/reindex-faces", adminAuth, async (c) => {
  try {
    const eventId = c.req.param("eventId");
    const photosKey = `${KV}photos:event:${eventId}`;
    console.log(`[reindex-faces] Buscando fotos para evento ${eventId} na chave ${photosKey}`);
    
    const photoIds: string[] = await getList(photosKey);
    console.log(`[reindex-faces] Encontradas ${photoIds.length} fotos na lista`);
    
    const photos: Array<{ id: string; url: string; fileName: string }> = [];
    for (const photoId of photoIds) {
      const photo: any = await kv.get(`${KV}photo:${photoId}`);
      if (photo?.url) {
        photos.push({
          id: photo.id,
          url: photo.url,
          fileName: photo.fileName,
        });
      } else if (photo) {
        // Foto existe mas sem URL — gerar signed URL do storage
        console.log(`[reindex-faces] Foto ${photoId} sem URL, gerando do storage: ${photo.storagePath}`);
        if (photo.storagePath) {
          const { data: signedData } = await sb().storage
            .from("make-68454e9b-eventface")
            .createSignedUrl(photo.storagePath, 3600);
          if (signedData?.signedUrl) {
            photos.push({
              id: photo.id,
              url: signedData.signedUrl,
              fileName: photo.fileName,
            });
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

// POST /faces/search — public, sem auth
// Recebe um embedding 128-dim da selfie do usuário e retorna photoIds com match.
// Usa HNSW via pgvector: O(log n), funciona com milhões de vetores, ~30ms.
app.post("/make-server-68454e9b/faces/search", async (c) => {
  try {
    const body = await c.req.json();
    const { eventId, embedding, threshold } = body;

    if (!eventId || !Array.isArray(embedding) || embedding.length === 0) {
      return c.json({ error: "eventId e embedding são obrigatórios" }, 400);
    }

    console.log(`[faces/search] Buscando faces para evento ${eventId}, embedding length: ${embedding.length}, threshold: ${threshold ?? 0.55}`);

    const searchThreshold = typeof threshold === "number" ? threshold : 0.55;
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

    // Accumulate daily stats
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
    const ids = await getList(`${KV}orders:index`);
    const orders = await Promise.all(ids.map((id) => kv.get(`${KV}order:${id}`)));
    const valid = orders
      .filter(Boolean)
      .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
    return c.json({ orders: valid });
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

// Download a purchased photo (public — orderId + photoId act as the access token)
app.get("/make-server-68454e9b/orders/:orderId/photos/:photoId/download", async (c) => {
  try {
    const orderId = c.req.param("orderId");
    const photoId = c.req.param("photoId");

    // Validate order exists
    const order: any = await kv.get(`${KV}order:${orderId}`);
    if (!order) return c.json({ error: "Pedido não encontrado" }, 404);

    // Validate photo belongs to this order
    const hasPhoto = order.items?.some(
      (item: any) => String(item.photoId) === String(photoId),
    );
    if (!hasPhoto) {
      return c.json({ error: "Foto não pertence a este pedido" }, 403);
    }

    // Get photo metadata from KV
    const photo: any = await kv.get(`${KV}photo:${photoId}`);
    if (!photo?.storagePath) {
      return c.json({ error: "Foto não encontrada no storage" }, 404);
    }

    // ── Streaming proxy ────────────────────────────────────────────────────────
    // Em vez de redirecionar para a signed URL do Supabase (que mobile browsers
    // frequentemente ABREM em vez de baixar), o servidor busca o arquivo e o
    // envia diretamente como blob — garantindo Content-Disposition: attachment
    // funcione em todos os browsers, inclusive iOS Safari e Chrome mobile.
    const fileName = photo.fileName ?? `foto-${photoId}.jpg`;

    const { data: blob, error: dlErr } = await sb()
      .storage
      .from(BUCKET)
      .download(photo.storagePath);

    if (dlErr || !blob) {
      console.log("[download] Erro ao buscar arquivo do storage:", dlErr?.message);
      // Fallback: signed URL redirect (melhor que nada)
      const { data: signData } = await sb().storage
        .from(BUCKET)
        .createSignedUrl(photo.storagePath, 3600, { download: fileName });
      if (signData?.signedUrl) return c.redirect(signData.signedUrl, 302);
      return c.json({ error: `Erro ao baixar foto: ${dlErr?.message}` }, 500);
    }

    const contentType = blob.type || "image/jpeg";
    console.log(`[download] ✓ Streaming ${fileName} (${blob.size} bytes, ${contentType})`);

    // c.body() do Hono garante que o middleware CORS adicione os headers corretamente.
    // blob.stream() evita carregar o arquivo inteiro em memória no Edge Function.
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

// Return signed URL as JSON (used by MinhaFoto page to avoid CORS issues with redirects)
app.get("/make-server-68454e9b/orders/:orderId/photos/:photoId/signed-url", async (c) => {
  try {
    const orderId = c.req.param("orderId");
    const photoId = c.req.param("photoId");

    const order: any = await kv.get(`${KV}order:${orderId}`);
    if (!order) return c.json({ error: "Pedido não encontrado" }, 404);

    const hasPhoto = order.items?.some(
      (item: any) => String(item.photoId) === String(photoId),
    );
    if (!hasPhoto) return c.json({ error: "Foto não pertence a este pedido" }, 403);

    const photo: any = await kv.get(`${KV}photo:${photoId}`);
    if (!photo?.storagePath) return c.json({ error: "Foto não encontrada no storage" }, 404);

    // View URL (no forced download) — used to display in browser
    const { data: viewData, error: viewErr } = await sb()
      .storage
      .from(BUCKET)
      .createSignedUrl(photo.storagePath, 604800);

    // Download URL (with Content-Disposition: attachment)
    const { data: dlData, error: dlErr } = await sb()
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
    // Send confirmation email if status changed to "paid" and hasn't been sent yet
    if (body.status === "paid" && order.status !== "paid") {
      sendOrderConfirmationEmail(updated).catch(console.log);
    }
    return c.json({ order: updated });
  } catch (err) {
    console.log("Erro ao atualizar pedido:", err);
    return c.json({ error: `Erro ao atualizar pedido: ${err}` }, 500);
  }
});

// Cancel order (admin) — sets status to cancelled and optionally refunds via MP
app.post("/make-server-68454e9b/orders/:id/cancel", adminAuth, async (c) => {
  try {
    const id = c.req.param("id");
    const order: any = await kv.get(`${KV}order:${id}`);
    if (!order) return c.json({ error: "Pedido não encontrado" }, 404);
    if (order.status === "cancelled") return c.json({ error: "Pedido já cancelado" }, 400);

    const body = await c.req.json().catch(() => ({}));
    const reason = body.reason ?? "Cancelado pelo admin";
    const now = new Date().toISOString();

    // Try to refund via Mercado Pago if there's a payment
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

    // Subtract from daily stats
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

    // Accumulate daily stats
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
    const [orderIds, eventIds] = await Promise.all([
      getList(`${KV}orders:index`),
      getList(`${KV}events:index`),
    ]);
    const orders: any[] = (
      await Promise.all(orderIds.map((id) => kv.get(`${KV}order:${id}`)))
    ).filter(Boolean);

    // Exclude cancelled orders from financial KPIs
    const activeOrders = orders.filter((o) => o.status !== "cancelled");
    const paidOrders   = activeOrders.filter((o) => o.status === "paid" || o.status === "delivered");

    const totalRevenue  = paidOrders.reduce((s, o) => s + (o.total ?? 0), 0);
    const totalPhotos   = paidOrders.reduce((s, o) => s + (o.items?.length ?? 0), 0);
    const pendingOrders = activeOrders.filter((o) => o.status === "pending").length;

    // Build daily chart for last 14 days — fetch all keys in parallel
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

    // Recent orders — show all (including cancelled), UI can style accordingly
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

// ── MP Token helper — somente KV (admin UI). Env var ignorada. ──────────────

async function getMpToken(): Promise<string | null> {
  const cfg = (await kv.get(`${KV}config`)) as any ?? {};
  return cfg.mpToken ?? null;
}

// ── Admin Config ──────────────────────────────────────────────────────────────

app.get("/make-server-68454e9b/admin/config", adminAuth, async (c) => {
  try {
    const cfg = (await kv.get(`${KV}config`)) as any ?? {};
    const kvToken: string | undefined = cfg.mpToken;

    // Apenas o KV é fonte de verdade — env var não é usada
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

    // Accept mpToken from body and store it in KV.
    // Never expose it back — only the masked preview is returned.
    const updated: any = { ...existing, updatedAt: new Date().toISOString() };
    if (body.photoPrice !== undefined) updated.photoPrice = body.photoPrice;
    if (body.coupons    !== undefined) updated.coupons    = body.coupons;
    if (typeof body.mpToken === "string" && body.mpToken.trim()) {
      updated.mpToken = body.mpToken.trim();
    }
    // Allow clearing the token
    if (body.mpToken === "") {
      delete updated.mpToken;
    }

    await kv.set(`${KV}config`, updated);

    // Return the same shape as GET — apenas KV
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

// PIX payment
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

    // Store MP payment ID in the order
    const order: any = await kv.get(`${KV}order:${orderId}`);
    if (order) {
      await kv.set(`${KV}order:${orderId}`, {
        ...order,
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

// Card preference (Checkout Pro)
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
      payment_methods: {
        installments: maxInstallments,
      },
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

    // Store preference ID in the order
    const order: any = await kv.get(`${KV}order:${orderId}`);
    if (order) {
      await kv.set(`${KV}order:${orderId}`, {
        ...order,
        mpPreferenceId: data.id,
        updatedAt: new Date().toISOString(),
      });
    }

    // Use sandbox URL for TEST tokens, production URL otherwise
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
  // Prevent duplicate emails
  if (order.emailSentAt) {
    console.log("sendOrderConfirmationEmail: e-mail já enviado para", order.id);
    return;
  }

  try {
    // Generate signed URLs (view + download) for each purchased photo
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
        // Troque por um domínio verificado no Resend para produção:
        // ex: "Smart Match <noreply@seudominio.com.br>"
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

    // Mark as sent to avoid duplicates
    await kv.set(`${KV}order:${order.id}`, {
      ...order,
      emailSentAt: new Date().toISOString(),
    });
    console.log("E-mail de confirmação enviado para:", order.customerEmail);
  } catch (err) {
    console.log("Erro ao enviar e-mail de confirmação:", err);
    // Non-blocking: do not throw
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
          // Update daily revenue on confirmation
          const dateKey = now.slice(0, 10);
          const dayRevenue = ((await kv.get(`${KV}daily:revenue:${dateKey}`)) as number) ?? 0;
          await kv.set(`${KV}daily:revenue:${dateKey}`, dayRevenue + (order.total ?? 0));
          // Send confirmation email (non-blocking)
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
// POST /admin/sync-storage — admin auth
// Varre o bucket S3 (pasta events/) e importa eventos+fotos que existem no
// Storage mas não estão no KV. Não duplica registros existentes.
// Query param: ?skipComplete=true para pular eventos com 100% de sincronização
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
    
    // 1. List all folders under events/ in the bucket
    console.log(`[Sync] Listando pastas em events/...`);
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

    // Filter only "folders" (items without mimetype metadata)
    const folderNames = eventFolders
      .filter((item: any) => !item.metadata?.mimetype)
      .map((item: any) => item.name);

    console.log(`[Sync] ✓ Encontradas ${folderNames.length} pastas de eventos: ${folderNames.join(", ")}`);

    // Fetch current config for price
    const cfg: any = (await kv.get(`${KV}config`)) ?? {};
    const currentPrice: number = cfg.photoPrice ?? 30;
    const branding: any = (await kv.get(`${KV}branding`)) ?? {};
    const defaultSessionType = Array.isArray(branding.eventSessionTypes) && branding.eventSessionTypes.length > 0
      ? branding.eventSessionTypes[0] : "Tour";
    const autoVenue = `${branding.venueName ?? "Allianz Parque"}, ${branding.venueLocation ?? "São Paulo, SP"}`;

    for (const eventSlug of folderNames) {
      try {
        // 2. List all files in events/<slug>/ FIRST (para calcular %)
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

        // Get existing photos to calculate sync %
        const existingPhotoIds = await getList(`${KV}photos:event:${eventSlug}`);
        const kvPhotoCount = existingPhotoIds.length;
        const syncPercentage = storagePhotoCount > 0 ? Math.round((kvPhotoCount / storagePhotoCount) * 100) : 0;

        console.log(`[Sync] Evento ${eventSlug}: ${kvPhotoCount}/${storagePhotoCount} fotos (${syncPercentage}%)`);

        // Skip if 100% synced and skipComplete=true
        if (skipComplete && syncPercentage >= 100) {
          console.log(`[Sync] ⏭ Pulando ${eventSlug} (100% sincronizado)`);
          eventsSkipped++;
          continue;
        }

        // 3. Check if event already exists in KV
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

        // 4. Process photos from the already-loaded files (no need to list again)
        console.log(`[Sync] Varrendo fotos do evento ${eventSlug}...`);

        // Get existing photo storagePaths to avoid duplicates (reuse existingPhotoIds from above)
        const existingPaths = new Set<string>();
        const existingIdSet = new Set(existingPhotoIds);
        if (existingPhotoIds.length > 0) {
          const recs = await Promise.all(existingPhotoIds.map((pid) => kv.get(`${KV}photo:${pid}`)));
          for (const rec of recs) { if ((rec as any)?.storagePath) existingPaths.add((rec as any).storagePath); }
        }

        // Import photos that don't exist yet
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

        // Update event photoCount
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

Deno.serve(app.fetch);