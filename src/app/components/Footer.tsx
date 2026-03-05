import { Camera, Instagram, Twitter, Youtube, Zap } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function Footer() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <footer
      className="relative transition-colors duration-300"
      style={{
        background: isDark ? '#05050A' : '#F4F4F5',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(9,9,11,0.08)'}`,
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 gap-12">
          {/* Brand */}
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: isDark ? 'linear-gradient(135deg, #166534, #15803d)' : 'linear-gradient(135deg, #166534, #15803D)' }}
              >
                <Camera className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span
                style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '1.2rem' }}
                className={isDark ? 'text-white' : 'text-[#09090B]'}
              >
                Smart<span style={{ color: isDark ? '#86efac' : '#166534' }}>Match</span>
              </span>
            </div>
            <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#71717A', lineHeight: 1.7 }}>
              Reconhecimento facial que encontra suas fotos em segundos. Tecnologia de ponta para eternizar seus momentos.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {[Instagram, Twitter, Youtube].map((Icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(9,9,11,0.06)',
                    color: isDark ? 'rgba(255,255,255,0.45)' : '#71717A',
                  }}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4 mt-16 pt-8"
          style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(9,9,11,0.07)'}` }}
        >
          <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.22)' : '#A1A1AA' }}>
            &copy; 2025 Smart Match. Todos os direitos reservados.
          </p>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(9,9,11,0.04)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.08)'}`,
            }}
          >
            <Zap className="w-3 h-3" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#A1A1AA' }} />
            <span className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#A1A1AA' }}>
              Powered by AI &middot; 99.1% uptime
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}