import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { authenticate, requireRole, requirePermission } from '../middleware/auth'
import { now, logAudit } from '../utils/security'

type Bindings = { DB: D1Database }

const shop = new Hono<{ Bindings: Bindings }>()

shop.use('*', authenticate, requireRole('owner'))

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const profileSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(1000).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(50).optional(),
  website: z.string().url().or(z.literal('')).optional(),
  tagline: z.string().max(200).optional(),
  currency: z.string().max(10).optional(),
  timezone: z.string().max(64).optional(),
  logoUrl: z.string().url().or(z.literal('')).optional(),
})

const settingSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean()]),
  type: z.enum(['string', 'number', 'boolean', 'json']).optional(),
})

const businessHoursSchema = z.array(
  z.object({
    day: z.number().int().min(0).max(6),
    isOpen: z.boolean(),
    openTime: z.string().regex(timeRegex).nullable().optional(),
    closeTime: z.string().regex(timeRegex).nullable().optional(),
  })
).max(7)

const gstSchema = z.object({
  gstNumber: z.string().max(50).optional().or(z.literal('')),
  businessName: z.string().max(200).optional().or(z.literal('')),
  stateCode: z.string().max(5).optional().or(z.literal('')),
  registeredAddress: z.string().max(500).optional().or(z.literal('')),
  isRegistered: z.boolean().optional(),
  taxInclusive: z.boolean().optional(),
})

const invoiceSchema = z.object({
  prefix: z.string().max(20).optional().or(z.literal('')),
  startingNumber: z.number().int().positive().optional(),
  nextNumber: z.number().int().positive().optional(),
  footer: z.string().max(500).optional().or(z.literal('')),
  paymentTerms: z.string().max(200).optional().or(z.literal('')),
  showGst: z.boolean().optional(),
  showLogo: z.boolean().optional(),
  autoIncrement: z.boolean().optional(),
})

const printerSchema = z.object({
  printerType: z.enum(['thermal', 'dotmatrix', 'a4']).optional(),
  thermalWidth: z.number().int().min(40).max(200).optional(),
  paperSize: z.enum(['58mm', '80mm', 'a4']).optional(),
  header: z.string().max(500).optional().or(z.literal('')),
  footer: z.string().max(500).optional().or(z.literal('')),
  copies: z.number().int().min(1).max(10).optional(),
  showBarcode: z.boolean().optional(),
  showQr: z.boolean().optional(),
})

const brandingSchema = z.object({
  logoUrl: z.string().url().or(z.literal('')).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  watermark: z.string().max(500).optional().or(z.literal('')),
  receiptFooter: z.string().max(500).optional().or(z.literal('')),
})

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_HOURS = [
  { day: 0, is_open: 1, open_time: '09:00', close_time: '18:00' },
  { day: 1, is_open: 1, open_time: '09:00', close_time: '18:00' },
  { day: 2, is_open: 1, open_time: '09:00', close_time: '18:00' },
  { day: 3, is_open: 1, open_time: '09:00', close_time: '18:00' },
  { day: 4, is_open: 1, open_time: '09:00', close_time: '18:00' },
  { day: 5, is_open: 1, open_time: '09:00', close_time: '18:00' },
  { day: 6, is_open: 0, open_time: null, close_time: null },
]

async function getOwnerShop(db: D1Database, ownerId: string) {
  return db.prepare('SELECT * FROM siq_shops WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1').bind(ownerId).first<any>()
}

async function ensureBusinessHours(db: D1Database, shopId: string) {
  const existing = await db.prepare('SELECT COUNT(*) AS count FROM siq_shop_business_hours WHERE shop_id = ?').bind(shopId).first<any>()
  if (Number(existing?.count) > 0) return
  await db.batch(
    DEFAULT_HOURS.map((h) =>
      db.prepare('INSERT OR IGNORE INTO siq_shop_business_hours (shop_id, day, is_open, open_time, close_time) VALUES (?, ?, ?, ?, ?)')
        .bind(shopId, h.day, h.is_open, h.open_time, h.close_time)
    )
  )
}

async function ensureGst(db: D1Database, shopId: string) {
  const row = await db.prepare('SELECT shop_id FROM siq_shop_gst WHERE shop_id = ?').bind(shopId).first()
  if (!row) await db.prepare('INSERT INTO siq_shop_gst (shop_id) VALUES (?)').bind(shopId).run()
}

async function ensureInvoice(db: D1Database, shopId: string) {
  const row = await db.prepare('SELECT shop_id FROM siq_shop_invoice WHERE shop_id = ?').bind(shopId).first()
  if (!row) await db.prepare('INSERT INTO siq_shop_invoice (shop_id) VALUES (?)').bind(shopId).run()
}

async function ensurePrinter(db: D1Database, shopId: string) {
  const row = await db.prepare('SELECT shop_id FROM siq_shop_printer WHERE shop_id = ?').bind(shopId).first()
  if (!row) await db.prepare('INSERT INTO siq_shop_printer (shop_id) VALUES (?)').bind(shopId).run()
}

async function ensureBranding(db: D1Database, shopId: string) {
  const row = await db.prepare('SELECT shop_id FROM siq_shop_branding WHERE shop_id = ?').bind(shopId).first()
  if (!row) await db.prepare('INSERT INTO siq_shop_branding (shop_id) VALUES (?)').bind(shopId).run()
}

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

shop.get('/profile', requirePermission('shop.read'), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)
  const profile = await db.prepare(
    `SELECT sh.id, sh.name, sh.slug, sh.description, sh.phone, sh.email, sh.address, sh.city, sh.state,
            sh.postal_code, sh.country, sh.website, sh.tagline, sh.currency, sh.timezone, sh.logo_url,
            sh.gst_number, sh.status, sh.created_at, sh.updated_at,
            u.email AS owner_email, u.name AS owner_name,
            (SELECT p.name FROM siq_subscriptions s INNER JOIN siq_subscription_plans p ON p.id = s.plan_id
             WHERE s.shop_id = sh.id AND s.status = 'active' ORDER BY s.created_at DESC LIMIT 1) AS plan_name
     FROM siq_shops sh LEFT JOIN users u ON u.id = sh.owner_id
     WHERE sh.id = ?`
  ).bind(shopRow.id).first<any>()
  return c.json(profile)
})

shop.patch('/profile', requirePermission('shop.update'), zValidator('json', profileSchema), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const body = c.req.valid('json')
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)

  if (body.slug) {
    const existing = await db.prepare('SELECT id FROM siq_shops WHERE slug = ? AND id != ?').bind(body.slug, shopRow.id).first()
    if (existing) return c.json({ error: 'Slug already in use' }, 409)
  }

  await db.prepare(
    `UPDATE siq_shops SET
       name = COALESCE(?, name), slug = COALESCE(?, slug), description = COALESCE(?, description),
       phone = COALESCE(?, phone), email = COALESCE(?, email), address = COALESCE(?, address),
       city = COALESCE(?, city), state = COALESCE(?, state), postal_code = COALESCE(?, postal_code),
       country = COALESCE(?, country), website = COALESCE(?, website), tagline = COALESCE(?, tagline),
       currency = COALESCE(?, currency), timezone = COALESCE(?, timezone), logo_url = COALESCE(?, logo_url),
       updated_at = ?
     WHERE id = ?`
  ).bind(
    body.name ?? null, body.slug ?? null, body.description ?? null,
    body.phone ?? null, body.email ?? null, body.address ?? null,
    body.city ?? null, body.state ?? null, body.postalCode ?? null,
    body.country ?? null, body.website ?? null, body.tagline ?? null,
    body.currency ?? null, body.timezone ?? null, body.logoUrl ?? null,
    now(), shopRow.id
  ).run()

  await logAudit(db, user.id, 'shop.profile.update', 'shop', shopRow.id, body)
  return c.json({ message: 'Shop profile updated' })
})

shop.get('/settings', requirePermission('shop.read'), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)
  const rows = await db.prepare('SELECT key, value, type, updated_at FROM siq_shop_settings WHERE shop_id = ? ORDER BY key').bind(shopRow.id).all<any>()
  return c.json((rows.results ?? []).map((row: any) => ({ key: row.key, value: parseSetting(row.value, row.type), type: row.type, updatedAt: row.updated_at })))
})

shop.put('/settings/:key', requirePermission('shop.update'), zValidator('json', settingSchema), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const key = c.req.param('key')
  const body = c.req.valid('json')
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)

  const existing = await db.prepare('SELECT type FROM siq_shop_settings WHERE shop_id = ? AND key = ?').bind(shopRow.id, key).first<any>()
  const type = body.type ?? existing?.type ?? 'string'
  const raw = serializeSetting(body.value, type)

  if (existing) {
    await db.prepare('UPDATE siq_shop_settings SET value = ?, type = ?, updated_at = ? WHERE shop_id = ? AND key = ?').bind(raw, type, now(), shopRow.id, key).run()
  } else {
    await db.prepare('INSERT INTO siq_shop_settings (shop_id, key, value, type, updated_at) VALUES (?, ?, ?, ?, ?)').bind(shopRow.id, key, raw, type, now()).run()
  }
  await logAudit(db, user.id, 'shop.setting.update', 'shop', shopRow.id, { key, value: body.value, type })
  return c.json({ key, value: parseSetting(raw, type), type })
})

shop.delete('/settings/:key', requirePermission('shop.update'), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const key = c.req.param('key')
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)

  const existing = await db.prepare('SELECT key FROM siq_shop_settings WHERE shop_id = ? AND key = ?').bind(shopRow.id, key).first()
  if (!existing) return c.json({ error: 'Setting not found' }, 404)
  await db.prepare('DELETE FROM siq_shop_settings WHERE shop_id = ? AND key = ?').bind(shopRow.id, key).run()
  await logAudit(db, user.id, 'shop.setting.delete', 'shop', shopRow.id, { key })
  return c.json({ message: 'Setting deleted' })
})

shop.get('/business-hours', requirePermission('shop.read'), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)
  await ensureBusinessHours(db, shopRow.id)
  const rows = await db.prepare('SELECT day, is_open, open_time, close_time FROM siq_shop_business_hours WHERE shop_id = ? ORDER BY day ASC').bind(shopRow.id).all<any>()
  return c.json((rows.results ?? []).map((row: any) => ({
    day: row.day,
    dayName: DAY_NAMES[row.day] ?? null,
    isOpen: row.is_open === 1,
    openTime: row.open_time,
    closeTime: row.close_time,
  })))
})

shop.put('/business-hours', requirePermission('shop.update'), zValidator('json', businessHoursSchema), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const hours = c.req.valid('json')
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)

  for (const h of hours) {
    if (h.isOpen && (!h.openTime || !h.closeTime)) {
      return c.json({ error: 'Open days require both openTime and closeTime' }, 400)
    }
  }

  const insertValues: unknown[] = []
  const placeholders = hours.map((h) => {
    insertValues.push(shopRow.id, h.day, h.isOpen ? 1 : 0, h.openTime ?? null, h.closeTime ?? null)
    return '(?, ?, ?, ?, ?)'
  }).join(', ')

  await db.prepare('DELETE FROM siq_shop_business_hours WHERE shop_id = ?').bind(shopRow.id).run()
  if (hours.length > 0) {
    await db.prepare(`INSERT INTO siq_shop_business_hours (shop_id, day, is_open, open_time, close_time) VALUES ${placeholders}`).bind(...insertValues).run()
  }
  await logAudit(db, user.id, 'shop.hours.update', 'shop', shopRow.id, { days: hours.length })

  const rows = await db.prepare('SELECT day, is_open, open_time, close_time FROM siq_shop_business_hours WHERE shop_id = ? ORDER BY day ASC').bind(shopRow.id).all<any>()
  return c.json((rows.results ?? []).map((row: any) => ({
    day: row.day,
    dayName: DAY_NAMES[row.day] ?? null,
    isOpen: row.is_open === 1,
    openTime: row.open_time,
    closeTime: row.close_time,
  })))
})

shop.get('/gst', requirePermission('shop.read'), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)
  await ensureGst(db, shopRow.id)
  const row = await db.prepare(
    'SELECT gst_number, business_name, state_code, registered_address, is_registered, tax_inclusive, updated_at FROM siq_shop_gst WHERE shop_id = ?'
  ).bind(shopRow.id).first<any>()
  return c.json({
    gstNumber: row.gst_number,
    businessName: row.business_name,
    stateCode: row.state_code,
    registeredAddress: row.registered_address,
    isRegistered: row.is_registered === 1,
    taxInclusive: row.tax_inclusive === 1,
    updatedAt: row.updated_at,
  })
})

shop.put('/gst', requirePermission('shop.update'), zValidator('json', gstSchema), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const body = c.req.valid('json')
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)

  await ensureGst(db, shopRow.id)
  await db.prepare(
    `UPDATE siq_shop_gst SET
       gst_number = COALESCE(?, gst_number), business_name = COALESCE(?, business_name),
       state_code = COALESCE(?, state_code), registered_address = COALESCE(?, registered_address),
       is_registered = COALESCE(?, is_registered), tax_inclusive = COALESCE(?, tax_inclusive),
       updated_at = ?
     WHERE shop_id = ?`
  ).bind(
    body.gstNumber ?? null, body.businessName ?? null,
    body.stateCode ?? null, body.registeredAddress ?? null,
    body.isRegistered === undefined ? null : (body.isRegistered ? 1 : 0),
    body.taxInclusive === undefined ? null : (body.taxInclusive ? 1 : 0),
    now(), shopRow.id
  ).run()

  await logAudit(db, user.id, 'shop.gst.update', 'shop', shopRow.id, body)
  return c.json({ message: 'GST settings updated' })
})

shop.get('/invoice', requirePermission('shop.read'), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)
  await ensureInvoice(db, shopRow.id)
  const row = await db.prepare(
    'SELECT prefix, starting_number, next_number, footer, payment_terms, show_gst, show_logo, auto_increment, updated_at FROM siq_shop_invoice WHERE shop_id = ?'
  ).bind(shopRow.id).first<any>()
  const nextNumber = Number(row.next_number)
  return c.json({
    prefix: row.prefix,
    startingNumber: Number(row.starting_number),
    nextNumber,
    footer: row.footer,
    paymentTerms: row.payment_terms,
    showGst: row.show_gst === 1,
    showLogo: row.show_logo === 1,
    autoIncrement: row.auto_increment === 1,
    nextInvoiceNumber: `${row.prefix ?? ''}${nextNumber}`,
    updatedAt: row.updated_at,
  })
})

shop.put('/invoice', requirePermission('shop.update'), zValidator('json', invoiceSchema), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const body = c.req.valid('json')
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)

  await ensureInvoice(db, shopRow.id)
  await db.prepare(
    `UPDATE siq_shop_invoice SET
       prefix = COALESCE(?, prefix), starting_number = COALESCE(?, starting_number),
       next_number = COALESCE(?, next_number), footer = COALESCE(?, footer),
       payment_terms = COALESCE(?, payment_terms), show_gst = COALESCE(?, show_gst),
       show_logo = COALESCE(?, show_logo), auto_increment = COALESCE(?, auto_increment),
       updated_at = ?
     WHERE shop_id = ?`
  ).bind(
    body.prefix ?? null, body.startingNumber ?? null,
    body.nextNumber ?? null, body.footer ?? null,
    body.paymentTerms ?? null,
    body.showGst === undefined ? null : (body.showGst ? 1 : 0),
    body.showLogo === undefined ? null : (body.showLogo ? 1 : 0),
    body.autoIncrement === undefined ? null : (body.autoIncrement ? 1 : 0),
    now(), shopRow.id
  ).run()

  await logAudit(db, user.id, 'shop.invoice.update', 'shop', shopRow.id, body)
  return c.json({ message: 'Invoice settings updated' })
})

shop.post('/invoice/next-number', requirePermission('shop.update'), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)

  await ensureInvoice(db, shopRow.id)
  const inv = await db.prepare('SELECT prefix, next_number, auto_increment FROM siq_shop_invoice WHERE shop_id = ?').bind(shopRow.id).first<any>()
  const number = Number(inv.next_number)
  if (inv.auto_increment) {
    await db.prepare('UPDATE siq_shop_invoice SET next_number = next_number + 1, updated_at = ? WHERE shop_id = ?').bind(now(), shopRow.id).run()
  }
  await logAudit(db, user.id, 'shop.invoice.next_number', 'shop', shopRow.id, { number })
  return c.json({ number, invoiceNumber: `${inv.prefix ?? ''}${number}` })
})

shop.get('/printer', requirePermission('shop.read'), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)
  await ensurePrinter(db, shopRow.id)
  const row = await db.prepare(
    'SELECT printer_type, thermal_width, paper_size, header, footer, copies, show_barcode, show_qr, updated_at FROM siq_shop_printer WHERE shop_id = ?'
  ).bind(shopRow.id).first<any>()
  return c.json({
    printerType: row.printer_type,
    thermalWidth: Number(row.thermal_width),
    paperSize: row.paper_size,
    header: row.header,
    footer: row.footer,
    copies: Number(row.copies),
    showBarcode: row.show_barcode === 1,
    showQr: row.show_qr === 1,
    updatedAt: row.updated_at,
  })
})

shop.put('/printer', requirePermission('shop.update'), zValidator('json', printerSchema), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const body = c.req.valid('json')
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)

  await ensurePrinter(db, shopRow.id)
  await db.prepare(
    `UPDATE siq_shop_printer SET
       printer_type = COALESCE(?, printer_type), thermal_width = COALESCE(?, thermal_width),
       paper_size = COALESCE(?, paper_size), header = COALESCE(?, header),
       footer = COALESCE(?, footer), copies = COALESCE(?, copies),
       show_barcode = COALESCE(?, show_barcode), show_qr = COALESCE(?, show_qr),
       updated_at = ?
     WHERE shop_id = ?`
  ).bind(
    body.printerType ?? null, body.thermalWidth ?? null,
    body.paperSize ?? null, body.header ?? null,
    body.footer ?? null, body.copies ?? null,
    body.showBarcode === undefined ? null : (body.showBarcode ? 1 : 0),
    body.showQr === undefined ? null : (body.showQr ? 1 : 0),
    now(), shopRow.id
  ).run()

  await logAudit(db, user.id, 'shop.printer.update', 'shop', shopRow.id, body)
  return c.json({ message: 'Printer settings updated' })
})

shop.get('/branding', requirePermission('shop.read'), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)
  await ensureBranding(db, shopRow.id)
  const row = await db.prepare(
    'SELECT logo_url, primary_color, accent_color, theme, watermark, receipt_footer, updated_at FROM siq_shop_branding WHERE shop_id = ?'
  ).bind(shopRow.id).first<any>()
  return c.json({
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    theme: row.theme,
    watermark: row.watermark,
    receiptFooter: row.receipt_footer,
    updatedAt: row.updated_at,
  })
})

shop.put('/branding', requirePermission('shop.update'), zValidator('json', brandingSchema), async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const body = c.req.valid('json')
  const shopRow = await getOwnerShop(db, user.id)
  if (!shopRow) return c.json({ error: 'Shop not found. Please contact platform admin.' }, 404)

  await ensureBranding(db, shopRow.id)
  await db.prepare(
    `UPDATE siq_shop_branding SET
       logo_url = COALESCE(?, logo_url), primary_color = COALESCE(?, primary_color),
       accent_color = COALESCE(?, accent_color), theme = COALESCE(?, theme),
       watermark = COALESCE(?, watermark), receipt_footer = COALESCE(?, receipt_footer),
       updated_at = ?
     WHERE shop_id = ?`
  ).bind(
    body.logoUrl ?? null, body.primaryColor ?? null,
    body.accentColor ?? null, body.theme ?? null,
    body.watermark ?? null, body.receiptFooter ?? null,
    now(), shopRow.id
  ).run()

  await logAudit(db, user.id, 'shop.branding.update', 'shop', shopRow.id, body)
  return c.json({ message: 'Branding settings updated' })
})

export default shop
