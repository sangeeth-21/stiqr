import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    platformName: 'StiQR', supportEmail: 'support@stiqr.com',
    maintenanceMode: false, allowRegistration: true,
    defaultTrialDays: '14', maxStaffPerOwner: '20',
  });
  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(249,115,22,0.04)' }}>
        <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );

  const Toggle = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div><div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{label}</div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div></div>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => onChange(!value)}
        style={{ width: 44, height: 24, borderRadius: 100, background: value ? '#f97316' : 'var(--bg-tertiary)', border: `1.5px solid ${value ? '#f97316' : 'var(--border)'}`, cursor: 'pointer', padding: '0 3px', display: 'flex', alignItems: 'center', transition: 'background 0.2s, border-color 0.2s', flexShrink: 0 }}>
        <motion.div animate={{ x: value ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
      </motion.button>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Platform Settings</h1>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSave}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: saved ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg,#f97316,#ea6c0a)', border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none', borderRadius: 12, color: saved ? '#22c55e' : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.3s' }}>
          <Save size={16} />{saved ? 'Saved ✓' : 'Save'}
        </motion.button>
      </div>

      <Section title="⚙️ General">
        <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Platform Name</label><input id="platform-name" type="text" value={settings.platformName} onChange={e => setSettings(s => ({ ...s, platformName: e.target.value }))} /></div>
        <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Support Email</label><input id="support-email" type="email" value={settings.supportEmail} onChange={e => setSettings(s => ({ ...s, supportEmail: e.target.value }))} /></div>
      </Section>

      <Section title="🔒 Access Control">
        <Toggle label="Maintenance Mode" desc="Disables all non-admin logins when enabled" value={settings.maintenanceMode} onChange={v => setSettings(s => ({ ...s, maintenanceMode: v }))} />
        <Toggle label="Allow New Registrations" desc="Allow new owner accounts to be created" value={settings.allowRegistration} onChange={v => setSettings(s => ({ ...s, allowRegistration: v }))} />
      </Section>

      <Section title="📋 Limits">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Trial Days</label><input id="trial-days" type="number" value={settings.defaultTrialDays} onChange={e => setSettings(s => ({ ...s, defaultTrialDays: e.target.value }))} /></div>
          <div><label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Max Staff/Owner</label><input id="max-staff" type="number" value={settings.maxStaffPerOwner} onChange={e => setSettings(s => ({ ...s, maxStaffPerOwner: e.target.value }))} /></div>
        </div>
      </Section>
    </div>
  );
};

export default AdminSettings;
