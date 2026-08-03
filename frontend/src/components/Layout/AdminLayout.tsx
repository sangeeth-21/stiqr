import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Store, CreditCard, FileText,
  Settings, BarChart3, Shield, LogOut, Menu, X, Bell, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from '../UI/ThemeToggle';
import { StiqrLogo } from '../UI/StiqrLogo';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',     path: '/admin' },
  { icon: Users,           label: 'Owners',         path: '/admin/owners' },
  { icon: Store,           label: 'Shops',          path: '/admin/shops' },
  { icon: CreditCard,      label: 'Subscriptions',  path: '/admin/subscriptions' },
  { icon: CreditCard,      label: 'Payments',       path: '/admin/payments' },
  { icon: BarChart3,       label: 'Reports',        path: '/admin/reports' },
  { icon: FileText,        label: 'Audit Logs',     path: '/admin/audit-logs' },
  { icon: Settings,        label: 'Settings',       path: '/admin/settings' },
];

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{
              background: 'var(--bg-sidebar)',
              borderRight: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column',
              height: '100vh', overflow: 'hidden', flexShrink: 0,
              boxShadow: 'var(--shadow)',
            }}
          >
            {/* Logo */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
              <StiqrLogo size={36} showText={true} subtitle="Admin Panel" animated={true} />
            </div>

            {/* Role badge */}
            <div style={{ padding: '12px 16px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 12,
                background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)',
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f97316, #fb923c)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
                }}>
                  {user?.name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Admin'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Shield size={10} color="#f97316" />
                    <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600 }}>Platform Admin</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  style={{ textDecoration: 'none' }}
                >
                  {({ isActive }) => (
                    <motion.div
                      whileHover={{ x: 3 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent',
                        border: isActive ? '1px solid rgba(249,115,22,0.25)' : '1px solid transparent',
                        color: isActive ? '#f97316' : 'var(--text-muted)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <item.icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                      <span style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="admin-nav-indicator"
                          style={{ marginLeft: 'auto' }}
                        >
                          <ChevronRight size={14} />
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Logout */}
            <div style={{ padding: '12px 12px 20px', borderTop: '1px solid var(--border)' }}>
              <motion.button
                whileHover={{ x: 3 }}
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: 'transparent', border: '1px solid transparent',
                  color: 'var(--text-muted)', cursor: 'pointer',
                  transition: 'all 0.2s', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <LogOut size={17} />
                Logout
              </motion.button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: 60, borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)', display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12, flexShrink: 0, boxShadow: 'var(--shadow-sm)',
        }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              width: 36, height: 36, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-hover)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-secondary)',
            }}
          >
            {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
          </motion.button>

          <div style={{ flex: 1 }} />

          {/* Notification bell */}
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{
              width: 36, height: 36, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-hover)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-secondary)', position: 'relative',
            }}
          >
            <Bell size={17} />
            <div style={{
              position: 'absolute', top: 6, right: 6,
              width: 8, height: 8, borderRadius: '50%',
              background: '#f97316', border: '2px solid var(--bg-card)',
            }} />
          </motion.button>

          <ThemeToggle />
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
