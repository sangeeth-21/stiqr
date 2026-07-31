-- 003: Roles, permissions, refresh tokens, login throttling and audit logging.
-- NOTE: New tables use the `siq_` prefix because this database may contain
-- legacy tables (roles, permissions, refresh_tokens, audit_logs, ...) from the
-- previous backend. Prefixing keeps the security schema isolated and safe.

-- 1. Extend users with status (for immediate suspension) and name.
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended'));
ALTER TABLE users ADD COLUMN name TEXT;

-- 2. Roles
CREATE TABLE IF NOT EXISTS siq_roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Permissions (granular, assignable to roles)
CREATE TABLE IF NOT EXISTS siq_permissions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Role <-> Permission mapping
CREATE TABLE IF NOT EXISTS siq_role_permissions (
  role_id TEXT NOT NULL REFERENCES siq_roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES siq_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 5. Refresh tokens (stored hashed, rotated on every use)
CREATE TABLE IF NOT EXISTS siq_refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_siq_refresh_tokens_user_id ON siq_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_siq_refresh_tokens_token_hash ON siq_refresh_tokens(token_hash);

-- 6. Login attempts (brute-force / credential stuffing protection)
CREATE TABLE IF NOT EXISTS siq_login_attempts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  ip TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_siq_login_attempts_email ON siq_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_siq_login_attempts_created_at ON siq_login_attempts(created_at);

-- 7. Audit logs (tamper-evident trail of privileged actions)
CREATE TABLE IF NOT EXISTS siq_audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_siq_audit_logs_actor ON siq_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_siq_audit_logs_action ON siq_audit_logs(action);

-- 8. Seed roles (id equals role name to keep joins simple).
INSERT OR IGNORE INTO siq_roles (id, name, description) VALUES
  ('admin', 'admin', 'Platform administrator - manages shop owners'),
  ('owner', 'owner', 'Shop owner - manages their own staff'),
  ('staff', 'staff', 'Staff member - restricted operational access');

-- 9. Seed permissions.
INSERT OR IGNORE INTO siq_permissions (id, code, description) VALUES
  ('perm_owners_read', 'owners.read', 'View shop owners'),
  ('perm_owners_manage', 'owners.manage', 'Create and update shop owners'),
  ('perm_owners_delete', 'owners.delete', 'Delete shop owners and their staff'),
  ('perm_owners_suspend', 'owners.suspend', 'Suspend or activate shop owners'),
  ('perm_owners_reset_password', 'owners.reset_password', 'Reset shop owner passwords'),
  ('perm_staff_read', 'staff.read', 'View own staff members'),
  ('perm_staff_manage', 'staff.manage', 'Create and update staff members'),
  ('perm_staff_delete', 'staff.delete', 'Delete staff members'),
  ('perm_staff_suspend', 'staff.suspend', 'Suspend or activate staff members'),
  ('perm_staff_reset_password', 'staff.reset_password', 'Reset staff passwords'),
  ('perm_roles_read', 'roles.read', 'View roles and permissions'),
  ('perm_audit_read', 'audit.read', 'View audit logs');

-- 10. Admin role can only manage owners (never staff directly).
INSERT OR IGNORE INTO siq_role_permissions (role_id, permission_id) VALUES
  ('admin', 'perm_owners_read'),
  ('admin', 'perm_owners_manage'),
  ('admin', 'perm_owners_delete'),
  ('admin', 'perm_owners_suspend'),
  ('admin', 'perm_owners_reset_password'),
  ('admin', 'perm_roles_read'),
  ('admin', 'perm_audit_read');

-- 11. Owner role can only manage their own staff.
INSERT OR IGNORE INTO siq_role_permissions (role_id, permission_id) VALUES
  ('owner', 'perm_staff_read'),
  ('owner', 'perm_staff_manage'),
  ('owner', 'perm_staff_delete'),
  ('owner', 'perm_staff_suspend'),
  ('owner', 'perm_staff_reset_password');
