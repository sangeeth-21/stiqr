import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter',sans-serif", textAlign: 'center', padding: 24 }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div style={{ fontSize: 80, marginBottom: 20 }}>🔍</div>
        <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 80, fontWeight: 900, color: '#f97316', lineHeight: 1, marginBottom: 8 }}>404</h1>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Page Not Found</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 340, marginBottom: 32 }}>The page you're looking for doesn't exist or has been moved.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>
            <ArrowLeft size={16} /> Go Back
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate('/login')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 14px rgba(249,115,22,0.4)' }}>
            <Home size={16} /> Home
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
