import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus } from 'lucide-react';

const purchases = [
  { id: 'PO-001', supplier: 'Apple Parts Co.',  items: 5, total: 24500, status: 'received', date: '2024-08-02', invoice: 'APC-2024-089' },
  { id: 'PO-002', supplier: 'Samsung Supply',   items: 3, total: 8700,  status: 'pending',  date: '2024-08-03', invoice: 'SS-2024-234' },
  { id: 'PO-003', supplier: 'Generic Tech',     items: 10, total: 5200, status: 'received', date: '2024-08-01', invoice: 'GT-2024-567' },
  { id: 'PO-004', supplier: 'Shield Glass',     items: 50, total: 3000, status: 'received', date: '2024-07-30', invoice: 'SG-2024-901' },
  { id: 'PO-005', supplier: 'ChargeFast',       items: 20, total: 9800, status: 'transit',  date: '2024-08-03', invoice: 'CF-2024-112' },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  transit:  { label: 'In Transit', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  received: { label: 'Received',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  cancelled:{ label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const Purchases: React.FC = () => {
  const [search, setSearch] = useState('');

  const filtered = purchases.filter(p =>
    p.supplier.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search)
  );

  const totalSpent = purchases.filter(p => p.status === 'received').reduce((s, p) => s + p.total, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Purchases</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Total purchased: <strong style={{ color: '#f97316' }}>₹{totalSpent.toLocaleString()}</strong></p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
          <Plus size={16} /> New Purchase
        </motion.button>
      </div>

      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input id="purchase-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search purchases…" style={{ paddingLeft: 40 }} />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>PO Number</th><th>Supplier</th><th>Invoice</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {filtered.map((po, i) => {
              const sc = statusConfig[po.status] || statusConfig.pending;
              return (
                <motion.tr key={po.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: '#f97316', fontSize: 12 }}>{po.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{po.supplier}</td>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--text-muted)' }}>{po.invoice}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{po.items}</td>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--text-primary)' }}>₹{po.total.toLocaleString()}</td>
                  <td><span style={{ padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: sc.bg, color: sc.color }}>{sc.label}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{po.date}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Purchases;
