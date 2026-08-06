import React, { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ShoppingCart, TrendingUp, Package, Wrench,
  ClipboardList, Users, UserCheck, Settings, PanelLeftClose,
  PanelLeftOpen, Store,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from '../UI/ThemeToggle';
import NotificationMenu from '../UI/NotificationMenu';
import Sidebar from './Sidebar';

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
      <Sidebar
        open={sidebarOpen}
        items={navItems}
        user={user}
        subtitle="Vendor Portal"
        roleLabel="Owner"
        roleIcon={<Store size={10} color="#f97316" />}
        onLogout={handleLogout}
      />

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
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            style={{
              width: 36, height: 36, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-hover)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--text-secondary)',
            }}
          >
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </motion.button>
          <div style={{ flex: 1 }} />
          <NotificationMenu />
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
