import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StiqrLogo } from './UI/StiqrLogo';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'done'>('loading');

  useEffect(() => {
    const duration = 2800;
    const interval = 30;
    const steps = duration / interval;
    let current = 0;
    const timer = setInterval(() => {
      current++;
      const ease = 1 - Math.pow(1 - current / steps, 3);
      setProgress(Math.round(ease * 100));
      if (current >= steps) {
        clearInterval(timer);
        setPhase('done');
        setTimeout(onComplete, 600);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'linear-gradient(135deg, #0f0f0f 0%, #1a0a00 50%, #0f0f0f 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {/* Background orbs */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', top: '20%', left: '15%',
                width: 300, height: 300, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(249,115,22,0.4), transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            <motion.div
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              style={{
                position: 'absolute', bottom: '20%', right: '15%',
                width: 250, height: 250, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(234,108,10,0.35), transparent 70%)',
                filter: 'blur(50px)',
              }}
            />
          </div>

          {/* Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 50 }}
          >
            <StiqrLogo size={90} animated={true} />
            <div style={{ textAlign: 'center' }}>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{
                  fontSize: 48, fontWeight: 900, letterSpacing: '-0.02em',
                  background: 'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fdba74 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text', lineHeight: 1,
                }}
              >
                StiQR
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                style={{ color: '#6b7280', fontSize: 13, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 6 }}
              >
                Mobile Shop ERP
              </motion.p>
            </div>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{
              height: 4, borderRadius: 100,
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <motion.div
                style={{
                  height: '100%', borderRadius: 100,
                  background: 'linear-gradient(90deg, #f97316, #fb923c)',
                  boxShadow: '0 0 12px rgba(249,115,22,0.8)',
                }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 500 }}>
                {progress < 30 ? 'Initializing…' : progress < 60 ? 'Loading modules…' : progress < 90 ? 'Almost ready…' : 'Ready!'}
              </span>
              <span style={{ color: '#f97316', fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                {progress}%
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
