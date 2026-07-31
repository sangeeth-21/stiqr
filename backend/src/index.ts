import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { createMiddleware } from 'hono/factory'
import auth from './routes/auth'
import admin from './routes/admin'
import owner from './routes/owner'
import platform from './routes/platform'
import shop from './routes/shop'
import { rateLimit } from './middleware/rateLimit'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  ENVIRONMENT: string
  CORS_ORIGINS?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', secureHeaders({
  contentSecurityPolicy: { defaultSrc: ["'none'"] },
  referrerPolicy: 'no-referrer',
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
}))

app.use('*', cors({
  origin: (origin, c) => {
    const allowed = (c.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map((o: string) => o.trim()).filter(Boolean)
    if (!origin) return allowed[0]
    return allowed.includes(origin) ? origin : null
  },
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}))

// Defense-in-depth: reject cross-origin state-changing requests from unknown origins.
// Requests without an Origin header (mobile apps, curl, server-to-server) pass through.
const originGuard = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const method = c.req.method
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next()
  const origin = c.req.header('Origin')
  if (!origin) return next()
  const allowed = (c.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map((o: string) => o.trim()).filter(Boolean)
  if (!allowed.includes(origin)) return c.json({ error: 'Forbidden' }, 403)
  await next()
})

app.use('*', originGuard)
app.use('*', rateLimit({ windowMs: 60_000, max: 120 }))

app.get('/', (c) => c.json({ message: 'Hello, World!', environment: c.env.ENVIRONMENT ?? 'development' }))
app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/auth', auth)
app.route('/admin', admin)
app.route('/admin', platform)
app.route('/owner', owner)
app.route('/shop', shop)

export default app
