/**
 * FaceGroupingPanel — agrupa todas as fotos do evento por rosto detectado
 * Usa os descritores já armazenados no KV (processados no upload pelo admin)
 * e faz clusterização greedy client-side para montar os "grupos de pessoa".
 *
 * v2: Algoritmo melhorado com centroid médio real, threshold ajustável,
 *     merge de clusters similares, e UI refinada com avatar circular.
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Users, ShoppingCart, CheckCircle2, ChevronDown, ChevronUp,
  Loader2, RefreshCw, User, Zap, AlertCircle, Camera,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../lib/api';
import { useCart } from '../contexts/CartContext';

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
}

interface FaceCluster {
  id: string;
  centroid: number[];
  descriptorCount: number; // track real number of descriptors for centroid avg
  photoIds: string[];
  coverSrc: string;
}

/* ── clustering melhorado ─────────────────────────────────────────────── */

function euclidean(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

function clusterFaces(
  faces: { photoId: string; descriptors: number[][] }[],
  photoMap: Map<string, GroupPhoto>,
  threshold = 0.55, // relaxed from 0.45 to handle glasses/beard/angle variations
): FaceCluster[] {
  const clusters: FaceCluster[] = [];

  for (const { photoId, descriptors } of faces) {
    for (const descriptor of descriptors) {
      let bestIdx = -1;
      let bestDist = Infinity;

      for (let i = 0; i < clusters.length; i++) {
        const d = euclidean(descriptor, clusters[i].centroid);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }

      if (bestIdx >= 0 && bestDist < threshold) {
        // Add to existing cluster — update centroid with proper running average
        const c = clusters[bestIdx];
        if (!c.photoIds.includes(photoId)) c.photoIds.push(photoId);
        const n = c.descriptorCount;
        c.centroid = c.centroid.map((v, i) => (v * n + descriptor[i]) / (n + 1));
        c.descriptorCount = n + 1;
      } else {
        // New cluster
        const photo = photoMap.get(photoId);
        clusters.push({
          id: `p${clusters.length}`,
          centroid: [...descriptor],
          descriptorCount: 1,
          photoIds: [photoId],
          coverSrc: photo?.src ?? '',
        });
      }
    }
  }

  // Merge pass: merge clusters that are too close to each other (post-clustering cleanup)
  // Multiple merge passes with progressively higher thresholds for robustness
  const mergeThresholds = [threshold * 0.80, threshold * 0.90];
  for (const mt of mergeThresholds) {
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          if (euclidean(clusters[i].centroid, clusters[j].centroid) < mt) {
            // Merge j into i
            const ci = clusters[i];
            const cj = clusters[j];
            for (const pid of cj.photoIds) {
              if (!ci.photoIds.includes(pid)) ci.photoIds.push(pid);
            }
            // Weighted average centroid
            const ni = ci.descriptorCount;
            const nj = cj.descriptorCount;
            ci.centroid = ci.centroid.map((v, k) => (v * ni + cj.centroid[k] * nj) / (ni + nj));
            ci.descriptorCount = ni + nj;
            clusters.splice(j, 1);
            merged = true;
            break;
          }
        }
        if (merged) break;
      }
    }
  }

  // Sort by appearances (most seen first)
  return clusters
    .filter((c) => c.photoIds.length >= 1)
    .sort((a, b) => b.photoIds.length - a.photoIds.length);
}

/* ── person card ────────────────────────────────────────────────────────── */

function PersonCard({
  cluster, index, photos, photoMap, eventId, eventName,
}: {
  cluster: FaceCluster;
  index: number;
  photos: GroupPhoto[];
  photoMap: Map<string, GroupPhoto>;
  eventId: string;
  eventName: string;
}) {
  const { addItem, isInCart, openDrawer } = useCart();
  const [expanded, setExpanded] = useState(false);

  const clusterPhotos = cluster.photoIds
    .map((id) => photoMap.get(id))
    .filter(Boolean) as GroupPhoto[];

  const totalPrice = clusterPhotos.reduce((s, p) => s + p.price, 0);

  const handleBuyAll = () => {
    clusterPhotos.forEach((p) => {
      if (!isInCart(p.id, eventId))
        addItem({ photoId: p.id, src: p.src, tag: p.tag, eventName, eventId, price: p.price });
    });
    openDrawer();
  };

  const allInCart = clusterPhotos.every((p) => isInCart(p.id, eventId));
  const someInCart = clusterPhotos.some((p) => isInCart(p.id, eventId));

  // Maximum photos to show in collapsed mode
  const MAX_PREVIEW = 6;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${allInCart ? 'rgba(134,239,172,0.25)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 p-5">
        {/* Circular avatar — best cover photo */}
        <div
          className="flex-shrink-0 overflow-hidden rounded-full"
          style={{
            width: 56,
            height: 56,
            border: `2px solid ${allInCart ? 'rgba(134,239,172,0.4)' : 'rgba(255,255,255,0.1)'}`,
            background: 'rgba(255,255,255,0.05)',
          }}
        >
          {cluster.coverSrc ? (
            <img
              src={cluster.coverSrc}
              alt={`Pessoa ${index + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full" style={{ background: 'rgba(134,239,172,0.08)' }}>
              <User className="w-6 h-6" style={{ color: 'rgba(134,239,172,0.4)' }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded-full text-[11px]"
              style={{ background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.18)', color: '#86efac', fontWeight: 700 }}
            >
              Pessoa #{index + 1}
            </span>
            {allInCart && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: '#86efac' }}>
                <CheckCircle2 className="w-3 h-3" /> No carrinho
              </span>
            )}
          </div>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
            {clusterPhotos.length} {clusterPhotos.length === 1 ? 'foto identificada' : 'fotos identificadas'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Total: R$ {totalPrice} · Reconhecimento IA
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={handleBuyAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
            style={{
              background: allInCart ? 'rgba(134,239,172,0.1)' : 'linear-gradient(135deg,rgba(22,101,52,0.9),rgba(21,128,61,0.85))',
              border: `1px solid ${allInCart ? 'rgba(134,239,172,0.3)' : 'rgba(134,239,172,0.2)'}`,
              color: allInCart ? '#86efac' : '#fff',
              fontWeight: 700,
            }}
          >
            {allInCart ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
            {allInCart ? 'No carrinho' : 'Comprar tudo'}
          </motion.button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Photo strip */}
      {clusterPhotos.length > 0 && (
        <div className="px-5 pb-4">
          <AnimatePresence mode="wait">
            {!expanded ? (
              /* Collapsed: horizontal strip */
              <motion.div
                key="collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-2 overflow-x-auto"
                style={{ scrollbarWidth: 'none' }}
              >
                {clusterPhotos.slice(0, MAX_PREVIEW).map((photo) => {
                  const inCart = isInCart(photo.id, eventId);
                  return (
                    <div
                      key={String(photo.id)}
                      className="relative group overflow-hidden rounded-xl flex-shrink-0"
                      style={{
                        width: 72,
                        height: 48,
                        border: inCart ? '1px solid rgba(134,239,172,0.35)' : '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                      }}
                    >
                      <img src={photo.src} alt={photo.tag} style={{ width: '100%', height: '100%', objectFit: 'cover' }} className="group-hover:scale-110 transition-transform duration-300" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.55)' }} />
                      <button
                        onClick={() => {
                          if (!inCart) addItem({ photoId: photo.id, src: photo.src, tag: photo.tag, eventName, eventId, price: photo.price });
                          openDrawer();
                        }}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <div className="p-1.5 rounded-lg" style={{ background: inCart ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.85)', border: `1px solid ${inCart ? 'rgba(134,239,172,0.4)' : 'rgba(134,239,172,0.2)'}` }}>
                          {inCart ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#86efac' }} /> : <ShoppingCart className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </button>
                    </div>
                  );
                })}
                {clusterPhotos.length > MAX_PREVIEW && (
                  <button
                    onClick={() => setExpanded(true)}
                    className="flex-shrink-0 rounded-xl flex items-center justify-center"
                    style={{ width: 72, height: 48, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    +{clusterPhotos.length - MAX_PREVIEW}
                  </button>
                )}
              </motion.div>
            ) : (
              /* Expanded: responsive grid */
              <motion.div
                key="expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid gap-2"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}
              >
                {clusterPhotos.map((photo, i) => {
                  const inCart = isInCart(photo.id, eventId);
                  return (
                    <motion.div
                      key={String(photo.id)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="relative group overflow-hidden rounded-xl"
                      style={{
                        aspectRatio: '3/2',
                        border: inCart ? '1px solid rgba(134,239,172,0.35)' : '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                      }}
                    >
                      <img src={photo.src} alt={photo.tag} style={{ width: '100%', height: '100%', objectFit: 'cover' }} className="group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                      <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-bold" style={{ color: '#86efac' }}>
                          R$ {photo.price}
                        </span>
                        <button
                          onClick={() => {
                            if (!inCart) addItem({ photoId: photo.id, src: photo.src, tag: photo.tag, eventName, eventId, price: photo.price });
                            openDrawer();
                          }}
                          className="p-1 rounded-lg"
                          style={{ background: inCart ? 'rgba(134,239,172,0.2)' : 'rgba(22,101,52,0.85)', border: `1px solid ${inCart ? 'rgba(134,239,172,0.4)' : 'rgba(134,239,172,0.2)'}` }}
                        >
                          {inCart ? <CheckCircle2 className="w-3 h-3" style={{ color: '#86efac' }} /> : <ShoppingCart className="w-3 h-3 text-white" />}
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

/* ── painel principal ───────────────────────────────────────────────────── */

type Stage = 'loading' | 'ready' | 'error' | 'empty';

export function FaceGroupingPanel({ photos, eventId, eventName }: Props) {
  const [stage, setStage] = useState<Stage>('loading');
  const [clusters, setClusters] = useState<FaceCluster[]>([]);
  const [error, setError] = useState('');

  const photoMap = useMemo(
    () => new Map<string, GroupPhoto>(photos.map((p) => [String(p.id), p])),
    [photos],
  );

  const load = async () => {
    setStage('loading');
    setError('');
    try {
      const { faces } = await api.getEventFaces(eventId);

      if (faces.length === 0) {
        setStage('empty');
        return;
      }

      const result = clusterFaces(faces, photoMap);
      setClusters(result);
      setStage(result.length > 0 ? 'ready' : 'empty');
    } catch (err: any) {
      setError(err.message ?? 'Erro ao carregar agrupamentos.');
      setStage('error');
    }
  };

  useEffect(() => { load(); }, [eventId]);

  return (
    <div className="py-6">
      <AnimatePresence mode="wait">

        {/* Loading */}
        {stage === 'loading' && (
          <motion.div key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center py-20"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 rounded-full border-2 border-transparent mx-auto mb-5"
              style={{ borderTopColor: '#86efac', borderRightColor: 'rgba(134,239,172,0.15)' }}
            />
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
              Agrupando rostos…
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Clusterizando descritores faciais das {photos.length} fotos
            </p>
          </motion.div>
        )}

        {/* Ready */}
        {stage === 'ready' && (
          <motion.div key="ready"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Summary header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                    style={{ background: 'rgba(134,239,172,0.08)', border: '1px solid rgba(134,239,172,0.2)', color: '#86efac', fontWeight: 700 }}>
                    <Users className="w-3.5 h-3.5" />
                    {clusters.length} {clusters.length === 1 ? 'pessoa identificada' : 'pessoas identificadas'}
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Agrupamento automático por reconhecimento facial · IA Smart Match
                </p>
              </div>
              <button
                onClick={load}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}
              >
                <RefreshCw className="w-3 h-3" /> Recarregar
              </button>
            </div>

            {/* Person cards */}
            <div className="space-y-4">
              {clusters.map((cluster, i) => (
                <PersonCard
                  key={cluster.id}
                  cluster={cluster}
                  index={i}
                  photos={photos}
                  photoMap={photoMap}
                  eventId={eventId}
                  eventName={eventName}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty */}
        {stage === 'empty' && (
          <motion.div key="empty"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-center py-20 max-w-sm mx-auto"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Camera className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 800, color: '#fff', fontSize: '1rem' }} className="mb-2">
              Nenhum rosto processado
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.38)', lineHeight: 1.7 }}>
              O administrador precisa processar as fotos deste evento. O reconhecimento facial acontece automaticamente no upload.
            </p>
          </motion.div>
        )}

        {/* Error */}
        {stage === 'error' && (
          <motion.div key="error"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="text-center py-20 max-w-sm mx-auto"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(252,165,165,0.07)', border: '1px solid rgba(252,165,165,0.15)' }}>
              <AlertCircle className="w-7 h-7" style={{ color: '#fca5a5' }} />
            </div>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 700, color: '#fff' }} className="mb-2">
              Erro ao carregar agrupamentos
            </p>
            <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>{error}</p>
            <button
              onClick={load}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm mx-auto"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700 }}
            >
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}