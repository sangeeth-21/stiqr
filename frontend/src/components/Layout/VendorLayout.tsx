import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, TrendingUp, Package, Wrench,
  ClipboardList, Users, UserCheck, Settings, LogOut, Menu, X,
  Bell, ChevronRight, Store,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from '../UI/ThemeToggle';
import { StiqrLogo } from '../UI/StiqrLogo';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',      path: '/vendor',              end: true },
  { icon: ShoppingCart,    label: 'Point of Sale',   path: '/vendor/pos' },
  { icon: TrendingUp,      label: 'Sales',           path: '/vendor/sales' },
  { icon: Package,         label: 'Purchases',       path: '/vendor/purchases' },
  { icon: Package,         label: 'Inventory',       path: '/vendor/inventory' },
  { icon: Wrench,          label: 'Services',        path: '/vendor/services' },
  { icon: ClipboardList,   label: 'Service Orders',  path: '/vendor/service-orders' },
  { icon: UserCheck,       label: 'Staff',           path: '/vendor/staff' },
  { icon: Users,           label: 'Customers',       path: '/vendor/customers' },
  { icon: Settings,        label: 'Settings',        path: '/vendor/settings' },
];

const VendorLayout: React.FC = () => {
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
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{
              background: 'var(--bg-sidebar)',
              borderRight: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column',
              height: '100vh', overflow: 'hidden', flexShrink: 0,
            }}
          >
            {/* Logo */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
              <StiqrLogo size={36} showText={true} subtitle="Vendor Portal" animated={true} />
            </div>

            {/* Shop info */}
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
                  {user?.name?.[0]?.toUpperCase() || 'V'}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name || 'Vendor'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Store size={10} color="#f97316" />
                    <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600 }}>Owner</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {navItems.map((item) => (
                <NavLink key={item.path} to={item.path} end={item.end} style={{ textDecoration: 'none' }}>
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
                      {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
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
                  fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500,
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
        <header style={{
          height: 60, borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)', display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12, flexShrink: 0,
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
            <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#f97316', border: '2px solid var(--bg-card)' }} />
          </motion.button>
          <ThemeToggle />
        </header>
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

export default VendorLayout;
