import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { hashPassword, generateId } from '../utils/crypto'
import { authenticate, requireRole, requirePermission } from '../middleware/auth'
import { now, logAudit, revokeUserSessions, PASSWORD_PATTERN, PASSWORD_MESSAGE } from '../utils/security'

type Bindings = { DB: D1Database }

const admin = new Hono<{ Bindings: Bindings }>()

admin.use('*', authenticate, requireRole('admin'))

const createOwnerSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email(),
  password: z.string().regex(PASSWORD_PATTERN, PASSWORD_MESSAGE),
})

const updateOwnerSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
})

const resetPasswordSchema = z.object({
  password: z.string().regex(PASSWORD_PATTERN, PASSWORD_MESSAGE),
})

const toggleStatusSchema = z.object({
  reason: z.string().max(500).optional(),
})

admin.get('/roles', requirePermission('roles.read'), async (c) => {
  const roles = await c.env.DB.prepare('SELECT id, name, description FROM siq_roles ORDER BY id').all<any>()
  const mappings = await c.env.DB.prepare('SELECT rp.role_id, p.code FROM siq_role_permissions rp INNER JOIN siq_permissions p ON p.id = rp.permission_id ORDER BY rp.role_id, p.code').all<any>()
  const byRole = new Map<string, string[]>()
  for (const row of mappings.results ?? []) {
    if (!byRole.has(row.role_id)) byRole.set(row.role_id, [])
    byRole.get(row.role_id)!.push(row.code)
  }
  return c.json((roles.results ?? []).map((role: any) => ({ ...role, permissions: byRole.get(role.id) ?? [] })))
})

admin.get('/permissions', requirePermission('roles.read'), async (c) => {
  const permissions = await c.env.DB.prepare('SELECT id, code, description FROM siq_permissions ORDER BY code').all()
  return c.json(permissions.results)
})

admin.get('/audit-logs', requirePermission('audit.read'), async (c) => {
  const logs = await c.env.DB.prepare('SELECT id, actor_id, action, entity_type, entity_id, meta, created_at FROM siq_audit_logs ORDER BY created_at DESC LIMIT 200').all()
  return c.json(logs.results)
})

admin.get('/owners', requirePermission('owners.read'), async (c) => {
  const owners = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.status, u.created_at, u.updated_at,
       (SELECT COUNT(*) FROM users s WHERE s.owner_id = u.id AND s.role = 'staff') AS staff_count
     FROM users u WHERE u.role = 'owner' ORDER BY u.created_at DESC`
  ).all<any>()
  return c.json(owners.results)
})

admin.post('/owners', requirePermission('owners.manage'), zValidator('json', createOwnerSchema), async (c) => {
  const { email, password, name } = c.req.valid('json')
  const normalized = email.toLowerCase().trim()

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(normalized).first()
  if (existing) return c.json({ error: 'Email already registered' }, 409)

  const id = generateId()
  const passwordHash = await hashPassword(password)
  await c.env.DB.prepare("INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, 'owner')").bind(id, normalized, name ?? null, passwordHash).run()
  await logAudit(c.env.DB, c.get('user').id, 'owner.create', 'user', id, { email: normalized })

  return c.json({ id, email: normalized, name: name ?? null, role: 'owner', status: 'active' }, 201)
})

admin.get('/owners/:id', requirePermission('owners.read'), async (c) => {
  const id = c.req.param('id')
  const owner = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.status, u.created_at, u.updated_at,
       (SELECT COUNT(*) FROM users s WHERE s.owner_id = u.id AND s.role = 'staff') AS staff_count
     FROM users u WHERE u.id = ? AND u.role = 'owner'`
  ).bind(id).first<any>()
  if (!owner) return c.json({ error: 'Owner not found' }, 404)
  const staff = await c.env.DB.prepare("SELECT id, email, name, status, created_at FROM users WHERE owner_id = ? AND role = 'staff' ORDER BY created_at DESC").bind(id).all<any>()
  return c.json({ ...owner, staff: staff.results })
})

admin.patch('/owners/:id', requirePermission('owners.manage'), zValidator('json', updateOwnerSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const owner = await c.env.DB.prepare("SELECT id FROM users WHERE id = ? AND role = 'owner'").bind(id).first()
  if (!owner) return c.json({ error: 'Owner not found' }, 404)

  const normalizedEmail = body.email?.toLowerCase().trim()
  if (normalizedEmail) {
    const duplicate = await c.env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(normalizedEmail, id).first()
    if (duplicate) return c.json({ error: 'Email already in use' }, 409)
  }

  await c.env.DB.prepare('UPDATE users SET email = COALESCE(?, email), name = COALESCE(?, name), updated_at = ? WHERE id = ?').bind(normalizedEmail ?? null, body.name ?? null, now(), id).run()
  await logAudit(c.env.DB, c.get('user').id, 'owner.update', 'user', id, body)

  return c.json({ message: 'Owner updated' })
})

admin.delete('/owners/:id', requirePermission('owners.delete'), async (c) => {
  const id = c.req.param('id')
  const owner = await c.env.DB.prepare("SELECT id FROM users WHERE id = ? AND role = 'owner'").bind(id).first()
  if (!owner) return c.json({ error: 'Owner not found' }, 404)
  await c.env.DB.prepare("DELETE FROM users WHERE id = ? OR (owner_id = ? AND role = 'staff')").bind(id, id).run()
  await logAudit(c.env.DB, c.get('user').id, 'owner.delete', 'user', id)
  return c.json({ message: 'Owner and associated staff deleted' })
})

admin.post('/owners/:id/suspend', requirePermission('owners.suspend'), zValidator('json', toggleStatusSchema), async (c) => {
  const id = c.req.param('id')
  const { reason } = c.req.valid('json')

  const owner = await c.env.DB.prepare("SELECT id, status FROM users WHERE id = ? AND role = 'owner'").bind(id).first<any>()
  if (!owner) return c.json({ error: 'Owner not found' }, 404)
  if (owner.status === 'suspended') return c.json({ error: 'Owner is already suspended' }, 400)

  await c.env.DB.prepare("UPDATE users SET status = 'suspended', updated_at = ? WHERE id = ?").bind(now(), id).run()
  await revokeUserSessions(c.env.DB, id)
  await logAudit(c.env.DB, c.get('user').id, 'owner.suspend', 'user', id, { reason: reason ?? null })

  return c.json({ message: 'Owner suspended and all sessions revoked' })
})

admin.post('/owners/:id/activate', requirePermission('owners.suspend'), zValidator('json', toggleStatusSchema), async (c) => {
  const id = c.req.param('id')
  const { reason } = c.req.valid('json')

  const owner = await c.env.DB.prepare("SELECT id, status FROM users WHERE id = ? AND role = 'owner'").bind(id).first<any>()
  if (!owner) return c.json({ error: 'Owner not found' }, 404)
  if (owner.status === 'active') return c.json({ error: 'Owner is already active' }, 400)

  await c.env.DB.prepare("UPDATE users SET status = 'active', updated_at = ? WHERE id = ?").bind(now(), id).run()
  await logAudit(c.env.DB, c.get('user').id, 'owner.activate', 'user', id, { reason: reason ?? null })

  return c.json({ message: 'Owner activated' })
})

admin.post('/owners/:id/reset-password', requirePermission('owners.reset_password'), zValidator('json', resetPasswordSchema), async (c) => {
  const id = c.req.param('id')
  const { password } = c.req.valid('json')

  const owner = await c.env.DB.prepare("SELECT id FROM users WHERE id = ? AND role = 'owner'").bind(id).first()
  if (!owner) return c.json({ error: 'Owner not found' }, 404)

  const passwordHash = await hashPassword(password)
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').bind(passwordHash, now(), id).run()
  await revokeUserSessions(c.env.DB, id)
  await logAudit(c.env.DB, c.get('user').id, 'owner.reset_password', 'user', id)

  return c.json({ message: 'Password reset and all sessions revoked' })
})

export default admin
