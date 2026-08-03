import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Trash2, Wrench, Clock, DollarSign } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  category: string;
  status: 'active' | 'inactive';
  ordersCount: number;
}

const mockServices: Service[] = [
  { id: '1', name: 'Screen Replacement',     description: 'Original or compatible screen replacement for all models', price: 1500, duration: '2-4 hrs',  category: 'Display',  status: 'active',   ordersCount: 28 },
  { id: '2', name: 'Battery Replacement',    description: 'OEM battery replacement with 6 month warranty',          price: 800,  duration: '1 hr',    category: 'Battery',  status: 'active',   ordersCount: 22 },
  { id: '3', name: 'Charging Port Repair',   description: 'Clean or replace charging port connector',              price: 600,  duration: '30-60 min', category: 'Charging', status: 'active',   ordersCount: 18 },
  { id: '4', name: 'Water Damage Repair',    description: 'Thorough cleaning and component repair after water damage', price: 2500, duration: '1-3 days', category: 'Advanced', status: 'active',   ordersCount: 8 },
  { id: '5', name: 'Camera Repair',          description: 'Front or rear camera module replacement',               price: 1200, duration: '2-3 hrs',  category: 'Camera',   status: 'active',   ordersCount: 11 },
  { id: '6', name: 'Software Flash',         description: 'Factory reset, OS flash and software troubleshooting',  price: 400,  duration: '1-2 hrs',  category: 'Software', status: 'inactive', ordersCount: 5 },
];

const categoryColors: Record<string, string> = {
  Display: '#f97316', Battery: '#22c55e', Charging: '#3b82f6',
  Advanced: '#8b5cf6', Camera: '#f59e0b', Software: '#6b7280',
};

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>(mockServices);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', duration: '', category: '' });

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    const newService: Service = {
      id: String(Date.now()), name: form.name, description: form.description,
      price: Number(form.price), duration: form.duration, category: form.category,
      status: 'active', ordersCount: 0,
    };
    setServices(prev => [newService, ...prev]);
    setShowModal(false);
    setForm({ name: '', description: '', price: '', duration: '', category: '' });
  };

  const toggleStatus = (id: string) => setServices(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s));
  const deleteService = (id: string) => setServices(prev => prev.filter(s => s.id !== id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Services</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{services.filter(s => s.status === 'active').length} active services</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
          <Plus size={16} /> Add Service
        </motion.button>
      </div>

      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input id="service-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services…" style={{ paddingLeft: 40 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtered.map((service, i) => (
          <motion.div key={service.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} whileHover={{ y: -4 }}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', opacity: service.status === 'inactive' ? 0.65 : 1 }}>
            {/* Color bar */}
            <div style={{ height: 4, background: categoryColors[service.category] || '#f97316' }} />
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${categoryColors[service.category] || '#f97316'}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wrench size={18} color={categoryColors[service.category] || '#f97316'} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>{service.name}</div>
                    <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: `${categoryColors[service.category] || '#f97316'}22`, color: categoryColors[service.category] || '#f97316' }}>{service.category}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => toggleStatus(service.id)}
                    style={{ width: 28, height: 28, borderRadius: 7, background: service.status === 'active' ? 'rgba(34,197,94,0.1)' : 'var(--bg-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: service.status === 'active' ? '#22c55e' : 'var(--text-muted)' }}>
                    {service.status === 'active' ? '✓' : '○'}
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => deleteService(service.id)}
                    style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                    <Trash2 size={13} />
                  </motion.button>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>{service.description}</p>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <DollarSign size={13} color="#f97316" /><span style={{ fontWeight: 700, color: '#f97316' }}>₹{service.price.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                  <Clock size={13} />{service.duration}
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                  {service.ordersCount} orders
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'var(--bg-modal)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, maxWidth: 480, width: '100%' }}>
              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>New Service</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Service Name</label><input id="svc-name" type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Screen Replacement" /></div>
                <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Description</label><textarea id="svc-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe what this service includes…" rows={3} style={{ resize: 'vertical' }} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Price (₹)</label><input id="svc-price" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="1500" /></div>
                  <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Duration</label><input id="svc-duration" type="text" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="2-4 hrs" /></div>
                </div>
                <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Category</label>
                  <select id="svc-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">Select category</option>
                    {['Display', 'Battery', 'Charging', 'Camera', 'Software', 'Advanced'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleCreate} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, boxShadow: '0 4px 12px rgba(249,115,22,0.35)' }}>
                  Create Service
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Services;
