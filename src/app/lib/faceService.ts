/**
 * faceService.ts — wrapper de face-api.js
 *
 * Pipeline por contexto:
 *
 *  • Fotos de evento (admin upload) — detectAllFacesMultiScale:
 *      Detector  → SsdMobilenetv1 (~6 MB) — alta precisão, multi-escala
 *      Landmarks → faceLandmark68Net (~350 KB) — alinhamento de alta qualidade
 *      Embedding → faceRecognitionNet (ResNet-34, 128-dim) — qualidade máxima
 *      Pré-proc  → enhanceImage (equalização de histograma adaptativa)
 *
 *  • Selfie do usuário (câmera / upload) — detectSingleFace:
 *      Detector  → SsdMobilenetv1
 *      Landmarks → faceLandmark68Net
 *      Embedding → faceRecognitionNet
 *
 * Matching:
 *      Distância mínima por foto (min-pool sobre todos os descritores),
 *      rankeado por proximidade, dois passes (strict 0.45 → relaxed 0.58).
 *
 * Cache de modelos:
 *      Os pesos (~12.4 MB) são persistidos na Cache Storage do navegador.
 *      F5 carrega do disco em vez da rede — praticamente instantâneo após
 *      o primeiro download.
 */

const MODEL_URL =
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

// ── Cache Storage — persiste entre reloads (ao contrário da memória) ────────────────

const CACHE_NAME = 'smart-match-face-models-v3';

async function cachedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = input.toString();

  if (!url.includes('justadudewhohacks')) {
    return fetch(input, init);
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return hit;

    const response = await fetch(input, init);
    if (response.ok) {
      await cache.put(url, response.clone());
    }
    return response;
  } catch {
    return fetch(input, init);
  }
}

// ── Singleton: carrega modelos apenas uma vez por sessão ──────────────────────

let _modelsPromise: Promise<void> | null = null;

export function loadModels(): Promise<void> {
  if (!_modelsPromise) {
    _modelsPromise = _doLoad();
  }
  return _modelsPromise;
}

async function _doLoad(): Promise<void> {
  const faceapi = await import('face-api.js');

  faceapi.env.monkeyPatch({ fetch: cachedFetch as typeof globalThis.fetch });

  faceapi.env.monkeyPatch({
    Canvas: HTMLCanvasElement as any,
    createCanvasElement: () => document.createElement('canvas'),
    createImageElement: () => document.createElement('img'),
  });

  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
}

loadModels().catch(() => {});

// ── Detecta UM rosto (para selfie do usuário) ─────────────────────────────

export async function detectSingleFace(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): Promise<{ descriptor: Float32Array; box: { x: number; y: number; width: number; height: number } } | null> {
  const faceapi = await import('face-api.js');

  const passes: Array<{ minConfidence: number }> = [
    { minConfidence: 0.5 },
    { minConfidence: 0.3 },
    { minConfidence: 0.15 },
  ];

  for (const { minConfidence } of passes) {
    const opts = new faceapi.SsdMobilenetv1Options({ minConfidence });
    const result = await faceapi
      .detectSingleFace(input, opts)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (result) {
      return { descriptor: result.descriptor, box: result.detection.box };
    }
  }
  return null;
}

// ── Detecta TODOS os rostos (para fotos do evento) ─────────────────────────

export async function detectAllFaces(
  input: HTMLImageElement | HTMLCanvasElement,
  options: { minConfidence?: number } = {},
): Promise<number[][]> {
  const faceapi = await import('face-api.js');

  const primaryConfidence = options.minConfidence ?? 0.5;

  let results = await faceapi
    .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: primaryConfidence }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  if (results.length === 0) {
    results = await faceapi
      .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.25 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
  }

  if (results.length === 0) {
    results = await faceapi
      .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.12 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
  }

  return results.map((r) => Array.from(r.descriptor));
}

// ── Pré-processamento: equalização de histograma adaptativa ───────────────────

export function enhanceImage(
  canvas: HTMLCanvasElement,
  blendFactor = 0.4,
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { alpha: false })!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const pixelCount = canvas.width * canvas.height;

  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    histogram[lum]++;
  }

  const cdf = new Uint8Array(256);
  let cumulative = 0;
  const scale = 255 / pixelCount;
  for (let i = 0; i < 256; i++) {
    cumulative += histogram[i];
    cdf[i] = Math.round(cumulative * scale);
  }

  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    const equalized = cdf[lum];
    const ratio = lum > 0 ? equalized / lum : 1;
    const blendedRatio = 1 + (ratio - 1) * blendFactor;

    data[i]     = Math.min(255, Math.max(0, Math.round(data[i]     * blendedRatio)));
    data[i + 1] = Math.min(255, Math.max(0, Math.round(data[i + 1] * blendedRatio)));
    data[i + 2] = Math.min(255, Math.max(0, Math.round(data[i + 2] * blendedRatio)));
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ── Detecção multi-escala para fotos de evento ────────────────────────────

export async function detectAllFacesMultiScale(
  input: HTMLImageElement | HTMLCanvasElement,
): Promise<number[][]> {
  const faceapi = await import('face-api.js');

  interface FaceResult {
    descriptor: number[];
    box: { x: number; y: number; width: number; height: number };
  }

  const allFaces: FaceResult[] = [];

  async function detectInRegion(
    canvas: HTMLCanvasElement,
    offsetX: number,
    offsetY: number,
  ): Promise<FaceResult[]> {
    const opts = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });
    const results = await faceapi
      .detectAllFaces(canvas, opts)
      .withFaceLandmarks()
      .withFaceDescriptors();

    return results.map((r) => ({
      descriptor: Array.from(r.descriptor),
      box: {
        x: r.detection.box.x + offsetX,
        y: r.detection.box.y + offsetY,
        width: r.detection.box.width,
        height: r.detection.box.height,
      },
    }));
  }

  function iou(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
  ): number {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);
    const interArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const unionArea = a.width * a.height + b.width * b.height - interArea;
    return unionArea > 0 ? interArea / unionArea : 0;
  }

  const fullCanvas = input instanceof HTMLCanvasElement ? input : (() => {
    const c = document.createElement('canvas');
    c.width = input.naturalWidth || input.width;
    c.height = input.naturalHeight || input.height;
    c.getContext('2d', { alpha: false })!.drawImage(input, 0, 0);
    return c;
  })();

  const fullFaces = await detectInRegion(fullCanvas, 0, 0);
  allFaces.push(...fullFaces);

  const w = fullCanvas.width;
  const h = fullCanvas.height;
  const MIN_DIM_FOR_QUADRANTS = 800;

  if (w >= MIN_DIM_FOR_QUADRANTS || h >= MIN_DIM_FOR_QUADRANTS) {
    const halfW = Math.ceil(w / 2);
    const halfH = Math.ceil(h / 2);
    const overlapW = Math.round(w * 0.1);
    const overlapH = Math.round(h * 0.1);

    const quadrants = [
      { sx: 0, sy: 0, sw: halfW + overlapW, sh: halfH + overlapH, ox: 0, oy: 0 },
      { sx: halfW - overlapW, sy: 0, sw: halfW + overlapW, sh: halfH + overlapH, ox: halfW - overlapW, oy: 0 },
      { sx: 0, sy: halfH - overlapH, sw: halfW + overlapW, sh: halfH + overlapH, ox: 0, oy: halfH - overlapH },
      { sx: halfW - overlapW, sy: halfH - overlapH, sw: halfW + overlapW, sh: halfH + overlapH, ox: halfW - overlapW, oy: halfH - overlapH },
    ];

    for (const { sx, sy, sw, sh, ox, oy } of quadrants) {
      const qw = Math.min(sw, w - sx);
      const qh = Math.min(sh, h - sy);
      const quadCanvas = document.createElement('canvas');
      quadCanvas.width = qw;
      quadCanvas.height = qh;
      quadCanvas.getContext('2d', { alpha: false })!
        .drawImage(fullCanvas, sx, sy, qw, qh, 0, 0, qw, qh);

      const quadFaces = await detectInRegion(quadCanvas, ox, oy);
      allFaces.push(...quadFaces);
    }
  }

  const unique: FaceResult[] = [];
  for (const face of allFaces) {
    const isDuplicate = unique.some((existing) => iou(existing.box, face.box) > 0.4);
    if (!isDuplicate) {
      unique.push(face);
    }
  }

  return unique.map((f) => f.descriptor);
}

// ── Redimensiona imagem para acelerar detecção ────────────────────────────

export function resizeImage(img: HTMLImageElement, maxDim = 1600): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  let { width, height } = img;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height / width) * maxDim);
      width = maxDim;
    } else {
      width = Math.round((width / height) * maxDim);
      height = maxDim;
    }
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

// ── Carrega uma imagem crossOrigin via URL ────────────────────────────────

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      imageCache.delete(url);
      reject(new Error(`Falha ao carregar imagem: ${url}`));
    };
    img.src = url;
  });

  imageCache.set(url, promise);
  return promise;
}

export function clearImageCache(): void {
  imageCache.clear();
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PhotoFaces {
  photoId: string;
  descriptors: number[][];
}

export interface MatchResult {
  photoId: string;
  minDistance: number;
}

// ── Distância euclidiana otimizada ───────────────────────────────────────

export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// ── Matching rankeado com dois passes ─────────────────────────────────────

export function findMatches(
  query: number[] | Float32Array,
  candidates: PhotoFaces[],
  threshold = 0.45,
): string[] {
  return findRankedMatches(query, candidates, threshold)
    .map((m) => m.photoId);
}

export function findRankedMatches(
  query: number[] | Float32Array,
  candidates: PhotoFaces[],
  strictThreshold = 0.45,
  relaxedThreshold = 0.58,
): MatchResult[] {
  const q = Array.from(query);

  const scored: MatchResult[] = candidates
    .map(({ photoId, descriptors }) => ({
      photoId,
      minDistance: Math.min(...descriptors.map((d) => euclideanDistance(q, d))),
    }))
    .filter((m) => isFinite(m.minDistance));

  let matches = scored.filter((m) => m.minDistance < strictThreshold);

  if (matches.length === 0) {
    matches = scored.filter((m) => m.minDistance < relaxedThreshold);
  }

  return matches.sort((a, b) => a.minDistance - b.minDistance);
}

// ── Desenha bounding-box estilizada no canvas ─────────────────────────────

export function drawFaceBox(
  canvas: HTMLCanvasElement,
  box: { x: number; y: number; width: number; height: number },
  color = '#86efac',
  scaleX = 1,
  scaleY = 1,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const x = box.x * scaleX;
  const y = box.y * scaleY;
  const w = box.width * scaleX;
  const h = box.height * scaleY;
  const cornerLen = Math.min(w, h) * 0.25;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 16;
  ctx.shadowColor = color;

  const corners = [
    [x, y + cornerLen, x, y, x + cornerLen, y],
    [x + w - cornerLen, y, x + w, y, x + w, y + cornerLen],
    [x + w, y + h - cornerLen, x + w, y + h, x + w - cornerLen, y + h],
    [x + cornerLen, y + h, x, y + h, x, y + h - cornerLen],
  ] as const;

  ctx.beginPath();
  for (const [x1, y1, xm, ym, x2, y2] of corners) {
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(xm, ym, x2, y2);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

export function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}