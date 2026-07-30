import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { hashPassword, generateId } from '../utils/crypto'
import { authenticate, requireRole } from '../middleware/auth'

type Bindings = { DB: D1Database }
type Variables = { user: { id: string; email: string; role: string; ownerId: string | null } }

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>()

admin.use('*', authenticate, requireRole('admin'))

const createOwnerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

admin.get('/owners', async (c) => {
  const owners = await c.env.DB.prepare("SELECT id, email, created_at FROM users WHERE role = 'owner' ORDER BY created_at DESC").all<any>()
  return c.json(owners.results)
})

admin.post('/owners', zValidator('json', createOwnerSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return c.json({ error: 'Email already registered' }, 409)
  const id = generateId()
  const passwordHash = await hashPassword(password)
  await c.env.DB.prepare("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'owner')").bind(id, email, passwordHash).run()
  return c.json({ id, email, role: 'owner' }, 201)
})

admin.delete('/owners/:id', async (c) => {
  const ownerId = c.req.param('id')
  const owner = await c.env.DB.prepare("SELECT id FROM users WHERE id = ? AND role = 'owner'").bind(ownerId).first()
  if (!owner) return c.json({ error: 'Owner not found' }, 404)
  await c.env.DB.prepare("DELETE FROM users WHERE id = ? OR (owner_id = ? AND role = 'staff')").bind(ownerId, ownerId).run()
  return c.json({ message: 'Owner and associated staff deleted' })
})

export default admin
