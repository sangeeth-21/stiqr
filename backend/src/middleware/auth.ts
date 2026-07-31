import { verify } from 'hono/jwt'
import { createMiddleware } from 'hono/factory'

export type UserContext = {
  id: string
  email: string
  role: 'admin' | 'owner' | 'staff'
  ownerId: string | null
  permissions: string[]
}

declare module 'hono' {
  interface ContextVariableMap {
    user: UserContext
  }
}

export const authenticate = createMiddleware<{ Bindings: { JWT_SECRET: string; DB: D1Database } }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = (await verify(token, c.env.JWT_SECRET, 'HS256')) as { sub: string }
    const user = await c.env.DB.prepare('SELECT id, email, role, owner_id, status FROM users WHERE id = ?').bind(payload.sub).first<any>()
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    if (user.status !== 'active') return c.json({ error: 'Account suspended' }, 403)
    const permissionRows = await c.env.DB.prepare(
      'SELECT p.code FROM siq_permissions p INNER JOIN siq_role_permissions rp ON rp.permission_id = p.id WHERE rp.role_id = ?'
    ).bind(user.role).all<any>()
    const permissions = (permissionRows.results ?? []).map((row: any) => row.code)
    c.set('user', { id: user.id, email: user.email, role: user.role, ownerId: user.owner_id, permissions })
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }
})

export const requireRole = (...roles: string[]) =>
  createMiddleware(async (c, next) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role)) return c.json({ error: 'Forbidden' }, 403)
    await next()
  })

export const requirePermission = (...permissions: string[]) =>
  createMiddleware(async (c, next) => {
    const user = c.get('user')
    const granted = user?.permissions ?? []
    if (permissions.some((permission) => !granted.includes(permission))) return c.json({ error: 'Forbidden' }, 403)
    await next()
  })
