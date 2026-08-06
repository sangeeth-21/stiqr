import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, UserCheck, Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, Shield, FlaskConical } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { findDemoUser } from '../store/demoCredentials';
import ThemeToggle from '../components/UI/ThemeToggle';
import { StiqrLogo } from '../components/UI/StiqrLogo';
import apiClient from '../api/client';

type Tab = 'vendor' | 'staff';

const tabs = [
  { id: 'vendor' as Tab, label: 'Vendor (Shop Owner)', icon: Store,     color: '#f97316', desc: 'Shop owner management & inventory portal' },
  { id: 'staff' as Tab,  label: 'Staff Member',         icon: UserCheck, color: '#f97316', desc: 'Staff point of sale & repair service desk' },
];

const VendorStaffLogin: React.FC<{ initialTab?: Tab }> = ({ initialTab = 'vendor' }) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
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
      
      // Role guard
      if (activeTab === 'vendor' && user.role !== 'owner') {
        setError('Access denied. This portal tab is for Shop Owners only.');
        setLoading(false);
        return;
      }
      if (activeTab === 'staff' && user.role !== 'staff') {
        setError('Access denied. This portal tab is for Staff Members only.');
        setLoading(false);
        return;
      }

      login(user, data.accessToken, data.refreshToken);
      if (user.role === 'owner') navigate('/vendor');
      else navigate('/staff');
    } catch (err: any) {
      // Demo fallback — lets you view the portals without a live backend
      const demoUser = findDemoUser(email, password);
      if (demoUser) {
        if (activeTab === 'vendor' && demoUser.role !== 'owner') {
          setError('Access denied. This portal tab is for Shop Owners only.');
          setLoading(false);
          return;
        }
        if (activeTab === 'staff' && demoUser.role !== 'staff') {
          setError('Access denied. This portal tab is for Staff Members only.');
          setLoading(false);
          return;
        }
        login(demoUser, 'demo-access-token', 'demo-refresh-token');
        if (demoUser.role === 'owner') navigate('/vendor');
        else navigate('/staff');
        return;
      }
      setError(err.response?.data?.message || 'Invalid credentials. Please check your login details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'vendor' | 'staff') => {
    setActiveTab(role);
    setEmail(role === 'vendor' ? 'owner@example.com' : 'alice@example.com');
    setPassword(role === 'vendor' ? 'Owner@1234' : 'Staff@1234');
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
            StiQR Mobile ERP
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.5, marginBottom: 24 }}>
            All-in-one platform for mobile shop sales, barcode inventory & repair service management.
          </p>

          {/* Software Showcase Mockup Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{
              width: '100%',
              background: isDark ? 'rgba(26,26,26,0.85)' : 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(249,115,22,0.3)',
              borderRadius: 20,
              padding: 20,
              boxShadow: isDark ? '0 20px 50px rgba(0,0,0,0.6)' : '0 20px 50px rgba(249,115,22,0.12)',
              backdropFilter: 'blur(16px)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="status-dot active" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Mobile World ERP</span>
              </div>
              <span className="badge badge-orange" style={{ fontSize: 11 }}>v2.4 Live</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>TODAY'S SALES</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#f97316', fontFamily: "'JetBrains Mono',monospace" }}>₹28,400</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>REPAIRS</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#22c55e', fontFamily: "'JetBrains Mono',monospace" }}>12 Active</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>INVENTORY</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#3b82f6', fontFamily: "'JetBrains Mono',monospace" }}>847 Items</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(249,115,22,0.1)', border: '1px dashed rgba(249,115,22,0.4)', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#f97316' }}>
                <span>🔲 Scan: 8901234567890</span>
              </div>
              <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>+ Item Added</span>
            </div>
          </motion.div>
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
            onClick={() => navigate('/admin/login')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}
          >
            <Shield size={14} color="#f97316" /> Admin Portal Login →
          </button>
          <ThemeToggle />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 40px 40px' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              Welcome back 👋
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Sign in to your Vendor Shop or Staff Portal
            </p>
          </motion.div>

          {/* Vendor & Staff Role Tabs */}
          <div style={{
            display: 'flex', gap: 4, marginBottom: 24,
            background: 'var(--bg-tertiary)', padding: 4, borderRadius: 12,
            border: '1px solid var(--border)',
          }}>
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setError(''); }}
                whileTap={{ scale: 0.97 }}
                style={{
                  flex: 1, padding: '10px 8px',
                  borderRadius: 9, border: 'none',
                  background: activeTab === tab.id
                    ? 'linear-gradient(135deg, #f97316, #ea6c0a)'
                    : 'transparent',
                  color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer', fontFamily: "'Inter',sans-serif",
                  fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.2s',
                  boxShadow: activeTab === tab.id ? '0 4px 12px rgba(249,115,22,0.35)' : 'none',
                }}
              >
                <tab.icon size={15} strokeWidth={2.5} />
                {tab.label}
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={activeTab}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {tabs.find(t => t.id === activeTab)?.icon && React.createElement(tabs.find(t => t.id === activeTab)!.icon, { size: 14, color: '#f97316' })}
              {tabs.find(t => t.id === activeTab)?.desc}
            </motion.p>
          </AnimatePresence>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={activeTab === 'vendor' ? 'owner@example.com' : 'staff@example.com'} required style={{ paddingLeft: 40 }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required style={{ paddingLeft: 40, paddingRight: 44 }} />
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
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} />Signing in…</> : <>Sign In ({activeTab === 'vendor' ? 'Vendor' : 'Staff'}) <ArrowRight size={18} /></>}
            </motion.button>
          </form>

          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <FlaskConical size={14} color="#f97316" /> Demo Access
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => fillDemo('vendor')}
                style={{ flex: 1, minWidth: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, background: 'rgba(249,115,22,0.08)', border: '1px dashed rgba(249,115,22,0.4)', color: '#f97316', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <Store size={15} /> Demo Owner
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => fillDemo('staff')}
                style={{ flex: 1, minWidth: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px dashed rgba(34,197,94,0.4)', color: '#22c55e', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <UserCheck size={15} /> Demo Staff
              </motion.button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, flexWrap: 'wrap', gap: 8 }}>
              <a href="/admin/login" style={{ color: '#f97316', fontWeight: 600 }}>Platform Admin Login →</a>
              <a href="/status" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Track Order Status →</a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VendorStaffLogin;
