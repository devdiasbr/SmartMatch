/**
 * TourFooterSVG — SVG fiel ao rodapé da imagem de referência do Tour Palmeiras.
 * O quadrado branco à direita serve de placeholder: o QR Code individual
 * de cada foto é renderizado sobre ele (foreignObject em React, <image> no print).
 */
import { QRCodeSVG } from 'qrcode.react';

// Caixa exata onde o QR code deve ser posicionado (coordenadas do viewBox 1200×140)
export const QR_BOX = { x: 1055, y: 7, size: 126 } as const;

interface TourFooterSVGProps {
  /** URL de download individual — se omitido mostra só o placeholder branco */
  downloadUrl?: string;
  /** Classe CSS extra na tag <svg> */
  className?: string;
  style?: React.CSSProperties;
}

export function TourFooterSVG({ downloadUrl, className = '', style }: TourFooterSVGProps) {
  // Ângulos dos dentes do "O" estilo roda/pneu
  const gearAngles = Array.from({ length: 12 }, (_, i) => (i * 30 * Math.PI) / 180);

  return (
    <svg
      viewBox="0 0 1200 140"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', width: '100%', ...style }}
      className={className}
    >
      <defs>
        {/* Arco superior para o texto "PALMEIRAS" */}
        <path id="palm-top" d="M 404 70 A 46 46 0 0 1 496 70" />
      </defs>

      {/* ── Fundo verde escuro ── */}
      <rect width="1200" height="140" fill="#002A14" />

      {/* ══════════════════════════════════════════
          TOUR — letras desenhadas em SVG
      ══════════════════════════════════════════ */}

      {/* T */}
      <rect x="40"  y="30" width="92"  height="14" rx="2" fill="#00A550" />
      <rect x="79"  y="30" width="14"  height="82" rx="2" fill="#00A550" />

      {/* O — anel grosso + 12 dentes radiais */}
      <circle cx="196" cy="71" r="33" fill="none" stroke="#00A550" strokeWidth="12" />
      {gearAngles.map((rad, i) => (
        <line
          key={i}
          x1={196 + 43 * Math.cos(rad)} y1={71 + 43 * Math.sin(rad)}
          x2={196 + 54 * Math.cos(rad)} y2={71 + 54 * Math.sin(rad)}
          stroke="#00A550" strokeWidth="7" strokeLinecap="round"
        />
      ))}

      {/* U */}
      <rect x="264" y="30" width="14" height="64" rx="2" fill="#00A550" />
      <rect x="330" y="30" width="14" height="64" rx="2" fill="#00A550" />
      <path
        d="M264 94 Q264 112 272 112 L336 112 Q344 112 344 94"
        fill="none" stroke="#00A550" strokeWidth="14" strokeLinecap="round"
      />

      {/* R */}
      <rect x="368" y="30" width="14" height="82" rx="2" fill="#00A550" />
      {/* Barriga do R */}
      <path
        d="M368 30 L400 30 Q428 30 428 52 Q428 74 400 74 L368 74"
        fill="#00A550"
      />
      {/* Perna diagonal do R */}
      <line x1="400" y1="76" x2="438" y2="112" stroke="#00A550" strokeWidth="14" strokeLinecap="round" />

      {/* ══════════════════════════════════════════
          Separador vertical
      ══════════════════════════════════════════ */}
      <line x1="468" y1="16" x2="468" y2="124" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

      {/* ══════════════════════════════════════════
          PALMEIRAS — escudo circular estilizado
      ══════════════════════════════════════════ */}
      {/* Círculo externo */}
      <circle cx="450" cy="70" r="52" fill="#00A550" />
      {/* Anel branco fino */}
      <circle cx="450" cy="70" r="49" fill="none" stroke="white" strokeWidth="2" />
      {/* Anel interno dourado/verde-claro — estrela */}
      <circle cx="450" cy="70" r="45" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      {/* Interior escuro */}
      <circle cx="450" cy="70" r="40" fill="#002A14" />

      {/* Escudo dentro do círculo */}
      <path
        d="M450 28 L474 38 L480 58 Q480 80 450 94 Q420 80 420 58 L426 38 Z"
        fill="#00A550"
      />
      {/* Estrela no topo do escudo */}
      <polygon
        points="450,34 452.5,41 460,41 454,46 456.5,53 450,48.5 443.5,53 446,46 440,41 447.5,41"
        fill="#002A14"
      />
      {/* Palmeira simplificada (3 folhas + tronco) */}
      <rect x="448" y="62" width="4" height="22" rx="2" fill="#002A14" />
      <ellipse cx="450" cy="60" rx="10" ry="6" fill="#002A14" transform="rotate(-25,450,60)" />
      <ellipse cx="450" cy="60" rx="10" ry="6" fill="#002A14" transform="rotate(25,450,60)" />
      <ellipse cx="450" cy="57" rx="7" ry="5"  fill="#002A14" />

      {/* Texto "PALMEIRAS" curvo em arco */}
      <text fill="white" fontSize="8" fontFamily="Arial, sans-serif" fontWeight="700" letterSpacing="3.5">
        <textPath href="#palm-top" startOffset="5%">PALMEIRAS</textPath>
      </text>

      {/* ══════════════════════════════════════════
          Separador vertical
      ══════════════════════════════════════════ */}
      <line x1="520" y1="16" x2="520" y2="124" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

      {/* ══════════════════════════════════════════
          ALLIANZ — logo mark + texto
      ══════════════════════════════════════════ */}
      {/* Logo mark Allianz: 3 ovals brancos sobrepostos em triângulo */}
      <g transform="translate(540, 44)">
        <ellipse cx="22" cy="12" rx="14" ry="9"  fill="none" stroke="white" strokeWidth="4.5" />
        <ellipse cx="10" cy="34" rx="14" ry="9"  fill="none" stroke="white" strokeWidth="4.5" />
        <ellipse cx="34" cy="34" rx="14" ry="9"  fill="none" stroke="white" strokeWidth="4.5" />
      </g>

      {/* "Allianz" */}
      <text
        x="608" y="65"
        fill="white"
        fontSize="30"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        letterSpacing="-0.5"
      >Allianz</text>

      {/* Divisor entre Allianz e Parque */}
      <line x1="728" y1="36" x2="728" y2="100" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />

      {/* "Parque" */}
      <text
        x="740" y="65"
        fill="white"
        fontSize="30"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        letterSpacing="-0.5"
      >Parque</text>

      {/* ── Subtítulo ── */}
      <text
        x="608" y="90"
        fill="rgba(255,255,255,0.55)"
        fontSize="11"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="400"
        letterSpacing="1"
      >ESTÁDIO OFICIAL DO PALMEIRAS</text>

      {/* ══════════════════════════════════════════
          QR CODE — quadrado branco placeholder
      ══════════════════════════════════════════ */}
      {/* Fundo branco */}
      <rect
        x={QR_BOX.x} y={QR_BOX.y}
        width={QR_BOX.size} height={QR_BOX.size}
        fill="white" rx="6"
      />

      {/* Se URL fornecida → QRCode via foreignObject (React) */}
      {downloadUrl && (
        <foreignObject
          x={QR_BOX.x + 3} y={QR_BOX.y + 3}
          width={QR_BOX.size - 6} height={QR_BOX.size - 6}
        >
          <QRCodeSVG
            value={downloadUrl}
            size={QR_BOX.size - 6}
            level="H"
            fgColor="#002A14"
            bgColor="#ffffff"
            includeMargin={false}
          />
        </foreignObject>
      )}
    </svg>
  );
}

/**
 * Retorna o SVG como string HTML para uso em janelas de impressão.
 * O QR code é inserido via <image> com a QR API pública.
 */
export function getTourFooterHtml(downloadUrl: string): string {
  const gearAngles = Array.from({ length: 12 }, (_, i) => (i * 30 * Math.PI) / 180);
  const gearLines = gearAngles
    .map(
      (rad) =>
        `<line x1="${(196 + 43 * Math.cos(rad)).toFixed(2)}" y1="${(71 + 43 * Math.sin(rad)).toFixed(2)}" ` +
        `x2="${(196 + 54 * Math.cos(rad)).toFixed(2)}" y2="${(71 + 54 * Math.sin(rad)).toFixed(2)}" ` +
        `stroke="#00A550" stroke-width="7" stroke-linecap="round"/>`
    )
    .join('\n');

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(downloadUrl)}&color=002A14&bgcolor=ffffff`;

  return `
<svg viewBox="0 0 1200 140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="display:block;width:100%">
  <defs>
    <path id="palm-top" d="M 404 70 A 46 46 0 0 1 496 70"/>
  </defs>
  <rect width="1200" height="140" fill="#002A14"/>
  <!-- T -->
  <rect x="40" y="30" width="92" height="14" rx="2" fill="#00A550"/>
  <rect x="79" y="30" width="14" height="82" rx="2" fill="#00A550"/>
  <!-- O -->
  <circle cx="196" cy="71" r="33" fill="none" stroke="#00A550" stroke-width="12"/>
  ${gearLines}
  <!-- U -->
  <rect x="264" y="30" width="14" height="64" rx="2" fill="#00A550"/>
  <rect x="330" y="30" width="14" height="64" rx="2" fill="#00A550"/>
  <path d="M264 94 Q264 112 272 112 L336 112 Q344 112 344 94" fill="none" stroke="#00A550" stroke-width="14" stroke-linecap="round"/>
  <!-- R -->
  <rect x="368" y="30" width="14" height="82" rx="2" fill="#00A550"/>
  <path d="M368 30 L400 30 Q428 30 428 52 Q428 74 400 74 L368 74" fill="#00A550"/>
  <line x1="400" y1="76" x2="438" y2="112" stroke="#00A550" stroke-width="14" stroke-linecap="round"/>
  <!-- Separador -->
  <line x1="468" y1="16" x2="468" y2="124" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  <!-- Badge Palmeiras -->
  <circle cx="450" cy="70" r="52" fill="#00A550"/>
  <circle cx="450" cy="70" r="49" fill="none" stroke="white" stroke-width="2"/>
  <circle cx="450" cy="70" r="40" fill="#002A14"/>
  <path d="M450 28 L474 38 L480 58 Q480 80 450 94 Q420 80 420 58 L426 38 Z" fill="#00A550"/>
  <polygon points="450,34 452.5,41 460,41 454,46 456.5,53 450,48.5 443.5,53 446,46 440,41 447.5,41" fill="#002A14"/>
  <rect x="448" y="62" width="4" height="22" rx="2" fill="#002A14"/>
  <ellipse cx="450" cy="60" rx="10" ry="6" fill="#002A14" transform="rotate(-25,450,60)"/>
  <ellipse cx="450" cy="60" rx="10" ry="6" fill="#002A14" transform="rotate(25,450,60)"/>
  <ellipse cx="450" cy="57" rx="7" ry="5" fill="#002A14"/>
  <text fill="white" font-size="8" font-family="Arial,sans-serif" font-weight="700" letter-spacing="3.5">
    <textPath href="#palm-top" startOffset="5%">PALMEIRAS</textPath>
  </text>
  <!-- Separador -->
  <line x1="520" y1="16" x2="520" y2="124" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  <!-- Allianz logo mark -->
  <g transform="translate(540,44)">
    <ellipse cx="22" cy="12" rx="14" ry="9" fill="none" stroke="white" stroke-width="4.5"/>
    <ellipse cx="10" cy="34" rx="14" ry="9" fill="none" stroke="white" stroke-width="4.5"/>
    <ellipse cx="34" cy="34" rx="14" ry="9" fill="none" stroke="white" stroke-width="4.5"/>
  </g>
  <text x="608" y="65" fill="white" font-size="30" font-family="Arial,Helvetica,sans-serif" font-weight="700" letter-spacing="-0.5">Allianz</text>
  <line x1="728" y1="36" x2="728" y2="100" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
  <text x="740" y="65" fill="white" font-size="30" font-family="Arial,Helvetica,sans-serif" font-weight="700" letter-spacing="-0.5">Parque</text>
  <text x="608" y="90" fill="rgba(255,255,255,0.55)" font-size="11" font-family="Arial,Helvetica,sans-serif" letter-spacing="1">ESTÁDIO OFICIAL DO PALMEIRAS</text>
  <!-- QR placeholder branco -->
  <rect x="${QR_BOX.x}" y="${QR_BOX.y}" width="${QR_BOX.size}" height="${QR_BOX.size}" fill="white" rx="6"/>
  <!-- QR Code via API pública -->
  <image x="${QR_BOX.x + 3}" y="${QR_BOX.y + 3}" width="${QR_BOX.size - 6}" height="${QR_BOX.size - 6}"
    href="${qrUrl}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
}
