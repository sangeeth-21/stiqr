import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';

const VendorSettings: React.FC = () => {
  const [form, setForm] = useState({
    shopName: 'Mobile World', ownerName: 'Rajan Kumar', phone: '9876543210',
    email: 'rajan@mobileshop.com', address: 'No. 45, Anna Salai, Chennai - 600002',
    gstNumber: '33AABCM1234Z1Z5', invoicePrefix: 'INV', receiptFooter: 'Thank you for your business!',
    currency: 'INR', taxRate: '18',
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(249,115,22,0.04)' }}>
        <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );

  const Field = ({ label, id, type = 'text', value, onChange, placeholder }: { label: string; id: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</label>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Shop Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage your shop profile and preferences</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
            background: saved ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg,#f97316,#ea6c0a)',
            border: saved ? '1px solid rgba(34,197,94,0.4)' : 'none',
            borderRadius: 12, color: saved ? '#22c55e' : '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: saved ? 'none' : '0 4px 14px rgba(249,115,22,0.35)',
            transition: 'all 0.3s',
          }}>
          <Save size={16} /> {saved ? 'Saved ✓' : 'Save Changes'}
        </motion.button>
      </div>

      <Section title="🏪 Shop Profile">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Shop Name" id="shop-name" value={form.shopName} onChange={v => setForm(f => ({ ...f, shopName: v }))} placeholder="My Mobile Shop" />
          <Field label="Owner Name" id="owner-name" value={form.ownerName} onChange={v => setForm(f => ({ ...f, ownerName: v }))} placeholder="Your name" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Phone" id="shop-phone" type="tel" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="9876543210" />
          <Field label="Email" id="shop-email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="shop@email.com" />
        </div>
        <Field label="Address" id="shop-address" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="Full address" />
      </Section>

      <Section title="🧾 GST & Tax">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="GSTIN Number" id="gst-number" value={form.gstNumber} onChange={v => setForm(f => ({ ...f, gstNumber: v }))} placeholder="22AAAAA0000A1Z5" />
          <Field label="Default Tax Rate (%)" id="tax-rate" type="number" value={form.taxRate} onChange={v => setForm(f => ({ ...f, taxRate: v }))} placeholder="18" />
        </div>
      </Section>

      <Section title="🖨️ Invoice & Receipt">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Invoice Prefix" id="inv-prefix" value={form.invoicePrefix} onChange={v => setForm(f => ({ ...f, invoicePrefix: v }))} placeholder="INV" />
          <Field label="Currency" id="currency" value={form.currency} onChange={v => setForm(f => ({ ...f, currency: v }))} placeholder="INR" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Receipt Footer Message</label>
          <textarea id="receipt-footer" value={form.receiptFooter} onChange={e => setForm(f => ({ ...f, receiptFooter: e.target.value }))} rows={3} placeholder="Thank you for your business!" style={{ resize: 'vertical' }} />
        </div>
      </Section>
    </div>
  );
};

export default VendorSettings;
