import { requireAuth, jwtSign, jwtVerify, hashPassword } from '../main';

export function authRoutes(app: any) {
  app.post('/api/auth/register', async (c) => {
    try {
      const { shopName, ownerName, email, mobile, password } = await c.req.json();
      if (!shopName || !ownerName || !email || !mobile || !password) {
        return c.json({ error: 'All fields required' }, 400);
      }
      const db = c.env.DB;
      const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      if (existing) return c.json({ error: 'Email already registered' }, 409);
      const userId = crypto.randomUUID();
      const shopId = crypto.randomUUID();
      const now = new Date().toISOString();
      const hashedPw = await hashPassword(password);
      const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const tenantId = crypto.randomUUID();
      await db.batch([
        db.prepare(`INSERT INTO tenants (id, name, slug, email, phone, isActive, createdAt, updatedAt) VALUES (?,?,?,?,?,1,?,?)`).bind(tenantId, shopName, `${slug}-${tenantId.slice(0,8)}`, email, mobile, now, now),
        db.prepare(`INSERT INTO shops (id, name, slug, isActive, createdAt, updatedAt) VALUES (?,?,?,1,?,?)`).bind(shopId, shopName, `${slug}-${userId.slice(0,8)}`, now, now),
        db.prepare(`INSERT INTO users (id, email, name, phone, password, role, status, shopId, tenantId, emailVerified, phoneVerified, failedAttempts, createdAt, updatedAt) VALUES (?,?,?,?,?,'OWNER','ACTIVE',?,?,1,1,0,?,?)`).bind(userId, email, ownerName, mobile, hashedPw, shopId, tenantId, now, now),
      ]);
      const token = await jwtSign({ sub: userId, email, role: 'OWNER', shopId, tenantId }, c.env.JWT_SECRET);
      return c.json({ data: { id: userId, email, name: ownerName, role: 'OWNER', shopId, tenantId, token } }, 201);
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/auth/login', async (c) => {
    try {
      const { email, password } = await c.req.json();
      if (!email || !password) return c.json({ error: 'Email and password required' }, 400);
      const db = c.env.DB;
      const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as any;
      if (!user) return c.json({ error: 'Invalid credentials' }, 401);
      if (user.status === 'SUSPENDED') return c.json({ error: 'Account suspended' }, 403);
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) return c.json({ error: 'Account locked. Try later.' }, 423);
      const hashed = await hashPassword(password);
      if (user.password !== hashed) {
        const attempts = (user.failedAttempts || 0) + 1;
        if (attempts >= 5) {
          const lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
          await db.prepare('UPDATE users SET failedAttempts = ?, lockedUntil = ? WHERE id = ?').bind(attempts, lockUntil, user.id).run();
          return c.json({ error: 'Account locked due to multiple failed attempts. Try again in 30 minutes.' }, 423);
        }
        await db.prepare('UPDATE users SET failedAttempts = ? WHERE id = ?').bind(attempts, user.id).run();
        return c.json({ error: 'Invalid credentials' }, 401);
      }
      await db.prepare('UPDATE users SET failedAttempts = 0, lastLoginAt = ? WHERE id = ?').bind(new Date().toISOString(), user.id).run();
      const token = await jwtSign({ sub: user.id, email: user.email, role: user.role, shopId: user.shopId || '', tenantId: user.tenantId || '' }, c.env.JWT_SECRET);
      const refreshToken = crypto.randomUUID();
      await db.prepare('INSERT INTO refresh_tokens (id, userId, token, expiresAt, createdAt) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), user.id, refreshToken, new Date(Date.now() + 7*24*60*60*1000).toISOString(), new Date().toISOString()).run();
      return c.json({ accessToken: token, refreshToken, expiresIn: 3600, user: { id: user.id, email: user.email, name: user.name, role: user.role, shopId: user.shopId, tenantId: user.tenantId } });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/auth/refresh', async (c) => {
    try {
      const { refreshToken } = await c.req.json();
      if (!refreshToken) return c.json({ error: 'Refresh token required' }, 400);
      const db = c.env.DB;
      const stored = await db.prepare('SELECT * FROM refresh_tokens WHERE token = ? AND expiresAt > ?').bind(refreshToken, new Date().toISOString()).first() as any;
      if (!stored) return c.json({ error: 'Invalid or expired refresh token' }, 401);
      await db.prepare('DELETE FROM refresh_tokens WHERE id = ?').bind(stored.id).run();
      const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(stored.userId).first() as any;
      if (!user) return c.json({ error: 'User not found' }, 404);
      const token = await jwtSign({ sub: user.id, email: user.email, role: user.role, shopId: user.shopId || '', tenantId: user.tenantId || '' }, c.env.JWT_SECRET);
      const newRefresh = crypto.randomUUID();
      await db.prepare('INSERT INTO refresh_tokens (id, userId, token, expiresAt, createdAt) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), user.id, newRefresh, new Date(Date.now() + 7*24*60*60*1000).toISOString(), new Date().toISOString()).run();
      return c.json({ accessToken: token, refreshToken: newRefresh, expiresIn: 3600 });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/auth/logout', requireAuth, async (c) => {
    try {
      const token = c.req.header('Authorization')?.slice(7);
      await c.env.DB.prepare('DELETE FROM refresh_tokens WHERE userId = ?').bind(c.var.userId).run();
      return c.json({ message: 'Logged out successfully' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/auth/logout-all', requireAuth, async (c) => {
    try {
      await c.env.DB.prepare('DELETE FROM refresh_tokens WHERE userId = ?').bind(c.var.userId).run();
      return c.json({ message: 'Logged out from all devices' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/auth/forgot-password', async (c) => {
    try {
      const { email } = await c.req.json();
      if (!email) return c.json({ error: 'Email required' }, 400);
      const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      if (!user) return c.json({ message: 'If email exists, reset token sent' });
      const token = crypto.randomUUID();
      await c.env.DB.prepare('INSERT INTO password_reset_tokens (id, userId, token, expiresAt, createdAt) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), (user as any).id, token, new Date(Date.now() + 60*60*1000).toISOString(), new Date().toISOString()).run();
      return c.json({ message: 'If email exists, reset token sent', resetToken: token });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/auth/reset-password', async (c) => {
    try {
      const { token, password } = await c.req.json();
      if (!token || !password) return c.json({ error: 'Token and password required' }, 400);
      const stored = await c.env.DB.prepare('SELECT * FROM password_reset_tokens WHERE token = ? AND expiresAt > ? AND usedAt IS NULL').bind(token, new Date().toISOString()).first() as any;
      if (!stored) return c.json({ error: 'Invalid or expired token' }, 400);
      const hashed = await hashPassword(password);
      await c.env.DB.batch([
        c.env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(hashed, stored.userId),
        c.env.DB.prepare('UPDATE password_reset_tokens SET usedAt = ? WHERE id = ?').bind(new Date().toISOString(), stored.id),
      ]);
      return c.json({ message: 'Password reset successfully' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/auth/change-password', requireAuth, async (c) => {
    try {
      const { oldPassword, newPassword } = await c.req.json();
      if (!oldPassword || !newPassword) return c.json({ error: 'Old and new password required' }, 400);
      const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.var.userId).first() as any;
      const hashed = await hashPassword(oldPassword);
      if (user.password !== hashed) return c.json({ error: 'Current password is incorrect' }, 400);
      const newHashed = await hashPassword(newPassword);
      await c.env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(newHashed, user.id).run();
      return c.json({ message: 'Password changed successfully' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/auth/send-otp', async (c) => {
    try {
      const { email, mobile } = await c.req.json();
      if (!email && !mobile) return c.json({ error: 'Email or mobile required' }, 400);
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await c.env.DB.prepare('INSERT INTO otps (id, email, phone, code, type, purpose, attempts, maxAttempts, isUsed, expiresAt, createdAt) VALUES (?,?,?,?,?,?,0,5,0,?,?)').bind(crypto.randomUUID(), email || null, mobile || null, code, 'EMAIL', 'VERIFICATION', new Date(Date.now() + 10*60*1000).toISOString(), new Date().toISOString()).run();
      return c.json({ message: 'OTP sent successfully', code });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/auth/verify-otp', async (c) => {
    try {
      const { email, mobile, code } = await c.req.json();
      if ((!email && !mobile) || !code) return c.json({ error: 'Email/mobile and code required' }, 400);
      const otp = await c.env.DB.prepare('SELECT * FROM otps WHERE (email = ? OR phone = ?) AND code = ? AND isUsed = 0 AND expiresAt > ? AND attempts < maxAttempts').bind(email || '', mobile || '', code, new Date().toISOString()).first() as any;
      if (!otp) return c.json({ error: 'Invalid or expired OTP' }, 400);
      await c.env.DB.batch([
        c.env.DB.prepare('UPDATE otps SET isUsed = 1 WHERE id = ?').bind(otp.id),
        c.env.DB.prepare('UPDATE users SET emailVerified = 1, phoneVerified = 1 WHERE email = ? OR phone = ?').bind(email || '', mobile || ''),
      ]);
      return c.json({ message: 'OTP verified successfully' });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/auth/profile', requireAuth, async (c) => {
    try {
      const user = await c.env.DB.prepare('SELECT id, email, name, phone, role, status, avatar, shopId, createdAt FROM users WHERE id = ?').bind(c.var.userId).first();
      if (!user) return c.json({ error: 'User not found' }, 404);
      return c.json({ data: user });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.patch('/api/auth/profile', requireAuth, async (c) => {
    try {
      const { name, phone } = await c.req.json();
      const updates: string[] = [];
      const vals: any[] = [];
      if (name) { updates.push('name = ?'); vals.push(name); }
      if (phone) { updates.push('phone = ?'); vals.push(phone); }
      if (!updates.length) return c.json({ error: 'No fields to update' }, 400);
      vals.push(c.var.userId);
      await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')}, updatedAt = ? WHERE id = ?`).bind(...vals, new Date().toISOString()).run();
      const user = await c.env.DB.prepare('SELECT id, email, name, phone, role, status, avatar, shopId FROM users WHERE id = ?').bind(c.var.userId).first();
      return c.json({ data: user });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
