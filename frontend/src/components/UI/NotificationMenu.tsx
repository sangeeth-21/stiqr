import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCheck, ArrowRight, ShoppingCart, Package, AlertTriangle,
  Wrench, Users, type LucideIcon,
} from 'lucide-react';

interface Notification {
  id: number;
  type: 'order' | 'inventory' | 'alert' | 'service' | 'user';
  title: string;
  description: string;
  time: string;
  unread?: boolean;
}

const TYPE_STYLES: Record<Notification['type'], { bg: string; color: string; icon: LucideIcon }> = {
  order:     { bg: 'rgba(249,115,22,0.12)', color: '#f97316', icon: ShoppingCart },
  inventory: { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6', icon: Package },
  alert:     { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', icon: AlertTriangle },
  service:   { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e', icon: Wrench },
  user:      { bg: 'rgba(139,92,246,0.12)',  color: '#8b5cf6', icon: Users },
};

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: 1, type: 'order', title: 'New order received', description: 'Order #1042 placed for ₹12,499', time: '2m ago', unread: true },
  { id: 2, type: 'inventory', title: 'Low stock alert', description: 'Samsung M14 (128GB) has only 3 units left', time: '18m ago', unread: true },
  { id: 3, type: 'service', title: 'Service request completed', description: 'iPhone 13 battery replacement done', time: '1h ago', unread: true },
  { id: 4, type: 'user', title: 'New staff member added', description: 'Ravi joined as sales staff', time: '3h ago', unread: true },
  { id: 5, type: 'alert', title: 'Payment due soon', description: 'Shop subscription renews in 3 days', time: '5h ago' },
  { id: 6, type: 'order', title: 'Order #1039 delivered', description: 'Customer confirmed pickup', time: 'Yesterday' },
];

const NotificationMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const markRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      {/* Bell button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={open}
        title="Notifications"
        style={{
          width: 36, height: 36, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-hover)', border: '1px solid var(--border)',
          cursor: 'pointer', color: 'var(--text-secondary)', position: 'relative',
        }}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #ea6c0a)',
            border: '2px solid var(--bg-card)',
            color: '#fff', fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 46, right: 0, zIndex: 1000,
              width: 360, maxWidth: 'calc(100vw - 32px)',
              borderRadius: 16, background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                  {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
                </div>
              </div>
              {unreadCount > 0 && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={markAllRead}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 10px', borderRadius: 8,
                    background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
                    color: '#f97316', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <CheckCheck size={13} />
                  Mark all read
                </motion.button>
              )}
            </div>

            {/* List */}
            <div style={{ maxHeight: 340, overflowY: 'auto' }}>
              {notifications.map((n) => {
                const style = TYPE_STYLES[n.type];
                const Icon = style.icon;
                return (
                  <motion.div
                    key={n.id}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => markRead(n.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px', cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      background: n.unread ? 'rgba(249,115,22,0.05)' : 'transparent',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = n.unread ? 'rgba(249,115,22,0.05)' : 'transparent'; }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: style.bg, color: style.color,
                    }}>
                      <Icon size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                        {n.unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />}
                      </div>
                      <div style={{
                        fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45, marginTop: 2,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {n.description}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 4 }}>{n.time}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: 'transparent', border: 'none',
                  color: '#f97316', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                View all notifications
                <ArrowRight size={14} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationMenu;
