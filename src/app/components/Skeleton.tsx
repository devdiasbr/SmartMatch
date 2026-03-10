import { useTheme } from './ThemeProvider';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`animate-pulse rounded-xl ${className}`}
      style={{
        background: isDark
          ? 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)'
          : 'linear-gradient(90deg, rgba(9,9,11,0.04) 0%, rgba(9,9,11,0.08) 50%, rgba(9,9,11,0.04) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.8s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

/* Card-shaped skeleton for event cards */
export function EventCardSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'rgba(255,255,255,0.025)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(9,9,11,0.09)';

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 18,
      }}
    >
      <div style={{ height: 3 }}>
        <Skeleton className="w-full h-full rounded-none" />
      </div>
      <div className="p-5 flex flex-col gap-4">
        <div>
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-5 w-36 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>
    </div>
  );
}

/* Photo card skeleton */
export function PhotoCardSkeleton() {
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '3/2' }}>
      <Skeleton className="w-full h-full rounded-none" />
    </div>
  );
}

/* KPI stat skeleton */
export function StatSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 py-6 px-4">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}
