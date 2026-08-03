import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Search, Package, Clock, CheckCircle, Wrench, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  pending:    { label: 'Pending',     color: '#f59e0b', icon: <Clock size={16} />,        bg: 'rgba(245,158,11,0.12)'  },
  processing: { label: 'Processing',  color: '#3b82f6', icon: <Package size={16} />,      bg: 'rgba(59,130,246,0.12)'  },
  ready:      { label: 'Ready',       color: '#22c55e', icon: <CheckCircle size={16} />,  bg: 'rgba(34,197,94,0.12)'   },
  completed:  { label: 'Completed',   color: '#22c55e', icon: <CheckCircle size={16} />,  bg: 'rgba(34,197,94,0.12)'   },
  in_service: { label: 'In Service',  color: '#f97316', icon: <Wrench size={16} />,       bg: 'rgba(249,115,22,0.12)'  },
  cancelled:  { label: 'Cancelled',   color: '#ef4444', icon: <AlertCircle size={16} />,  bg: 'rgba(239,68,68,0.12)'   },
};

const StatusLookup: React.FC = () => {
  const [mobile, setMobile] = useState('');
  const [orders, setOrders] = useState<OrderStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
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
        { id: '1', orderNumber: 'ORD-2024-001', status: 'in_service', customerName: 'Demo Customer', shopName: 'Mobile World', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), items: [{ name: 'Screen Replacement', qty: 1, price: 1500 }, { name: 'Battery', qty: 1, price: 500 }], total: 2000, notes: 'Screen replacement in progress. Expected: Tomorrow 5 PM' },
        { id: '2', orderNumber: 'ORD-2024-002', status: 'completed',  customerName: 'Demo Customer', shopName: 'Mobile World', createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(), items: [{ name: 'Charger Port Repair', qty: 1, price: 800 }], total: 800 },
      ]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', fontFamily: "'Inter',sans-serif" }}>
      {/* Header */}
      <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/login')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, fontFamily: 'inherit' }}
        >
          <ArrowLeft size={16} /> Back to Login
        </motion.button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
          <StiqrLogo size={32} showText={true} subtitle="Order Status" animated={true} />
        </div>
        <ThemeToggle />
      </header>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #f97316 0%, #ea6c0a 100%)',
        padding: '60px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 36, fontWeight: 900, color: '#fff', marginBottom: 10 }}>
            Track Your Order
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, marginBottom: 40 }}>
            Enter your mobile number to check the status of your repair or purchase
          </p>
          {/* Search form */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, maxWidth: 480, margin: '0 auto' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Phone size={18} color="rgba(249,115,22,0.7)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                id="status-mobile"
                type="tel"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="Enter mobile number"
                required
                style={{
                  paddingLeft: 44, background: '#fff', border: 'none',
                  borderRadius: 12, color: '#111', fontSize: 16,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                }}
              />
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              disabled={loading}
              style={{
                padding: '11px 24px', background: '#fff', border: 'none', borderRadius: 12,
                color: '#f97316', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                fontFamily: 'inherit',
              }}
            >
              {loading ? <div className="spinner" style={{ borderTopColor: '#f97316', width: 18, height: 18 }} /> : <Search size={18} />}
              Search
            </motion.button>
          </form>
        </motion.div>
      </div>

      {/* Results */}
      <div style={{ width: '100%', padding: '40px 24px' }}>
        <AnimatePresence>
          {searched && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>No orders found</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No orders found for mobile number <strong>{mobile}</strong>. Please check the number and try again.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>
                    Found <strong style={{ color: 'var(--text-primary)' }}>{orders.length}</strong> order(s) for <strong style={{ color: '#f97316' }}>{mobile}</strong>
                  </p>
                  {orders.map((order, i) => {
                    const sc = statusConfig[order.status] || statusConfig.pending;
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        style={{
                          background: 'var(--bg-card)', border: '1px solid var(--border)',
                          borderRadius: 16, overflow: 'hidden',
                          boxShadow: 'var(--shadow)',
                        }}
                      >
                        {/* Status bar top */}
                        <div style={{ height: 4, background: sc.color }} />
                        <div style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{order.orderNumber}</div>
                              {order.shopName && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>📍 {order.shopName}</div>}
                            </div>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 12px', borderRadius: 100,
                              background: sc.bg, color: sc.color,
                              fontSize: 13, fontWeight: 600, flexShrink: 0,
                            }}>
                              {sc.icon}
                              {sc.label}
                            </div>
                          </div>

                          {/* Items */}
                          {order.items && order.items.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Items</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {order.items.map((item, j) => (
                                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{item.name} × {item.qty}</span>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>₹{item.price.toLocaleString()}</span>
                                  </div>
                                ))}
                                {order.total !== undefined && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 4 }}>
                                    <span style={{ color: 'var(--text-primary)' }}>Total</span>
                                    <span style={{ color: '#f97316' }}>₹{order.total.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {order.notes && (
                            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                              💬 {order.notes}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-disabled)' }}>
                            <span>Created: {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span>Updated: {new Date(order.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!searched && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '60px 0' }}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>📱</div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Enter your mobile number</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>We'll find all orders associated with your number</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default StatusLookup;
