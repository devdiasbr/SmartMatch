import { Link } from 'react-router';
import { useTheme } from './ThemeProvider';

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

  /* ─── tokens ─── */
  const containerBg    = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)';
  const containerBorder= isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,107,43,0.1)';
  const activeBg       = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,107,43,0.1)';
  const activeColor    = isDark ? '#ffffff'                 : '#006B2B';
  const inactiveColor  = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,40,20,0.45)';
  const dividerColor   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,107,43,0.08)';
  const badgeActiveBg  = isDark ? 'rgba(134,239,172,0.18)' : 'rgba(0,107,43,0.12)';
  const badgeActiveClr = isDark ? '#86efac'                : '#006B2B';
  const badgeIdleBg    = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  const sharedStyle = (isActive: boolean, isLast: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    paddingTop: '0.875rem',
    paddingBottom: '0.875rem',
    paddingLeft: fullWidth ? undefined : '1.25rem',
    paddingRight: fullWidth ? undefined : '1.25rem',
    flex: fullWidth ? '1' : undefined,
    fontSize: '0.875rem',
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
      className={`flex rounded-2xl overflow-hidden ${fullWidth ? '' : 'ml-auto w-fit'} ${className}`}
      style={{
        background: containerBg,
        border: `1px solid ${containerBorder}`,
        width: fullWidth ? '100%' : undefined,
      }}
    >
      {tabs.map((tab, i) => {
        const isActive = active === tab.key;
        const isLast   = i === tabs.length - 1;
        const Icon     = tab.icon;
        const style    = sharedStyle(isActive, isLast);

        const inner = (
          <>
            {Icon && <Icon style={{ width: 16, height: 16, flexShrink: 0 }} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
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