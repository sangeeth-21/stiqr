import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import auth from './routes/auth'
import admin from './routes/admin'
import owner from './routes/owner'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())
app.use('*', secureHeaders())

app.get('/', (c) => c.json({ message: 'Hello, World!', environment: c.env.ENVIRONMENT ?? 'development' }))
app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/auth', auth)
app.route('/admin', admin)
app.route('/owner', owner)

export default app
