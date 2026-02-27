import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface BrandingConfig {
  appName: string;
  pageTitle: string;
  watermarkText: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  backgroundUrls: string[];
  hasLogo: boolean;
  hasFavicon: boolean;
  backgroundCount: number;
  updatedAt: string | null;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  appName: 'Smart Match',
  pageTitle: 'Smart Match – Tour Palmeiras',
  watermarkText: '© Smart Match',
  logoUrl: null,
  faviconUrl: null,
  backgroundUrls: [],
  hasLogo: false,
  hasFavicon: false,
  backgroundCount: 0,
  updatedAt: null,
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
