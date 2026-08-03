import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const planRevenueData = [
  { month: 'Feb', basic: 18000, pro: 28000, enterprise: 15000 },
  { month: 'Mar', basic: 22000, pro: 32000, enterprise: 18000 },
  { month: 'Apr', basic: 19000, pro: 35000, enterprise: 22000 },
  { month: 'May', basic: 24000, pro: 41000, enterprise: 25000 },
  { month: 'Jun', basic: 28000, pro: 45000, enterprise: 30000 },
  { month: 'Jul', basic: 26000, pro: 48000, enterprise: 32000 },
];

const AdminReports: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Platform Reports</h1>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
      <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Revenue by Plan (6 months)</h3>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Monthly subscription revenue breakdown</p>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={planRevenueData}>
          <defs>
            {[['basicGrad','#3b82f6'],['proGrad','#f97316'],['entGrad','#8b5cf6']].map(([id, color]) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v/1000}K`} />
          <Tooltip />
          <Area type="monotone" dataKey="basic" stroke="#3b82f6" strokeWidth={2} fill="url(#basicGrad)" name="Basic" />
          <Area type="monotone" dataKey="pro" stroke="#f97316" strokeWidth={2} fill="url(#proGrad)" name="Pro" />
          <Area type="monotone" dataKey="enterprise" stroke="#8b5cf6" strokeWidth={2} fill="url(#entGrad)" name="Enterprise" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default AdminReports;
