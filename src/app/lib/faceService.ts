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
 *      rankeado por proximidade, dois passes (strict 0.45 → relaxed 0.55).
 *
 * Performance vs versão anterior:
 *      Modelos: ~12.5 MB → ~6.5 MB (sem SsdMobilenetv1 + faceLandmark68Net)
 *      Detecção por foto: ~800 ms → ~50 ms (TinyFaceDetector é 15-20× mais rápido)
 *      Pré-carregamento: inicia imediatamente ao importar o módulo
 */

const MODEL_URL =
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

// ── Singleton: carrega modelos apenas uma vez ─────────────────────────────────

let _modelsPromise: Promise<void> | null = null;

export function loadModels(): Promise<void> {
  if (!_modelsPromise) {
    _modelsPromise = _doLoad();
  }
  return _modelsPromise;
}

async function _doLoad(): Promise<void> {
  const faceapi = await import('face-api.js');
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
// já estarão (ou estarão quase) prontos.
loadModels().catch(() => {/* silencia erros de pré-carregamento */});

// ── Opções TinyFaceDetector ───────────────────────────────────────────────────
// inputSize deve ser múltiplo de 32. Valores maiores = mais preciso, mais lento.
// Para câmera em tempo real: 320 (fast). Para upload de fotos: 512 (melhor recall).

function tinyOpts(inputSize: 320 | 416 | 512 = 320, scoreThreshold = 0.35) {
  // Retorna a Promise<faceapi> inline para evitar re-importar em cada chamada
  return import('face-api.js').then(faceapi =>
    new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold })
  );
}

// ── Detecta UM rosto (para selfie do usuário) ─────────────────────────────────
// Tenta com inputSize crescente para maximizar recall sem travar a câmera.

export async function detectSingleFace(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): Promise<{ descriptor: Float32Array; box: { x: number; y: number; width: number; height: number } } | null> {
  const faceapi = await import('face-api.js');

  for (const inputSize of [320, 416, 512] as const) {
    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold: 0.30 });
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
// Usa inputSize 512 para máximo recall em fotos de grupo / multidão.

export async function detectAllFaces(
  input: HTMLImageElement | HTMLCanvasElement,
): Promise<number[][]> {
  const faceapi = await import('face-api.js');
  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.35 });
  const results = await faceapi
    .detectAllFaces(input, opts)
    .withFaceLandmarks(true)     // true = usa faceLandmark68TinyNet
    .withFaceDescriptors();
  return results.map((r) => Array.from(r.descriptor));
}

// ── Carrega uma imagem crossOrigin via URL ────────────────────────────────────

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${url}`));
    img.src = url;
  });
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

// ── Distância euclidiana otimizada ────────────────────────────────────────────
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
//   2. Passe 1 (strict, 0.45): alta precisão, poucos falsos positivos.
//   3. Passe 2 (relaxed, 0.55): se nenhum match strict, amplia recall.
//   4. Retorna fotos ordenadas por distância crescente (melhor match primeiro).

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
  relaxedThreshold = 0.55,
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
