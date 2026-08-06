import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, ArrowLeft, FlaskConical } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { findDemoUser } from '../store/demoCredentials';
import ThemeToggle from '../components/UI/ThemeToggle';
import { StiqrLogo } from '../components/UI/StiqrLogo';
import apiClient from '../api/client';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuthStore();
  const { isDark } = useThemeStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      const user = data.user;
      if (user.role !== 'admin') {
        setError('Access denied. This portal is strictly for Platform Administrators.');
        setLoading(false);
        return;
      }
      login(user, data.accessToken, data.refreshToken);
      navigate('/admin');
    } catch (err: any) {
      // Demo fallback — lets you view the portal without a live backend
      const demoUser = findDemoUser(email, password);
      if (demoUser) {
        if (demoUser.role !== 'admin') {
          setError('Access denied. This portal is strictly for Platform Administrators.');
          setLoading(false);
          return;
        }
        login(demoUser, 'demo-access-token', 'demo-refresh-token');
        navigate('/admin');
        return;
      }
      setError(err.response?.data?.message || 'Invalid admin credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('admin@stiqr.com');
    setPassword('YourPassword@123');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: isDark
        ? 'linear-gradient(135deg, #0f0f0f 0%, #1a0900 40%, #0f0f0f 100%)'
        : 'linear-gradient(135deg, #fff7ed 0%, #fff 40%, #fff7ed 100%)',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Left Hero Panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          padding: 60, position: 'relative', overflow: 'hidden',
        }}
        className="hidden-mobile"
      >
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.35, 0.2] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: '10%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.4), transparent 70%)', filter: 'blur(80px)' }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          style={{ textAlign: 'center', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 460 }}
        >
          <div style={{ marginBottom: 20 }}>
            <StiqrLogo size={90} animated={true} />
          </div>

          <h1 style={{
            fontFamily: "'Outfit',sans-serif", fontSize: 44, fontWeight: 900,
            background: 'linear-gradient(135deg, #f97316, #fb923c, #fdba74)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', marginBottom: 10, lineHeight: 1.1,
          }}>
            Platform Control
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
            Platform Administrator Command Center — manage shops, subscriptions, platform reports & audit logs.
          </p>

          <div style={{
            width: '100%', padding: 20, borderRadius: 20,
            background: isDark ? 'rgba(26,26,26,0.85)' : 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(249,115,22,0.3)', backdropFilter: 'blur(16px)',
            display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <Shield size={20} color="#f97316" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Admin System Access</span>
              <span className="badge badge-orange" style={{ marginLeft: 'auto', fontSize: 11 }}>Strict Access</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              This portal is restricted to authorized platform administrators only. All login attempts are recorded in system audit logs.
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Right Form Panel */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        style={{
          width: '100%', flex: 1, maxWidth: 520,
          display: 'flex', flexDirection: 'column',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border)',
          boxShadow: isDark ? '-20px 0 60px rgba(0,0,0,0.4)' : '-20px 0 60px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px' }}>
          <button
            onClick={() => navigate('/login')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
          >
            <ArrowLeft size={15} /> Vendor / Staff Portal
          </button>
          <ThemeToggle />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 40px 40px' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginBottom: 32 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', color: '#f97316', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
              <Shield size={14} /> Platform Administrator Portal
            </div>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              Admin Sign In 🔐
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Enter your administrator credentials to access platform controls
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Admin Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@stiqr.com" required style={{ paddingLeft: 40 }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Admin Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input id="admin-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter admin password" required style={{ paddingLeft: 40, paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-disabled)', padding: 4 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', fontSize: 13 }}>
                  <AlertCircle size={15} />{error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit" disabled={loading} whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
              style={{
                marginTop: 4, padding: '13px 20px',
                background: loading ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, #f97316, #ea6c0a)',
                color: loading ? 'var(--text-muted)' : '#fff',
                border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter',sans-serif", fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 16px rgba(249,115,22,0.4)',
              }}
            >
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} />Authenticating Admin…</> : <>Admin Login <ArrowRight size={18} /></>}
            </motion.button>
          </form>

          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={fillDemo}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 12, background: 'rgba(249,115,22,0.08)', border: '1px dashed rgba(249,115,22,0.4)', color: '#f97316', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <FlaskConical size={16} /> Use Demo Admin Credentials
            </motion.button>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 14 }}>
              Shop Owner or Staff Member?{' '}
              <a href="/login" style={{ color: '#f97316', fontWeight: 600 }}>Vendor / Staff Sign In →</a>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
