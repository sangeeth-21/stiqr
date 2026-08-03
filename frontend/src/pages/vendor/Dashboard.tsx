import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart, DollarSign, Package, ArrowUpRight, Wrench } from 'lucide-react';

const salesData = [
  { day: 'Mon', sales: 12400, purchases: 8200 },
  { day: 'Tue', sales: 9800, purchases: 6100 },
  { day: 'Wed', sales: 15600, purchases: 11200 },
  { day: 'Thu', sales: 18200, purchases: 9800 },
  { day: 'Fri', sales: 22100, purchases: 14500 },
  { day: 'Sat', sales: 28400, purchases: 18700 },
  { day: 'Sun', sales: 19800, purchases: 12300 },
];

const serviceData = [
  { name: 'Screen Fix', count: 28, revenue: 42000 },
  { name: 'Battery', count: 22, revenue: 17600 },
  { name: 'Charging Port', count: 18, revenue: 14400 },
  { name: 'Camera', count: 11, revenue: 22000 },
  { name: 'Water Dmg', count: 8, revenue: 32000 },
];

const stats = [
  { label: "Today's Sales",   value: '₹28,400', change: '+24%', up: true,  icon: ShoppingCart, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { label: 'Month Revenue',  value: '₹1.86L',  change: '+18%', up: true,  icon: DollarSign,   color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  { label: 'Items Sold',     value: '847',      change: '+12%', up: true,  icon: Package,      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { label: 'Pending Services', value: '12',     change: '-3',   up: false, icon: Wrench,       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
];

const recentSales = [
  { id: 'INV-001', customer: 'Rajesh Kumar', items: 3, total: 4500, status: 'paid', time: '10 min ago' },
  { id: 'INV-002', customer: 'Priya Devi',   items: 1, total: 1200, status: 'paid', time: '32 min ago' },
  { id: 'INV-003', customer: 'Arun Patel',   items: 5, total: 8900, status: 'pending', time: '1 hr ago' },
  { id: 'INV-004', customer: 'Sunita Rao',   items: 2, total: 3200, status: 'paid', time: '2 hr ago' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow)' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
          {p.name}: ₹{p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const VendorDashboard: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>Shop Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        <motion.a href="/vendor/pos" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
          background: 'linear-gradient(135deg, #f97316, #ea6c0a)', borderRadius: 12, color: '#fff',
          fontFamily: 'inherit', fontSize: 14, fontWeight: 700, textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
        }}>
          <ShoppingCart size={16} /> Open POS
        </motion.a>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -3 }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, transition: 'transform 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={19} color={s.color} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: s.up ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 2 }}>
                <ArrowUpRight size={13} />{s.change}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Outfit',sans-serif", color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        {/* Sales vs Purchases chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Weekly Sales vs Purchases</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>This week's performance</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesData} barSize={16} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="sales" fill="#f97316" radius={[5,5,0,0]} name="sales" />
              <Bar dataKey="purchases" fill="rgba(249,115,22,0.3)" radius={[5,5,0,0]} name="purchases" />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}><div style={{ width: 10, height: 10, borderRadius: 3, background: '#f97316' }} />Sales</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}><div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(249,115,22,0.3)' }} />Purchases</div>
          </div>
        </motion.div>

        {/* Top services */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Top Services</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>This month's service revenue</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {serviceData.map((s, i) => (
              <div key={s.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.name}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>₹{s.revenue.toLocaleString()}</span>
                </div>
                <div style={{ height: 5, borderRadius: 100, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.count / 28) * 100}%` }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.6 }}
                    style={{ height: '100%', borderRadius: 100, background: `linear-gradient(90deg, #f97316, #fb923c)` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Sales */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Sales</h3>
          <a href="/vendor/sales" style={{ fontSize: 13, color: '#f97316', fontWeight: 600 }}>View all →</a>
        </div>
        <table>
          <thead><tr><th>Invoice</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Time</th></tr></thead>
          <tbody>
            {recentSales.map((sale, i) => (
              <motion.tr key={sale.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 + i * 0.06 }}>
                <td style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: '#f97316', fontSize: 13 }}>{sale.id}</td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sale.customer}</td>
                <td style={{ color: 'var(--text-muted)' }}>{sale.items} item{sale.items !== 1 ? 's' : ''}</td>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono',monospace" }}>₹{sale.total.toLocaleString()}</td>
                <td><span className={`badge badge-${sale.status === 'paid' ? 'green' : 'yellow'}`}>{sale.status === 'paid' ? 'Paid' : 'Pending'}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{sale.time}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
};

export default VendorDashboard;
