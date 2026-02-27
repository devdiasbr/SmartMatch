import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AnimatedBackgroundProps {
  urls: string[];
  fallback: string;
  interval?: number;
  filter?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Crossfade background image carousel.
 * When only 1 image (or none), renders a static image.
 * When 2+, fades between them every `interval` ms (default 3000).
 */
export function AnimatedBackground({
  urls,
  fallback,
  interval = 3000,
  filter = 'brightness(0.32) saturate(0.9)',
  className = '',
  style,
}: AnimatedBackgroundProps) {
  const images = urls.length > 0 ? urls : [fallback];
  const [currentIndex, setCurrentIndex] = useState(0);

  const advance = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(advance, interval);
    return () => clearInterval(timer);
  }, [advance, interval, images.length]);

  // Single image — no animation needed
  if (images.length <= 1) {
    return (
      <img
        src={images[0]}
        alt="Background"
        className={`w-full h-full object-cover ${className}`}
        style={{ filter, ...style }}
      />
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={style}>
      <AnimatePresence mode="popLayout">
        <motion.img
          key={`bg-${currentIndex}`}
          src={images[currentIndex]}
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
      </AnimatePresence>
    </div>
  );
}
