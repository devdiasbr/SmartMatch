/**
 * faceService.ts — wrapper de face-api.js
 * Modelos carregados via jsDelivr CDN (proxy do GitHub).
 * Imports dinâmicos para não inflar o bundle principal.
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
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
}

// ── Opções padrão do detector leve ───────────────────────────────────────────

const detectorOpts = async () => {
  const faceapi = await import('face-api.js');
  return new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.30 });
};

// ── Detecta UM rosto (para selfie) ───────────────────────────────────────────

export async function detectSingleFace(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): Promise<{ descriptor: Float32Array; box: { x: number; y: number; width: number; height: number } } | null> {
  const faceapi = await import('face-api.js');
  // Try with primary opts first, fall back to lower threshold if nothing found
  for (const threshold of [0.30, 0.20, 0.15]) {
    const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: threshold });
    const result = await faceapi
      .detectSingleFace(input, opts)
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    if (result) {
      return { descriptor: result.descriptor, box: result.detection.box };
    }
  }
  return null;
}

// ── Detecta TODOS os rostos (para fotos do evento) ───────────────────────────

export async function detectAllFaces(
  input: HTMLImageElement | HTMLCanvasElement,
): Promise<number[][]> {
  const faceapi = await import('face-api.js');
  const opts = await detectorOpts();
  const results = await faceapi
    .detectAllFaces(input, opts)
    .withFaceLandmarks(true)
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

// ── Compara um descritor de selfie com os descritores armazenados ─────────────

export interface PhotoFaces {
  photoId: string;
  descriptors: number[][];
}

export function findMatches(
  query: number[] | Float32Array,
  candidates: PhotoFaces[],
  threshold = 0.50, // slightly relaxed from 0.52 for better recall
): string[] {
  const q = Array.from(query);
  return candidates
    .filter(({ descriptors }) =>
      descriptors.some((d) => euclideanDistance(q, d) < threshold),
    )
    .map(({ photoId }) => photoId);
}

export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
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
  const r = 14;
  const cornerLen = Math.min(w, h) * 0.25;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 16;
  ctx.shadowColor = color;

  // Apenas cantos (corner brackets)
  const corners = [
    [x, y + cornerLen, x, y, x + cornerLen, y],           // top-left
    [x + w - cornerLen, y, x + w, y, x + w, y + cornerLen], // top-right
    [x + w, y + h - cornerLen, x + w, y + h, x + w - cornerLen, y + h], // bottom-right
    [x + cornerLen, y + h, x, y + h, x, y + h - cornerLen], // bottom-left
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