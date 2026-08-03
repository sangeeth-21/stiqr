import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, AlertCircle, TrendingDown, CheckCircle } from 'lucide-react';
import BarcodeGenerator from '../../components/Barcode/BarcodeGenerator';

interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  supplier: string;
}

const products: Product[] = [
  { id: '1', name: 'iPhone 15 Screen',       barcode: '8901234567890', category: 'Parts',       price: 3500, stock: 12, minStock: 5,  supplier: 'Apple Parts Co.' },
  { id: '2', name: 'Samsung A54 Battery',     barcode: '8901234567891', category: 'Parts',       price: 850,  stock: 3,  minStock: 10, supplier: 'Samsung Supply' },
  { id: '3', name: 'USB-C Charging Cable',    barcode: '8901234567892', category: 'Accessories', price: 350,  stock: 45, minStock: 20, supplier: 'Generic Tech' },
  { id: '4', name: 'Tempered Glass 6.1"',     barcode: '8901234567893', category: 'Accessories', price: 120,  stock: 80, minStock: 30, supplier: 'Shield Glass' },
  { id: '5', name: 'iPhone 14 Back Panel',    barcode: '8901234567894', category: 'Parts',       price: 1800, stock: 7,  minStock: 5,  supplier: 'Apple Parts Co.' },
  { id: '6', name: 'OTG Adapter Type-C',      barcode: '8901234567895', category: 'Accessories', price: 149,  stock: 2,  minStock: 15, supplier: 'Generic Tech' },
  { id: '7', name: 'Wireless Charger 15W',    barcode: '8901234567896', category: 'Accessories', price: 799,  stock: 20, minStock: 10, supplier: 'ChargeFast' },
  { id: '8', name: 'iPhone 13 Motherboard',  barcode: '8901234567897', category: 'Parts',       price: 8500, stock: 2,  minStock: 3,  supplier: 'Apple Parts Co.' },
];

const Inventory: React.FC = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showBarcode, setShowBarcode] = useState(false);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
    const matchCat = category === 'all' || p.category === category;
    return matchSearch && matchCat;
  });

  const lowStockCount = products.filter(p => p.stock < p.minStock).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Inventory</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{products.length} products — <span style={{ color: '#f59e0b', fontWeight: 600 }}>{lowStockCount} low stock</span></p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg,#f97316,#ea6c0a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
          <Plus size={16} /> Add Product
        </motion.button>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <AlertCircle size={16} color="#f59e0b" />
          <span style={{ fontSize: 14, color: '#f59e0b', fontWeight: 600 }}>{lowStockCount} product(s) are below minimum stock level and need restocking.</span>
        </motion.div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
          <Search size={16} color="var(--text-disabled)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input id="inventory-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or barcode…" style={{ paddingLeft: 40 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'Parts', 'Accessories'].map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: category === c ? 'rgba(249,115,22,0.1)' : 'var(--bg-hover)', color: category === c ? '#f97316' : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', borderColor: category === c ? 'rgba(249,115,22,0.3)' : 'var(--border)' }}>
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showBarcode && selectedProduct ? '1fr 320px' : '1fr', gap: 20 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>Product</th><th>Barcode</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((product, i) => {
                  const isLow = product.stock < product.minStock;
                  return (
                    <motion.tr key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{product.supplier}</div>
                      </td>
                      <td><code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 4, color: 'var(--text-muted)' }}>{product.barcode}</code></td>
                      <td><span className="badge badge-blue">{product.category}</span></td>
                      <td style={{ fontWeight: 700, color: '#f97316', fontFamily: "'JetBrains Mono',monospace" }}>₹{product.price.toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 50, height: 5, borderRadius: 100, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: 100, width: `${Math.min((product.stock / (product.minStock * 2)) * 100, 100)}%`, background: isLow ? '#ef4444' : '#22c55e' }} />
                          </div>
                          <span style={{ fontWeight: 700, color: isLow ? '#ef4444' : 'var(--text-primary)', fontSize: 14 }}>{product.stock}</span>
                        </div>
                      </td>
                      <td>
                        {isLow
                          ? <span className="badge badge-red"><TrendingDown size={11} /> Low</span>
                          : <span className="badge badge-green"><CheckCircle size={11} /> OK</span>
                        }
                      </td>
                      <td>
                        <motion.button whileTap={{ scale: 0.9 }}
                          onClick={() => { setSelectedProduct(product); setShowBarcode(true); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 8, color: '#f97316', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                          🔲 Barcode
                        </motion.button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Barcode panel */}
        <AnimatePresence>
          {showBarcode && selectedProduct && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>Barcode Preview</span>
                <button onClick={() => setShowBarcode(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
              <BarcodeGenerator value={selectedProduct.barcode} productName={selectedProduct.name} price={selectedProduct.price} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Inventory;
