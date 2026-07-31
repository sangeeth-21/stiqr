-- 004: Platform admin — shops, subscription plans, subscriptions, payments,
-- platform settings and admin permissions. All tables use the `siq_` prefix to
-- stay isolated from any legacy tables in the shared database.

-- 1. Shops (owned by owners)
CREATE TABLE IF NOT EXISTS siq_shops (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'IN',
  gst_number TEXT,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_siq_shops_owner ON siq_shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_siq_shops_status ON siq_shops(status);
CREATE INDEX IF NOT EXISTS idx_siq_shops_slug ON siq_shops(slug);

-- 2. Subscription plans
CREATE TABLE IF NOT EXISTS siq_subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('monthly', 'yearly', 'one_time')),
  features TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Subscriptions (one per shop, renewed/rotated over time)
CREATE TABLE IF NOT EXISTS siq_subscriptions (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES siq_shops(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES siq_subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'cancelled', 'pending', 'suspended')),
  started_at TEXT,
  expires_at TEXT,
  auto_renew INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_siq_subscriptions_shop ON siq_subscriptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_siq_subscriptions_status ON siq_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_siq_subscriptions_expires ON siq_subscriptions(expires_at);

-- 4. Payments
CREATE TABLE IF NOT EXISTS siq_payments (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES siq_shops(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES siq_subscriptions(id) ON DELETE SET NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_method TEXT,
  transaction_id TEXT,
  gateway TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_siq_payments_shop ON siq_payments(shop_id);
CREATE INDEX IF NOT EXISTS idx_siq_payments_status ON siq_payments(status);
CREATE INDEX IF NOT EXISTS idx_siq_payments_paid_at ON siq_payments(paid_at);

-- 5. Platform settings (maintenance mode, feature flags, platform config)
CREATE TABLE IF NOT EXISTS siq_platform_settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  type TEXT NOT NULL DEFAULT 'string' CHECK(type IN ('string', 'number', 'boolean', 'json')),
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. Seed subscription plans.
INSERT OR IGNORE INTO siq_subscription_plans (id, name, code, price, currency, billing_cycle, features) VALUES
  ('plan_free', 'Free', 'free', 0, 'INR', 'one_time', '{"staff":3,"shops":1}'),
  ('plan_pro', 'Pro', 'pro', 499, 'INR', 'monthly', '{"staff":20,"shops":1}'),
  ('plan_enterprise', 'Enterprise', 'enterprise', 1999, 'INR', 'monthly', '{"staff":999,"shops":99}');

-- 7. Seed default platform settings.
INSERT OR IGNORE INTO siq_platform_settings (id, key, value, type) VALUES
  ('set_maintenance_mode', 'maintenance_mode', 'false', 'boolean'),
  ('set_allow_registration', 'allow_registration', 'true', 'boolean'),
  ('set_platform_name', 'platform_name', 'StiQR', 'string');

-- 8. Platform admin permissions.
INSERT OR IGNORE INTO siq_permissions (id, code, description) VALUES
  ('perm_platform_dashboard', 'platform.dashboard', 'View platform dashboard'),
  ('perm_platform_shops_read', 'platform.shops.read', 'View shops'),
  ('perm_platform_shops_manage', 'platform.shops.manage', 'Create and update shops'),
  ('perm_platform_shops_suspend', 'platform.shops.suspend', 'Suspend or activate shops'),
  ('perm_platform_plans_manage', 'platform.plans.manage', 'Create and update subscription plans'),
  ('perm_platform_subscriptions_read', 'platform.subscriptions.read', 'View subscriptions'),
  ('perm_platform_subscriptions_manage', 'platform.subscriptions.manage', 'Manage and renew subscriptions'),
  ('perm_platform_credentials_read', 'platform.credentials.read', 'View login credentials'),
  ('perm_platform_credentials_reset', 'platform.credentials.reset', 'Reset user passwords'),
  ('perm_platform_payments_read', 'platform.payments.read', 'View payments'),
  ('perm_platform_payments_manage', 'platform.payments.manage', 'Record and refund payments'),
  ('perm_platform_reports_read', 'platform.reports.read', 'View platform reports'),
  ('perm_platform_settings_manage', 'platform.settings.manage', 'Manage platform settings');

-- 9. Grant all platform permissions to the admin role.
INSERT OR IGNORE INTO siq_role_permissions (role_id, permission_id) VALUES
  ('admin', 'perm_platform_dashboard'),
  ('admin', 'perm_platform_shops_read'),
  ('admin', 'perm_platform_shops_manage'),
  ('admin', 'perm_platform_shops_suspend'),
  ('admin', 'perm_platform_plans_manage'),
  ('admin', 'perm_platform_subscriptions_read'),
  ('admin', 'perm_platform_subscriptions_manage'),
  ('admin', 'perm_platform_credentials_read'),
  ('admin', 'perm_platform_credentials_reset'),
  ('admin', 'perm_platform_payments_read'),
  ('admin', 'perm_platform_payments_manage'),
  ('admin', 'perm_platform_reports_read'),
  ('admin', 'perm_platform_settings_manage');
