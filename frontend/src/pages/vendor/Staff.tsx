import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Mail } from 'lucide-react';

const staff = [
  { id: '1', name: 'Arjun Kumar',  email: 'arjun@shop.com',  role: 'Technician', status: 'active', joined: '2024-01-10', sales: 124 },
  { id: '2', name: 'Vikram Nair',  email: 'vikram@shop.com', role: 'Sales',       status: 'active', joined: '2024-02-15', sales: 98 },
  { id: '3', name: 'Ravi Patel',   email: 'ravi@shop.com',   role: 'Technician', status: 'active', joined: '2024-03-01', sales: 67 },
  { id: '4', name: 'Sita Rao',     email: 'sita@shop.com',   role: 'Cashier',     status: 'suspended', joined: '2024-01-20', sales: 45 },
];

const VendorStaff: React.FC = () => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Staff Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{staff.filter(s => s.status === 'active').length} active staff members</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
          <Plus size={16} /> Add Staff
        </motion.button>
      </div>

      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input id="staff-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff…" style={{ paddingLeft: 40 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {filtered.map((member, i) => (
          <motion.div key={member.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }} whileHover={{ y: -3 }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, opacity: member.status === 'suspended' ? 0.7 : 1, transition: 'transform 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#f97316,#fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>
                  {member.name[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{member.name}</div>
                  <div style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>{member.role}</div>
                </div>
              </div>
              <span className={`badge badge-${member.status === 'active' ? 'green' : 'red'}`}>{member.status === 'active' ? 'Active' : 'Suspended'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              <Mail size={12} />{member.email}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 20, color: '#f97316' }}>{member.sales}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sales</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{member.joined}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Joined</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {showModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'var(--bg-modal)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, maxWidth: 400, width: '100%' }}>
            <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>Add Staff Member</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Full Name</label><input id="staff-name" type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Staff name" /></div>
              <div><label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Email</label><input id="staff-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="staff@shop.com" /></div>
              <div><label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Password</label><input id="staff-password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars" /></div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>Add Staff</motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default VendorStaff;
