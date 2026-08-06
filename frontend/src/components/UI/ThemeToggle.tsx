import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

const ThemeToggle: React.FC = () => {
  const { isDark, setTheme } = useThemeStore();

  const handleToggle = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={handleToggle}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        position: 'relative',
        width: 36,
        height: 36,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        background: 'var(--bg-hover)',
        border: '1px solid var(--border)',
        color: isDark ? '#f97316' : 'var(--text-secondary)',
      }}
    >
      {/* Small active indicator dot (mirrors the notification badge) */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#f97316',
          border: '2px solid var(--bg-card)',
        }}
      />

      {/* Icon — swaps instantly */}
      {isDark ? <Moon size={17} strokeWidth={2.2} /> : <Sun size={17} strokeWidth={2.2} />}
    </motion.button>
  );
};

export default ThemeToggle;
