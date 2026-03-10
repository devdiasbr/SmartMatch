/**
 * faceService.ts — wrapper de face-api.js
 *
 * Pipeline por contexto:
 *
 *  • Fotos de evento (admin upload) — detectAllFaces:
 *      Detector  → TinyFaceDetector (inputSize 512) — rápido, ~190 KB
 *      Landmarks → faceLandmark68TinyNet             — ~80 KB, muito mais rápido
 *      Embedding → faceRecognitionNet (ResNet-34, 128-dim) — qualidade máxima
 *
 *  • Selfie do usuário (câmera / upload) — detectSingleFace:
 *      Detector  → TinyFaceDetector (inputSize 320) — otimizado para tempo real
 *      Landmarks → faceLandmark68TinyNet
 *      Embedding → faceRecognitionNet
 *
 * Matching:
 *      Distância mínima por foto (min-pool sobre todos os descritores),
 *      rankeado por proximidade, dois passes (strict 0.55 → relaxed 0.70).
 *
 * Cache de modelos:
 *      Os pesos (~6.3 MB) são persistidos na Cache Storage do navegador.
 *      F5 carrega do disco em vez da rede — praticamente instantâneo após
 *      o primeiro download.
 */

const MODEL_URL =
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

// ── Cache Storage — persiste entre reloads (ao contrário da memória) ──────────

const CACHE_NAME = 'smart-match-face-models-v2';

/**
 * Fetch com cache persistente via Cache Storage API.
 * Apenas requests para o CDN do face-api são cacheadas; o resto passa direto.
 * Compatível com a assinatura esperada por faceapi.env.monkeyPatch.
 */
async function cachedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = input.toString();

  // Só cacheia os pesos do face-api (CDN estático, nunca muda para a mesma tag)
  if (!url.includes('justadudewhohacks')) {
    return fetch(input, init);
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return hit; // cache hit — instantâneo

    const response = await fetch(input, init);
    if (response.ok) {
      // Clona antes de guardar pois a Response só pode ser lida uma vez
      await cache.put(url, response.clone());
    }
    return response;
  } catch {
    // Fallback para fetch normal se Cache API não estiver disponível
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

  // Instala o fetch com cache antes de qualquer download de modelo
  faceapi.env.monkeyPatch({ fetch: cachedFetch as typeof globalThis.fetch });

  // Monkey-patch para corrigir "Illegal constructor" do HTMLCanvasElement
  // face-api.js tenta criar canvas com `new HTMLCanvasElement()` que não é permitido
  faceapi.env.monkeyPatch({
    Canvas: HTMLCanvasElement as any,
    createCanvasElement: () => document.createElement('canvas'),
    createImageElement: () => document.createElement('img'),
  });

  await Promise.all([
    // TinyFaceDetector — 190 KB (vs 6 MB do SsdMobilenetv1), 15-20× mais rápido
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    // faceLandmark68TinyNet — 80 KB (vs 350 KB), mesma qualidade de alinhamento
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    // faceRecognitionNet — mantemos o ResNet-34 completo (128-dim, melhor qualidade)
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
}

// ── Pré-carrega em background assim que o módulo é importado ─────────────────
// Isso garante que quando o usuário clicar em "buscar por rosto" os modelos
// já estarão (ou estarão quase) prontos — especialmente rápido quando há cache.
loadModels().catch(() => {/* silencia erros de pré-carregamento */});

// ── Opções TinyFaceDetector ───────────────────────────────────────────────────
// inputSize deve ser múltiplo de 32. Valores maiores = mais preciso, mais lento.
// Para câmera em tempo real: 320 (fast). Para upload de fotos: 512 (melhor recall).

// ── Detecta UM rosto (para selfie do usuário) ─────────────────────────────────
// Multi-pass: tenta 3 tamanhos com threshold progressivamente menor para máximo recall.

export async function detectSingleFace(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): Promise<{ descriptor: Float32Array; box: { x: number; y: number; width: number; height: number } } | null> {
  const faceapi = await import('face-api.js');

  // Passa 1: 320 rápido, threshold normal — ótimo para selfies próximas
  // Passa 2: 416 balanceado, threshold menor — selfies com rosto menor
  // Passa 3: 512 máxima qualidade, threshold ainda menor — condições difíceis
  const passes: Array<{ inputSize: 320 | 416 | 512; scoreThreshold: number }> = [
    { inputSize: 320, scoreThreshold: 0.22 },
    { inputSize: 416, scoreThreshold: 0.18 },
    { inputSize: 512, scoreThreshold: 0.14 },
  ];

  for (const { inputSize, scoreThreshold } of passes) {
    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
    const result = await faceapi
      .detectSingleFace(input, opts)
      .withFaceLandmarks(true)   // true = usa faceLandmark68TinyNet (mais rápido)
      .withFaceDescriptor();
    if (result) {
      return { descriptor: result.descriptor, box: result.detection.box };
    }
  }
  return null;
}

// ── Detecta TODOS os rostos (para fotos do evento — admin upload) ─────────────
// Multi-pass com inputSize 512 (máxima qualidade) + fallbacks com threshold menor
// para garantir detecção mesmo em rostos pequenos, distantes ou parcialmente visíveis.

export async function detectAllFaces(
  input: HTMLImageElement | HTMLCanvasElement,
  options: { inputSize?: 320 | 416 | 512; scoreThreshold?: number } = {},
): Promise<number[][]> {
  const faceapi = await import('face-api.js');

  // Passa 1: inputSize solicitado (padrão 512 para máxima qualidade em fotos de evento)
  const primarySize   = options.inputSize ?? 512;
  const primaryThresh = options.scoreThreshold ?? 0.28;
  let results = await faceapi
    .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ inputSize: primarySize, scoreThreshold: primaryThresh }))
    .withFaceLandmarks(true)
    .withFaceDescriptors();

  // Passa 2: threshold menor — captura rostos com score ligeiramente baixo
  if (results.length === 0) {
    results = await faceapi
      .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.16 }))
      .withFaceLandmarks(true)
      .withFaceDescriptors();
  }

  // Passa 3: threshold muito baixo + 416 — último recurso para rostos difíceis
  if (results.length === 0) {
    results = await faceapi
      .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.10 }))
      .withFaceLandmarks(true)
      .withFaceDescriptors();
  }

  return results.map((r) => Array.from(r.descriptor));
}

// ── Redimensiona imagem para acelerar detecção ────────────────────────────────
// Mantém aspect ratio e limita dimensão máxima.
// OTIMIZAÇÃO: Usa menor resolução mas mantém qualidade adequada para face recognition

export function resizeImage(img: HTMLImageElement, maxDim = 1600): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  let { width, height } = img;

  // 1600px preserva detalhes faciais mesmo em fotos de grupo de alta resolução.
  // Menor que 1200 prejudica o ResNet-34 (perde textura e landmarks sutis).
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

// ── Carrega uma imagem crossOrigin via URL ────────────────────────────────────
// Otimizado: usa cache de objetos Image para evitar re-downloads

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(url: string): Promise<HTMLImageElement> {
  // Se já está em cache (ou carregando), retorna a Promise existente
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      imageCache.delete(url); // Remove do cache em caso de erro
      reject(new Error(`Falha ao carregar imagem: ${url}`));
    };
    img.src = url;
  });

  imageCache.set(url, promise);
  return promise;
}

// Limpa o cache de imagens (útil para liberar memória após processamento em batch)
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
  minDistance: number; // menor distância encontrada para essa foto
}

// ── Distância euclidiana otimizada ───────────────────────────────────────────
// Inline sem uso de ** para evitar Math.pow overhead em loop interno.

export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// ── Matching rankeado com dois passes ─────────────────────────────────────────
//
// Estratégia:
//   1. Para cada foto calcula a distância MÍNIMA sobre todos seus descritores
//      (min-pool) — evita que uma face aleatória cause match espúrio.
//   2. Passe 1 (strict, 0.50): boa precisão, permite alguma variação.
//   3. Passe 2 (relaxed, 0.60): se nenhum match strict, amplia recall.
//   4. Retorna fotos ordenadas por distância crescente (melhor match primeiro).

export function findMatches(
  query: number[] | Float32Array,
  candidates: PhotoFaces[],
  threshold = 0.55,
): string[] {
  return findRankedMatches(query, candidates, threshold)
    .map((m) => m.photoId);
}

export function findRankedMatches(
  query: number[] | Float32Array,
  candidates: PhotoFaces[],
  strictThreshold = 0.50,   // Reduzido de 0.55 → mais preciso no passe strict
  relaxedThreshold = 0.65,  // Reduzido de 0.70 → melhor recall sem muito ruído
): MatchResult[] {
  const q = Array.from(query);

  // Calcula min-distance por foto
  const scored: MatchResult[] = candidates
    .map(({ photoId, descriptors }) => ({
      photoId,
      minDistance: Math.min(...descriptors.map((d) => euclideanDistance(q, d))),
    }))
    .filter((m) => isFinite(m.minDistance));

  // Passe 1 — strict
  let matches = scored.filter((m) => m.minDistance < strictThreshold);

  // Passe 2 — relaxed (só usa se strict não retornou nada)
  if (matches.length === 0) {
    matches = scored.filter((m) => m.minDistance < relaxedThreshold);
  }

  // Ordena por menor distância (melhor match primeiro)
  return matches.sort((a, b) => a.minDistance - b.minDistance);
}

// ── Desenha bounding-box estilizada no canvas ─────────────────────────────────

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

  // Corner brackets
  const corners = [
    [x, y + cornerLen, x, y, x + cornerLen, y],                          // top-left
    [x + w - cornerLen, y, x + w, y, x + w, y + cornerLen],             // top-right
    [x + w, y + h - cornerLen, x + w, y + h, x + w - cornerLen, y + h], // bottom-right
    [x + cornerLen, y + h, x, y + h, x, y + h - cornerLen],             // bottom-left
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