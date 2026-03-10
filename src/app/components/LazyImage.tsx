import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTheme } from './ThemeProvider';

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export function LazyImage({ src, alt = '', className = '', style, onClick }: LazyImageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const placeholderBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(9,9,11,0.04)';

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={style} onClick={onClick}>
      {/* Placeholder shimmer */}
      {!loaded && (
        <div
          className="absolute inset-0"
          style={{
            background: placeholderBg,
            animation: 'shimmer 1.8s ease-in-out infinite',
          }}
        />
      )}
      {inView && (
        <motion.img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          style={style}
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          onLoad={() => setLoaded(true)}
          loading="lazy"
          draggable={false}
        />
      )}
    </div>
  );
}
