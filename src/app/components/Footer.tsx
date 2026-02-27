import { Link } from 'react-router';
import { Camera, Instagram, Twitter, Youtube, Zap } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function Footer() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <footer
      className="relative transition-colors duration-300"
      style={{
        background: isDark ? '#05050A' : '#DDEEE4',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,107,43,0.08)'}`,
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: isDark ? 'linear-gradient(135deg, #166534, #15803d)' : 'linear-gradient(135deg, #006B2B, #00843D)' }}
              >
                <Camera className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '1.2rem' }}
                className={isDark ? 'text-white' : 'text-[#0D2818]'}
              >
                Smart<span style={{ color: isDark ? '#86efac' : '#006B2B' }}>Match</span>
              </span>
            </div>
            <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(13,40,24,0.5)', lineHeight: 1.7 }}>
              Reconhecimento facial que encontra suas fotos em segundos. Tecnologia de ponta para eternizar seus momentos.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {[Instagram, Twitter, Youtube].map((Icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,107,43,0.08)',
                    color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,107,43,0.6)',
                  }}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          {[
            { title: 'Produto', links: ['Como funciona', 'Precos', 'Eventos', 'Para organizadores'] },
            { title: 'Suporte', links: ['Central de ajuda', 'Contato', 'Politica de privacidade', 'Termos de uso'] },
            { title: 'Empresa', links: ['Sobre nos', 'Blog', 'Parceiros', 'Carreiras'] },
          ].map((col) => (
            <div key={col.title}>
              <h4
                className="text-xs tracking-widest mb-4"
                style={{
                  color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(13,40,24,0.4)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                {col.title}
              </h4>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link
                      to="#"
                      className="text-sm transition-colors"
                      style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(13,40,24,0.55)' }}
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4 mt-16 pt-8"
          style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,107,43,0.08)'}` }}
        >
          <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(13,40,24,0.35)' }}>
            &copy; 2025 Smart Match. Todos os direitos reservados.
          </p>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,107,43,0.05)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,107,43,0.12)'}`,
            }}
          >
            <Zap className="w-3 h-3" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,107,43,0.6)' }} />
            <span className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,107,43,0.7)' }}>
              Powered by AI &middot; 99.1% uptime
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}