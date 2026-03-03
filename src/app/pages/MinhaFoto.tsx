import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router';
import { Download, Loader2, AlertCircle, CheckCircle2, Camera, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import QRCode from 'qrcode';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-68454e9b`;

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function fetchSignedUrl(orderId: string, photoId: string) {
  const url = `${BASE}/orders/${orderId}/photos/${photoId}/signed-url?apikey=${encodeURIComponent(publicAnonKey)}`;

  let res = await fetch(url, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
  if (res.status === 401 || res.status === 403) {
    console.warn(`[MinhaFoto] retry sem Authorization (status ${res.status})`);
    res = await fetch(url);
  }

  const rawText = await res.text();
  console.log(`[MinhaFoto] signed-url status=${res.status} body=${rawText.slice(0, 300)}`);

  let data: any = {};
  try { data = JSON.parse(rawText); } catch {}

  if (!res.ok) throw new Error(`[${res.status}] ${data.error ?? data.message ?? `Erro HTTP ${res.status}`}`);
  if (!data.viewUrl) throw new Error('Servidor retornou resposta sem viewUrl');

  return {
    viewUrl:     data.viewUrl,
    downloadUrl: data.downloadUrl ?? data.viewUrl,
    fileName:    data.fileName ?? 'minha-foto.jpg',
  };
}

/** Busca footerImageUrl e qrRight do branding público (sem auth) */
async function fetchFooterConfig(): Promise<{ footerImageUrl: string | null; footerQrRight: number }> {
  try {
    const res = await fetch(`${BASE}/branding/public?apikey=${encodeURIComponent(publicAnonKey)}`);
    if (!res.ok) throw new Error(`branding/public retornou ${res.status}`);
    const data = await res.json();
    return {
      footerImageUrl: data.footerImageUrl ?? null,
      footerQrRight:  typeof data.footerQrRight === 'number' ? data.footerQrRight : 16,
    };
  } catch (err) {
    console.warn('[MinhaFoto] Não foi possível carregar config do rodapé:', err);
    return { footerImageUrl: null, footerQrRight: 16 };
  }
}

// ── Canvas utilities ──────────────────────────────────────────────────────────

/** Carrega uma imagem de URL com crossOrigin; retorna null se falhar em 5s */
function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 5000);
    img.onload  = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = src;
  });
}

/**
 * Compõe a foto com o rodapé oficial (imagem carregada do servidor)
 * e o QR code posicionado conforme o slider configurado no admin.
 *
 * Layout:
 *   ┌──────────────────── foto ─────────────────────┐
 *   ├── [   imagem do rodapé   ] [  QR code  ]  ────┤  ← footerQrRight %
 *   └───────────────────────────────────────────────┘
 *
 * Se o rodapé não estiver configurado no servidor, cai no fallback de texto.
 */
async function composePhotoWithFooter(
  photoBlobOrUrl: Blob | string,
  qrContent:      string,
  footerImgUrl:   string | null,
  qrRight:        number,   // % a partir da direita (ex: 16)
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    // Carrega a foto
    let photoImg: HTMLImageElement | null;
    if (typeof photoBlobOrUrl === 'string') {
      photoImg = await loadImg(photoBlobOrUrl);
    } else {
      const objUrl = URL.createObjectURL(photoBlobOrUrl);
      photoImg = await loadImg(objUrl);
      URL.revokeObjectURL(objUrl);
    }

    if (!photoImg) return reject(new Error('Falha ao carregar foto no canvas'));

    const W = photoImg.naturalWidth;
    const H = photoImg.naturalHeight;

    // Altura do rodapé é proporcional à largura (10%), min 80, max 240px
    const FH  = Math.max(80, Math.min(240, Math.round(W * 0.10)));
    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H + FH;
    const ctx = canvas.getContext('2d')!;

    // ── 1. Foto original ────────────────────────────────────────────────────
    ctx.drawImage(photoImg, 0, 0, W, H);

    // ── 2. Rodapé: imagem do servidor OU fallback texto ──────────────────────
    const footerImg = footerImgUrl ? await loadImg(footerImgUrl) : null;

    if (footerImg) {
      // Desenha a imagem do rodapé estendida ao longo de toda a largura
      ctx.drawImage(footerImg, 0, H, W, FH);
    } else {
      // Fallback: barra verde escura simples
      const grad = ctx.createLinearGradient(0, H, 0, H + FH);
      grad.addColorStop(0, '#003D17');
      grad.addColorStop(1, '#006B2B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, H, W, FH);

      const fSize = Math.round(FH * 0.4);
      ctx.font      = `900 italic ${fSize}px Montserrat, 'Arial Black', Arial, sans-serif`;
      ctx.fillStyle = '#00E05A';
      ctx.textBaseline = 'middle';
      ctx.textAlign    = 'left';
      ctx.fillText('TOUR Palmeiras · Allianz Parque', Math.round(FH * 0.2), H + FH / 2);
    }

    // ── 3. QR code sobreposto ao rodapé na posição configurada ───────────────
    // Replica EXATAMENTE o CSS do print: right:qrRight%, top:6%, height:88%, aspect-ratio:1/1
    // CSS right:X% → borda direita do elemento fica X% da largura a partir da direita
    //   → left = containerWidth * (1 - X/100) - elementWidth
    const qrSize = Math.round(FH * 0.88);
    const qrY    = H + Math.round(FH * 0.06);
    const qrX    = Math.round(W * (1 - qrRight / 100)) - qrSize;

    try {
      const qrDataUrl = await QRCode.toDataURL(qrContent, {
        width:  qrSize * 2,
        margin: 1,
        color: { dark: '#ffffff', light: '#006B2B' },  // branco sobre verde (padrão da impressão)
      });
      const qrImg = await loadImg(qrDataUrl);
      if (qrImg) ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } catch (err) {
      console.warn('[MinhaFoto] QR code geração falhou:', err);
    }

    // ── 4. Exporta como JPEG ─────────────────────────────────────────────────
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob);
        else reject(new Error('canvas.toBlob retornou null'));
      },
      'image/jpeg',
      0.93,
    );
  });
}

// ── Componente ────────────────────────────────────────────────────────────────

export function MinhaFoto() {
  const { orderId, photoId } = useParams<{ orderId: string; photoId: string }>();

  const [viewUrl,     setViewUrl]     = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName,    setFileName]    = useState('minha-foto.jpg');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloaded,  setDownloaded]  = useState(false);
  const [dlError,     setDlError]     = useState('');

  // Config do rodapé (carregada do servidor)
  const [footerImgUrl, setFooterImgUrl] = useState<string | null>(null);
  const [qrRight,      setQrRight]      = useState(16);
  const hasAutoTriggered = useRef(false);

  const load = () => {
    if (!orderId || !photoId) {
      setError('Link inválido — orderId ou photoId ausente.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');

    // Carrega foto + config do rodapé em paralelo
    Promise.all([
      fetchSignedUrl(orderId, photoId),
      fetchFooterConfig(),
    ])
      .then(([{ viewUrl, downloadUrl, fileName }, { footerImageUrl, footerQrRight }]) => {
        setViewUrl(viewUrl);
        setDownloadUrl(downloadUrl);
        setFileName(fileName);
        setFooterImgUrl(footerImageUrl);
        setQrRight(footerQrRight);
      })
      .catch(err => {
        console.error('[MinhaFoto] Erro ao carregar:', err);
        setError(err.message ?? 'Não foi possível carregar a foto.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [orderId, photoId]);

  // Auto-download ao escanear QR code
  useEffect(() => {
    if (downloadUrl && !hasAutoTriggered.current && !loading && !error) {
      hasAutoTriggered.current = true;
      const t = setTimeout(() => handleDownload(), 700);
      return () => clearTimeout(t);
    }
  }, [downloadUrl, loading, error]);

  const handleDownload = async () => {
    if (!downloadUrl || downloading) return;
    setDownloading(true);
    setDlError('');

    try {
      // 1. Busca a foto original do Supabase Storage
      console.log('[MinhaFoto] Buscando foto original…');
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error(`Storage retornou HTTP ${res.status}`);
      const originalBlob = await res.blob();

      // 2. Compõe foto + rodapé da config + QR na posição configurada
      const photoPageUrl = `${window.location.origin}/minha-foto/${orderId}/${photoId}`;
      console.log('[MinhaFoto] Compondo rodapé. footerImgUrl=', footerImgUrl ? '✓' : 'null', 'qrRight=', qrRight);

      let finalBlob: Blob;
      try {
        finalBlob = await composePhotoWithFooter(originalBlob, photoPageUrl, footerImgUrl, qrRight);
      } catch (canvasErr) {
        console.warn('[MinhaFoto] Canvas falhou, usando blob original:', canvasErr);
        finalBlob = originalBlob;
      }

      // 3. Download via blob:// (same-origin → `download` funciona em todos os browsers)
      const blobUrl = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName.replace(/\.[^.]+$/, '') + '_smartmatch.jpg';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);

      setDownloaded(true);
    } catch (err: any) {
      console.error('[MinhaFoto] Erro no download:', err);
      setDlError(`Falha: ${err.message ?? 'erro desconhecido'}`);
      window.open(downloadUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(160deg, #06120A 0%, #08080E 60%, #001A0A 100%)' }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Camera className="w-6 h-6" style={{ color: '#00FF7F' }} />
          <span
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 900,
              fontSize: '1.5rem',
              letterSpacing: '-0.03em',
              color: '#fff',
            }}
          >
            Smart<span style={{ color: '#00FF7F' }}>Match</span>
          </span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
          Tour Palmeiras · Allianz Parque
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Carregando */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#00FF7F' }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
              Carregando sua foto…
            </p>
          </div>
        )}

        {/* Erro */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.12)' }}
            >
              <AlertCircle className="w-7 h-7" style={{ color: '#f87171' }} />
            </div>
            <div>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, color: '#fff', fontSize: '1rem', marginBottom: 6 }}>
                Ops, algo deu errado
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', lineHeight: 1.6, wordBreak: 'break-word' }}>
                {error}
              </p>
            </div>
            <button
              onClick={() => { hasAutoTriggered.current = false; load(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem' }}>
              Procure o fotógrafo do evento ou acesse smartmatch.com.br
            </p>
          </div>
        )}

        {/* Foto carregada */}
        {!loading && viewUrl && (
          <>
            <div className="relative bg-black" style={{ lineHeight: 0 }}>
              <img
                src={viewUrl}
                alt="Sua foto"
                className="w-full block"
                style={{ maxHeight: '60vh', objectFit: 'contain' }}
              />
              <div
                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{
                  background: 'rgba(0,255,127,0.15)',
                  border: '1px solid rgba(0,255,127,0.3)',
                  color: '#00FF7F',
                }}
              >
                <CheckCircle2 className="w-3 h-3" />
                Foto verificada
              </div>
            </div>

            <div className="p-5 flex flex-col gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl"
                style={{
                  background: downloaded ? 'rgba(0,255,127,0.12)' : 'linear-gradient(135deg, #00843D, #00FF7F)',
                  color: downloaded ? '#00FF7F' : '#001A0A',
                  border: downloaded ? '1px solid rgba(0,255,127,0.3)' : 'none',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  letterSpacing: '-0.01em',
                  opacity: downloading ? 0.75 : 1,
                  cursor: downloading ? 'not-allowed' : 'pointer',
                }}
              >
                {downloading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Preparando download…</>
                ) : downloaded ? (
                  <><CheckCircle2 className="w-4 h-4" /> Download concluído</>
                ) : (
                  <><Download className="w-4 h-4" /> Baixar minha foto</>
                )}
              </motion.button>

              {dlError && (
                <div
                  className="rounded-xl p-3 text-xs"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', lineHeight: 1.6 }}
                >
                  {dlError}
                  <a
                    href={downloadUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-2 text-center font-bold underline"
                    style={{ color: '#fbbf24' }}
                  >
                    Abrir foto em nova aba →
                  </a>
                </div>
              )}

              {downloaded && !dlError && (
                <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                  📱 No iPhone: <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Arquivos</strong> → Downloads<br />
                  📱 No Android: pasta <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Downloads</strong> ou Galeria
                </p>
              )}

              <p className="text-center" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem' }}>
                Foto exclusiva do Tour Palmeiras · Smart<span style={{ color: '#00FF7F' }}>Match</span>
              </p>
            </div>
          </>
        )}
      </motion.div>

      <p className="mt-8 text-center" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem' }}>
        smartmatch.com.br · Todos os direitos reservados
      </p>
    </div>
  );
}