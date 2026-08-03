import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Zap, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setScanning(true);
      }
    } catch {
      setError('Camera access denied. Please use manual entry below.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setScanning(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      onClose();
    }
  };

  const toggleFlash = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn(!flashOn);
    } catch { /* flash not supported */ }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Inter',sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Camera size={20} color="#f97316" />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Barcode Scanner</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleFlash}
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: flashOn ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.1)',
                border: `1px solid ${flashOn ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: flashOn ? '#f97316' : '#fff',
              }}
            >
              <Zap size={18} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
              }}
            >
              <X size={18} />
            </motion.button>
          </div>
        </div>

        {/* Camera view */}
        <div style={{ position: 'relative', width: 320, height: 320 }}>
          {scanning && (
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }}
              playsInline
              muted
            />
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Scanner overlay */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Corner brackets */}
            {[
              { top: 16, left: 16, borderTop: '3px solid #f97316', borderLeft: '3px solid #f97316' },
              { top: 16, right: 16, borderTop: '3px solid #f97316', borderRight: '3px solid #f97316' },
              { bottom: 16, left: 16, borderBottom: '3px solid #f97316', borderLeft: '3px solid #f97316' },
              { bottom: 16, right: 16, borderBottom: '3px solid #f97316', borderRight: '3px solid #f97316' },
            ].map((style, i) => (
              <div key={i} style={{ position: 'absolute', width: 28, height: 28, borderRadius: 2, ...style }} />
            ))}

            {/* Scan line animation */}
            <motion.div
              animate={{ top: ['18%', '78%', '18%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', left: '10%', right: '10%',
                height: 2, background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
                boxShadow: '0 0 8px rgba(249,115,22,0.8)',
                borderRadius: 1,
              }}
            />

            {/* Center dot */}
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', boxShadow: '0 0 12px rgba(249,115,22,0.8)' }} />
          </div>

          {/* No camera message */}
          {!scanning && !error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', borderRadius: 16 }}>
              <div style={{ textAlign: 'center', color: '#fff' }}>
                <Camera size={32} color="#f97316" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: 14 }}>Starting camera…</p>
              </div>
            </div>
          )}
        </div>

        {/* Status text */}
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 24, textAlign: 'center' }}
        >
          {scanning ? 'Position barcode within the frame…' : 'Camera starting…'}
        </motion.p>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 13, marginTop: 12 }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* Manual entry */}
        <form onSubmit={handleManualSubmit} style={{ marginTop: 24, display: 'flex', gap: 8, width: 320 }}>
          <input
            id="barcode-manual"
            type="text"
            value={manualInput}
            onChange={e => setManualInput(e.target.value)}
            placeholder="Or enter barcode manually…"
            style={{
              flex: 1, background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10, color: '#fff', fontSize: 14,
              padding: '10px 14px',
            }}
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '10px 18px', background: 'linear-gradient(135deg, #f97316, #ea6c0a)',
              border: 'none', borderRadius: 10, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Add
          </motion.button>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};

export default BarcodeScanner;
