import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Download, Loader2, AlertCircle, CheckCircle2, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-68454e9b`;

export function MinhaFoto() {
  const { orderId, photoId } = useParams<{ orderId: string; photoId: string }>();

  const [viewUrl,     setViewUrl]     = useState<string | null>(null);
  // downloadUrl = signed URL do Supabase Storage com ?download=... (CORS aberto)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName,    setFileName]    = useState('minha-foto.jpg');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloaded,  setDownloaded]  = useState(false);
  const [dlError,     setDlError]     = useState('');

  useEffect(() => {
    if (!orderId || !photoId) {
      setError('Link inválido.');
      setLoading(false);
      return;
    }

    fetch(`${BASE}/orders/${orderId}/photos/${photoId}/signed-url`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setViewUrl(data.viewUrl);
        setDownloadUrl(data.downloadUrl ?? data.viewUrl);
        if (data.fileName) setFileName(data.fileName);
      })
      .catch(err => setError(err.message ?? 'Não foi possível carregar a foto.'))
      .finally(() => setLoading(false));
  }, [orderId, photoId]);

  /**
   * Download confiável para todos os browsers (desktop e mobile, incluindo iOS Safari).
   *
   * FLUXO:
   *   1. fetch(downloadUrl)  → downloadUrl é uma signed URL do Supabase Storage.
   *      O Supabase Storage retorna Access-Control-Allow-Origin: * em todas as
   *      respostas de signed URLs, então o fetch cross-origin funciona de qualquer
   *      domínio (figma.site, localhost, produção, etc.).
   *
   *   2. response.blob()  → o arquivo vira um Blob local no browser.
   *
   *   3. URL.createObjectURL(blob)  → gera uma URL blob:// que é SEMPRE same-origin
   *      com a página atual, independente de onde a foto veio.
   *
   *   4. <a href={blobUrl} download={fileName}>.click()  → como é same-origin,
   *      o atributo `download` É respeitado em TODOS os browsers, inclusive iOS
   *      Safari 11.3+ e Chrome mobile.
   *
   * POR QUE NÃO window.location.href = signedUrl?
   *   → iOS Safari abre imagens (.jpg/.png) no próprio browser em vez de baixar,
   *     ignorando Content-Disposition: attachment para tipos de imagem.
   *
   * POR QUE NÃO <a href={signedUrl} download>?
   *   → O atributo `download` é ignorado em URLs cross-origin (specs do HTML5).
   *     blob:// resolve isso por ser same-origin por definição.
   */
  const handleDownload = async () => {
    if (!downloadUrl || downloading) return;
    setDownloading(true);
    setDlError('');

    try {
      // Busca o arquivo diretamente do Supabase Storage (CORS * configurado)
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error(`Erro ao buscar foto: HTTP ${res.status}`);

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Disparo do download via anchor same-origin — funciona em todos os browsers
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Libera a memória após 30s (garante que o download iniciou)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);

      setDownloaded(true);
    } catch (err: any) {
      console.error('[MinhaFoto] Erro no download:', err);
      // Fallback: abre a URL em nova aba; no Android costuma iniciar o download
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
        setDownloaded(true);
      } else {
        setDlError('Não foi possível baixar. Tente novamente.');
      }
    } finally {
      setDownloading(false);
    }
  };

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
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                {error}
              </p>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
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
                <p className="text-center text-xs" style={{ color: '#f87171', lineHeight: 1.5 }}>
                  {dlError}
                </p>
              )}

              {/* Dica pós-download (especialmente útil para iOS) */}
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
