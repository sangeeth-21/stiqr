import React from 'react';
import { motion } from 'framer-motion';

interface StiqrLogoProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
  animated?: boolean;
}

export const StiqrLogo: React.FC<StiqrLogoProps> = ({
  size = 36,
  showText = false,
  subtitle,
  animated = false,
}) => {
  const iconContent = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        {/* Primary Orange Gradient */}
        <linearGradient id="stiqr-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="50%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA6C0A" />
        </linearGradient>

        {/* Glow Filter */}
        <filter id="stiqr-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        {/* Inner Light Gradient */}
        <linearGradient id="stiqr-grad-inner" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FED7AA" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Outer Rounded Container with Shadow */}
      <rect
        x="5"
        y="5"
        width="90"
        height="90"
        rx="26"
        fill="url(#stiqr-grad-primary)"
        filter="url(#stiqr-glow)"
      />

      {/* Glassmorphism Inner Border */}
      <rect
        x="7"
        y="7"
        width="86"
        height="86"
        rx="24"
        fill="none"
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="2"
      />

      {/* QR Code Matrix Corners */}
      {/* Top Left Finder */}
      <rect x="22" y="22" width="20" height="20" rx="5" fill="#FFFFFF" />
      <rect x="26" y="26" width="12" height="12" rx="3" fill="#EA6C0A" />

      {/* Top Right Finder */}
      <rect x="58" y="22" width="20" height="20" rx="5" fill="#FFFFFF" />
      <rect x="62" y="26" width="12" height="12" rx="3" fill="#EA6C0A" />

      {/* Bottom Left Finder */}
      <rect x="22" y="58" width="20" height="20" rx="5" fill="#FFFFFF" />
      <rect x="26" y="62" width="12" height="12" rx="3" fill="#EA6C0A" />

      {/* Stylized 'S' Scan Line (Dynamic Spark) */}
      <path
        d="M58 56 C 68 56, 72 64, 66 72 C 60 80, 74 80, 76 74"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Center QR Data Dot */}
      <circle cx="50" cy="50" r="5" fill="#FFFFFF" />
      <circle cx="50" cy="32" r="3" fill="rgba(255,255,255,0.8)" />
      <circle cx="32" cy="50" r="3" fill="rgba(255,255,255,0.8)" />
      <circle cx="68" cy="50" r="3.5" fill="#FFFFFF" />

      {/* Smartphone Notch Line accent */}
      <rect x="42" y="14" width="16" height="3" rx="1.5" fill="rgba(255, 255, 255, 0.6)" />
    </svg>
  );

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {animated ? (
        <motion.div
          whileHover={{ scale: 1.05, rotate: 3 }}
          whileTap={{ scale: 0.95 }}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          {iconContent}
        </motion.div>
      ) : (
        iconContent
      )}

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 900,
              fontSize: size * 0.52,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            StiQR
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: Math.max(size * 0.26, 10),
                color: 'var(--text-muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StiqrLogo;
