import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Wrench, Phone, Clock, ChevronRight } from 'lucide-react';

const serviceOrders = [
  { id: 'SRV-001', customer: 'Rajesh Kumar', mobile: '9876543210', service: 'Screen Replacement', device: 'iPhone 14 Pro', status: 'in_service', received: '2024-08-02', expected: '2024-08-03', tech: 'Arjun', amount: 3500 },
  { id: 'SRV-002', customer: 'Priya Nair',   mobile: '8765432109', service: 'Battery Replacement',  device: 'Samsung S23',   status: 'pending',    received: '2024-08-03', expected: '2024-08-03', tech: 'Vikram', amount: 800 },
  { id: 'SRV-003', customer: 'Suresh Babu',  mobile: '7654321098', service: 'Water Damage Repair',  device: 'OnePlus 11',    status: 'completed',  received: '2024-08-01', expected: '2024-08-03', tech: 'Arjun', amount: 2800 },
  { id: 'SRV-004', customer: 'Meena R',      mobile: '6543210987', service: 'Charging Port Fix',    device: 'Redmi Note 12', status: 'ready',      received: '2024-08-02', expected: '2024-08-02', tech: 'Vikram', amount: 600 },
  { id: 'SRV-005', customer: 'Kiran M',      mobile: '5432109876', service: 'Camera Repair',        device: 'iPhone 13',     status: 'in_service', received: '2024-08-03', expected: '2024-08-04', tech: 'Ravi', amount: 1200 },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  in_service: { label: 'In Service', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  ready:      { label: 'Ready',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  completed:  { label: 'Completed',  color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  cancelled:  { label: 'Cancelled',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const statusOrder = ['pending', 'in_service', 'ready', 'completed'];

const ServiceOrders: React.FC = () => {
  const [orders, setOrders] = useState(serviceOrders);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = orders.filter(o => {
    const matchSearch = o.customer.toLowerCase().includes(search.toLowerCase()) || o.mobile.includes(search) || o.id.includes(search);
    const matchFilter = filter === 'all' || o.status === filter;
    return matchSearch && matchFilter;
  });

  const advanceStatus = (id: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const idx = statusOrder.indexOf(o.status);
      return { ...o, status: idx < statusOrder.length - 1 ? statusOrder[idx + 1] : o.status };
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Service Orders</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{orders.filter(o => o.status !== 'completed').length} active service orders</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
          <Plus size={16} /> New Order
        </motion.button>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
          <Search size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input id="svc-order-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer, mobile…" style={{ paddingLeft: 40 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'pending', 'in_service', 'ready', 'completed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: filter === s ? 'rgba(249,115,22,0.1)' : 'var(--bg-hover)', color: filter === s ? '#f97316' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', borderColor: filter === s ? 'rgba(249,115,22,0.3)' : 'var(--border)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
              {s === 'in_service' ? 'In Service' : s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map((order, i) => {
          const sc = statusConfig[order.status] || statusConfig.pending;
          return (
            <motion.div key={order.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ height: 3, background: sc.color }} />
              <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2, fontFamily: "'JetBrains Mono',monospace" }}>{order.id}</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{order.customer}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}><Phone size={11} />{order.mobile}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}><Wrench size={12} style={{ display: 'inline', marginRight: 4 }} />{order.service}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📱 {order.device}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>🔧 {order.tech}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Received: {order.received}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}><Clock size={11} /> Expected: {order.expected}</div>
                    <div style={{ fontWeight: 700, color: '#f97316', fontSize: 14, marginTop: 2 }}>₹{order.amount.toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ padding: '5px 12px', borderRadius: 100, background: sc.bg, color: sc.color, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>{sc.label}</div>
                    {order.status !== 'completed' && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => advanceStatus(order.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                        Advance <ChevronRight size={12} />
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ServiceOrders;
