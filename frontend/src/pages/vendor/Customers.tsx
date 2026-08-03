import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

const customers = [
  { id: '1', name: 'Rajesh Kumar', mobile: '9876543210', totalOrders: 8, totalSpent: 24500, lastVisit: '2024-08-03', type: 'regular' },
  { id: '2', name: 'Priya Nair',   mobile: '8765432109', totalOrders: 3, totalSpent: 8200,  lastVisit: '2024-08-02', type: 'new' },
  { id: '3', name: 'Arun Patel',   mobile: '7654321098', totalOrders: 15, totalSpent: 58900, lastVisit: '2024-07-30', type: 'vip' },
  { id: '4', name: 'Sunita Rao',   mobile: '6543210987', totalOrders: 5, totalSpent: 12300, lastVisit: '2024-08-01', type: 'regular' },
  { id: '5', name: 'Mohan Das',    mobile: '5432109876', totalOrders: 2, totalSpent: 3400,  lastVisit: '2024-07-28', type: 'new' },
];

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  vip:     { label: 'VIP',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  regular: { label: 'Regular', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  new:     { label: 'New',     color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
};

const Customers: React.FC = () => {
  const [search, setSearch] = useState('');

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Customers</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{customers.length} customers registered</p>
        </div>
      </div>

      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input id="customer-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or mobile…" style={{ paddingLeft: 40 }} />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Customer</th><th>Mobile</th><th>Type</th><th>Orders</th><th>Total Spent</th><th>Last Visit</th></tr></thead>
          <tbody>
            {filtered.map((c, i) => {
              const tc = typeConfig[c.type];
              return (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#f97316,#fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 }}>{c.name[0]}</div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: 'var(--text-muted)' }}>{c.mobile}</td>
                  <td><span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: tc.bg, color: tc.color }}>{tc.label}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.totalOrders}</td>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: '#f97316' }}>₹{c.totalSpent.toLocaleString()}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.lastVisit}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Customers;
