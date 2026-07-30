import { verify } from 'hono/jwt'
import { createMiddleware } from 'hono/factory'

declare module 'hono' {
  interface ContextVariableMap {
    user: { id: string; email: string; role: 'admin' | 'owner' | 'staff'; ownerId: string | null }
  }
}

export const authenticate = createMiddleware<{ Bindings: { JWT_SECRET: string } }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = (await verify(token, c.env.JWT_SECRET, 'HS256')) as any
    c.set('user', { id: payload.sub, email: payload.email, role: payload.role, ownerId: payload.ownerId ?? null })
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

export const requireRole = (...roles: string[]) =>
  createMiddleware(async (c, next) => {
    const user = c.get('user')
    if (!user || !roles.includes(user.role)) return c.json({ error: 'Forbidden' }, 403)
    await next()
  })
