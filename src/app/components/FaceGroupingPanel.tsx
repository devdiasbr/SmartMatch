/**
 * FaceGroupingPanel v5
 *
 * Correções v5:
 * ─ Desduplicação de fotos: após o clustering, cada foto é atribuída a
 *   APENAS UM cluster — aquele cujo centroide é mais próximo dos
 *   descritores faciais da foto.  Antes, fotos com múltiplos rostos
 *   apareciam em vários clusters simultaneamente.
 * ─ Light mode completo: todas as cores passam pelo useTheme().
 * ─ Algoritmo mantém average-linkage (greedy 0.55 / merge 0.60) da v4.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Users, ShoppingCart, CheckCircle2, ChevronDown, ChevronUp,
  RefreshCw, User, AlertCircle, Camera, ImageOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { useCart } from '../contexts/CartContext';
import { useTheme } from './ThemeProvider';

/* ── tipos ──────────────────────────────────────────────────────────────── */

export interface GroupPhoto {
  id: string | number;
  src: string;
  price: number;
  tag: string;
}

interface Props {
  photos: GroupPhoto[];
  eventId: string;
  eventName: string;
  org?: string;
}

interface FaceCluster {
  id: string;
  centroid: number[];
  descriptorCount: number;
  photoIds: string[];
  coverSrc: string;
}

/* ── tema helper ───────────────────────────────────────────────────────── */

function useColors() {
  const { theme } = useTheme();
  const d = theme === 'dark';
  return {
    isDark: d,
    cardBg:        d ? 'rgba(255,255,255,0.03)' : 'rgba(9,9,11,0.015)',
    cardBorder:    d ? 'rgba(255,255,255,0.07)' : 'rgba(9,9,11,0.09)',
    heading:       d ? '#fff'                   : '#09090B',
    muted:         d ? 'rgba(255,255,255,0.35)' : 'rgba(9,9,11,0.45)',
    mutedMid:      d ? 'rgba(255,255,255,0.25)' : 'rgba(9,9,11,0.35)',
    accentText:    d ? '#86efac'                : '#166534',
    accentBg:      d ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.07)',
    accentBorder:  d ? 'rgba(134,239,172,0.18)' : 'rgba(22,101,52,0.2)',
    accentBorder2: d ? 'rgba(134,239,172,0.35)' : 'rgba(22,101,52,0.35)',
    accentBorder3: d ? 'rgba(134,239,172,0.3)'  : 'rgba(22,101,52,0.3)',
    buyBg:         d ? 'linear-gradient(135deg,rgba(22,101,52,0.9),rgba(21,128,61,0.85))' : 'linear-gradient(135deg,#166534,#15803d)',
    avatarBorder:  d ? 'rgba(255,255,255,0.1)'  : 'rgba(9,9,11,0.1)',
    avatarBg:      d ? 'rgba(255,255,255,0.05)' : 'rgba(9,9,11,0.03)',
    controlBg:     d ? 'rgba(255,255,255,0.05)' : 'rgba(9,9,11,0.04)',
    controlBorder: d ? 'rgba(255,255,255,0.07)' : 'rgba(9,9,11,0.09)',
    controlText:   d ? 'rgba(255,255,255,0.5)'  : 'rgba(9,9,11,0.4)',
    stripBorder:   d ? 'rgba(255,255,255,0.05)' : 'rgba(9,9,11,0.08)',
    ovlBg:         d ? 'rgba(0,0,0,0.55)'        : 'rgba(0,0,0,0.55)',
    buyInCartBg:   d ? 'rgba(134,239,172,0.2)'  : 'rgba(22,101,52,0.15)',
    inCartBadgeBg: d ? 'rgba(134,239,172,0.1)'  : 'rgba(22,101,52,0.08)',
    unidBg:        d ? 'rgba(255,255,255,0.015)' : 'rgba(9,9,11,0.015)',
    unidBorder:    d ? 'rgba(255,255,255,0.05)'  : 'rgba(9,9,11,0.07)',
    unidBadgeBg:   d ? 'rgba(255,255,255,0.05)'  : 'rgba(9,9,11,0.04)',
    unidBadgeBorder: d ? 'rgba(255,255,255,0.1)' : 'rgba(9,9,11,0.09)',
    unidBadgeText: d ? 'rgba(255,255,255,0.45)'  : 'rgba(9,9,11,0.45)',
    unidHeading:   d ? 'rgba(255,255,255,0.7)'   : 'rgba(9,9,11,0.7)',
    statBadgeBg:   d ? 'rgba(255,255,255,0.04)'  : 'rgba(9,9,11,0.04)',
    statBadgeBorder: d ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.09)',
    statBadgeText: d ? 'rgba(255,255,255,0.4)'   : 'rgba(9,9,11,0.4)',
    errBg:         d ? 'rgba(252,165,165,0.07)'  : 'rgba(220,38,38,0.06)',
    errBorder:     d ? 'rgba(252,165,165,0.15)'  : 'rgba(220,38,38,0.15)',
    retryBg:       d ? 'rgba(255,255,255,0.05)'  : 'rgba(9,9,11,0.04)',
    retryBorder:   d ? 'rgba(255,255,255,0.1)'   : 'rgba(9,9,11,0.09)',
    emptyIconBg:   d ? 'rgba(255,255,255,0.04)'  : 'rgba(22,101,52,0.06)',
    emptyIconBorder: d ? 'rgba(255,255,255,0.07)' : 'rgba(22,101,52,0.12)',
    emptyIcon:     d ? 'rgba(255,255,255,0.2)'   : 'rgba(22,101,52,0.35)',
    spinTop:       d ? '#86efac'                  : '#166534',
    spinRight:     d ? 'rgba(134,239,172,0.15)'  : 'rgba(22,101,52,0.15)',
  };
}

/* ── math helpers ────────────────────────────────────────────────────────── */

function euclidean(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

function avgLinkageDist(descsA: number[][], descsB: number[][]): number {
  let total = 0; let count = 0;
  for (const da of descsA) for (const db of descsB) { total += euclidean(da, db); count++; }
  return count > 0 ? total / count : Infinity;
}

function mergeClusters(clusters: FaceCluster[], rawDescs: number[][][], i: number, j: number) {
  const ci = clusters[i]; const cj = clusters[j];
  for (const pid of cj.photoIds) if (!ci.photoIds.includes(pid)) ci.photoIds.push(pid);
  const ni = ci.descriptorCount; const nj = cj.descriptorCount;
  ci.centroid = ci.centroid.map((v, k) => (v * ni + cj.centroid[k] * nj) / (ni + nj));
  ci.descriptorCount = ni + nj;
  rawDescs[i] = rawDescs[i].concat(rawDescs[j]);
  clusters.splice(j, 1); rawDescs.splice(j, 1);
}

/**
 * Pós-processamento: remove fotos duplicadas entre clusters.
 * Cada foto é mantida SOMENTE no cluster cujo centroide está mais próximo
 * da média dos descritores faciais dessa foto.
 */
function deduplicateAcrossClusters(
  clusters: FaceCluster[],
  faces: { photoId: string; descriptors: number[][] }[],
) {
  // mapa photoId → índices de clusters onde aparece
  const photoToIdxs = new Map<string, number[]>();
  for (let i = 0; i < clusters.length; i++) {
    for (const pid of clusters[i].photoIds) {
      const arr = photoToIdxs.get(pid) ?? [];
      arr.push(i);
      photoToIdxs.set(pid, arr);
    }
  }

  // mapa photoId → descritores originais
  const photoDescs = new Map<string, number[][]>();
  for (const { photoId, descriptors } of faces) photoDescs.set(photoId, descriptors);

  for (const [pid, idxs] of photoToIdxs) {
    if (idxs.length <= 1) continue; // sem conflito

    const descs = photoDescs.get(pid) ?? [];

    let bestIdx = idxs[0];
    let bestAvg = Infinity;

    for (const ci of idxs) {
      let total = 0;
      for (const desc of descs) total += euclidean(desc, clusters[ci].centroid);
      const avg = descs.length > 0 ? total / descs.length : Infinity;
      if (avg < bestAvg) { bestAvg = avg; bestIdx = ci; }
    }

    // remove foto de todos os clusters menos o melhor
    for (const ci of idxs) {
      if (ci !== bestIdx) {
        clusters[ci].photoIds = clusters[ci].photoIds.filter(id => id !== pid);
      }
    }
  }
}

/* ── algoritmo principal ─────────────────────────────────────────────────── */

function clusterFaces(
  faces: { photoId: string; descriptors: number[][] }[],
  photoMap: Map<string, GroupPhoto>,
  greedyThreshold = 0.58,  // Ajustado de 0.55 para 0.58 (um pouco mais permissivo)
  mergeThreshold  = 0.63,  // Ajustado de 0.60 para 0.63 (permite mais merge)
): FaceCluster[] {
  const clusters: FaceCluster[] = [];
  const rawDescs: number[][][] = [];

  /* Passo 1: greedy */
  for (const { photoId, descriptors } of faces) {
    for (const descriptor of descriptors) {
      let bestIdx = -1; let bestDist = Infinity;
      for (let i = 0; i < clusters.length; i++) {
        const d = euclidean(descriptor, clusters[i].centroid);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      if (bestIdx >= 0 && bestDist < greedyThreshold) {
        const c = clusters[bestIdx];
        if (!c.photoIds.includes(photoId)) c.photoIds.push(photoId);
        const n = c.descriptorCount;
        c.centroid = c.centroid.map((v, k) => (v * n + descriptor[k]) / (n + 1));
        c.descriptorCount = n + 1;
        rawDescs[bestIdx].push(descriptor);
      } else {
        clusters.push({ id: `p${clusters.length}`, centroid: [...descriptor], descriptorCount: 1, photoIds: [photoId], coverSrc: photoMap.get(photoId)?.src ?? '' });
        rawDescs.push([[...descriptor]]);
      }
    }
  }

  /* Passo 2: merge average-linkage */
  let merged = true;
  while (merged) {
    merged = false;
    let bestI = -1; let bestJ = -1; let bestAvg = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const avg = avgLinkageDist(rawDescs[i], rawDescs[j]);
        if (avg < bestAvg) { bestAvg = avg; bestI = i; bestJ = j; }
      }
    }
    if (bestI >= 0 && bestAvg < mergeThreshold) { mergeClusters(clusters, rawDescs, bestI, bestJ); merged = true; }
  }

  /* Passo 3: desduplicar fotos entre clusters */
  deduplicateAcrossClusters(clusters, faces);

  return clusters
    .filter(c => c.photoIds.length >= 1)
    .sort((a, b) => b.photoIds.length - a.photoIds.length);
}

/* ── PersonCard ──────────────────────────────────────────────────────────── */

function PersonCard({ cluster, index, photoMap, eventId, eventName }: {
  cluster: FaceCluster; index: number;
  photoMap: Map<string, GroupPhoto>; eventId: string; eventName: string;
}) {
  const { addItem, isInCart, openDrawer } = useCart();
  const c = useColors();
  const [expanded, setExpanded] = useState(false);

  const clusterPhotos = cluster.photoIds.map(id => photoMap.get(id)).filter(Boolean) as GroupPhoto[];
  const totalPrice = clusterPhotos.reduce((s, p) => s + p.price, 0);
  const allInCart = clusterPhotos.every(p => isInCart(p.id, eventId));
  const MAX_PREVIEW = 6;

  const handleBuyAll = () => {
    clusterPhotos.forEach(p => { if (!isInCart(p.id, eventId)) addItem({ photoId: p.id, src: p.src, tag: p.tag, eventName, eventId, price: p.price }); });
    openDrawer();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: c.cardBg, border: `1px solid ${allInCart ? c.accentBorder2 : c.cardBorder}` }}
    >
      <div className="flex items-center gap-4 p-5">
        {/* Avatar */}
        <div className="flex-shrink-0 overflow-hidden rounded-full"
          style={{ width: 56, height: 56, border: `2px solid ${allInCart ? c.accentBorder2 : c.avatarBorder}`, background: c.avatarBg }}>
          {cluster.coverSrc
            ? <img src={cluster.coverSrc} alt={`Pessoa ${index + 1}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <div className="flex items-center justify-center w-full h-full" style={{ background: c.accentBg }}><User className="w-6 h-6" style={{ color: c.accentText }} /></div>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[11px]"
              style={{ background: c.accentBg, border: `1px solid ${c.accentBorder}`, color: c.accentText, fontWeight: 700 }}>
              Pessoa #{index + 1}
            </span>
            {allInCart && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: c.accentText }}>
                <CheckCircle2 className="w-3 h-3" /> No carrinho
              </span>
            )}
          </div>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, color: c.heading, fontSize: '0.95rem' }}>
            {clusterPhotos.length} {clusterPhotos.length === 1 ? 'foto identificada' : 'fotos identificadas'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: c.muted }}>
            Total: R$ {totalPrice} · Reconhecimento IA
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={handleBuyAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
            style={{
              background: allInCart ? c.inCartBadgeBg : c.buyBg,
              border: `1px solid ${allInCart ? c.accentBorder3 : c.accentBorder}`,
              color: allInCart ? c.accentText : '#fff', fontWeight: 700,
            }}>
            {allInCart ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
            {allInCart ? 'No carrinho' : 'Comprar tudo'}
          </motion.button>
          <button onClick={() => setExpanded(!expanded)} className="p-2 rounded-xl"
            style={{ background: c.controlBg, border: `1px solid ${c.controlBorder}`, color: c.controlText }}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Photo strip */}
      {clusterPhotos.length > 0 && (
        <div className="px-5 pb-4">
          <AnimatePresence mode="wait">
            {!expanded ? (
              <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {clusterPhotos.slice(0, MAX_PREVIEW).map(photo => {
                  const inCart = isInCart(photo.id, eventId);
                  return (
                    <div key={String(photo.id)} className="relative group overflow-hidden rounded-xl flex-shrink-0"
                      style={{ width: 72, height: 48, border: `1px solid ${inCart ? c.accentBorder2 : c.stripBorder}`, cursor: 'pointer' }}>
                      <img src={photo.src} alt={photo.tag} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} className="group-hover:scale-110 transition-transform duration-300" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: c.ovlBg }} />
                      <button onClick={() => { if (!inCart) addItem({ photoId: photo.id, src: photo.src, tag: photo.tag, eventName, eventId, price: photo.price }); openDrawer(); }}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="p-1.5 rounded-lg" style={{ background: inCart ? c.buyInCartBg : 'rgba(22,101,52,0.85)', border: `1px solid ${inCart ? c.accentBorder2 : c.accentBorder}` }}>
                          {inCart ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: c.accentText }} /> : <ShoppingCart className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </button>
                    </div>
                  );
                })}
                {clusterPhotos.length > MAX_PREVIEW && (
                  <button onClick={() => setExpanded(true)} className="flex-shrink-0 rounded-xl flex items-center justify-center"
                    style={{ width: 72, height: 48, background: c.controlBg, border: `1px solid ${c.controlBorder}`, color: c.muted, fontSize: '0.75rem', fontWeight: 700 }}>
                    +{clusterPhotos.length - MAX_PREVIEW}
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div key="expanded" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                {clusterPhotos.map((photo, i) => {
                  const inCart = isInCart(photo.id, eventId);
                  return (
                    <motion.div key={String(photo.id)} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                      className="relative group overflow-hidden rounded-xl"
                      style={{ aspectRatio: '3/2', border: `1px solid ${inCart ? c.accentBorder2 : c.stripBorder}`, cursor: 'pointer' }}>
                      <img src={photo.src} alt={photo.tag} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} className="group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                      <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-bold" style={{ color: c.accentText }}>R$ {photo.price}</span>
                        <button onClick={() => { if (!inCart) addItem({ photoId: photo.id, src: photo.src, tag: photo.tag, eventName, eventId, price: photo.price }); openDrawer(); }}
                          className="p-1 rounded-lg" style={{ background: inCart ? c.buyInCartBg : 'rgba(22,101,52,0.85)', border: `1px solid ${inCart ? c.accentBorder2 : c.accentBorder}` }}>
                          {inCart ? <CheckCircle2 className="w-3 h-3" style={{ color: c.accentText }} /> : <ShoppingCart className="w-3 h-3 text-white" />}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

/* ── UnidentifiedCard ────────────────────────────────────────────────────── */

function UnidentifiedCard({ photos, eventId, eventName }: { photos: GroupPhoto[]; eventId: string; eventName: string }) {
  const { addItem, isInCart, openDrawer } = useCart();
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  const [showCount, setShowCount] = useState(12);
  if (photos.length === 0) return null;

  const displayPhotos = expanded ? photos.slice(0, showCount) : [];
  const hasMore = expanded && showCount < photos.length;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: c.unidBg, border: `1px solid ${c.unidBorder}` }}>
      <div className="flex items-center gap-4 p-5">
        <div className="flex-shrink-0 flex items-center justify-center rounded-full"
          style={{ width: 56, height: 56, background: c.unidBadgeBg, border: `1px solid ${c.unidBadgeBorder}` }}>
          <ImageOff className="w-5 h-5" style={{ color: c.unidBadgeText }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] mb-1"
            style={{ background: c.unidBadgeBg, border: `1px solid ${c.unidBadgeBorder}`, color: c.unidBadgeText, fontWeight: 700 }}>
            Sem rosto detectado
          </span>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, color: c.unidHeading, fontSize: '0.9rem' }}>
            {photos.length} {photos.length === 1 ? 'foto' : 'fotos'} não identificadas
          </p>
          <p className="text-xs mt-0.5" style={{ color: c.mutedMid }}>
            Rosto não encontrado pela IA · Compre individualmente
          </p>
        </div>
        <button onClick={() => { setExpanded(!expanded); setShowCount(12); }} className="p-2 rounded-xl flex-shrink-0"
          style={{ background: c.controlBg, border: `1px solid ${c.controlBorder}`, color: c.controlText }}>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-5 pb-5">
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
              {displayPhotos.map(photo => {
                const inCart = isInCart(photo.id, eventId);
                return (
                  <div key={String(photo.id)} className="relative group overflow-hidden rounded-xl"
                    style={{ aspectRatio: '3/2', border: `1px solid ${inCart ? c.accentBorder2 : c.stripBorder}`, cursor: 'pointer' }}>
                    <img src={photo.src} alt={photo.tag} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} className="group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                    <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold" style={{ color: c.accentText }}>R$ {photo.price}</span>
                      <button onClick={() => { if (!inCart) addItem({ photoId: photo.id, src: photo.src, tag: photo.tag, eventName, eventId, price: photo.price }); openDrawer(); }}
                        className="p-1 rounded-lg" style={{ background: inCart ? c.buyInCartBg : 'rgba(22,101,52,0.85)', border: `1px solid ${inCart ? c.accentBorder2 : c.accentBorder}` }}>
                        {inCart ? <CheckCircle2 className="w-3 h-3" style={{ color: c.accentText }} /> : <ShoppingCart className="w-3 h-3 text-white" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <button
                onClick={() => setShowCount(prev => prev + 12)}
                className="w-full mt-3 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2"
                style={{ background: c.controlBg, border: `1px solid ${c.controlBorder}`, color: c.muted, fontWeight: 700 }}
              >
                Carregar mais ({photos.length - showCount} restantes)
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── painel principal ────────────────────────────────────────────────────── */

type Stage = 'loading' | 'ready' | 'error' | 'empty';

export function FaceGroupingPanel({ photos, eventId, eventName, org }: Props) {
  const c = useColors();
  const [stage, setStage] = useState<Stage>('loading');
  const [clusters, setClusters] = useState<FaceCluster[]>([]);
  const [unidentified, setUnidentified] = useState<GroupPhoto[]>([]);
  const [error, setError] = useState('');

  const photoMap = useMemo(
    () => new Map<string, GroupPhoto>(photos.map(p => [String(p.id), p])),
    [photos],
  );

  const load = async () => {
    setStage('loading'); setError('');
    try {
      const { faces } = await api.getEventFaces(eventId, org);
      if (faces.length === 0) { setStage('empty'); return; }

      const result = clusterFaces(faces, photoMap);
      setClusters(result);

      const detectedIds = new Set<string>(faces.map(f => f.photoId));
      setUnidentified(photos.filter(p => !detectedIds.has(String(p.id))));

      setStage(result.length > 0 ? 'ready' : 'empty');
    } catch (err: any) {
      setError(err.message ?? 'Erro ao carregar agrupamentos.');
      setStage('error');
    }
  };

  useEffect(() => { load(); }, [eventId, org]);

  return (
    <div className="py-6">
      <AnimatePresence mode="wait">

        {/* Loading */}
        {stage === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 rounded-full border-2 border-transparent mx-auto mb-5"
              style={{ borderTopColor: c.spinTop, borderRightColor: c.spinRight }} />
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, color: c.heading, fontSize: '0.95rem' }}>Agrupando rostos…</p>
            <p className="text-xs mt-1" style={{ color: c.muted }}>Clusterizando descritores das {photos.length} fotos</p>
          </motion.div>
        )}

        {/* Ready */}
        {stage === 'ready' && (
          <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                    style={{ background: c.accentBg, border: `1px solid ${c.accentBorder}`, color: c.accentText, fontWeight: 700 }}>
                    <Users className="w-3.5 h-3.5" />
                    {clusters.length} {clusters.length === 1 ? 'pessoa identificada' : 'pessoas identificadas'}
                  </div>
                  {unidentified.length > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
                      style={{ background: c.statBadgeBg, border: `1px solid ${c.statBadgeBorder}`, color: c.statBadgeText, fontWeight: 600 }}>
                      <ImageOff className="w-3 h-3" /> {unidentified.length} sem rosto
                    </div>
                  )}
                </div>
                <p className="text-xs" style={{ color: c.muted }}>Agrupamento por average-linkage · IA Smart Match</p>
              </div>
              <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
                style={{ background: c.controlBg, border: `1px solid ${c.controlBorder}`, color: c.controlText, fontWeight: 600 }}>
                <RefreshCw className="w-3 h-3" /> Recarregar
              </button>
            </div>

            <div className="space-y-4">
              {clusters.map((cluster, i) => (
                <PersonCard key={cluster.id} cluster={cluster} index={i} photoMap={photoMap} eventId={eventId} eventName={eventName} />
              ))}
              <UnidentifiedCard photos={unidentified} eventId={eventId} eventName={eventName} />
            </div>
          </motion.div>
        )}

        {/* Empty */}
        {stage === 'empty' && (
          <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-20 max-w-sm mx-auto">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: c.emptyIconBg, border: `1px solid ${c.emptyIconBorder}` }}>
              <Camera className="w-8 h-8" style={{ color: c.emptyIcon }} />
            </div>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, color: c.heading, fontSize: '1rem' }} className="mb-2">
              Nenhum rosto processado
            </p>
            <p className="text-sm" style={{ color: c.muted, lineHeight: 1.7 }}>
              O reconhecimento facial acontece automaticamente no upload das fotos.
            </p>
          </motion.div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <motion.div key="error" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-20 max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: c.errBg, border: `1px solid ${c.errBorder}` }}>
              <AlertCircle className="w-7 h-7" style={{ color: '#fca5a5' }} />
            </div>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, color: c.heading }} className="mb-2">
              Erro ao carregar agrupamentos
            </p>
            <p className="text-xs mb-6" style={{ color: c.muted }}>{error}</p>
            <button onClick={load} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm mx-auto"
              style={{ background: c.retryBg, border: `1px solid ${c.retryBorder}`, color: c.heading, fontWeight: 700 }}>
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}