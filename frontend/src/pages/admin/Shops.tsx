import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Phone, Users } from 'lucide-react';

const mockShops = [
  { id: '1', name: 'Mobile World', owner: 'Rajan Kumar', location: 'Chennai, TN', phone: '+91 98765 43210', staff: 5, revenue: 124500, status: 'active', plan: 'Pro' },
  { id: '2', name: 'Tech Hub', owner: 'Priya Singh', location: 'Bangalore, KA', phone: '+91 87654 32109', staff: 3, revenue: 98200, status: 'active', plan: 'Basic' },
  { id: '3', name: 'Phone Palace', owner: 'Amit Shah', location: 'Mumbai, MH', phone: '+91 76543 21098', staff: 7, revenue: 87600, status: 'active', plan: 'Enterprise' },
  { id: '4', name: 'DigiStore', owner: 'Meena Patel', location: 'Delhi, DL', phone: '+91 65432 10987', staff: 2, revenue: 65300, status: 'suspended', plan: 'Basic' },
  { id: '5', name: 'Smart Gadgets', owner: 'Kiran Reddy', location: 'Hyderabad, TS', phone: '+91 54321 09876', staff: 4, revenue: 54100, status: 'active', plan: 'Pro' },
];

const planColors: Record<string, string> = { Basic: '#3b82f6', Pro: '#f97316', Enterprise: '#8b5cf6' };

const Shops: React.FC = () => {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const filtered = mockShops.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.owner.toLowerCase().includes(search.toLowerCase()) ||
    s.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Shops</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{filtered.length} shops registered</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['grid', 'list'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: view === v ? 'linear-gradient(135deg,#f97316,#ea6c0a)' : 'var(--bg-hover)', color: view === v ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
              {v === 'grid' ? '⊞ Grid' : '≡ List'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input id="shop-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search shops…" style={{ paddingLeft: 40 }} />
      </div>

      {view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map((shop, i) => (
            <motion.div key={shop.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }} whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #f97316, #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏪</div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{shop.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{shop.owner}</div>
                  </div>
                </div>
                <span className={`badge badge-${shop.status === 'active' ? 'green' : 'red'}`}>{shop.status === 'active' ? 'Active' : 'Suspended'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}><MapPin size={13} />{shop.location}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}><Phone size={13} />{shop.phone}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}><Users size={13} />{shop.staff} staff</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>MTD Revenue</div>
                  <div style={{ fontWeight: 800, color: '#f97316', fontFamily: "'Outfit',sans-serif", fontSize: 18 }}>₹{shop.revenue.toLocaleString()}</div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 100, background: `${planColors[shop.plan]}22`, color: planColors[shop.plan], fontSize: 12, fontWeight: 700, border: `1px solid ${planColors[shop.plan]}44` }}>
                  {shop.plan}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <table>
            <thead><tr><th>Shop</th><th>Location</th><th>Staff</th><th>Plan</th><th>Revenue</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((shop, i) => (
                <motion.tr key={shop.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <td><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{shop.name}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{shop.owner}</div></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{shop.location}</td>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} color="var(--text-muted)" /><span style={{ fontWeight: 600 }}>{shop.staff}</span></div></td>
                  <td><span style={{ padding: '3px 10px', borderRadius: 100, background: `${planColors[shop.plan]}22`, color: planColors[shop.plan], fontSize: 12, fontWeight: 700 }}>{shop.plan}</span></td>
                  <td style={{ fontWeight: 700, color: '#f97316', fontFamily: "'JetBrains Mono',monospace" }}>₹{shop.revenue.toLocaleString()}</td>
                  <td><span className={`badge badge-${shop.status === 'active' ? 'green' : 'red'}`}>{shop.status === 'active' ? 'Active' : 'Suspended'}</span></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Shops;
