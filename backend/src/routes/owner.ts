import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { hashPassword, generateId } from '../utils/crypto'
import { authenticate, requireRole, requirePermission } from '../middleware/auth'
import { now, logAudit, revokeUserSessions, PASSWORD_PATTERN, PASSWORD_MESSAGE } from '../utils/security'

type Bindings = { DB: D1Database }

const owner = new Hono<{ Bindings: Bindings }>()

owner.use('*', authenticate, requireRole('owner'))

const createStaffSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email(),
  password: z.string().regex(PASSWORD_PATTERN, PASSWORD_MESSAGE),
})

const updateStaffSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
})

const resetPasswordSchema = z.object({
  password: z.string().regex(PASSWORD_PATTERN, PASSWORD_MESSAGE),
})

const toggleStatusSchema = z.object({
  reason: z.string().max(500).optional(),
})

owner.get('/staff', requirePermission('staff.read'), async (c) => {
  const user = c.get('user')
  const staff = await c.env.DB.prepare("SELECT id, email, name, status, created_at, updated_at FROM users WHERE owner_id = ? AND role = 'staff' ORDER BY created_at DESC").bind(user.id).all<any>()
  return c.json(staff.results)
})

owner.post('/staff', requirePermission('staff.manage'), zValidator('json', createStaffSchema), async (c) => {
  const user = c.get('user')
  const { email, password, name } = c.req.valid('json')
  const normalized = email.toLowerCase().trim()

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(normalized).first()
  if (existing) return c.json({ error: 'Email already registered' }, 409)

  const id = generateId()
  const passwordHash = await hashPassword(password)
  await c.env.DB.prepare("INSERT INTO users (id, email, name, password_hash, role, owner_id) VALUES (?, ?, ?, ?, 'staff', ?)").bind(id, normalized, name ?? null, passwordHash, user.id).run()
  await logAudit(c.env.DB, user.id, 'staff.create', 'user', id, { email: normalized })

  return c.json({ id, email: normalized, name: name ?? null, role: 'staff', ownerId: user.id, status: 'active' }, 201)
})

owner.get('/staff/:id', requirePermission('staff.read'), async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const staff = await c.env.DB.prepare("SELECT id, email, name, status, created_at, updated_at FROM users WHERE id = ? AND owner_id = ? AND role = 'staff'").bind(id, user.id).first<any>()
  if (!staff) return c.json({ error: 'Staff member not found' }, 404)
  return c.json(staff)
})

owner.patch('/staff/:id', requirePermission('staff.manage'), zValidator('json', updateStaffSchema), async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const staff = await c.env.DB.prepare("SELECT id FROM users WHERE id = ? AND owner_id = ? AND role = 'staff'").bind(id, user.id).first()
  if (!staff) return c.json({ error: 'Staff member not found' }, 404)

  const normalizedEmail = body.email?.toLowerCase().trim()
  if (normalizedEmail) {
    const duplicate = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(normalizedEmail, id).first()
    if (duplicate) return c.json({ error: 'Email already in use' }, 409)
  }

  await c.env.DB.prepare('UPDATE users SET email = COALESCE(?, email), name = COALESCE(?, name), updated_at = ? WHERE id = ?').bind(normalizedEmail ?? null, body.name ?? null, now(), id).run()
  await logAudit(c.env.DB, user.id, 'staff.update', 'user', id, body)

  return c.json({ message: 'Staff member updated' })
})

owner.delete('/staff/:id', requirePermission('staff.delete'), async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  const staff = await c.env.DB.prepare("SELECT id FROM users WHERE id = ? AND owner_id = ? AND role = 'staff'").bind(id, user.id).first()
  if (!staff) return c.json({ error: 'Staff member not found' }, 404)

  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
  await logAudit(c.env.DB, user.id, 'staff.delete', 'user', id)

  return c.json({ message: 'Staff member deleted' })
})

owner.post('/staff/:id/suspend', requirePermission('staff.suspend'), zValidator('json', toggleStatusSchema), async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const { reason } = c.req.valid('json')

  const staff = await c.env.DB.prepare("SELECT id, status FROM users WHERE id = ? AND owner_id = ? AND role = 'staff'").bind(id, user.id).first<any>()
  if (!staff) return c.json({ error: 'Staff member not found' }, 404)
  if (staff.status === 'suspended') return c.json({ error: 'Staff member is already suspended' }, 400)

  await c.env.DB.prepare("UPDATE users SET status = 'suspended', updated_at = ? WHERE id = ?").bind(now(), id).run()
  await revokeUserSessions(c.env.DB, id)
  await logAudit(c.env.DB, user.id, 'staff.suspend', 'user', id, { reason: reason ?? null })

  return c.json({ message: 'Staff member suspended and all sessions revoked' })
})

owner.post('/staff/:id/activate', requirePermission('staff.suspend'), zValidator('json', toggleStatusSchema), async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const { reason } = c.req.valid('json')

  const staff = await c.env.DB.prepare("SELECT id, status FROM users WHERE id = ? AND owner_id = ? AND role = 'staff'").bind(id, user.id).first<any>()
  if (!staff) return c.json({ error: 'Staff member not found' }, 404)
  if (staff.status === 'active') return c.json({ error: 'Staff member is already active' }, 400)

  await c.env.DB.prepare("UPDATE users SET status = 'active', updated_at = ? WHERE id = ?").bind(now(), id).run()
  await logAudit(c.env.DB, user.id, 'staff.activate', 'user', id, { reason: reason ?? null })

  return c.json({ message: 'Staff member activated' })
})

owner.post('/staff/:id/reset-password', requirePermission('staff.reset_password'), zValidator('json', resetPasswordSchema), async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const { password } = c.req.valid('json')

  const staff = await c.env.DB.prepare("SELECT id FROM users WHERE id = ? AND owner_id = ? AND role = 'staff'").bind(id, user.id).first()
  if (!staff) return c.json({ error: 'Staff member not found' }, 404)

  const passwordHash = await hashPassword(password)
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').bind(passwordHash, now(), id).run()
  await revokeUserSessions(c.env.DB, id)
  await logAudit(c.env.DB, user.id, 'staff.reset_password', 'user', id)

  return c.json({ message: 'Password reset and all sessions revoked' })
})

export default owner
