import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Download } from 'lucide-react';

const sales = [
  { id: 'INV-2024-001', customer: 'Rajesh Kumar', mobile: '9876543210', items: 3, subtotal: 3814, tax: 687, total: 4500, status: 'paid', date: '2024-08-03', paymentMode: 'UPI' },
  { id: 'INV-2024-002', customer: 'Priya Devi',   mobile: '8765432109', items: 1, subtotal: 1017, tax: 183, total: 1200, status: 'paid', date: '2024-08-03', paymentMode: 'Cash' },
  { id: 'INV-2024-003', customer: 'Arun Patel',   mobile: '7654321098', items: 5, subtotal: 7542, tax: 1358, total: 8900, status: 'pending', date: '2024-08-02', paymentMode: 'Card' },
  { id: 'INV-2024-004', customer: 'Sunita Rao',   mobile: '6543210987', items: 2, subtotal: 2712, tax: 488, total: 3200, status: 'paid', date: '2024-08-02', paymentMode: 'Cash' },
  { id: 'INV-2024-005', customer: 'Mohan Das',    mobile: '5432109876', items: 4, subtotal: 6779, tax: 1221, total: 8000, status: 'paid', date: '2024-08-01', paymentMode: 'UPI' },
  { id: 'INV-2024-006', customer: 'Kavitha V',    mobile: '4321098765', items: 1, subtotal: 2542, tax: 458, total: 3000, status: 'refunded', date: '2024-08-01', paymentMode: 'Card' },
];

const Sales: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = sales.filter(s => {
    const matchSearch = s.customer.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search) || s.mobile.includes(search);
    const matchFilter = filter === 'all' || s.status === filter;
    return matchSearch && matchFilter;
  });

  const totalRevenue = filtered.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.total, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Sales</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Total: <strong style={{ color: '#f97316' }}>₹{totalRevenue.toLocaleString()}</strong> from {filtered.filter(s => s.status === 'paid').length} invoices</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Download size={15} /> Export
          </motion.button>
          <motion.a href="/vendor/pos" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
            <Plus size={16} /> New Sale
          </motion.a>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
          <Search size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input id="sales-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by customer, mobile, invoice…" style={{ paddingLeft: 40 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'paid', 'pending', 'refunded'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: filter === f ? 'rgba(249,115,22,0.1)' : 'var(--bg-hover)', color: filter === f ? '#f97316' : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', borderColor: filter === f ? 'rgba(249,115,22,0.3)' : 'var(--border)', textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>Invoice</th><th>Customer</th><th>Mobile</th><th>Items</th><th>Subtotal</th><th>GST</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {filtered.map((sale, i) => (
                <motion.tr key={sale.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: '#f97316', fontSize: 12 }}>{sale.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sale.customer}</td>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'var(--text-muted)' }}>{sale.mobile}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{sale.items}</td>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--text-secondary)' }}>₹{sale.subtotal.toLocaleString()}</td>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--text-muted)' }}>₹{sale.tax.toLocaleString()}</td>
                  <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--text-primary)' }}>₹{sale.total.toLocaleString()}</td>
                  <td><span className="badge badge-blue">{sale.paymentMode}</span></td>
                  <td><span className={`badge badge-${sale.status === 'paid' ? 'green' : sale.status === 'pending' ? 'yellow' : 'red'}`}>{sale.status}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(sale.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Sales;
