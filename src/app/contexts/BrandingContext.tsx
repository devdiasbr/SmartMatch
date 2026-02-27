import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface BrandingConfig {
  appName: string;
  pageTitle: string;
  watermarkText: string;
  watermarkProducer: string;
  watermarkPhotoTag: string;
  watermarkTour: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  backgroundUrls: string[];
  ctaBgUrl: string | null;
  scannerImageUrl: string | null;
  hasLogo: boolean;
  hasFavicon: boolean;
  backgroundCount: number;
  updatedAt: string | null;
  // Venue / tour identity
  venueName: string;
  venueLocation: string;
  tourLabel: string;
  homeExclusiveText: string;
  // Home page content
  heroLine1: string;
  heroLine2: string;
  heroLine3: string;
  heroSubtitle: string;
  heroCTA: string;
  heroBadge: string;
  // Home CTA banner
  ctaTitle1: string;
  ctaTitle2: string;
  ctaSubtitle: string;
  ctaButton: string;
  // Events page content
  eventsHeroTitle: string;
  eventsHeroTitleAccent: string;
  eventsHeroSubtitle: string;
  eventsListTitle: string;
  // Session types
  eventSessionTypes: string[];
  // Background slideshow
  bgTransitionInterval: number; // seconds
}

export const DEFAULT_BRANDING: BrandingConfig = {
  appName: 'Smart Match',
  pageTitle: 'Smart Match – Tour Palmeiras',
  watermarkText: 'SMART MATCH',
  watermarkProducer: 'EDU SANTANA PRODUÇÕES',
  watermarkPhotoTag: '◆ FOTO PROTEGIDA ◆',
  watermarkTour: '© TOUR PALMEIRAS',
  logoUrl: null,
  faviconUrl: null,
  backgroundUrls: [],
  ctaBgUrl: null,
  scannerImageUrl: null,
  hasLogo: false,
  hasFavicon: false,
  backgroundCount: 0,
  updatedAt: null,
  // Venue
  venueName: 'Allianz Parque',
  venueLocation: 'São Paulo, SP',
  tourLabel: 'Tour',
  homeExclusiveText: 'Exclusivo Allianz Parque',
  // Home
  heroLine1: 'Você vibrou.',
  heroLine2: 'Você torceu.',
  heroLine3: 'Encontre-se.',
  heroSubtitle: 'Nossa IA varre milhares de fotos do Tour do Allianz Parque e localiza você em segundos. Compre apenas o que importa — os seus momentos.',
  heroCTA: 'Ver eventos',
  heroBadge: 'Allianz Parque · Tour Oficial do Palmeiras',
  ctaTitle1: 'Pronto para encontrar',
  ctaTitle2: 'seus momentos?',
  ctaSubtitle: 'Tire uma selfie e nossa IA encontra você em segundos entre milhares de fotos.',
  ctaButton: 'Ver eventos',
  // Events
  eventsHeroTitle: 'Reviva seus',
  eventsHeroTitleAccent: 'Momentos no Allianz',
  eventsHeroSubtitle: 'Busca com reconhecimento facial. Encontre suas fotos pelo data e horário do tour.',
  eventsListTitle: 'Tours Disponíveis',
  eventSessionTypes: ['Tour'],
  bgTransitionInterval: 5,
};

interface BrandingContextValue {
  branding: BrandingConfig;
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue>({
  branding: DEFAULT_BRANDING,
  loading: true,
  refreshBranding: async () => {},
});

function applyFavicon(url: string | null) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url ?? '/favicon.ico';
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const refreshBranding = useCallback(async () => {
    try {
      const data = await api.getPublicBranding();
      setBranding(data);
      document.title = data.pageTitle || DEFAULT_BRANDING.pageTitle;
      applyFavicon(data.faviconUrl);
    } catch {
      document.title = DEFAULT_BRANDING.pageTitle;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}