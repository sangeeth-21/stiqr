import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { hashPassword, generateId } from '../utils/crypto'
import { authenticate, requireRole } from '../middleware/auth'

type Bindings = { DB: D1Database }
type Variables = { user: { id: string; email: string; role: string; ownerId: string | null } }

const owner = new Hono<{ Bindings: Bindings; Variables: Variables }>()

owner.use('*', authenticate, requireRole('owner'))

const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

owner.get('/staff', async (c) => {
  const user = c.get('user')
  const staff = await c.env.DB.prepare("SELECT id, email, created_at FROM users WHERE owner_id = ? AND role = 'staff' ORDER BY created_at DESC").bind(user.id).all<any>()
  return c.json(staff.results)
})

owner.post('/staff', zValidator('json', createStaffSchema), async (c) => {
  const user = c.get('user')
  const { email, password } = c.req.valid('json')
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return c.json({ error: 'Email already registered' }, 409)
  const id = generateId()
  const passwordHash = await hashPassword(password)
  await c.env.DB.prepare("INSERT INTO users (id, email, password_hash, role, owner_id) VALUES (?, ?, ?, 'staff', ?)").bind(id, email, passwordHash, user.id).run()
  return c.json({ id, email, role: 'staff', ownerId: user.id }, 201)
})

owner.delete('/staff/:id', async (c) => {
  const user = c.get('user')
  const staffId = c.req.param('id')
  const staff = await c.env.DB.prepare("SELECT id FROM users WHERE id = ? AND owner_id = ? AND role = 'staff'").bind(staffId, user.id).first()
  if (!staff) return c.json({ error: 'Staff member not found' }, 404)
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(staffId).run()
  return c.json({ message: 'Staff member deleted' })
})

export default owner
