import { motion, useScroll, useSpring } from 'motion/react';
import { useTheme } from './ThemeProvider';

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] origin-left"
      style={{
        scaleX,
        height: 2,
        background: isDark
          ? 'linear-gradient(90deg, #00FF7F, #00D4FF)'
          : 'linear-gradient(90deg, #166534, #15803d)',
      }}
    />
  );
}
