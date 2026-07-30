import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
  R2: R2Bucket
  ENVIRONMENT: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())
app.use('*', secureHeaders())

app.get('/', (c) => {
  return c.json({
    message: 'Hello, World!',
    environment: c.env.ENVIRONMENT ?? 'development',
  })
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

export default app
