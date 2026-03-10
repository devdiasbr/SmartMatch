import { Link } from 'react-router';
import { useTheme } from './ThemeProvider';
import { useState, useEffect } from 'react';

export interface TabNavItem {
  key: string;
  label: string;
  icon?: React.ElementType;
  badge?: number;
  to?: string; // se passado, renderiza como <Link>
}

interface TabNavProps {
  tabs: TabNavItem[];
  active: string;
  onChange?: (key: string) => void;
  /** true = cada tab ocupa espaço igual (flex-1); false = conteúdo define o tamanho */
  fullWidth?: boolean;
  className?: string;
}

export function TabNav({
  tabs,
  active,
  onChange,
  fullWidth = false,
  className = '',
}: TabNavProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Responsive: only icons on mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener('change', handler as any);
    return () => mq.removeEventListener('change', handler as any);
  }, []);

  /* ─── tokens ─── */
  const containerBg    = isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF';
  const containerBorder= isDark ? 'rgba(255,255,255,0.07)' : 'rgba(9,9,11,0.10)';
  const activeBg       = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(22,101,52,0.09)';
  const activeColor    = isDark ? '#ffffff'                 : '#166534';
  const inactiveColor  = isDark ? 'rgba(255,255,255,0.42)' : '#71717A';
  const dividerColor   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(9,9,11,0.07)';
  const badgeActiveBg  = isDark ? 'rgba(134,239,172,0.18)' : 'rgba(22,101,52,0.1)';
  const badgeActiveClr = isDark ? '#86efac'                : '#166534';
  const badgeIdleBg    = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(9,9,11,0.06)';

  const sharedStyle = (isActive: boolean, isLast: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isMobile ? '0' : '0.5rem',
    paddingTop: isMobile ? '0.75rem' : '0.875rem',
    paddingBottom: isMobile ? '0.75rem' : '0.875rem',
    paddingLeft: fullWidth ? undefined : isMobile ? '0.75rem' : '1.25rem',
    paddingRight: fullWidth ? undefined : isMobile ? '0.75rem' : '1.25rem',
    flex: fullWidth || isMobile ? '1' : undefined,
    fontSize: isMobile ? '0.75rem' : '0.875rem',
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: isActive ? 700 : 500,
    letterSpacing: '-0.01em',
    color: isActive ? activeColor : inactiveColor,
    background: isActive ? activeBg : 'transparent',
    borderRight: isLast ? 'none' : `1px solid ${dividerColor}`,
    transition: 'background 0.18s, color 0.18s',
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  });

  return (
    <div
      className={`flex rounded-2xl overflow-hidden ${fullWidth ? '' : isMobile ? 'w-full' : 'mx-auto w-fit'} ${className}`}
      style={{
        background: containerBg,
        border: `1px solid ${containerBorder}`,
        width: fullWidth ? '100%' : undefined,
        boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {tabs.map((tab, i) => {
        const isActive = active === tab.key;
        const isLast   = i === tabs.length - 1;
        const Icon     = tab.icon;
        const style    = sharedStyle(isActive, isLast);

        const inner = (
          <>
            {Icon && <Icon style={{ width: isMobile ? 18 : 16, height: isMobile ? 18 : 16, flexShrink: 0 }} />}
            {!isMobile && <span>{tab.label}</span>}
            {!isMobile && tab.badge !== undefined && tab.badge > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 20,
                  height: 20,
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 700,
                  paddingLeft: 4,
                  paddingRight: 4,
                  background: isActive ? badgeActiveBg : badgeIdleBg,
                  color: isActive ? badgeActiveClr : inactiveColor,
                }}
              >
                {tab.badge}
              </span>
            )}
          </>
        );

        if (tab.to) {
          return (
            <Link key={tab.key} to={tab.to} style={style}>
              {inner}
            </Link>
          );
        }

        return (
          <button
            key={tab.key}
            onClick={() => onChange?.(tab.key)}
            style={style}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}