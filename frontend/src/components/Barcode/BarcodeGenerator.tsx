import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import Barcode from 'react-barcode';
import { Download, Copy, Check } from 'lucide-react';

interface BarcodeGeneratorProps {
  value: string;
  productName?: string;
  price?: number;
}

const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({ value, productName, price }) => {
  const [copied, setCopied] = React.useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = barcodeRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.download = `barcode-${value}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 16,
      }}
    >
      {productName && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{productName}</div>
          {price !== undefined && (
            <div style={{ fontSize: 14, color: '#f97316', fontWeight: 600 }}>₹{price.toLocaleString()}</div>
          )}
        </div>
      )}

      {/* Barcode display */}
      <div
        ref={barcodeRef}
        style={{
          background: '#ffffff', padding: '16px 20px',
          borderRadius: 12, border: '1px solid var(--border)',
        }}
      >
        <Barcode
          value={value || '000000000000'}
          width={2}
          height={70}
          fontSize={14}
          fontOptions="bold"
          font="JetBrains Mono"
          background="#ffffff"
          lineColor="#111827"
          margin={0}
        />
      </div>

      {/* Barcode value */}
      <code style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13, color: 'var(--text-muted)',
        background: 'var(--bg-tertiary)', padding: '4px 12px',
        borderRadius: 6, letterSpacing: '0.1em',
      }}>
        {value}
      </code>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            background: copied ? 'rgba(34,197,94,0.1)' : 'var(--bg-hover)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
            color: copied ? '#22c55e' : 'var(--text-secondary)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={handleDownload}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8,
            background: 'linear-gradient(135deg, #f97316, #ea6c0a)',
            border: 'none', color: '#fff',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(249,115,22,0.3)',
          }}
        >
          <Download size={14} />
          Download
        </motion.button>
      </div>
    </motion.div>
  );
};

export default BarcodeGenerator;
