import { createMiddleware } from 'hono/factory'

type Entry = { count: number; resetAt: number }

const buckets = new Map<string, Entry>()

function sweep(nowMs: number) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= nowMs) buckets.delete(key)
  }
}

export const rateLimit = (options: { windowMs: number; max: number }) =>
  createMiddleware(async (c, next) => {
    const key = c.req.header('CF-Connecting-IP') ?? c.req.header('x-forwarded-for') ?? 'unknown'
    sweep(Date.now())
    const nowMs = Date.now()
    const bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= nowMs) {
      buckets.set(key, { count: 1, resetAt: nowMs + options.windowMs })
      await next()
      return
    }
    bucket.count++
    if (bucket.count > options.max) {
      return c.json({ error: 'Too many requests. Please slow down.' }, 429)
    }
    await next()
  })
