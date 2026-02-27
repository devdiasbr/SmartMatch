import { QRCodeSVG } from 'qrcode.react';

// ── Template definitions ───────────────────────────────────────────────────────

export type FooterTemplate = 'verde' | 'branco' | 'premium';

export const FOOTER_TEMPLATES: Record<FooterTemplate, {
  label: string;
  desc: string;
  swatch: string;      // CSS background for picker thumbnail
  accentColor: string; // main accent colour for preview labels
  overlay: boolean;    // true = absolute on photo, false = block below
  barBg: string;
  tourColor: string;
  shieldBg: string;
  shieldBorder: string;
  shieldText: string;
  brandColor: string;
  borderTop?: string;
  qrFg: string;
}> = {
  verde: {
    label: 'Tour Verde',
    desc: 'Overlay verde transparente',
    swatch: 'linear-gradient(135deg, #003D17 0%, #006B2B 60%, #004A1C 100%)',
    accentColor: '#00E05A',
    overlay: true,
    barBg: 'linear-gradient(135deg, rgba(0,61,23,0.93) 0%, rgba(0,107,43,0.93) 60%, rgba(0,74,28,0.93) 100%)',
    tourColor: '#00E05A',
    shieldBg: '#006B2B',
    shieldBorder: '#00843D',
    shieldText: '#ffffff',
    brandColor: '#ffffff',
    qrFg: '#003D17',
  },
  branco: {
    label: 'Branco Clássico',
    desc: 'Barra branca abaixo da foto',
    swatch: '#ffffff',
    accentColor: '#006B2B',
    overlay: false,
    barBg: '#ffffff',
    tourColor: '#006B2B',
    shieldBg: '#006B2B',
    shieldBorder: '#00843D',
    shieldText: '#ffffff',
    brandColor: '#003D17',
    borderTop: '3px solid #006B2B',
    qrFg: '#003D17',
  },
  premium: {
    label: 'Premium Escuro',
    desc: 'Overlay preto com neon verde',
    swatch: 'linear-gradient(135deg, #08080E 0%, #12121C 60%, #0A0A14 100%)',
    accentColor: '#00FF7F',
    overlay: true,
    barBg: 'linear-gradient(135deg, rgba(8,8,14,0.96) 0%, rgba(18,18,28,0.96) 100%)',
    tourColor: '#00FF7F',
    shieldBg: 'rgba(0,255,127,0.12)',
    shieldBorder: 'rgba(0,255,127,0.5)',
    shieldText: '#00FF7F',
    brandColor: 'rgba(255,255,255,0.85)',
    borderTop: '2px solid rgba(0,255,127,0.35)',
    qrFg: '#08080E',
  },
};

// ── PhotoFooter ────────────────────────────────────────────────────────────────

interface PhotoFooterProps {
  downloadUrl?: string;
  className?: string;
  style?: React.CSSProperties;
  qrSize?: number;
  compact?: boolean;
  template?: FooterTemplate;
}

export function PhotoFooter({
  downloadUrl = '#',
  className = '',
  style,
  qrSize = 72,
  compact = false,
  template = 'verde',
}: PhotoFooterProps) {
  const t = FOOTER_TEMPLATES[template];
  const py = compact ? 'py-2 px-3' : 'py-4 px-5';
  const fontSize = compact ? '0.65rem' : '0.9rem';
  const tourFontSize = compact ? 16 : 28;
  const shieldSize = compact ? 28 : 44;
  const effectiveQr = compact ? Math.max(36, qrSize * 0.6) : qrSize;

  return (
    <div
      className={`w-full flex items-center justify-between ${py} ${className}`}
      style={{
        background: t.barBg,
        borderTop: t.borderTop,
        minHeight: compact ? 40 : 72,
        ...style,
      }}
    >
      {/* TOUR */}
      <span
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 900,
          fontSize: `${tourFontSize}px`,
          color: t.tourColor,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        TOUR
      </span>

      {/* Shield */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: shieldSize,
          height: shieldSize,
          borderRadius: '50%',
          background: t.shieldBg,
          border: `2px solid ${t.shieldBorder}`,
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 900,
          fontSize: shieldSize * 0.32,
          color: t.shieldText,
        }}
      >
        P
      </div>

      {/* Allianz Parque */}
      <span
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 800,
          fontSize,
          color: t.brandColor,
          letterSpacing: '-0.02em',
          flexShrink: 0,
        }}
      >
        Allianz Parque
      </span>

      {/* QR Code */}
      <div
        className="rounded-lg overflow-hidden flex-shrink-0"
        style={{ background: '#fff', padding: compact ? 3 : 5 }}
      >
        <QRCodeSVG
          value={downloadUrl}
          size={effectiveQr}
          level="H"
          fgColor={t.qrFg}
          bgColor="#ffffff"
          includeMargin={false}
        />
      </div>
    </div>
  );
}

// ── PhotoWithFooter ────────────────────────────────────────────────────────────

interface PhotoWithFooterProps {
  src: string;
  alt?: string;
  downloadUrl?: string;
  className?: string;
  compact?: boolean;
  template?: FooterTemplate;
}

export function PhotoWithFooter({
  src,
  alt = '',
  downloadUrl = '#',
  className = '',
  compact = false,
  template = 'verde',
}: PhotoWithFooterProps) {
  const t = FOOTER_TEMPLATES[template];

  if (t.overlay) {
    // Overlay mode: footer floats absolutely on the bottom of the image
    return (
      <div
        className={`relative overflow-hidden rounded-xl ${className}`}
        style={{ background: '#000' }}
      >
        <img src={src} alt={alt} className="w-full object-cover block" />
        <div className="absolute bottom-0 left-0 right-0">
          <PhotoFooter
            downloadUrl={downloadUrl}
            compact={compact}
            template={template}
          />
        </div>
      </div>
    );
  }

  // Block mode: footer sits below the image
  return (
    <div className={`overflow-hidden rounded-xl ${className}`} style={{ background: '#fff' }}>
      <img src={src} alt={alt} className="w-full object-cover block" />
      <PhotoFooter
        downloadUrl={downloadUrl}
        compact={compact}
        template={template}
      />
    </div>
  );
}
