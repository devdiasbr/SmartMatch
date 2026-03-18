import { Camera } from 'lucide-react';
import { Link } from 'react-router';
import { useTheme } from './ThemeProvider';
import { useBranding } from '../contexts/BrandingContext';

export function Footer() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { branding } = useBranding();

  const mutedColor = isDark ? 'rgba(255,255,255,0.35)' : '#71717A';
  const linkHover  = isDark ? 'rgba(255,255,255,0.6)'  : '#09090B';

  const links = [
    { label: 'Políticas', to: '/politicas' },
    { label: 'Suporte', to: '/suporte' },
    { label: 'Contato', to: '/contato' },
  ];

  return (
    <footer
      style={{
        background: isDark ? '#0A0A12' : '#F0F0F5',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(9,9,11,0.08)'}`,
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.appName} className="h-7 object-contain max-w-[140px]" />
            ) : (
              <>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #166534, #15803d)' }}
                >
                  <Camera className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </div>
                <span
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '1rem' }}
                  className={isDark ? 'text-white' : 'text-[#09090B]'}
                >
                  Smart<span style={{ color: isDark ? '#86efac' : '#166534' }}>Match</span>
                </span>
              </>
            )}
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-6">
            {links.map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="text-sm transition-colors duration-150 hover:opacity-100"
                style={{ color: mutedColor, fontWeight: 500 }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = linkHover; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = mutedColor; }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.22)' : '#A1A1AA' }}>
            &copy; {new Date().getFullYear()} SmartMatch. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}