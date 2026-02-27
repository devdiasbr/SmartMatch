import { useEffect } from 'react';

interface ProtectedImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  watermark?: boolean;
  watermarkText?: string;
  watermarkProducer?: string;
  watermarkPhotoTag?: string;
  watermarkTour?: string;
  onClick?: (e: React.MouseEvent) => void;
}

let printStyleInjected = false;
function injectPrintBlocker(brandText: string) {
  if (printStyleInjected) return;
  printStyleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      .ef-protected-container img {
        filter: brightness(0) !important;
        -webkit-filter: brightness(0) !important;
      }
      .ef-protected-container .ef-watermark { display: none !important; }
      .ef-protected-container::after {
        content: 'Conteúdo protegido — ${brandText}';
        display: flex; align-items: center; justify-content: center;
        position: absolute; inset: 0;
        color: rgba(255,255,255,0.35);
        font-size: 0.9rem; font-weight: 700;
        letter-spacing: 0.1em;
        font-family: 'Montserrat', sans-serif;
        z-index: 10; pointer-events: none;
      }
    }
  `;
  document.head.appendChild(style);
}

// Large enough to guarantee full coverage at -28° rotation regardless of container size
const ROWS = 50;
const COLS = 24;

export function ProtectedImage({
  src,
  alt = '',
  className = '',
  style,
  watermark = true,
  watermarkText = 'SMART MATCH',
  watermarkProducer = 'EDU SANTANA PRODUÇÕES',
  watermarkPhotoTag = '◆ FOTO PROTEGIDA ◆',
  watermarkTour = '© TOUR PALMEIRAS',
  onClick,
}: ProtectedImageProps) {
  useEffect(() => {
    injectPrintBlocker(watermarkText);
  }, [watermarkText]);

  const handleContextMenu = (e: React.MouseEvent) => { e.preventDefault(); return false; };

  // 5 row variants — dynamic, cycle through the tiled grid
  const rowDefs = [
    { text: watermarkText,    size: '0.95rem', weight: 900, color: 'rgba(255,255,255,0.40)', shadow: '0 1px 6px rgba(0,0,0,0.7)' },
    { text: watermarkProducer, size: '0.62rem', weight: 700, color: 'rgba(0,255,127,0.38)',  shadow: '0 1px 5px rgba(0,0,0,0.65)' },
    { text: watermarkPhotoTag, size: '0.58rem', weight: 700, color: 'rgba(255,255,255,0.22)', shadow: '0 1px 4px rgba(0,0,0,0.6)' },
    { text: watermarkTour,    size: '0.62rem', weight: 700, color: 'rgba(0,212,255,0.28)',  shadow: '0 1px 5px rgba(0,0,0,0.65)' },
    { text: watermarkText,    size: '0.95rem', weight: 900, color: 'rgba(0,255,127,0.22)',  shadow: '0 1px 6px rgba(0,0,0,0.7)' },
  ];

  return (
    <div
      className={`ef-protected-container relative overflow-hidden ${className}`}
      style={{ ...style, userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' as any }}
      onContextMenu={handleContextMenu}
      onClick={onClick}
    >
      {/* Image */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        draggable={false}
        loading="lazy"
        onDragStart={(e) => e.preventDefault()}
        style={{ pointerEvents: 'none', display: 'block' }}
      />

      {/* Transparent right-click blocker */}
      <div
        className="absolute inset-0"
        style={{ background: 'transparent', zIndex: 2 }}
        onContextMenu={handleContextMenu}
      />

      {/* ── Watermark ── */}
      {watermark && (
        <div
          className="ef-watermark absolute inset-0 overflow-hidden"
          style={{ zIndex: 3, pointerEvents: 'none' }}
        >
          {/* ── Full-coverage rotated grid ──
              Positioned at -150%/-150% with 400% width/height so that after
              rotating -28° the entire container is always covered. */}
          <div
            style={{
              position: 'absolute',
              top: '-150%',
              left: '-150%',
              width: '400%',
              height: '400%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transform: 'rotate(-28deg)',
              transformOrigin: 'center center',
            }}
          >
            {Array.from({ length: ROWS }).map((_, row) => {
              const def = rowDefs[row % rowDefs.length];
              // Brick-pattern offset: stagger every other row by half a cell
              const shift = row % 2 === 0 ? 0 : -100;
              return (
                <div
                  key={row}
                  style={{
                    display: 'flex',
                    gap: '32px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    marginLeft: shift,
                  }}
                >
                  {Array.from({ length: COLS }).map((_, col) => (
                    <span
                      key={col}
                      style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: def.weight,
                        fontSize: def.size,
                        color: def.color,
                        letterSpacing: '0.18em',
                        textShadow: def.shadow,
                        textTransform: 'uppercase' as const,
                        flexShrink: 0,
                      }}
                    >
                      {def.text}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>

          {/* ── Center ghost logo ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0,
            }}
          >
            <span style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(2rem, 7vw, 4rem)',
              color: 'rgba(255,255,255,0.08)',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              textShadow: '0 2px 16px rgba(0,0,0,0.5)',
              lineHeight: 1,
            }}>EVENT</span>
            <span style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(2rem, 7vw, 4rem)',
              color: 'rgba(0,255,127,0.08)',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              textShadow: '0 2px 16px rgba(0,0,0,0.5)',
              lineHeight: 1,
            }}>MATCH</span>
            <span style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(0.45rem, 1.2vw, 0.65rem)',
              color: 'rgba(0,255,127,0.07)',
              letterSpacing: '0.45em',
              textTransform: 'uppercase',
              marginTop: 10,
            }}>{watermarkProducer}</span>
          </div>

          {/* ── Corner badges (alternating white / green) ── */}
          {([
            { top: 8,    left:  8,  color: 'rgba(255,255,255,0.40)' },
            { top: 8,    right: 8,  color: 'rgba(0,255,127,0.40)'  },
            { bottom: 8, left:  8,  color: 'rgba(0,255,127,0.40)'  },
            { bottom: 8, right: 8,  color: 'rgba(255,255,255,0.40)' },
          ] as (React.CSSProperties & { color: string })[]).map(({ color, ...pos }, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                ...pos,
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 800,
                fontSize: '0.52rem',
                color,
                letterSpacing: '0.18em',
                textShadow: '0 1px 5px rgba(0,0,0,0.8)',
                textTransform: 'uppercase',
              }}
            >
              © {watermarkText}
            </span>
          ))}

          {/* ── Subtle scan lines for depth ── */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)',
          }} />
        </div>
      )}
    </div>
  );
}