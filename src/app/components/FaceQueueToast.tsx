/**
 * FaceQueueToast — Indicador flutuante persistente da fila de embedding facial.
 * Renderizado no Root.tsx: aparece em qualquer página enquanto há processamento.
 */
import { motion, AnimatePresence } from 'motion/react';
import { Scan, CheckCircle2 } from 'lucide-react';
import { useFaceQueue } from '../lib/faceQueue';
import { useTheme } from './ThemeProvider';

export function FaceQueueToast() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const q = useFaceQueue();

  // Visível enquanto há trabalho pendente OU ativo OU logo após terminar (done>0)
  const visible = q.active || q.pending > 0 || (q.done > 0 && q.total > 0);
  const finished = !q.active && q.pending === 0 && q.done > 0;

  const green   = isDark ? '#86efac' : '#166534';
  const cardBg  = isDark ? 'rgba(8,8,14,0.92)'   : 'rgba(255,255,255,0.96)';
  const border  = isDark ? 'rgba(134,239,172,0.18)' : 'rgba(22,101,52,0.18)';
  const text    = isDark ? '#fff' : '#09090B';
  const muted   = isDark ? 'rgba(255,255,255,0.45)' : '#71717A';

  const pct = q.total > 0 ? (q.done / q.total) * 100 : 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="face-queue-toast"
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
          style={{
            background: cardBg,
            border: `1px solid ${border}`,
            backdropFilter: 'blur(20px)',
            boxShadow: isDark
              ? '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(134,239,172,0.06)'
              : '0 8px 40px rgba(0,0,0,0.12)',
            minWidth: 240,
          }}
        >
          {/* Ícone */}
          <div
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: finished ? 'rgba(34,197,94,0.1)' : isDark ? 'rgba(134,239,172,0.08)' : 'rgba(22,101,52,0.07)' }}
          >
            {finished ? (
              <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e' }} />
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
              >
                <Scan className="w-4 h-4" style={{ color: green }} />
              </motion.div>
            )}
          </div>

          {/* Texto + barra */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold leading-tight" style={{ color: text }}>
              {finished ? 'Reconhecimento concluído' : 'Reconhecimento facial'}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: muted }}>
              {finished
                ? `${q.done} foto${q.done !== 1 ? 's' : ''} processada${q.done !== 1 ? 's' : ''}${q.errors > 0 ? ` · ${q.errors} erro${q.errors !== 1 ? 's' : ''}` : ''}`
                : q.active
                  ? `${q.done}/${q.total} fotos · ${q.pending} na fila`
                  : `${q.pending} na fila…`
              }
            </p>

            {/* Barra de progresso */}
            {!finished && q.total > 0 && (
              <div
                className="mt-1.5 h-1 rounded-full overflow-hidden"
                style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${green}, #7dd3fc)` }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}