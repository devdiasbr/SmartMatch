import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

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

// ── Supabase admin client ─────────────────────────────────────────────────────

function sb() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

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

async function brandingWithUrls() {
  const b: any = (await kv.get(`${KV}branding`)) ?? {};
  let logoUrl: string | null = null;
  let faviconUrl: string | null = null;
  const backgroundUrls: string[] = [];

  if (b.logoPath) {
    const { data } = await sb().storage.from(BUCKET).createSignedUrl(b.logoPath, 3600);
    logoUrl = data?.signedUrl ?? null;
  }
  if (b.faviconPath) {
    const { data } = await sb().storage.from(BUCKET).createSignedUrl(b.faviconPath, 3600);
    faviconUrl = data?.signedUrl ?? null;
  }
  for (const p of (b.backgroundPaths ?? [])) {
    const { data } = await sb().storage.from(BUCKET).createSignedUrl(p, 3600);
    if (data?.signedUrl) backgroundUrls.push(data.signedUrl);
  }

  return {
    appName: b.appName ?? "Smart Match",
    pageTitle: b.pageTitle ?? "Smart Match – Tour Palmeiras",
    watermarkText: b.watermarkText ?? "© Smart Match",
    logoUrl,
    faviconUrl,
    backgroundUrls,
    hasLogo: !!b.logoPath,
    hasFavicon: !!b.faviconPath,
    backgroundCount: (b.backgroundPaths ?? []).length,
    updatedAt: b.updatedAt ?? null,
  };
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
      watermarkText: "© Smart Match",
      logoUrl: null, faviconUrl: null, backgroundUrls: [],
      hasLogo: false, hasFavicon: false, backgroundCount: 0, updatedAt: null,
    });
  }
});

// Admin branding GET
app.get("/make-server-68454e9b/admin/branding", adminAuth, async (c) => {
  try {
    return c.json(await brandingWithUrls());
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
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`${KV}branding`, updated);
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
    if (!["logo", "favicon", "background"].includes(type))
      return c.json({ error: "type deve ser logo, favicon ou background" }, 400);

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
        : `branding/bg/bg-${ts}.${ext}`;

    const { error: uploadError } = await sb().storage
      .from(BUCKET).upload(storagePath, bytes, { contentType: mimeType, upsert: false });
    if (uploadError) return c.json({ error: `Upload erro: ${uploadError.message}` }, 500);

    const existing: any = (await kv.get(`${KV}branding`)) ?? {};

    // Delete old asset when replacing logo or favicon
    if (type === "logo" && existing.logoPath) {
      await sb().storage.from(BUCKET).remove([existing.logoPath]);
    } else if (type === "favicon" && existing.faviconPath) {
      await sb().storage.from(BUCKET).remove([existing.faviconPath]);
    }

    const updated: any = { ...existing, updatedAt: new Date().toISOString() };
    if (type === "logo") updated.logoPath = storagePath;
    else if (type === "favicon") updated.faviconPath = storagePath;
    else updated.backgroundPaths = [...(existing.backgroundPaths ?? []), storagePath];

    await kv.set(`${KV}branding`, updated);

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
    if (asset !== "logo" && asset !== "favicon")
      return c.json({ error: "Asset deve ser logo ou favicon" }, 400);

    const existing: any = (await kv.get(`${KV}branding`)) ?? {};
    const pathKey = asset === "logo" ? "logoPath" : "faviconPath";
    if (existing[pathKey]) {
      await sb().storage.from(BUCKET).remove([existing[pathKey]]);
    }
    await kv.set(`${KV}branding`, { ...existing, [pathKey]: null, updatedAt: new Date().toISOString() });
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
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: `Erro ao remover background: ${err}` }, 500);
  }
});

// ── Auth ──────────────────────────────────────────────────────────────────────

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

    const event = {
      id: slug,
      name: `Tour ${day}/${month}/${year}, ${hours}:${mins}`,
      slug,
      date: dateISO,
      endTime: body.endTime ?? "",
      location: "Allianz Parque, São Paulo, SP",
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
    await kv.del(`${KV}event:${id}`);
    await removeFromList(`${KV}events:index`, id);
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

    // Always serve photos with the current configured price
    const cfg: any = (await kv.get(`${KV}config`)) ?? {};
    const currentPrice: number = cfg.photoPrice ?? 30;

    const photos = await Promise.all(
      photoIds.map(async (pid) => {
        const p = await kv.get(`${KV}photo:${pid}`);
        if (!p) return null;
        const withUrl = await withSignedUrl(p);
        // Inject current price so UI always reflects the admin setting
        return { ...withUrl, price: currentPrice };
      }),
    );
    return c.json({ photos: photos.filter(Boolean) });
  } catch (err) {
    console.log("Erro ao listar fotos:", err);
    return c.json({ error: `Erro ao listar fotos: ${err}` }, 500);
  }
});

// Upload photo (admin) — receives base64
app.post("/make-server-68454e9b/events/:id/photos", adminAuth, async (c) => {
  try {
    const eventId = c.req.param("id");
    let event: any = await kv.get(`${KV}event:${eventId}`);

    // Auto-create event if it doesn't exist (for direct slug uploads)
    if (!event) {
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
        event = {
          id: eventId,
          name: `Tour ${day}/${month}/${year}, ${hours}:${mins}`,
          slug: eventId,
          date: dateISO,
          endTime: "",
          location: "Allianz Parque, São Paulo, SP",
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
      } else {
        return c.json({ error: "Evento não encontrado" }, 404);
      }
    }

    const body = await c.req.json();
    const { base64, fileName, mimeType = "image/jpeg", tag = "Geral" } = body;
    if (!base64) return c.json({ error: "Imagem base64 obrigatória" }, 400);

    const photoId = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ext = mimeType === "image/png" ? "png" : "jpg";
    const storagePath = `events/${eventId}/${photoId}.${ext}`;

    // Decode base64 → Uint8Array
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // Upload to Supabase Storage
    const { error: uploadError } = await sb().storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

    if (uploadError) {
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
    return c.json({ photo: photoWithUrl }, 201);
  } catch (err) {
    console.log("Erro ao fazer upload de foto:", err);
    return c.json({ error: `Erro ao fazer upload: ${err}` }, 500);
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
app.get("/make-server-68454e9b/events/:id/faces", async (c) => {
  try {
    const eventId = c.req.param("id");
    const photoIds = await getList(`${KV}photos:event:${eventId}`);

    const faces: { photoId: string; descriptors: number[][] }[] = [];

    for (const photoId of photoIds) {
      const photo: any = await kv.get(`${KV}photo:${photoId}`);
      if (photo?.faceDescriptors?.length > 0) {
        faces.push({ photoId, descriptors: photo.faceDescriptors });
      }
    }

    return c.json({ faces });
  } catch (err) {
    console.log("Erro ao buscar descritores faciais:", err);
    return c.json({ error: `Erro ao buscar faces: ${err}` }, 500);
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

    // Generate signed download URL valid for 7 days
    const { data, error: signErr } = await sb()
      .storage
      .from(BUCKET)
      .createSignedUrl(photo.storagePath, 604800, {
        download: photo.fileName ?? `foto-${photoId}.jpg`,
      });

    if (signErr || !data?.signedUrl) {
      console.log("Erro ao gerar signed URL:", signErr?.message);
      return c.json({ error: `Erro ao gerar link de download: ${signErr?.message}` }, 500);
    }

    // 302 redirect so the QR code scanner goes straight to the file
    return c.redirect(data.signedUrl, 302);
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
    const orderIds = await getList(`${KV}orders:index`);
    const orders: any[] = (
      await Promise.all(orderIds.map((id) => kv.get(`${KV}order:${id}`)))
    ).filter(Boolean);

    // Exclude cancelled orders from financial KPIs
    const activeOrders = orders.filter((o) => o.status !== "cancelled");
    const paidOrders   = activeOrders.filter((o) => o.status === "paid" || o.status === "delivered");

    const totalRevenue  = paidOrders.reduce((s, o) => s + (o.total ?? 0), 0);
    const totalPhotos   = paidOrders.reduce((s, o) => s + (o.items?.length ?? 0), 0);
    const pendingOrders = activeOrders.filter((o) => o.status === "pending").length;

    const eventIds = await getList(`${KV}events:index`);

    // Build daily chart for last 14 days
    const daily: { day: string; receita: number; fotos: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const dayLabel = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      const receita = ((await kv.get(`${KV}daily:revenue:${dateKey}`)) as number) ?? 0;
      const fotos = ((await kv.get(`${KV}daily:count:${dateKey}`)) as number) ?? 0;
      daily.push({ day: dayLabel, receita, fotos });
    }

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
    const { amount, customerEmail, orderId, successUrl, failureUrl, pendingUrl } = body;

    if (!amount || !customerEmail || !orderId) {
      return c.json({ error: "amount, customerEmail e orderId são obrigatórios" }, 400);
    }

    const mpToken = await getMpToken();
    if (!mpToken) {
      return c.json({ error: "MP_ACCESS_TOKEN não configurado. Configure-o na área Financeiro do admin." }, 500);
    }

    const preferenceBody = {
      items: [
        {
          title: "Smart Match – Fotos Tour Palmeiras",
          quantity: 1,
          currency_id: "BRL",
          unit_price: Number(amount),
        },
      ],
      payer: { email: customerEmail },
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

Deno.serve(app.fetch);