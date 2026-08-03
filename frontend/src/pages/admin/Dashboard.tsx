import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Store, Users, DollarSign, AlertCircle, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

const revenueData = [
  { month: 'Jan', revenue: 42000, subscriptions: 18 },
  { month: 'Feb', revenue: 58000, subscriptions: 24 },
  { month: 'Mar', revenue: 51000, subscriptions: 21 },
  { month: 'Apr', revenue: 73000, subscriptions: 32 },
  { month: 'May', revenue: 68000, subscriptions: 29 },
  { month: 'Jun', revenue: 89000, subscriptions: 38 },
  { month: 'Jul', revenue: 94000, subscriptions: 42 },
];

const planData = [
  { name: 'Basic', value: 45, color: '#f97316' },
  { name: 'Pro', value: 35, color: '#fb923c' },
  { name: 'Enterprise', value: 20, color: '#fed7aa' },
];

const topShops = [
  { name: 'Mobile World', owner: 'Rajan Kumar', revenue: '₹1,24,500', status: 'active', growth: '+12%' },
  { name: 'Tech Hub', owner: 'Priya Singh', revenue: '₹98,200', status: 'active', growth: '+8%' },
  { name: 'Phone Palace', owner: 'Amit Shah', revenue: '₹87,600', status: 'active', growth: '+15%' },
  { name: 'DigiStore', owner: 'Meena Patel', revenue: '₹65,300', status: 'suspended', growth: '-3%' },
  { name: 'Smart Gadgets', owner: 'Kiran Reddy', revenue: '₹54,100', status: 'active', growth: '+5%' },
];

const stats = [
  { label: 'Total Shops',     value: '142',     change: '+8',     up: true,  icon: Store,       color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  { label: 'Active Owners',   value: '138',     change: '+5',     up: true,  icon: Users,       color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  { label: 'Monthly Revenue', value: '₹94K',    change: '+18%',   up: true,  icon: DollarSign,  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { label: 'Suspended',       value: '4',       change: '-2',     up: false, icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow)' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
          {p.name}: {p.name === 'revenue' ? `₹${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
            Platform Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <Activity size={14} color="#22c55e" />
          <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>Platform Live</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '20px 22px',
              display: 'flex', flexDirection: 'column', gap: 12,
              cursor: 'default', transition: 'box-shadow 0.2s, transform 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={20} color={stat.color} />
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 700,
                color: stat.up ? '#22c55e' : '#ef4444',
              }}>
                {stat.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {stat.change}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif", lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Revenue chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Platform Revenue</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Monthly subscription revenue</p>
            </div>
            <div style={{ padding: '4px 12px', borderRadius: 100, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', fontSize: 12, color: '#f97316', fontWeight: 600 }}>
              +18% vs last month
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ fill: '#f97316', r: 4 }} activeDot={{ r: 6, fill: '#f97316' }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Plan distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}
        >
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Plan Distribution</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Active subscription plans</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={planData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                {planData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(val) => [`${val}%`, '']} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {planData.map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Top Shops */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Top Performing Shops</h3>
          <a href="/admin/shops" style={{ fontSize: 13, color: '#f97316', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            View all <ArrowUpRight size={14} />
          </a>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Shop Name</th>
                <th>Owner</th>
                <th>Revenue (MTD)</th>
                <th>Growth</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {topShops.map((shop, i) => (
                <motion.tr
                  key={shop.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.06 }}
                >
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #f97316, #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700 }}>
                        {shop.name[0]}
                      </div>
                      {shop.name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{shop.owner}</td>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'JetBrains Mono',monospace" }}>{shop.revenue}</td>
                  <td>
                    <span style={{ color: shop.growth.startsWith('+') ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 3 }}>
                      {shop.growth.startsWith('+') ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {shop.growth}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${shop.status === 'active' ? 'green' : 'red'}`}>
                      <span className="status-dot" style={{ background: shop.status === 'active' ? '#22c55e' : '#ef4444' }} />
                      {shop.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
