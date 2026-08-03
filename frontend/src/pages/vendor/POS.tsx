import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Plus, Minus, ShoppingCart, CreditCard, Banknote, Printer, X, Search } from 'lucide-react';
import BarcodeScanner from '../../components/Barcode/BarcodeScanner';

interface CartItem {
  id: string;
  name: string;
  barcode: string;
  price: number;
  qty: number;
}

const productCatalog: CartItem[] = [
  { id: '1', name: 'iPhone 15 Screen',     barcode: '8901234567890', price: 3500, qty: 1 },
  { id: '2', name: 'Samsung A54 Battery',  barcode: '8901234567891', price: 850,  qty: 1 },
  { id: '3', name: 'USB-C Charging Cable', barcode: '8901234567892', price: 350,  qty: 1 },
  { id: '4', name: 'Tempered Glass',       barcode: '8901234567893', price: 120,  qty: 1 },
  { id: '5', name: 'Phone Case (Clear)',   barcode: '8901234567894', price: 199,  qty: 1 },
  { id: '6', name: 'OTG Adapter',         barcode: '8901234567895', price: 149,  qty: 1 },
];

const POS: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [successModal, setSuccessModal] = useState(false);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;

  const addToCart = (product: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const handleScan = (barcode: string) => {
    const product = productCatalog.find(p => p.barcode === barcode);
    if (product) { addToCart(product); setScannerOpen(false); }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.id !== id));

  const handleCheckout = () => {
    setPaymentModal(false);
    setSuccessModal(true);
    setTimeout(() => { setSuccessModal(false); setCart([]); }, 3000);
  };

  const filtered = productCatalog.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.includes(search)
  );

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 108px)' }}>
      {/* Left: Product catalog */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input id="pos-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products or scan barcode…" style={{ paddingLeft: 40 }} />
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setScannerOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
              background: 'linear-gradient(135deg, #f97316, #ea6c0a)',
              border: 'none', borderRadius: 12, color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(249,115,22,0.35)', flexShrink: 0,
            }}
          >
            <Scan size={16} /> Scan
          </motion.button>
        </div>

        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: -4 }}>Point of Sale</h2>

        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, alignContent: 'start' }}>
          {filtered.map((product, i) => (
            <motion.button
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => addToCart(product)}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: 16, cursor: 'pointer',
                textAlign: 'left', fontFamily: 'inherit', transition: 'box-shadow 0.2s',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(249,115,22,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📱</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{product.name}</div>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: 'var(--text-disabled)' }}>{product.barcode}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 17, color: '#f97316' }}>₹{product.price.toLocaleString()}</span>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#f97316,#ea6c0a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={14} color="#fff" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Right: Cart */}
      <div style={{
        width: 340, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShoppingCart size={18} color="#f97316" />
          <h3 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', flex: 1 }}>Cart</h3>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 100, background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }}>
            {cart.reduce((s, i) => s + i.qty, 0)} items
          </span>
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cart is empty. Add products or scan a barcode.</p>
              </motion.div>
            ) : (
              cart.map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{item.name}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>₹{item.price.toLocaleString()}</div>
                    </div>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => removeItem(item.id)}
                      style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}>
                      <X size={13} />
                    </motion.button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateQty(item.id, -1)}
                        style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--bg-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <Minus size={13} />
                      </motion.button>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                      <motion.button whileTap={{ scale: 0.85 }} onClick={() => updateQty(item.id, 1)}
                        style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#f97316' }}>
                        <Plus size={13} />
                      </motion.button>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₹{(item.price * item.qty).toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Totals + Checkout */}
        {cart.length > 0 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
                <span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
                <span>GST (18%)</span><span>₹{tax.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 4 }}>
                <span>Total</span><span style={{ color: '#f97316' }}>₹{total.toLocaleString()}</span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setPaymentModal(true)}
              style={{
                width: '100%', padding: '13px', background: 'linear-gradient(135deg, #f97316, #ea6c0a)',
                border: 'none', borderRadius: 12, color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
              }}
            >
              <CreditCard size={17} /> Charge ₹{total.toLocaleString()}
            </motion.button>
          </div>
        )}
      </div>

      {/* Barcode scanner */}
      {scannerOpen && <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />}

      {/* Payment modal */}
      <AnimatePresence>
        {paymentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPaymentModal(false)}
            style={{ position: 'fixed', inset: 0, background: 'var(--bg-modal)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, maxWidth: 380, width: '100%' }}>
              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Payment</h2>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#f97316', fontFamily: "'Outfit',sans-serif", marginBottom: 24 }}>₹{total.toLocaleString()}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {([
                  { id: 'cash' as const, label: 'Cash', icon: Banknote, emoji: '💵' },
                  { id: 'card' as const, label: 'Card', icon: CreditCard, emoji: '💳' },
                  { id: 'upi' as const, label: 'UPI', icon: ShoppingCart, emoji: '📱' },
                ] as const).map(method => (
                  <motion.button key={method.id} whileTap={{ scale: 0.97 }} onClick={() => setPaymentMethod(method.id)}
                    style={{
                      padding: '14px 16px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, fontWeight: 600,
                      background: paymentMethod === method.id ? 'rgba(249,115,22,0.12)' : 'var(--bg-hover)',
                      border: `2px solid ${paymentMethod === method.id ? '#f97316' : 'var(--border)'}`,
                      color: paymentMethod === method.id ? '#f97316' : 'var(--text-secondary)',
                      transition: 'all 0.2s',
                    }}>
                    <span style={{ fontSize: 22 }}>{method.emoji}</span> {method.label}
                  </motion.button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setPaymentModal(false)} style={{ flex: 1, padding: '12px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Cancel</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleCheckout}
                  style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 12px rgba(249,115,22,0.4)' }}>
                  <Printer size={16} /> Print & Complete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success */}
      <AnimatePresence>
        {successModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.1, opacity: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, padding: 48, textAlign: 'center', maxWidth: 320 }}>
              <motion.div animate={{ scale: [0.8, 1.2, 1] }} transition={{ duration: 0.5 }} style={{ fontSize: 64, marginBottom: 20 }}>✅</motion.div>
              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Payment Complete!</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Receipt printed. Cart cleared.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default POS;
