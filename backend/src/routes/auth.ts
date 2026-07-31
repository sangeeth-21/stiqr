import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { hashPassword, verifyPassword, generateId, generateToken, hashToken } from '../utils/crypto'
import { authenticate } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'
import {
  now,
  MAX_LOGIN_ATTEMPTS,
  recentLoginFailures,
  recordLoginAttempt,
  clearLoginAttempts,
  revokeUserSessions,
  logAudit,
  PASSWORD_PATTERN,
  PASSWORD_MESSAGE,
} from '../utils/security'

type Bindings = { DB: D1Database; JWT_SECRET: string }

const ACCESS_TOKEN_TTL = 15 * 60
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

const auth = new Hono<{ Bindings: Bindings }>()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const registerSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email(),
  password: z.string().regex(PASSWORD_PATTERN, PASSWORD_MESSAGE),
  role: z.enum(['owner', 'staff']),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().regex(PASSWORD_PATTERN, PASSWORD_MESSAGE),
})

type UserRow = {
  id: string
  email: string
  password_hash: string
  role: 'admin' | 'owner' | 'staff'
  owner_id: string | null
  status: string
}

async function signAccessToken(env: Bindings, user: UserRow): Promise<string> {
  const iat = Math.floor(Date.now() / 1000)
  return sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      ownerId: user.owner_id ?? null,
      status: user.status ?? 'active',
      iat,
      exp: iat + ACCESS_TOKEN_TTL,
    },
    env.JWT_SECRET,
    'HS256'
  )
}

async function issueRefreshToken(db: D1Database, userId: string): Promise<{ token: string; id: string }> {
  const token = generateToken()
  const id = generateId()
  await db.prepare('INSERT INTO siq_refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').bind(id, userId, await hashToken(token), new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString()).run()
  return { token, id }
}

auth.post('/login', rateLimit({ windowMs: 60_000, max: 10 }), zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('x-forwarded-for') ?? null
  const normalized = email.toLowerCase().trim()

  const failures = await recentLoginFailures(c.env.DB, normalized)
  if (failures >= MAX_LOGIN_ATTEMPTS) return c.json({ error: 'Too many failed attempts. Please try again later.' }, 429)

  const user = await c.env.DB.prepare('SELECT id, email, password_hash, role, owner_id, status FROM users WHERE email = ?').bind(normalized).first<UserRow>()
  const passwordValid = user ? await verifyPassword(password, user.password_hash) : false
  if (!user || !passwordValid) {
    await recordLoginAttempt(c.env.DB, normalized, false, ip)
    return c.json({ error: 'Invalid email or password' }, 401)
  }
  if (user.status !== 'active') return c.json({ error: 'Account is suspended. Contact support.' }, 403)

  await clearLoginAttempts(c.env.DB, normalized)
  const accessToken = await signAccessToken(c.env, user)
  const { token: refreshToken } = await issueRefreshToken(c.env.DB, user.id)
  await logAudit(c.env.DB, user.id, 'auth.login', 'user', user.id, { ip })

  return c.json({
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_TTL,
    user: { id: user.id, email: user.email, role: user.role, ownerId: user.owner_id },
  })
})

auth.post('/refresh', rateLimit({ windowMs: 60_000, max: 20 }), zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json')
  const tokenHash = await hashToken(refreshToken)
  const stored = await c.env.DB.prepare(
    'SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.status FROM siq_refresh_tokens rt INNER JOIN users u ON u.id = rt.user_id WHERE rt.token_hash = ?'
  ).bind(tokenHash).first<any>()
  if (!stored) return c.json({ error: 'Invalid refresh token' }, 401)
  if (stored.revoked_at) return c.json({ error: 'Refresh token has been revoked' }, 401)
  if (new Date(stored.expires_at).getTime() < Date.now()) return c.json({ error: 'Refresh token has expired' }, 401)
  if (stored.status !== 'active') return c.json({ error: 'Account is suspended' }, 403)

  const user = await c.env.DB.prepare('SELECT id, email, password_hash, role, owner_id, status FROM users WHERE id = ?').bind(stored.user_id).first<UserRow>()
  if (!user) return c.json({ error: 'User not found' }, 401)

  await c.env.DB.prepare('UPDATE siq_refresh_tokens SET revoked_at = ? WHERE id = ?').bind(now(), stored.id).run()
  const accessToken = await signAccessToken(c.env, user)
  const { token: newRefreshToken } = await issueRefreshToken(c.env.DB, user.id)

  return c.json({ accessToken, refreshToken: newRefreshToken, tokenType: 'Bearer', expiresIn: ACCESS_TOKEN_TTL })
})

auth.post('/logout', authenticate, zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json')
  const tokenHash = await hashToken(refreshToken)
  await c.env.DB.prepare('UPDATE siq_refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL').bind(now(), tokenHash).run()
  return c.json({ message: 'Logged out successfully' })
})

auth.post('/register', authenticate, rateLimit({ windowMs: 60_000, max: 5 }), zValidator('json', registerSchema), async (c) => {
  const actor = c.get('user')
  const { email, password, role, name } = c.req.valid('json')
  const normalized = email.toLowerCase().trim()

  if (role === 'owner' && !actor.permissions.includes('owners.manage')) return c.json({ error: 'Forbidden' }, 403)
  if (role === 'staff' && !actor.permissions.includes('staff.manage')) return c.json({ error: 'Forbidden' }, 403)

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(normalized).first()
  if (existing) return c.json({ error: 'Email already registered' }, 409)

  const id = generateId()
  const passwordHash = await hashPassword(password)
  const ownerId = role === 'staff' ? actor.id : null

  await c.env.DB.prepare('INSERT INTO users (id, email, name, password_hash, role, owner_id) VALUES (?, ?, ?, ?, ?, ?)').bind(id, normalized, name ?? null, passwordHash, role, ownerId).run()
  await logAudit(c.env.DB, actor.id, 'user.create', 'user', id, { role, email: normalized })

  return c.json({ id, email: normalized, name: name ?? null, role }, 201)
})

auth.get('/me', authenticate, async (c) => {
  const user = c.get('user')
  const record = await c.env.DB.prepare('SELECT id, email, name, role, owner_id, status, created_at FROM users WHERE id = ?').bind(user.id).first<any>()
  if (!record) return c.json({ error: 'User not found' }, 404)
  return c.json({
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
    ownerId: record.owner_id,
    status: record.status,
    permissions: user.permissions,
    createdAt: record.created_at,
  })
})

auth.post('/change-password', authenticate, zValidator('json', changePasswordSchema), async (c) => {
  const user = c.get('user')
  const { currentPassword, newPassword } = c.req.valid('json')
  if (currentPassword === newPassword) return c.json({ error: 'New password must differ from the current password' }, 400)

  const record = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first<any>()
  if (!record) return c.json({ error: 'User not found' }, 404)

  const valid = await verifyPassword(currentPassword, record.password_hash)
  if (!valid) return c.json({ error: 'Current password is incorrect' }, 401)

  const passwordHash = await hashPassword(newPassword)
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').bind(passwordHash, now(), user.id).run()
  await revokeUserSessions(c.env.DB, user.id)
  await logAudit(c.env.DB, user.id, 'auth.change_password', 'user', user.id)

  return c.json({ message: 'Password changed. All sessions have been revoked.' })
})

export default auth
