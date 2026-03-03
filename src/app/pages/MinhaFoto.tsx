import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router';
import { Download, Loader2, AlertCircle, CheckCircle2, Camera, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-68454e9b`;

/**
 * Chama o endpoint público de signed-url no servidor.
 * Tenta primeiro com Authorization header + ?apikey= (padrão Supabase).
 * Se retornar 401/403, tenta só com ?apikey= (caso raro de gateway strip).
 */
async function fetchSignedUrl(orderId: string, photoId: string): Promise<{
  viewUrl: string;
  downloadUrl: string;
  fileName: string;
}> {
  const url = `${BASE}/orders/${orderId}/photos/${photoId}/signed-url?apikey=${encodeURIComponent(publicAnonKey)}`;

  // Tentativa 1: com Authorization header (padrão)
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });

  // Se falhou com 401/403, tenta sem Authorization (só apikey= na URL)
  if (res.status === 401 || res.status === 403) {
    console.warn(`[MinhaFoto] Tentativa 1 retornou ${res.status}, tentando sem Authorization header...`);
    res = await fetch(url);
  }

  // Lê o body como texto para debug seguro
  const rawText = await res.text();
  console.log(`[MinhaFoto] signed-url status=${res.status} body=${rawText.slice(0, 300)}`);

  let data: any = {};
  try { data = JSON.parse(rawText); } catch { /* body não era JSON */ }

  if (!res.ok) {
    const msg = data.error ?? data.message ?? `Erro HTTP ${res.status}`;
    throw new Error(`[${res.status}] ${msg}`);
  }

  if (!data.viewUrl) {
    throw new Error('Servidor retornou resposta sem viewUrl');
  }

  return {
    viewUrl: data.viewUrl,
    downloadUrl: data.downloadUrl ?? data.viewUrl,
    fileName: data.fileName ?? 'minha-foto.jpg',
  };
}

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
  const hasAutoTriggered = useRef(false);

  const load = () => {
    if (!orderId || !photoId) {
      setError('Link inválido — orderId ou photoId ausente.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    fetchSignedUrl(orderId, photoId)
      .then(({ viewUrl, downloadUrl, fileName }) => {
        setViewUrl(viewUrl);
        setDownloadUrl(downloadUrl);
        setFileName(fileName);
      })
      .catch(err => {
        console.error('[MinhaFoto] Erro ao carregar foto:', err);
        setError(err.message ?? 'Não foi possível carregar a foto.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [orderId, photoId]);

  // Auto-trigger download quando foto carrega (QR code scan)
  useEffect(() => {
    if (downloadUrl && !hasAutoTriggered.current && !loading && !error) {
      hasAutoTriggered.current = true;
      const t = setTimeout(() => handleDownload(), 600);
      return () => clearTimeout(t);
    }
  }, [downloadUrl, loading, error]);

  /**
   * Download confiável em todos os browsers (incluindo iOS Safari e Chrome mobile).
   *
   * Fluxo:
   *  1. fetch(downloadUrl) → a signed URL do Storage tem CORS aberto (Access-Control-Allow-Origin: *)
   *  2. response.blob() → arquivo vira Blob local
   *  3. URL.createObjectURL(blob) → URL blob:// é sempre same-origin → atributo `download` funciona
   */
  const handleDownload = async () => {
    if (!downloadUrl || downloading) return;
    setDownloading(true);
    setDlError('');

    try {
      console.log('[MinhaFoto] Iniciando download de:', downloadUrl.slice(0, 100) + '...');
      const res = await fetch(downloadUrl);
      console.log('[MinhaFoto] Download response status:', res.status);

      if (!res.ok) {
        throw new Error(`Erro ao buscar foto no storage: HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
      setDownloaded(true);
    } catch (err: any) {
      console.error('[MinhaFoto] Erro no download:', err);
      setDlError(`Falha no download: ${err.message ?? 'erro desconhecido'}. Tente o botão abaixo.`);
      // Fallback: abre em nova aba (funciona em Android)
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

      {/* Card principal */}
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

        {/* Erro ao carregar */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.12)' }}
            >
              <AlertCircle className="w-7 h-7" style={{ color: '#f87171' }} />
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  color: '#fff',
                  fontSize: '1rem',
                  marginBottom: 6,
                }}
              >
                Ops, algo deu errado
              </p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', lineHeight: 1.6, wordBreak: 'break-word' }}>
                {error}
              </p>
            </div>

            {/* Botão Tentar Novamente */}
            <button
              onClick={() => { hasAutoTriggered.current = false; load(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>

            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem', lineHeight: 1.6 }}>
              Procure o fotógrafo do evento ou acesse smartmatch.com.br
            </p>
          </div>
        )}

        {/* Foto carregada com sucesso */}
        {!loading && viewUrl && (
          <>
            {/* Imagem */}
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

            {/* Ações */}
            <div className="p-5 flex flex-col gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl"
                style={{
                  background: downloaded
                    ? 'rgba(0,255,127,0.12)'
                    : 'linear-gradient(135deg, #00843D, #00FF7F)',
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

              {/* Erro de download */}
              {dlError && (
                <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', lineHeight: 1.6 }}>
                  {dlError}
                  {/* Fallback direto para o Storage */}
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

              {/* Dica pós-download */}
              {downloaded && !dlError && (
                <p
                  className="text-center text-xs"
                  style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}
                >
                  📱 No iPhone: acesse o app <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Arquivos</strong> → Downloads<br />
                  📱 No Android: verifique a pasta <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Downloads</strong> ou Galeria
                </p>
              )}

              <p
                className="text-center"
                style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem', lineHeight: 1.5 }}
              >
                Foto exclusiva do Tour Palmeiras · Smart<span style={{ color: '#00FF7F' }}>Match</span>
              </p>
            </div>
          </>
        )}
      </motion.div>

      <p
        className="mt-8 text-center"
        style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem' }}
      >
        smartmatch.com.br · Todos os direitos reservados
      </p>
    </div>
  );
}
