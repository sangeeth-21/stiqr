import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Search, Clock, CheckCircle, Wrench, AlertCircle, ArrowLeft,
  BadgeCheck, CalendarDays, PackageSearch, RefreshCw, MessageSquare,
  Sparkles, Smartphone, ShieldCheck, Store, Package, Check, Boxes, Timer,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useThemeStore } from '../store/themeStore';
import ThemeToggle from '../components/UI/ThemeToggle';
import { StiqrLogo } from '../components/UI/StiqrLogo';

interface OrderStatus {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  items?: { name: string; qty: number; price: number }[];
  total?: number;
  shopName?: string;
  notes?: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',     color: '#f59e0b', bg: 'rgba(245,158,11,0.14)'  },
  processing: { label: 'Processing',  color: '#3b82f6', bg: 'rgba(59,130,246,0.14)'  },
  ready:      { label: 'Ready',       color: '#22c55e', bg: 'rgba(34,197,94,0.14)'   },
  completed:  { label: 'Completed',   color: '#22c55e', bg: 'rgba(34,197,94,0.14)'   },
  in_service: { label: 'In Service',  color: '#f97316', bg: 'rgba(249,115,22,0.14)'  },
  cancelled:  { label: 'Cancelled',   color: '#ef4444', bg: 'rgba(239,68,68,0.14)'   },
};

const FLOW = [
  { key: 'pending',    label: 'Pending',    icon: Clock },
  { key: 'processing', label: 'In Service', icon: Wrench },
  { key: 'ready',      label: 'Ready',      icon: CheckCircle },
  { key: 'completed',  label: 'Completed',  icon: BadgeCheck },
];

const stepIndex = (status: string): number => {
  if (status === 'pending') return 0;
  if (status === 'processing' || status === 'in_service') return 1;
  if (status === 'ready') return 2;
  if (status === 'completed') return 3;
  return -1;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return fmtDate(iso);
};

const statusIconMap: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  pending: Clock,
  processing: Package,
  ready: CheckCircle,
  completed: BadgeCheck,
  in_service: Wrench,
  cancelled: AlertCircle,
};

/* ── Animated progress stepper ── */
const StatusStepper: React.FC<{ status: string }> = ({ status }) => {
  const idx = stepIndex(status);
  if (idx < 0) return null;

  return (
    <div className="status-stepper" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      {FLOW.map((step, i) => {
        const completed = i < idx;
        const isCurrent = i === idx;
        const reached = i <= idx;
        return (
          <React.Fragment key={step.key}>
            <div className="status-step" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, flex: '1 1 0', minWidth: 0, textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: reached ? 'linear-gradient(135deg,#f97316,#ea6c0a)' : 'var(--bg-tertiary)',
                    color: reached ? '#ffffff' : 'var(--text-disabled)',
                    border: reached ? 'none' : '1.5px solid var(--border-strong)',
                    boxShadow: isCurrent
                      ? '0 0 0 7px rgba(249,115,22,0.15), 0 10px 24px rgba(249,115,22,0.35)'
                      : completed ? '0 6px 18px rgba(249,115,22,0.3)' : 'none',
                    position: 'relative', zIndex: 2,
                  }}
                >
                  {completed ? <Check size={20} strokeWidth={3} /> : <step.icon size={20} strokeWidth={2.3} />}
                  {isCurrent && (
                    <motion.span
                      animate={{ scale: [1, 1.45, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.6)', pointerEvents: 'none' }}
                    />
                  )}
                </motion.div>
              </div>
              <span className="status-step-label" style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? '#f97316' : reached ? 'var(--text-primary)' : 'var(--text-disabled)', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
                {step.label}
              </span>
            </div>
            {i < FLOW.length - 1 && (
              <div className="status-step-line" style={{ flex: '0.8 1 auto', height: 3, borderRadius: 2, alignSelf: 'flex-start', marginTop: 21, position: 'relative', overflow: 'hidden', background: completed ? 'transparent' : 'var(--border-strong)' }}>
                {completed && (
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#f97316,#fb923c)', borderRadius: 2 }}
                  />
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ── Single order card ── */
const OrderCard: React.FC<{ order: OrderStatus; index: number }> = ({ order, index }) => {
  const isCancelled = order.status === 'cancelled';
  const sc = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = statusIconMap[order.status] || Package;
  const progressIdx = stepIndex(order.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="order-card"
      style={{
        borderRadius: 26, overflow: 'hidden', position: 'relative',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
      }}
    >
      {/* Top accent */}
      <div style={{ height: 4, background: isCancelled ? 'linear-gradient(90deg,#ef4444,#f87171)' : `linear-gradient(90deg, ${sc.color}, transparent)` }} />

      <div style={{ padding: 'clamp(18px, 4vw, 28px)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${sc.color}22, ${sc.color}08)`, border: `1px solid ${sc.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Store size={24} color={sc.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {order.shopName || 'Mobile Shop'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: 8, letterSpacing: '0.02em' }}>
                  {order.orderNumber}
                </span>
                {order.customerName && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>for {order.customerName}</span>
                )}
              </div>
            </div>
          </div>
          <motion.div
            animate={isCancelled ? {} : { scale: [1, 1.03, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 15px', borderRadius: 100, background: sc.bg, border: `1px solid ${sc.color}40`, boxShadow: `0 4px 16px ${sc.color}22`, flexShrink: 0 }}
          >
            <motion.span
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color, flexShrink: 0 }}
            />
            <span style={{ color: sc.color, fontSize: 13, fontWeight: 800, letterSpacing: '0.01em' }}>{sc.label}</span>
          </motion.div>
        </div>

        {/* Status hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 22px', borderRadius: 20, background: `linear-gradient(135deg, ${sc.color}14, ${sc.color}03)`, border: `1px solid ${sc.color}30`, marginBottom: 16 }}>
          <motion.div
            initial={{ scale: 0.7, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: index * 0.1 + 0.15, type: 'spring', stiffness: 260, damping: 18 }}
            style={{ width: 58, height: 58, borderRadius: 18, background: `linear-gradient(135deg, ${sc.color}, ${sc.color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 12px 32px ${sc.color}44`, flexShrink: 0 }}
          >
            <StatusIcon size={27} strokeWidth={2.2} />
          </motion.div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: sc.color, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              {isCancelled ? 'Order Status' : 'Current Status'}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif", lineHeight: 1.12 }}>
              {sc.label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Timer size={13} /> Updated {timeAgo(order.updatedAt)}
            </div>
          </div>
          {!isCancelled && progressIdx >= 0 && (
            <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Progress</div>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "'JetBrains Mono',monospace", color: sc.color, marginTop: 2 }}>
                {progressIdx + 1}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/{FLOW.length}</span>
              </div>
            </div>
          )}
        </div>

        {/* Progress timeline */}
        <div style={{ padding: '24px 4px 12px', borderRadius: 18, background: 'rgba(249,115,22,0.035)', border: '1px dashed rgba(249,115,22,0.22)', marginBottom: 24 }}>
          {isCancelled ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px 0', color: '#ef4444', fontSize: 14, fontWeight: 700 }}>
              <AlertCircle size={18} /> This order was cancelled
            </div>
          ) : (
            <StatusStepper status={order.status} />
          )}
        </div>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
              <Boxes size={14} color="#f97316" /> Order Items
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {order.items.map((item, j) => (
                <motion.div
                  key={j}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 + j * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 14, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: `rgba(249,115,22,0.1)`, border: '1px solid rgba(249,115,22,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={17} color="#f97316" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 1 }}>
                      Qty <strong style={{ color: 'var(--text-secondary)' }}>× {item.qty}</strong>
                    </div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono',monospace", flexShrink: 0 }}>
                    ₹{item.price.toLocaleString()}
                  </span>
                </motion.div>
              ))}
              {order.total !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '15px 16px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(249,115,22,0.14), rgba(249,115,22,0.05))', border: '1px solid rgba(249,115,22,0.32)' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Order Total</span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#f97316', fontFamily: "'JetBrains Mono',monospace" }}>₹{order.total.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div style={{ display: 'flex', gap: 12, padding: '15px 18px', borderRadius: 16, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, alignItems: 'flex-start', position: 'relative', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(180deg,#3b82f6,#60a5fa)' }} />
            <MessageSquare size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Service Note</div>
              {order.notes}
            </div>
          </div>
        )}

        {/* Footer dates */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', borderTop: '1px dashed var(--border)', paddingTop: 16, fontSize: 12, color: 'var(--text-disabled)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={13} /> Placed {fmtDate(order.createdAt)}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Timer size={13} /> Updated {timeAgo(order.updatedAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Skeleton card ── */
const SkeletonCard: React.FC<{ delay: number }> = ({ delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    style={{ borderRadius: 24, border: '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden' }}
  >
    <div className="skeleton" style={{ height: 4, borderRadius: 0 }} />
    <div style={{ padding: 24 }}>
      <div className="skeleton" style={{ width: '45%', height: 18, marginBottom: 14 }} />
      <div className="skeleton" style={{ width: '30%', height: 13, marginBottom: 24 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%' }} />
            <div className="skeleton" style={{ width: 56, height: 10 }} />
          </div>
        ))}
      </div>
      <div className="skeleton" style={{ width: '100%', height: 44, borderRadius: 12 }} />
    </div>
  </motion.div>
);

/* ════════════════════════ MAIN ════════════════════════ */
const StatusLookup: React.FC = () => {
  const [mobile, setMobile] = useState('');
  const [orders, setOrders] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setSearched(false);
    try {
      const { data } = await apiClient.get(`/public/status?mobile=${mobile.replace(/\s+/g, '')}`);
      setOrders(Array.isArray(data) ? data : data.orders || []);
      setSearched(true);
    } catch {
      // Demo data for UI preview
      setOrders([
        { id: '1', orderNumber: 'ORD-2024-001', status: 'in_service', customerName: 'Demo Customer', shopName: 'Mobile World', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), items: [{ name: 'Screen Replacement', qty: 1, price: 1500 }, { name: 'Battery Replacement', qty: 1, price: 500 }], total: 2000, notes: 'Screen replacement in progress. Expected delivery: Tomorrow 5:00 PM' },
        { id: '2', orderNumber: 'ORD-2024-002', status: 'completed',  customerName: 'Demo Customer', shopName: 'Mobile World', createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(), items: [{ name: 'Charger Port Repair', qty: 1, price: 800 }], total: 800 },
      ]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: "'Inter',sans-serif", position: 'relative', overflowX: 'hidden' }}>
      {/* Ambient background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '-8%', left: '-10%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.2), transparent 65%)', filter: 'blur(90px)' }}
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '20%', right: '-12%', width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.14), transparent 65%)', filter: 'blur(90px)' }}
        />
      </div>

      {/* ── Header ── */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: isDark ? 'rgba(15,15,15,0.75)' : 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', cursor: 'pointer', color: '#f97316', fontSize: 13, fontWeight: 700, padding: '9px 14px', borderRadius: 12, fontFamily: 'inherit', flexShrink: 0 }}
          >
            <ArrowLeft size={16} /> <span className="back-label">Back</span>
          </motion.button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
            <StiqrLogo size={34} showText subtitle="Order Status" animated />
          </div>
          <div style={{ flexShrink: 0 }}>
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', zIndex: 1, background: isDark ? 'linear-gradient(165deg, #0f0f0f 0%, #1a0a00 55%, #0f0f0f 100%)' : 'linear-gradient(165deg, #fff7ed 0%, #ffffff 55%, #fff7ed 100%)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: isDark ? 0.06 : 0.05, backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px', color: '#f97316' }} />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            style={{ position: 'absolute', top: '-40%', left: '15%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.4), transparent 70%)', filter: 'blur(70px)' }}
          />
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: 'clamp(48px, 9vw, 90px) 20px', textAlign: 'center' }}>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 100, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', color: '#f97316', fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 0 24px rgba(249,115,22,0.15)' }}>
              <Sparkles size={13} /> Live Order Tracking
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ fontFamily: "'Outfit',sans-serif", fontSize: 'clamp(34px, 7vw, 56px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.08, marginTop: 22, color: 'var(--text-primary)' }}
          >
            Track your{' '}
            <span style={{ background: 'linear-gradient(135deg, #f97316, #fb923c, #fdba74)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              repair order
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ margin: '18px auto 0', maxWidth: 520, color: 'var(--text-muted)', fontSize: 'clamp(15px, 2.5vw, 17px)', lineHeight: 1.7 }}
          >
            Enter your registered mobile number to see live status of every repair and purchase order.
          </motion.p>

          {/* Search card */}
          <motion.form
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32 }}
            onSubmit={handleSearch}
            className="status-search-row"
            style={{
              margin: '34px auto 0', maxWidth: 540,
              padding: 10, borderRadius: 20,
              background: isDark ? 'rgba(26,26,26,0.85)' : 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(249,115,22,0.25)',
              boxShadow: '0 24px 70px rgba(0,0,0,0.18)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
              <Phone size={18} color="#f97316" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                id="status-mobile"
                type="tel"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="Enter mobile number"
                required
                style={{ paddingLeft: 46, height: 52, background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 14, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', boxShadow: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
              />
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: loading ? 1 : 1.03 }}
              whileTap={{ scale: loading ? 1 : 0.97 }}
              disabled={loading}
              className="status-search-btn"
              style={{
                height: 52, padding: '0 26px', background: loading ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, #f97316, #ea6c0a)',
                border: 'none', borderRadius: 14, color: loading ? 'var(--text-muted)' : '#fff',
                fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, flexShrink: 0,
                boxShadow: loading ? 'none' : '0 8px 24px rgba(249,115,22,0.4)',
                fontFamily: 'inherit',
              }}
            >
              {loading ? <><div className="spinner" style={{ borderTopColor: '#f97316', width: 18, height: 18 }} />Tracking…</> : <><Search size={18} /> Track</>}
            </motion.button>
          </motion.form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            style={{ marginTop: 16, fontSize: 12, color: 'var(--text-disabled)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <ShieldCheck size={13} /> Your data is encrypted & private
          </motion.p>
        </div>
      </section>

      {/* ── Results / States ── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto', padding: 'clamp(28px, 6vw, 56px) 20px' }}>
        <AnimatePresence mode="wait">
          {/* Loading */}
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f97316', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                <div className="spinner" style={{ width: 18, height: 18 }} /> Searching for orders…
              </div>
              <SkeletonCard delay={0} />
              <SkeletonCard delay={0.12} />
            </motion.div>
          )}

          {/* Initial state */}
          {!loading && !searched && (
            <motion.div key="initial" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', padding: 'clamp(32px, 6vw, 64px) 0' }}>
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: 96, height: 96, margin: '0 auto 26px', borderRadius: 30, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 60px rgba(249,115,22,0.18)' }}
              >
                <Smartphone size={46} color="#f97316" strokeWidth={1.8} />
              </motion.div>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
                Enter your mobile number
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 360, margin: '0 auto', lineHeight: 1.7 }}>
                We'll instantly pull up all orders linked to your number — repairs, purchases, and service tickets.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 28 }}>
                {[
                  { icon: Wrench, label: 'Repairs' },
                  { icon: CheckCircle, label: 'Purchases' },
                  { icon: Clock, label: 'Live Updates' },
                ].map((f) => (
                  <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <f.icon size={15} color="#f97316" /> {f.label}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Results / empty */}
          {!loading && searched && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {orders.length === 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} style={{ textAlign: 'center', padding: 'clamp(36px, 6vw, 64px) 0' }}>
                  <div style={{ width: 96, height: 96, margin: '0 auto 26px', borderRadius: 30, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PackageSearch size={46} color="#ef4444" strokeWidth={1.8} />
                  </div>
                  <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>No orders found</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 380, margin: '0 auto', lineHeight: 1.7 }}>
                    We couldn't find any orders for <strong style={{ color: '#f97316' }}>{mobile}</strong>. Please double-check the number and try again.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => { setSearched(false); setMobile(''); }}
                    style={{ marginTop: 28, padding: '13px 26px', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(249,115,22,0.35)', fontFamily: 'inherit' }}
                  >
                    <RefreshCw size={16} /> Try Another Number
                  </motion.button>
                </motion.div>
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-muted)' }}>
                      <span style={{ width: 34, height: 34, borderRadius: 12, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Phone size={16} color="#f97316" />
                      </span>
                      <span>
                        <strong style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{orders.length}</strong> order{orders.length > 1 ? 's' : ''} found for{' '}
                        <strong style={{ color: '#f97316', fontWeight: 800 }}>{mobile}</strong>
                      </span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={handleSearch}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <RefreshCw size={14} /> Refresh
                    </motion.button>
                  </motion.div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {orders.map((order, i) => (
                      <OrderCard key={order.id} order={order} index={i} />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── Footer ── */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid var(--border)', padding: '26px 20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-disabled)', fontSize: 13 }}>
          <StiqrLogo size={22} /> <span>Powered by StiQR · Track your orders anytime, anywhere</span>
        </div>
      </footer>
    </div>
  );
};

export default StatusLookup;
