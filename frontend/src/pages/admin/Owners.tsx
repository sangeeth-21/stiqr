import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, MoreVertical, Edit, Trash2, Shield, ShieldOff, Key, Users, Mail } from 'lucide-react';

interface Owner {
  id: string;
  name: string;
  email: string;
  staffCount: number;
  status: 'active' | 'suspended';
  createdAt: string;
  shopName: string;
}

const mockOwners: Owner[] = [
  { id: '1', name: 'Rajan Kumar',   email: 'rajan@mobileshop.com',  staffCount: 5, status: 'active',    createdAt: '2024-01-15', shopName: 'Mobile World' },
  { id: '2', name: 'Priya Singh',   email: 'priya@techhub.com',     staffCount: 3, status: 'active',    createdAt: '2024-02-20', shopName: 'Tech Hub' },
  { id: '3', name: 'Amit Shah',     email: 'amit@phonepalace.com',  staffCount: 7, status: 'active',    createdAt: '2024-03-10', shopName: 'Phone Palace' },
  { id: '4', name: 'Meena Patel',   email: 'meena@digistore.com',   staffCount: 2, status: 'suspended', createdAt: '2024-01-28', shopName: 'DigiStore' },
  { id: '5', name: 'Kiran Reddy',   email: 'kiran@smartgadgets.com',staffCount: 4, status: 'active',    createdAt: '2024-04-05', shopName: 'Smart Gadgets' },
];

type ModalType = 'create' | 'edit' | 'delete' | 'suspend' | 'reset' | null;

const Owners: React.FC = () => {
  const [owners, setOwners] = useState<Owner[]>(mockOwners);
  const [search, setSearch] = useState('');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selected, setSelected] = useState<Owner | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const filtered = owners.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase()) ||
    o.shopName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAction = (type: ModalType, owner: Owner) => {
    setSelected(owner);
    setModalType(type);
    setDropdownOpen(null);
    if (type === 'edit') setForm({ name: owner.name, email: owner.email, password: '' });
  };

  const handleCreate = () => {
    setForm({ name: '', email: '', password: '' });
    setModalType('create');
  };

  const handleSubmitCreate = () => {
    const newOwner: Owner = {
      id: String(Date.now()), name: form.name, email: form.email,
      staffCount: 0, status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      shopName: `${form.name}'s Shop`,
    };
    setOwners(prev => [newOwner, ...prev]);
    setModalType(null);
  };

  const handleSuspendToggle = () => {
    if (!selected) return;
    setOwners(prev => prev.map(o => o.id === selected.id ? { ...o, status: o.status === 'active' ? 'suspended' : 'active' } : o));
    setModalType(null);
  };

  const handleDelete = () => {
    if (!selected) return;
    setOwners(prev => prev.filter(o => o.id !== selected.id));
    setModalType(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Owner Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{owners.length} total owners</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={handleCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', background: 'linear-gradient(135deg, #f97316, #ea6c0a)',
            border: 'none', borderRadius: 12, color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
          }}
        >
          <Plus size={16} /> Add Owner
        </motion.button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input id="owner-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search owners…" style={{ paddingLeft: 40 }} />
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Owner</th>
                <th>Shop</th>
                <th>Staff</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((owner, i) => (
                <motion.tr
                  key={owner.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #f97316, #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 }}>
                        {owner.name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{owner.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                          <Mail size={11} />{owner.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{owner.shopName}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} color="var(--text-muted)" />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{owner.staffCount}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${owner.status === 'active' ? 'green' : 'red'}`}>
                      <span className="status-dot" style={{ background: owner.status === 'active' ? '#22c55e' : '#ef4444', width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
                      {owner.status === 'active' ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {new Date(owner.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    <div style={{ position: 'relative' }}>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setDropdownOpen(dropdownOpen === owner.id ? null : owner.id)}
                        style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-hover)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        <MoreVertical size={15} />
                      </motion.button>
                      <AnimatePresence>
                        {dropdownOpen === owner.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                              position: 'absolute', right: 0, top: 36, zIndex: 50,
                              background: 'var(--bg-card)', border: '1px solid var(--border)',
                              borderRadius: 12, padding: 6, minWidth: 160,
                              boxShadow: 'var(--shadow-lg)',
                            }}
                          >
                            {[
                              { icon: Edit, label: 'Edit', action: () => handleAction('edit', owner) },
                              { icon: owner.status === 'active' ? ShieldOff : Shield, label: owner.status === 'active' ? 'Suspend' : 'Activate', action: () => handleAction('suspend', owner) },
                              { icon: Key, label: 'Reset Password', action: () => handleAction('reset', owner) },
                              { icon: Trash2, label: 'Delete', action: () => handleAction('delete', owner), danger: true },
                            ].map(item => (
                              <button
                                key={item.label}
                                onClick={item.action}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  width: '100%', padding: '8px 12px', borderRadius: 8,
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                                  color: (item as any).danger ? '#ef4444' : 'var(--text-secondary)',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                              >
                                <item.icon size={14} />{item.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modalType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalType(null)}
            style={{ position: 'fixed', inset: 0, background: 'var(--bg-modal)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, maxWidth: 440, width: '100%', boxShadow: 'var(--shadow-lg)' }}
            >
              {(modalType === 'create' || modalType === 'edit') && (
                <>
                  <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>
                    {modalType === 'create' ? 'Add New Owner' : `Edit ${selected?.name}`}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Full Name</label>
                      <input id="owner-name" type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" /></div>
                    <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email</label>
                      <input id="owner-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="owner@example.com" /></div>
                    {modalType === 'create' && <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Password</label>
                      <input id="owner-password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 chars with symbol" /></div>}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                    <button onClick={() => setModalType(null)} style={{ flex: 1, padding: '11px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmitCreate} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #f97316, #ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, boxShadow: '0 4px 12px rgba(249,115,22,0.35)' }}>
                      {modalType === 'create' ? 'Create Owner' : 'Save Changes'}
                    </motion.button>
                  </div>
                </>
              )}
              {modalType === 'delete' && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <Trash2 size={24} color="#ef4444" />
                    </div>
                    <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Delete Owner</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{selected?.name}</strong> and all their staff? This cannot be undone.</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setModalType(null)} style={{ flex: 1, padding: '11px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleDelete} style={{ flex: 1, padding: '11px', background: '#ef4444', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>Delete</motion.button>
                  </div>
                </>
              )}
              {modalType === 'suspend' && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      {selected?.status === 'active' ? <ShieldOff size={24} color="#f59e0b" /> : <Shield size={24} color="#22c55e" />}
                    </div>
                    <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                      {selected?.status === 'active' ? 'Suspend Owner' : 'Activate Owner'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                      {selected?.status === 'active' ? `This will immediately suspend ${selected?.name} and revoke all their sessions.` : `This will reactivate ${selected?.name}'s account.`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setModalType(null)} style={{ flex: 1, padding: '11px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleSuspendToggle} style={{ flex: 1, padding: '11px', background: selected?.status === 'active' ? '#f59e0b' : '#22c55e', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                      {selected?.status === 'active' ? 'Suspend' : 'Activate'}
                    </motion.button>
                  </div>
                </>
              )}
              {modalType === 'reset' && (
                <>
                  <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Reset Password</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Set a new password for <strong style={{ color: 'var(--text-primary)' }}>{selected?.name}</strong>.</p>
                  <input id="owner-new-password" type="password" placeholder="New password" style={{ marginBottom: 16 }} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setModalType(null)} style={{ flex: 1, padding: '11px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setModalType(null)} style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #f97316, #ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>Reset</motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Owners;
