import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      aria-label="Toggle theme"
      style={{
        position: 'relative',
        width: 68,
        height: 34,
        borderRadius: 100,
        padding: 3,
        cursor: 'pointer',
        border: 'none',
        background: isDark
          ? 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)'
          : 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)',
        boxShadow: isDark
          ? 'inset 0 2px 4px rgba(0,0,0,0.6), 0 0 12px rgba(249,115,22,0.25), 0 0 0 1px rgba(249,115,22,0.3)'
          : 'inset 0 2px 4px rgba(0,0,0,0.08), 0 0 12px rgba(249,115,22,0.3), 0 0 0 1px rgba(249,115,22,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        transition: 'background 0.4s ease, box-shadow 0.4s ease',
      }}
    >
      {/* Background Track Icons */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          pointerEvents: 'none',
        }}
      >
        {/* Sun track icon */}
        <motion.div
          animate={{
            opacity: isDark ? 0.35 : 0.9,
            scale: isDark ? 0.8 : 1,
          }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Sun size={15} color="#f97316" strokeWidth={2.5} />
        </motion.div>

        {/* Moon track icon */}
        <motion.div
          animate={{
            opacity: isDark ? 0.9 : 0.35,
            scale: isDark ? 1 : 0.8,
          }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Moon size={15} color={isDark ? '#fb923c' : '#94a3b8'} strokeWidth={2.5} />
        </motion.div>
      </div>

      {/* Floating Star / Ray Accents */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <motion.div
          animate={{
            opacity: isDark ? [0.4, 0.9, 0.4] : 0,
            scale: isDark ? [0.8, 1.2, 0.8] : 0,
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: 6, left: 16 }}
        >
          <Sparkles size={8} color="#fdba74" />
        </motion.div>
        <motion.div
          animate={{
            opacity: isDark ? [0.8, 0.3, 0.8] : 0,
            scale: isDark ? [1.1, 0.7, 1.1] : 0,
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          style={{ position: 'absolute', bottom: 5, right: 18 }}
        >
          <Sparkles size={7} color="#f97316" />
        </motion.div>
      </div>

      {/* Sliding Knob Thumb */}
      <motion.div
        animate={{
          x: isDark ? 34 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 450,
          damping: 28,
        }}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          zIndex: 2,
          background: isDark
            ? 'linear-gradient(135deg, #f97316 0%, #ea6c0a 100%)'
            : 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
          boxShadow: isDark
            ? '0 0 14px rgba(249,115,22,0.7), inset 0 1px 2px rgba(255,255,255,0.4)'
            : '0 0 12px rgba(249,115,22,0.6), inset 0 1px 2px rgba(255,255,255,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Active Icon in Knob with Rotation Animation */}
        <motion.div
          key={isDark ? 'dark-icon' : 'light-icon'}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isDark ? (
            <Moon size={14} color="#ffffff" strokeWidth={2.5} />
          ) : (
            <Sun size={14} color="#ffffff" strokeWidth={2.5} />
          )}
        </motion.div>
      </motion.div>
    </motion.button>
  );
};

export default ThemeToggle;
