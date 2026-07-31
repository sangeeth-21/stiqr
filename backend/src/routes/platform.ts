import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { hashPassword, generateId } from '../utils/crypto'
import { authenticate, requireRole, requirePermission } from '../middleware/auth'
import { now, logAudit, revokeUserSessions, PASSWORD_PATTERN, PASSWORD_MESSAGE } from '../utils/security'

type Bindings = { DB: D1Database }

const platform = new Hono<{ Bindings: Bindings }>()

platform.use('*', authenticate, requireRole('admin'))

const createShopSchema = z.object({
  ownerId: z.string().min(1),
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(1000).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(50).default('IN'),
  gstNumber: z.string().max(50).optional(),
  logoUrl: z.string().url().optional(),
  planId: z.string().optional(),
})

const updateShopSchema = createShopSchema.partial().omit({ ownerId: true, planId: true })

const toggleStatusSchema = z.object({ reason: z.string().max(500).optional() })

const planSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50).regex(/^[a-z0-9_-]+$/),
  price: z.number().nonnegative(),
  currency: z.string().max(10).default('INR'),
  billingCycle: z.enum(['monthly', 'yearly', 'one_time']),
  features: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
})

const updatePlanSchema = planSchema.partial()

const subscriptionUpdateSchema = z.object({
  planId: z.string().optional(),
  status: z.enum(['active', 'expired', 'cancelled', 'pending', 'suspended']).optional(),
  autoRenew: z.boolean().optional(),
})

const renewSchema = z.object({
  months: z.number().int().positive().max(60).optional(),
  amount: z.number().positive().optional(),
})

const paymentSchema = z.object({
  shopId: z.string().min(1),
  subscriptionId: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().max(10).default('INR'),
  status: z.enum(['pending', 'succeeded', 'failed', 'refunded']).default('pending'),
  paymentMethod: z.string().max(50).optional(),
  transactionId: z.string().max(100).optional(),
  gateway: z.string().max(50).optional(),
})

const resetPasswordSchema = z.object({
  password: z.string().regex(PASSWORD_PATTERN, PASSWORD_MESSAGE),
})

const settingSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
  type: z.enum(['string', 'number', 'boolean', 'json']).optional(),
})

const maintenanceSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().max(500).optional(),
})

// ── Dashboard ────────────────────────────────────────────────────────────────

platform.get('/dashboard/overview', requirePermission('platform.dashboard'), async (c) => {
  const db = c.env.DB
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const stats = await db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE role = 'owner') AS total_owners,
       (SELECT COUNT(*) FROM users WHERE role = 'staff') AS total_staff,
       (SELECT COUNT(*) FROM siq_shops) AS total_shops,
       (SELECT COUNT(*) FROM siq_shops WHERE status = 'active') AS active_shops,
       (SELECT COUNT(*) FROM siq_shops WHERE status = 'suspended') AS suspended_shops,
       (SELECT COUNT(*) FROM siq_subscriptions WHERE status = 'active') AS active_subscriptions,
       (SELECT COUNT(*) FROM siq_subscriptions WHERE status = 'expired') AS expired_subscriptions,
       (SELECT COALESCE(SUM(amount), 0) FROM siq_payments WHERE status = 'succeeded') AS total_revenue,
       (SELECT COALESCE(SUM(amount), 0) FROM siq_payments WHERE status = 'succeeded' AND paid_at >= ?) AS revenue_this_month,
       (SELECT COUNT(*) FROM siq_payments WHERE status = 'succeeded' AND paid_at >= ?) AS payments_this_month`
  ).bind(monthStart, monthStart).first<any>()

  const recentSignups = await db.prepare("SELECT id, email, name, created_at FROM users WHERE role = 'owner' AND created_at >= ? ORDER BY created_at DESC LIMIT 10").bind(weekStart).all<any>()
  const expiring = await db.prepare(
    `SELECT s.id, s.expires_at, sh.name AS shop_name, p.name AS plan_name
     FROM siq_subscriptions s INNER JOIN siq_shops sh ON sh.id = s.shop_id INNER JOIN siq_subscription_plans p ON p.id = s.plan_id
     WHERE s.status = 'active' AND s.expires_at IS NOT NULL AND s.expires_at <= ?
     ORDER BY s.expires_at ASC LIMIT 10`
  ).bind(nextWeek).all<any>()
  const recentPayments = await db.prepare(
    `SELECT p.id, p.amount, p.currency, p.status, p.paid_at, sh.name AS shop_name
     FROM siq_payments p INNER JOIN siq_shops sh ON sh.id = p.shop_id
     ORDER BY COALESCE(p.paid_at, p.created_at) DESC LIMIT 10`
  ).all<any>()

  return c.json({ stats, recentSignups: recentSignups.results, expiringSubscriptions: expiring.results, recentPayments: recentPayments.results })
})

platform.get('/dashboard/activity', requirePermission('platform.dashboard'), async (c) => {
  const logs = await c.env.DB.prepare('SELECT id, actor_id, action, entity_type, entity_id, meta, created_at FROM siq_audit_logs ORDER BY created_at DESC LIMIT 50').all()
  return c.json(logs.results)
})

// ── Shops ────────────────────────────────────────────────────────────────────

platform.get('/shops', requirePermission('platform.shops.read'), async (c) => {
  const shops = await c.env.DB.prepare(
    `SELECT sh.id, sh.name, sh.slug, sh.phone, sh.email, sh.city, sh.gst_number, sh.status, sh.created_at,
       u.email AS owner_email, u.name AS owner_name,
       (SELECT COUNT(*) FROM siq_subscriptions sub WHERE sub.shop_id = sh.id AND sub.status = 'active') AS active_subscriptions,
       (SELECT COALESCE(SUM(p.amount), 0) FROM siq_payments p WHERE p.shop_id = sh.id AND p.status = 'succeeded') AS total_revenue
     FROM siq_shops sh LEFT JOIN users u ON u.id = sh.owner_id
     ORDER BY sh.created_at DESC`
  ).all<any>()
  return c.json(shops.results)
})

platform.post('/shops', requirePermission('platform.shops.manage'), zValidator('json', createShopSchema), async (c) => {
  const db = c.env.DB
  const body = c.req.valid('json')

  const owner = await db.prepare("SELECT id FROM users WHERE id = ? AND role = 'owner'").bind(body.ownerId).first()
  if (!owner) return c.json({ error: 'Owner not found' }, 404)

  if (body.slug) {
    const existing = await db.prepare('SELECT id FROM siq_shops WHERE slug = ?').bind(body.slug).first()
    if (existing) return c.json({ error: 'Slug already in use' }, 409)
  }

  const id = generateId()
  await db.prepare(
    `INSERT INTO siq_shops (id, owner_id, name, slug, description, phone, email, address, city, state, postal_code, country, gst_number, logo_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, body.ownerId, body.name, body.slug ?? null, body.description ?? null,
    body.phone ?? null, body.email ?? null, body.address ?? null, body.city ?? null,
    body.state ?? null, body.postalCode ?? null, body.country, body.gstNumber ?? null,
    body.logoUrl ?? null
  ).run()

  let subscriptionId: string | null = null
  if (body.planId) {
    const plan = await db.prepare('SELECT id, billing_cycle FROM siq_subscription_plans WHERE id = ?').bind(body.planId).first<any>()
    if (plan) {
      subscriptionId = generateId()
      const startedAt = now()
      const expiresAt = plan.billing_cycle === 'yearly'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      await db.prepare(
        `INSERT INTO siq_subscriptions (id, shop_id, plan_id, status, started_at, expires_at) VALUES (?, ?, ?, 'active', ?, ?)`
      ).bind(subscriptionId, id, body.planId, startedAt, expiresAt).run()
    }
  }

  await logAudit(db, c.get('user').id, 'shop.create', 'shop', id, { name: body.name, ownerId: body.ownerId })
  return c.json({ id, ownerId: body.ownerId, name: body.name, status: 'active', subscriptionId }, 201)
})

platform.get('/shops/:id', requirePermission('platform.shops.read'), async (c) => {
  const id = c.req.param('id')
  const shop = await c.env.DB.prepare(
    `SELECT sh.*, u.email AS owner_email, u.name AS owner_name
     FROM siq_shops sh LEFT JOIN users u ON u.id = sh.owner_id WHERE sh.id = ?`
  ).bind(id).first<any>()
  if (!shop) return c.json({ error: 'Shop not found' }, 404)
  const subscriptions = await c.env.DB.prepare(
    `SELECT s.id, s.status, s.started_at, s.expires_at, s.auto_renew, p.name AS plan_name, p.price, p.currency
     FROM siq_subscriptions s INNER JOIN siq_subscription_plans p ON p.id = s.plan_id
     WHERE s.shop_id = ? ORDER BY s.created_at DESC`
  ).bind(id).all<any>()
  const payments = await c.env.DB.prepare('SELECT id, amount, currency, status, payment_method, transaction_id, paid_at FROM siq_payments WHERE shop_id = ? ORDER BY created_at DESC').bind(id).all<any>()
  return c.json({ ...shop, subscriptions: subscriptions.results, payments: payments.results })
})

platform.patch('/shops/:id', requirePermission('platform.shops.manage'), zValidator('json', updateShopSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const shop = await c.env.DB.prepare('SELECT id FROM siq_shops WHERE id = ?').bind(id).first()
  if (!shop) return c.json({ error: 'Shop not found' }, 404)

  if (body.slug) {
    const existing = await c.env.DB.prepare('SELECT id FROM siq_shops WHERE slug = ? AND id != ?').bind(body.slug, id).first()
    if (existing) return c.json({ error: 'Slug already in use' }, 409)
  }

  await c.env.DB.prepare(
    `UPDATE siq_shops SET
       name = COALESCE(?, name), slug = COALESCE(?, slug), description = COALESCE(?, description),
       phone = COALESCE(?, phone), email = COALESCE(?, email), address = COALESCE(?, address),
       city = COALESCE(?, city), state = COALESCE(?, state), postal_code = COALESCE(?, postal_code),
       country = COALESCE(?, country), gst_number = COALESCE(?, gst_number), logo_url = COALESCE(?, logo_url),
       updated_at = ?
     WHERE id = ?`
  ).bind(
    body.name ?? null, body.slug ?? null, body.description ?? null,
    body.phone ?? null, body.email ?? null, body.address ?? null,
    body.city ?? null, body.state ?? null, body.postalCode ?? null,
    body.country ?? null, body.gstNumber ?? null, body.logoUrl ?? null,
    now(), id
  ).run()

  await logAudit(c.env.DB, c.get('user').id, 'shop.update', 'shop', id, body)
  return c.json({ message: 'Shop updated' })
})

platform.delete('/shops/:id', requirePermission('platform.shops.manage'), async (c) => {
  const id = c.req.param('id')
  const shop = await c.env.DB.prepare('SELECT id FROM siq_shops WHERE id = ?').bind(id).first()
  if (!shop) return c.json({ error: 'Shop not found' }, 404)
  await c.env.DB.prepare('DELETE FROM siq_shops WHERE id = ?').bind(id).run()
  await logAudit(c.env.DB, c.get('user').id, 'shop.delete', 'shop', id)
  return c.json({ message: 'Shop deleted' })
})

platform.post('/shops/:id/suspend', requirePermission('platform.shops.suspend'), zValidator('json', toggleStatusSchema), async (c) => {
  const id = c.req.param('id')
  const { reason } = c.req.valid('json')
  const shop = await c.env.DB.prepare('SELECT id, status FROM siq_shops WHERE id = ?').bind(id).first<any>()
  if (!shop) return c.json({ error: 'Shop not found' }, 404)
  if (shop.status === 'suspended') return c.json({ error: 'Shop is already suspended' }, 400)
  await c.env.DB.prepare("UPDATE siq_shops SET status = 'suspended', updated_at = ? WHERE id = ?").bind(now(), id).run()
  await c.env.DB.prepare("UPDATE siq_subscriptions SET status = 'suspended', updated_at = ? WHERE shop_id = ? AND status = 'active'").bind(now(), id).run()
  await logAudit(c.env.DB, c.get('user').id, 'shop.suspend', 'shop', id, { reason: reason ?? null })
  return c.json({ message: 'Shop suspended and its active subscriptions paused' })
})

platform.post('/shops/:id/activate', requirePermission('platform.shops.suspend'), zValidator('json', toggleStatusSchema), async (c) => {
  const id = c.req.param('id')
  const { reason } = c.req.valid('json')
  const shop = await c.env.DB.prepare('SELECT id, status FROM siq_shops WHERE id = ?').bind(id).first<any>()
  if (!shop) return c.json({ error: 'Shop not found' }, 404)
  if (shop.status === 'active') return c.json({ error: 'Shop is already active' }, 400)
  await c.env.DB.prepare("UPDATE siq_shops SET status = 'active', updated_at = ? WHERE id = ?").bind(now(), id).run()
  await logAudit(c.env.DB, c.get('user').id, 'shop.activate', 'shop', id, { reason: reason ?? null })
  return c.json({ message: 'Shop activated' })
})

// ── Subscription plans ───────────────────────────────────────────────────────

platform.get('/plans', requirePermission('platform.subscriptions.read'), async (c) => {
  const plans = await c.env.DB.prepare('SELECT id, name, code, price, currency, billing_cycle, features, is_active, created_at FROM siq_subscription_plans ORDER BY price ASC').all<any>()
  return c.json(plans.results)
})

platform.post('/plans', requirePermission('platform.plans.manage'), zValidator('json', planSchema), async (c) => {
  const body = c.req.valid('json')
  const existing = await c.env.DB.prepare('SELECT id FROM siq_subscription_plans WHERE code = ? OR name = ?').bind(body.code, body.name).first()
  if (existing) return c.json({ error: 'Plan code or name already exists' }, 409)
  const id = generateId()
  await c.env.DB.prepare(
    'INSERT INTO siq_subscription_plans (id, name, code, price, currency, billing_cycle, features, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, body.name, body.code, body.price, body.currency, body.billingCycle, body.features ?? null, body.isActive ?? true).run()
  await logAudit(c.env.DB, c.get('user').id, 'plan.create', 'plan', id, { name: body.name, price: body.price })
  return c.json({ id, ...body }, 201)
})

platform.patch('/plans/:id', requirePermission('platform.plans.manage'), zValidator('json', updatePlanSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const plan = await c.env.DB.prepare('SELECT id FROM siq_subscription_plans WHERE id = ?').bind(id).first()
  if (!plan) return c.json({ error: 'Plan not found' }, 404)
  await c.env.DB.prepare(
    `UPDATE siq_subscription_plans SET
       name = COALESCE(?, name), code = COALESCE(?, code), price = COALESCE(?, price),
       currency = COALESCE(?, currency), billing_cycle = COALESCE(?, billing_cycle),
       features = COALESCE(?, features), is_active = COALESCE(?, is_active)
     WHERE id = ?`
  ).bind(body.name ?? null, body.code ?? null, body.price ?? null, body.currency ?? null, body.billingCycle ?? null, body.features ?? null, body.isActive === undefined ? null : (body.isActive ? 1 : 0), id).run()
  await logAudit(c.env.DB, c.get('user').id, 'plan.update', 'plan', id, body)
  return c.json({ message: 'Plan updated' })
})

// ── Subscriptions ────────────────────────────────────────────────────────────

platform.get('/subscriptions', requirePermission('platform.subscriptions.read'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT s.id, s.status, s.started_at, s.expires_at, s.auto_renew, s.created_at,
       sh.name AS shop_name, sh.status AS shop_status, p.name AS plan_name, p.price, p.currency
     FROM siq_subscriptions s
     INNER JOIN siq_shops sh ON sh.id = s.shop_id
     INNER JOIN siq_subscription_plans p ON p.id = s.plan_id
     ORDER BY s.created_at DESC`
  ).all<any>()
  return c.json(rows.results)
})

platform.get('/subscriptions/:id', requirePermission('platform.subscriptions.read'), async (c) => {
  const id = c.req.param('id')
  const sub = await c.env.DB.prepare(
    `SELECT s.*, sh.name AS shop_name, p.name AS plan_name, p.price, p.currency, p.billing_cycle
     FROM siq_subscriptions s
     INNER JOIN siq_shops sh ON sh.id = s.shop_id
     INNER JOIN siq_subscription_plans p ON p.id = s.plan_id
     WHERE s.id = ?`
  ).bind(id).first<any>()
  if (!sub) return c.json({ error: 'Subscription not found' }, 404)
  const payments = await c.env.DB.prepare('SELECT id, amount, currency, status, transaction_id, paid_at FROM siq_payments WHERE subscription_id = ? ORDER BY created_at DESC').bind(id).all<any>()
  return c.json({ ...sub, payments: payments.results })
})

platform.patch('/subscriptions/:id', requirePermission('platform.subscriptions.manage'), zValidator('json', subscriptionUpdateSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const sub = await c.env.DB.prepare('SELECT id FROM siq_subscriptions WHERE id = ?').bind(id).first()
  if (!sub) return c.json({ error: 'Subscription not found' }, 404)
  await c.env.DB.prepare(
    `UPDATE siq_subscriptions SET
       plan_id = COALESCE(?, plan_id), status = COALESCE(?, status), auto_renew = COALESCE(?, auto_renew),
       updated_at = ?
     WHERE id = ?`
  ).bind(body.planId ?? null, body.status ?? null, body.autoRenew === undefined ? null : (body.autoRenew ? 1 : 0), now(), id).run()
  await logAudit(c.env.DB, c.get('user').id, 'subscription.update', 'subscription', id, body)
  return c.json({ message: 'Subscription updated' })
})

platform.post('/subscriptions/:id/renew', requirePermission('platform.subscriptions.manage'), zValidator('json', renewSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')
  const sub = await c.env.DB.prepare(
    `SELECT s.id, s.shop_id, s.plan_id, s.expires_at, p.billing_cycle FROM siq_subscriptions s
     INNER JOIN siq_subscription_plans p ON p.id = s.plan_id WHERE s.id = ?`
  ).bind(id).first<any>()
  if (!sub) return c.json({ error: 'Subscription not found' }, 404)

  const months = body.months ?? (sub.billing_cycle === 'yearly' ? 12 : 1)
  const base = sub.expires_at && new Date(sub.expires_at).getTime() > Date.now() ? new Date(sub.expires_at) : new Date()
  const expiresAt = new Date(base.getTime() + months * 30 * 24 * 60 * 60 * 1000).toISOString()
  const startedAt = now()

  await c.env.DB.prepare("UPDATE siq_subscriptions SET status = 'active', started_at = ?, expires_at = ?, updated_at = ? WHERE id = ?").bind(startedAt, expiresAt, now(), id).run()

  let paymentId: string | null = null
  if (body.amount !== undefined) {
    paymentId = generateId()
    await c.env.DB.prepare(
      `INSERT INTO siq_payments (id, shop_id, subscription_id, amount, currency, status, payment_method, transaction_id, gateway, paid_at)
       VALUES (?, ?, ?, ?, 'INR', 'succeeded', 'admin_renewal', ?, 'admin', ?)`
    ).bind(paymentId, sub.shop_id, id, body.amount, generateId(), now()).run()
  }

  await logAudit(c.env.DB, c.get('user').id, 'subscription.renew', 'subscription', id, { months, expiresAt })
  return c.json({ message: 'Subscription renewed', expiresAt, paymentId })
})

// ── Login credentials ────────────────────────────────────────────────────────

platform.get('/login-credentials', requirePermission('platform.credentials.read'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.owner_id, u.status, u.created_at,
       (SELECT a.created_at FROM siq_audit_logs a WHERE a.actor_id = u.id AND a.action = 'auth.login' ORDER BY a.created_at DESC LIMIT 1) AS last_login,
       (SELECT sh.name FROM siq_shops sh WHERE sh.owner_id = u.id ORDER BY sh.created_at DESC LIMIT 1) AS shop_name
     FROM users u ORDER BY u.created_at DESC`
  ).all<any>()
  return c.json(rows.results)
})

platform.get('/login-credentials/:id', requirePermission('platform.credentials.read'), async (c) => {
  const id = c.req.param('id')
  const user = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.owner_id, u.status, u.created_at, u.updated_at,
       (SELECT a.created_at FROM siq_audit_logs a WHERE a.actor_id = u.id AND a.action = 'auth.login' ORDER BY a.created_at DESC LIMIT 1) AS last_login
     FROM users u WHERE u.id = ?`
  ).bind(id).first<any>()
  if (!user) return c.json({ error: 'User not found' }, 404)
  const shops = await c.env.DB.prepare('SELECT id, name, status, created_at FROM siq_shops WHERE owner_id = ? ORDER BY created_at DESC').bind(id).all<any>()
  return c.json({ ...user, shops: shops.results })
})

platform.post('/login-credentials/:id/reset-password', requirePermission('platform.credentials.reset'), zValidator('json', resetPasswordSchema), async (c) => {
  const id = c.req.param('id')
  const { password } = c.req.valid('json')
  const user = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first()
  if (!user) return c.json({ error: 'User not found' }, 404)
  const passwordHash = await hashPassword(password)
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').bind(passwordHash, now(), id).run()
  await revokeUserSessions(c.env.DB, id)
  await logAudit(c.env.DB, c.get('user').id, 'credentials.reset', 'user', id)
  return c.json({ message: 'Password reset and all sessions revoked' })
})

// ── Payments ─────────────────────────────────────────────────────────────────

platform.get('/payments', requirePermission('platform.payments.read'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT p.id, p.amount, p.currency, p.status, p.payment_method, p.transaction_id, p.gateway, p.paid_at, p.created_at,
       sh.name AS shop_name
     FROM siq_payments p INNER JOIN siq_shops sh ON sh.id = p.shop_id
     ORDER BY COALESCE(p.paid_at, p.created_at) DESC`
  ).all<any>()
  return c.json(rows.results)
})

platform.get('/payments/:id', requirePermission('platform.payments.read'), async (c) => {
  const id = c.req.param('id')
  const payment = await c.env.DB.prepare(
    `SELECT p.*, sh.name AS shop_name FROM siq_payments p INNER JOIN siq_shops sh ON sh.id = p.shop_id WHERE p.id = ?`
  ).bind(id).first<any>()
  if (!payment) return c.json({ error: 'Payment not found' }, 404)
  return c.json(payment)
})

platform.post('/payments', requirePermission('platform.payments.manage'), zValidator('json', paymentSchema), async (c) => {
  const body = c.req.valid('json')
  const shop = await c.env.DB.prepare('SELECT id FROM siq_shops WHERE id = ?').bind(body.shopId).first()
  if (!shop) return c.json({ error: 'Shop not found' }, 404)
  if (body.subscriptionId) {
    const sub = await c.env.DB.prepare('SELECT id FROM siq_subscriptions WHERE id = ?').bind(body.subscriptionId).first()
    if (!sub) return c.json({ error: 'Subscription not found' }, 404)
  }
  const id = generateId()
  const paidAt = body.status === 'succeeded' ? now() : null
  await c.env.DB.prepare(
    `INSERT INTO siq_payments (id, shop_id, subscription_id, amount, currency, status, payment_method, transaction_id, gateway, paid_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, body.shopId, body.subscriptionId ?? null, body.amount, body.currency, body.status, body.paymentMethod ?? null, body.transactionId ?? null, body.gateway ?? null, paidAt).run()
  await logAudit(c.env.DB, c.get('user').id, 'payment.record', 'payment', id, { shopId: body.shopId, amount: body.amount, status: body.status })
  return c.json({ id, ...body }, 201)
})

platform.post('/payments/:id/refund', requirePermission('platform.payments.manage'), zValidator('json', toggleStatusSchema), async (c) => {
  const id = c.req.param('id')
  const { reason } = c.req.valid('json')
  const payment = await c.env.DB.prepare('SELECT id, status FROM siq_payments WHERE id = ?').bind(id).first<any>()
  if (!payment) return c.json({ error: 'Payment not found' }, 404)
  if (payment.status === 'refunded') return c.json({ error: 'Payment is already refunded' }, 400)
  if (payment.status !== 'succeeded') return c.json({ error: 'Only succeeded payments can be refunded' }, 400)
  await c.env.DB.prepare("UPDATE siq_payments SET status = 'refunded' WHERE id = ?").bind(id).run()
  await logAudit(c.env.DB, c.get('user').id, 'payment.refund', 'payment', id, { reason: reason ?? null })
  return c.json({ message: 'Payment refunded' })
})

// ── Platform reports ─────────────────────────────────────────────────────────

platform.get('/reports/overview', requirePermission('platform.reports.read'), async (c) => {
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const overview = await c.env.DB.prepare(
    `SELECT
       (SELECT COALESCE(SUM(amount), 0) FROM siq_payments WHERE status = 'succeeded') AS total_revenue,
       (SELECT COALESCE(SUM(amount), 0) FROM siq_payments WHERE status = 'succeeded' AND paid_at >= ?) AS revenue_this_year,
       (SELECT COALESCE(SUM(amount), 0) FROM siq_payments WHERE status = 'succeeded' AND paid_at >= ?) AS revenue_this_month,
       (SELECT COUNT(*) FROM siq_payments WHERE status = 'succeeded') AS total_payments,
       (SELECT COUNT(*) FROM siq_shops) AS total_shops,
       (SELECT COUNT(*) FROM siq_subscriptions WHERE status = 'active') AS active_subscriptions`
  ).bind(yearStart, monthStart).first<any>()

  const planMix = await c.env.DB.prepare(
    `SELECT p.name AS plan_name, COUNT(s.id) AS count
     FROM siq_subscription_plans p LEFT JOIN siq_subscriptions s ON s.plan_id = p.id AND s.status = 'active'
     GROUP BY p.id ORDER BY count DESC`
  ).all<any>()

  return c.json({ overview, planMix: planMix.results })
})

platform.get('/reports/revenue', requirePermission('platform.reports.read'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT strftime('%Y-%m', paid_at) AS month, COUNT(*) AS payments, COALESCE(SUM(amount), 0) AS revenue
     FROM siq_payments WHERE status = 'succeeded' AND paid_at IS NOT NULL
     GROUP BY month ORDER BY month DESC LIMIT 12`
  ).all<any>()
  return c.json(rows.results)
})

platform.get('/reports/subscriptions', requirePermission('platform.reports.read'), async (c) => {
  const byStatus = await c.env.DB.prepare('SELECT status, COUNT(*) AS count FROM siq_subscriptions GROUP BY status ORDER BY count DESC').all<any>()
  const expiring = await c.env.DB.prepare(
    `SELECT s.id, s.expires_at, sh.name AS shop_name, p.name AS plan_name
     FROM siq_subscriptions s INNER JOIN siq_shops sh ON sh.id = s.shop_id INNER JOIN siq_subscription_plans p ON p.id = s.plan_id
     WHERE s.status = 'active' AND s.expires_at IS NOT NULL
     ORDER BY s.expires_at ASC LIMIT 20`
  ).all<any>()
  return c.json({ byStatus: byStatus.results, expiring: expiring.results })
})

platform.get('/reports/shops', requirePermission('platform.reports.read'), async (c) => {
  const growth = await c.env.DB.prepare(
    `SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count FROM siq_shops GROUP BY month ORDER BY month DESC LIMIT 12`
  ).all<any>()
  const byStatus = await c.env.DB.prepare('SELECT status, COUNT(*) AS count FROM siq_shops GROUP BY status').all<any>()
  return c.json({ growth: growth.results, byStatus: byStatus.results })
})

platform.get('/reports/top-shops', requirePermission('platform.reports.read'), async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT sh.id, sh.name, sh.status, u.email AS owner_email,
       COUNT(p.id) AS payment_count, COALESCE(SUM(p.amount), 0) AS revenue
     FROM siq_shops sh
     LEFT JOIN siq_payments p ON p.shop_id = sh.id AND p.status = 'succeeded'
     LEFT JOIN users u ON u.id = sh.owner_id
     GROUP BY sh.id ORDER BY revenue DESC LIMIT 10`
  ).all<any>()
  return c.json(rows.results)
})

// ── Platform settings ────────────────────────────────────────────────────────

platform.get('/settings', requirePermission('platform.settings.manage'), async (c) => {
  const rows = await c.env.DB.prepare('SELECT key, value, type, updated_by, updated_at FROM siq_platform_settings ORDER BY key').all<any>()
  return c.json((rows.results ?? []).map((row: any) => ({ ...row, value: parseSetting(row.value, row.type) })))
})

platform.get('/settings/:key', requirePermission('platform.settings.manage'), async (c) => {
  const key = c.req.param('key')
  const row = await c.env.DB.prepare('SELECT key, value, type, updated_by, updated_at FROM siq_platform_settings WHERE key = ?').bind(key).first<any>()
  if (!row) return c.json({ error: 'Setting not found' }, 404)
  return c.json({ ...row, value: parseSetting(row.value, row.type) })
})

platform.put('/settings/:key', requirePermission('platform.settings.manage'), zValidator('json', settingSchema), async (c) => {
  const key = c.req.param('key')
  const body = c.req.valid('json')
  const existing = await c.env.DB.prepare('SELECT id, type FROM siq_platform_settings WHERE key = ?').bind(key).first<any>()
  const type = body.type ?? existing?.type ?? 'string'
  const raw = serializeSetting(body.value, type)
  const actor = c.get('user').id

  if (existing) {
    await c.env.DB.prepare('UPDATE siq_platform_settings SET value = ?, type = ?, updated_by = ?, updated_at = ? WHERE key = ?').bind(raw, type, actor, now(), key).run()
  } else {
    await c.env.DB.prepare('INSERT INTO siq_platform_settings (id, key, value, type, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(generateId(), key, raw, type, actor, now()).run()
  }
  await logAudit(c.env.DB, actor, 'setting.update', 'setting', key, { value: body.value, type })
  return c.json({ key, value: parseSetting(raw, type), type })
})

platform.delete('/settings/:key', requirePermission('platform.settings.manage'), async (c) => {
  const key = c.req.param('key')
  const row = await c.env.DB.prepare('SELECT id FROM siq_platform_settings WHERE key = ?').bind(key).first()
  if (!row) return c.json({ error: 'Setting not found' }, 404)
  await c.env.DB.prepare('DELETE FROM siq_platform_settings WHERE key = ?').bind(key).run()
  await logAudit(c.env.DB, c.get('user').id, 'setting.delete', 'setting', key)
  return c.json({ message: 'Setting deleted' })
})

platform.post('/settings/maintenance', requirePermission('platform.settings.manage'), zValidator('json', maintenanceSchema), async (c) => {
  const { enabled, reason } = c.req.valid('json')
  const key = 'maintenance_mode'
  const existing = await c.env.DB.prepare('SELECT id FROM siq_platform_settings WHERE key = ?').bind(key).first()
  const actor = c.get('user').id
  const raw = enabled ? 'true' : 'false'
  if (existing) {
    await c.env.DB.prepare('UPDATE siq_platform_settings SET value = ?, updated_by = ?, updated_at = ? WHERE key = ?').bind(raw, actor, now(), key).run()
  } else {
    await c.env.DB.prepare('INSERT INTO siq_platform_settings (id, key, value, type, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(generateId(), key, raw, 'boolean', actor, now()).run()
  }
  await logAudit(c.env.DB, actor, 'maintenance.toggle', 'setting', key, { enabled, reason: reason ?? null })
  return c.json({ key, value: enabled, type: 'boolean', message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled' })
})

function parseSetting(value: string | null, type: string): unknown {
  if (value === null) return null
  switch (type) {
    case 'number': return Number(value)
    case 'boolean': return value === 'true'
    case 'json': {
      try { return JSON.parse(value) } catch { return value }
    }
    default: return value
  }
}

function serializeSetting(value: unknown, type: string): string {
  switch (type) {
    case 'number': return String(value)
    case 'boolean': return value === true || value === 'true' ? 'true' : 'false'
    case 'json': return JSON.stringify(value)
    default: return String(value)
  }
}

export default platform
