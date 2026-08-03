import React from 'react';
import { motion } from 'framer-motion';

const payments = [
  { id: 'PAY-001', shop: 'Mobile World', amount: 2999, plan: 'Pro', method: 'UPI', status: 'success', date: '2024-08-01', txnId: 'UPI8901234567' },
  { id: 'PAY-002', shop: 'Tech Hub', amount: 999, plan: 'Basic', method: 'Card', status: 'success', date: '2024-08-01', txnId: 'CARD7654321098' },
  { id: 'PAY-003', shop: 'Phone Palace', amount: 7999, plan: 'Enterprise', method: 'NEFT', status: 'success', date: '2024-08-01', txnId: 'NEFT6543210987' },
  { id: 'PAY-004', shop: 'DigiStore', amount: 999, plan: 'Basic', method: 'Card', status: 'failed', date: '2024-07-01', txnId: 'CARD5432109876' },
  { id: 'PAY-005', shop: 'Smart Gadgets', amount: 2999, plan: 'Pro', method: 'UPI', status: 'pending', date: '2024-08-03', txnId: '-' },
];

const Payments: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div>
      <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Payments</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Total collected: <strong style={{ color: '#f97316' }}>₹{payments.filter(p=>p.status==='success').reduce((s,p)=>s+p.amount,0).toLocaleString()}</strong></p>
    </div>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <table>
        <thead><tr><th>Payment ID</th><th>Shop</th><th>Plan</th><th>Amount</th><th>Method</th><th>Txn ID</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          {payments.map((p, i) => (
            <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#f97316', fontWeight: 600 }}>{p.id}</td>
              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.shop}</td>
              <td><span className="badge badge-orange">{p.plan}</span></td>
              <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: 'var(--text-primary)' }}>₹{p.amount.toLocaleString()}</td>
              <td><span className="badge badge-blue">{p.method}</span></td>
              <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--text-disabled)' }}>{p.txnId}</td>
              <td><span className={`badge badge-${p.status === 'success' ? 'green' : p.status === 'pending' ? 'yellow' : 'red'}`}>{p.status}</span></td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.date}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default Payments;
