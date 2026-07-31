-- 005: Shop owner modules — shop profile extensions, settings, business hours,
-- GST, invoice, printer and branding. All tables use the `siq_` prefix.

-- 1. Extend shop profile.
ALTER TABLE siq_shops ADD COLUMN website TEXT;
ALTER TABLE siq_shops ADD COLUMN tagline TEXT;
ALTER TABLE siq_shops ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE siq_shops ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata';

-- 2. Shop settings (typed key-value).
CREATE TABLE IF NOT EXISTS siq_shop_settings (
  shop_id TEXT NOT NULL REFERENCES siq_shops(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  type TEXT NOT NULL DEFAULT 'string' CHECK(type IN ('string', 'number', 'boolean', 'json')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (shop_id, key)
);

-- 3. Business hours (one row per day, day 0 = Monday ... 6 = Sunday).
CREATE TABLE IF NOT EXISTS siq_shop_business_hours (
  shop_id TEXT NOT NULL REFERENCES siq_shops(id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK(day BETWEEN 0 AND 6),
  is_open INTEGER NOT NULL DEFAULT 1,
  open_time TEXT,
  close_time TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (shop_id, day)
);
CREATE INDEX IF NOT EXISTS idx_siq_shop_hours_shop ON siq_shop_business_hours(shop_id);

-- 4. GST / tax configuration.
CREATE TABLE IF NOT EXISTS siq_shop_gst (
  shop_id TEXT PRIMARY KEY REFERENCES siq_shops(id) ON DELETE CASCADE,
  gst_number TEXT,
  business_name TEXT,
  state_code TEXT,
  registered_address TEXT,
  is_registered INTEGER NOT NULL DEFAULT 1,
  tax_inclusive INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Invoice configuration and numbering.
CREATE TABLE IF NOT EXISTS siq_shop_invoice (
  shop_id TEXT PRIMARY KEY REFERENCES siq_shops(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL DEFAULT 'INV-',
  starting_number INTEGER NOT NULL DEFAULT 1,
  next_number INTEGER NOT NULL DEFAULT 1,
  footer TEXT,
  payment_terms TEXT,
  show_gst INTEGER NOT NULL DEFAULT 1,
  show_logo INTEGER NOT NULL DEFAULT 1,
  auto_increment INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Receipt / label printer configuration.
CREATE TABLE IF NOT EXISTS siq_shop_printer (
  shop_id TEXT PRIMARY KEY REFERENCES siq_shops(id) ON DELETE CASCADE,
  printer_type TEXT NOT NULL DEFAULT 'thermal' CHECK(printer_type IN ('thermal', 'dotmatrix', 'a4')),
  thermal_width INTEGER NOT NULL DEFAULT 80,
  paper_size TEXT NOT NULL DEFAULT '80mm' CHECK(paper_size IN ('58mm', '80mm', 'a4')),
  header TEXT,
  footer TEXT,
  copies INTEGER NOT NULL DEFAULT 1,
  show_barcode INTEGER NOT NULL DEFAULT 1,
  show_qr INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. Shop branding (logo, colors, receipt footer).
CREATE TABLE IF NOT EXISTS siq_shop_branding (
  shop_id TEXT PRIMARY KEY REFERENCES siq_shops(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#2563eb',
  accent_color TEXT NOT NULL DEFAULT '#f59e0b',
  theme TEXT NOT NULL DEFAULT 'light' CHECK(theme IN ('light', 'dark', 'system')),
  watermark TEXT,
  receipt_footer TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. Owner permissions for the shop module.
INSERT OR IGNORE INTO siq_permissions (id, code, description) VALUES
  ('perm_shop_read', 'shop.read', 'View shop profile, settings, business hours, GST, invoice, printer and branding'),
  ('perm_shop_update', 'shop.update', 'Update shop profile, settings, business hours, GST, invoice, printer and branding');

-- 9. Grant shop module permissions to the owner role.
INSERT OR IGNORE INTO siq_role_permissions (role_id, permission_id) VALUES
  ('owner', 'perm_shop_read'),
  ('owner', 'perm_shop_update');
