import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, TrendingUp, Wrench, Clock, ArrowUpRight } from 'lucide-react';

const stats = [
  { label: "Today's Sales",    value: '₹8,400', change: '+12%', icon: ShoppingCart, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { label: 'Invoices Today',   value: '14',     change: '+3',   icon: TrendingUp,   color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  { label: 'Services Handled', value: '6',      change: '+1',   icon: Wrench,       color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { label: 'Shift Hours',      value: '6.5h',   change: '',     icon: Clock,        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
];

const recentActivity = [
  { type: 'sale',    desc: 'Sold iPhone 14 Screen + Battery', amount: '₹4,200', time: '14 min ago' },
  { type: 'service', desc: 'Screen repair started — Rajesh Kumar', amount: '₹1,500', time: '42 min ago' },
  { type: 'sale',    desc: 'Sold USB-C Cable × 3', amount: '₹1,050', time: '1 hr ago' },
  { type: 'service', desc: 'Battery replacement completed — Priya', amount: '₹800', time: '2 hr ago' },
];

const StaffDashboard: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>My Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })} · Shift started 09:00 AM
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -3 }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={18} color={s.color} />
              </div>
              {s.change && <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>{s.change}</span>}
            </div>
            <div>
              <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { href: '/staff/pos', emoji: '🛒', label: 'Open POS', desc: 'Process a new sale', color: '#f97316' },
              { href: '/staff/services', emoji: '🔧', label: 'Service Orders', desc: 'View pending repairs', color: '#3b82f6' },
              { href: '/staff/sales', emoji: '📊', label: 'Today\'s Sales', desc: 'View all invoices', color: '#22c55e' },
            ].map(action => (
              <motion.a key={action.href} href={action.href} whileHover={{ x: 4 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--bg-hover)', border: '1px solid var(--border)', textDecoration: 'none', transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${action.color}44`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <span style={{ fontSize: 22 }}>{action.emoji}</span>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{action.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{action.desc}</div>
                </div>
                <ArrowUpRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
              </motion.a>
            ))}
          </div>
        </motion.div>

        {/* Recent activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentActivity.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.07 }}
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: a.type === 'sale' ? 'rgba(249,115,22,0.1)' : 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                  {a.type === 'sale' ? '💰' : '🔧'}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.desc}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-disabled)' }}>{a.time}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316', flexShrink: 0 }}>{a.amount}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StaffDashboard;
