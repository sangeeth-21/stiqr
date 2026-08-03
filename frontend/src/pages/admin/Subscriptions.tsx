import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const subscriptions = [
  { id: 'SUB-001', shop: 'Mobile World', plan: 'Pro',        amount: 2999, status: 'active',   nextBilling: '2024-09-01', started: '2024-01-01' },
  { id: 'SUB-002', shop: 'Tech Hub',     plan: 'Basic',      amount: 999,  status: 'active',   nextBilling: '2024-09-01', started: '2024-02-01' },
  { id: 'SUB-003', shop: 'Phone Palace', plan: 'Enterprise', amount: 7999, status: 'active',   nextBilling: '2024-09-01', started: '2024-03-01' },
  { id: 'SUB-004', shop: 'DigiStore',    plan: 'Basic',      amount: 999,  status: 'suspended',nextBilling: '-',          started: '2024-01-01' },
  { id: 'SUB-005', shop: 'Smart Gadgets',plan: 'Pro',        amount: 2999, status: 'trial',    nextBilling: '2024-08-10', started: '2024-07-10' },
];

const planColors: Record<string, string> = { Basic: '#3b82f6', Pro: '#f97316', Enterprise: '#8b5cf6' };
const statusIcon: Record<string, React.ReactNode> = {
  active: <CheckCircle size={13} color="#22c55e" />,
  suspended: <XCircle size={13} color="#ef4444" />,
  trial: <Clock size={13} color="#f59e0b" />,
};

const Subscriptions: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Subscriptions</h1>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <table>
        <thead><tr><th>Shop</th><th>Plan</th><th>Amount/mo</th><th>Status</th><th>Next Billing</th><th>Started</th></tr></thead>
        <tbody>
          {subscriptions.map((s, i) => (
            <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.shop}</td>
              <td><span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: `${planColors[s.plan]}22`, color: planColors[s.plan] }}>{s.plan}</span></td>
              <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: '#f97316' }}>₹{s.amount.toLocaleString()}</td>
              <td><div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: s.status === 'active' ? '#22c55e' : s.status === 'trial' ? '#f59e0b' : '#ef4444' }}>{statusIcon[s.status]} {s.status.charAt(0).toUpperCase() + s.status.slice(1)}</div></td>
              <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.nextBilling}</td>
              <td style={{ fontSize: 12, color: 'var(--text-disabled)' }}>{s.started}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default Subscriptions;
