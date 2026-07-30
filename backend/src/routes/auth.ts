import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { hashPassword, verifyPassword, generateId } from '../utils/crypto'
import { authenticate } from '../middleware/auth'

type Bindings = { DB: D1Database; JWT_SECRET: string }
type Variables = { user: { id: string; email: string; role: string; ownerId: string | null } }

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['owner', 'staff']),
})

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json')
  const user = await c.env.DB.prepare('SELECT id, email, password_hash, role, owner_id FROM users WHERE email = ?').bind(email).first<any>()
  if (!user) return c.json({ error: 'Invalid email or password' }, 401)
  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return c.json({ error: 'Invalid email or password' }, 401)
  const token = await sign({ sub: user.id, email: user.email, role: user.role, ownerId: user.owner_id, exp: Math.floor(Date.now() / 1000) + 86400 }, c.env.JWT_SECRET, 'HS256')
  return c.json({ token, user: { id: user.id, email: user.email, role: user.role } })
})

auth.post('/register', authenticate, zValidator('json', registerSchema), async (c) => {
  const user = c.get('user')
  const { email, password, role } = c.req.valid('json')

  if (user.role !== 'admin' && user.role !== 'owner') return c.json({ error: 'Forbidden' }, 403)
  if (role === 'owner' && user.role !== 'admin') return c.json({ error: 'Only admins can create owners' }, 403)
  if (role === 'staff' && user.role !== 'owner') return c.json({ error: 'Only owners can create staff' }, 403)

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (existing) return c.json({ error: 'Email already registered' }, 409)

  const id = generateId()
  const passwordHash = await hashPassword(password)
  const ownerId = role === 'staff' ? user.id : null

  await c.env.DB.prepare('INSERT INTO users (id, email, password_hash, role, owner_id) VALUES (?, ?, ?, ?, ?)').bind(id, email, passwordHash, role, ownerId).run()

  return c.json({ id, email, role }, 201)
})

auth.get('/me', authenticate, async (c) => {
  const user = c.get('user')
  const record = await c.env.DB.prepare('SELECT id, email, role, owner_id, created_at FROM users WHERE id = ?').bind(user.id).first<any>()
  if (!record) return c.json({ error: 'User not found' }, 404)
  return c.json({ id: record.id, email: record.email, role: record.role, ownerId: record.owner_id, createdAt: record.created_at })
})

export default auth
