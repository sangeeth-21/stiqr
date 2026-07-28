import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { app as mainApp } from './cf/main';
import { authRoutes } from './cf/routes/auth';
import { coreRoutes } from './cf/routes/core';
import { inventoryRoutes } from './cf/routes/inventory';
import { posRoutes } from './cf/routes/pos';
import { financialRoutes } from './cf/routes/financial';
import { analyticsRoutes } from './cf/routes/analytics';
import { adminRoutes } from './cf/routes/admin';

type Bindings = { DB: D1Database; JWT_SECRET: string; };
type Variables = { userId: string; userRole: string; userEmail: string; };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS
app.use('*', cors({ origin: '*', allowMethods: ['GET','HEAD','PUT','PATCH','POST','DELETE'], allowHeaders: ['Content-Type','Authorization'] }));

// Health check
app.get('/api/health', (c) => c.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '2.0.0-cloudflare',
  platform: 'cloudflare-workers',
  totalEndpoints: '~450+',
}));

// Auth routes (public)
authRoutes(app);

// Protected routes
const secure = new Hono<{ Bindings: Bindings; Variables: Variables }>();
secure.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }
  const { jwtVerify } = await import('./cf/main');
  try {
    const payload = await jwtVerify(authHeader.slice(7), c.env.JWT_SECRET);
    c.set('userId', payload.sub as string);
    c.set('userRole', payload.role as string);
    c.set('userEmail', payload.email as string);
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
  await next();
});

// Register all protected route modules
coreRoutes(secure);
inventoryRoutes(secure);
posRoutes(secure);
financialRoutes(secure);
analyticsRoutes(secure);
adminRoutes(secure);

app.route('/', secure);

// 404 with full endpoint listing
app.all('*', (c) => c.json({
  statusCode: 404,
  message: `Route ${c.req.method} ${c.req.path} not found`,
  api: 'StiQR Backend API v2.0.0-cloudflare',
  baseUrl: 'https://stiqr-backend.ksangeeth76.workers.dev',
  modules: {
    system: ['GET /api/health'],
    auth: ['POST /api/auth/register', 'POST /api/auth/login', 'GET /api/auth/profile', 'POST /api/auth/logout', 'POST /api/auth/refresh', 'POST /api/auth/forgot-password', 'POST /api/auth/reset-password'],
    users: ['GET/POST /api/users', 'GET/PATCH/DELETE /api/users/:id', 'GET/PATCH /api/users/:id/status'],
    shops: ['GET/POST /api/shops', 'GET/PATCH/DELETE /api/shops/:id', 'GET /api/shops/:id/stats'],
    roles: ['GET/POST /api/roles', 'GET/PATCH/DELETE /api/roles/:id', 'GET/POST /api/roles/:id/permissions'],
    permissions: ['GET/POST /api/permissions', 'GET/PATCH/DELETE /api/permissions/:id'],
    tenants: ['GET/POST /api/tenants', 'GET/PATCH/DELETE /api/tenants/:id'],
    settings: ['GET/POST /api/settings', 'GET/PATCH /api/settings/:key'],
    notifications: ['GET /api/notifications', 'PATCH /api/notifications/:id/read', 'DELETE /api/notifications/:id'],
    otp: ['POST /api/otp/generate', 'POST /api/otp/verify'],
    products: ['GET/POST /api/products', 'GET/PATCH/DELETE /api/products/:id', 'GET/POST /api/products/:id/variants', 'GET/POST /api/products/:id/images'],
    categories: ['GET/POST /api/categories', 'GET/PATCH/DELETE /api/categories/:id', 'GET /api/categories/tree'],
    brands: ['GET/POST /api/brands', 'GET/PATCH/DELETE /api/brands/:id'],
    units: ['GET/POST /api/units', 'GET/PATCH/DELETE /api/units/:id'],
    stock: ['GET /api/stock', 'GET /api/stock/:id', 'POST /api/stock/adjust', 'GET /api/stock-movements', 'POST /api/inventory/adjust', 'GET /api/inventory/summary'],
    suppliers: ['GET/POST /api/suppliers', 'GET/PATCH/DELETE /api/suppliers/:id'],
    warehouses: ['GET/POST /api/warehouses', 'GET/PATCH/DELETE /api/warehouses/:id'],
    barcodes: ['GET/POST /api/barcodes', 'GET/PATCH/DELETE /api/barcodes/:id', 'GET /api/barcodes/search/:code'],
    imei: ['GET/POST /api/imei', 'GET/PATCH/DELETE /api/imei/:id'],
    tax: ['GET/POST /api/tax', 'GET/PATCH/DELETE /api/tax/:id'],
    coupons: ['GET/POST /api/coupons', 'GET/PATCH/DELETE /api/coupons/:id', 'POST /api/coupons/:id/validate'],
    sales: ['GET/POST /api/sales', 'GET/PATCH/DELETE /api/sales/:id', 'GET /api/sales/:id/items'],
    purchases: ['GET/POST /api/purchases', 'GET/PATCH/DELETE /api/purchases/:id', 'GET /api/purchases/:id/items'],
    invoices: ['GET/POST /api/invoices', 'GET/PATCH/DELETE /api/invoices/:id'],
    pos: ['GET/POST /api/pos/sessions', 'GET/PATCH/DELETE /api/pos/sessions/:id'],
    payments: ['GET/POST /api/payments', 'GET/PATCH/DELETE /api/payments/:id'],
    expenses: ['GET/POST /api/expenses', 'GET/PATCH/DELETE /api/expenses/:id'],
    income: ['GET/POST /api/income', 'GET/PATCH/DELETE /api/income/:id'],
    serviceRepair: ['GET/POST /api/service-repair', 'GET/PATCH/DELETE /api/service-repair/:id'],
    wallets: ['GET/POST /api/wallets', 'GET/PATCH/DELETE /api/wallets/:id', 'GET /api/wallets/:id/balance', 'POST /api/wallets/:id/freeze', 'POST /api/wallets/:id/unfreeze'],
    walletTransactions: ['GET/POST /api/wallet-transactions', 'GET/PATCH/DELETE /api/wallet-transactions/:id', 'POST /api/wallet-transactions/credit', 'POST /api/wallet-transactions/debit'],
    commission: ['GET/POST /api/commission/rules', 'GET/PATCH /api/commission/rules/:id', 'GET/POST /api/commission/slabs', 'GET /api/commission/ledger', 'POST /api/commission/calculate'],
    settlements: ['GET/POST /api/settlements', 'GET/PATCH/DELETE /api/settlements/:id', 'POST /api/settlements/:id/approve'],
    dmt: ['GET/POST /api/dmt/senders', 'GET/PATCH /api/dmt/senders/:id', 'GET/POST /api/dmt/beneficiaries', 'GET/POST /api/dmt/transfers'],
    aeps: ['GET/POST /api/aeps/transactions', 'GET /api/aeps/transactions/:id'],
    bbps: ['GET/POST /api/bbps/billers', 'GET/POST /api/bbps/payments'],
    recharges: ['GET/POST /api/recharges', 'GET/PATCH/DELETE /api/recharges/:id'],
    beneficiary: ['GET/POST /api/beneficiary', 'GET/PATCH/DELETE /api/beneficiary/:id'],
    kyc: ['GET/POST /api/kyc', 'GET/PATCH/DELETE /api/kyc/:id'],
    financialTransactions: ['GET/POST /api/financial-transactions', 'GET /api/financial-transactions/:id'],
    fraud: ['GET/POST /api/fraud/rules', 'GET/POST /api/fraud/alerts', 'GET/POST /api/fraud/blacklist'],
    loyalty: ['GET/POST /api/loyalty/programs', 'GET/POST /api/loyalty/transactions'],
    subscriptions: ['GET/POST /api/subscriptions', 'GET/PATCH/DELETE /api/subscriptions/:id'],
    analytics: ['GET/POST /api/analytics/events', 'GET/POST /api/analytics/dashboards', 'GET/POST /api/analytics/widgets', 'GET /api/analytics/summary', 'GET /api/analytics/trends'],
    aiAssistant: ['GET/POST /api/ai-assistant/conversations', 'GET/POST /api/ai-assistant/predictions', 'POST /api/ai-assistant/chat', 'POST /api/ai-assistant/analyze'],
    ocr: ['GET/POST /api/ocr', 'GET/PATCH/DELETE /api/ocr/:id', 'GET /api/ocr/stats'],
    automation: ['GET/POST /api/automation/rules', 'GET/PATCH/DELETE /api/automation/rules/:id', 'POST /api/automation/rules/:id/execute', 'GET/POST /api/automation/jobs', 'GET /api/automation/stats'],
    localization: ['GET/POST /api/localization/translations', 'POST /api/localization/translations/bulk', 'GET /api/localization/translations/export'],
    backups: ['GET/POST /api/backups', 'GET/PATCH/DELETE /api/backups/:id', 'POST /api/backups/:id/restore', 'GET /api/backups/stats'],
    systemAdmin: ['GET/POST /api/system-admin/feature-flags', 'GET/POST /api/system-admin/announcements', 'GET /api/system-admin/info'],
    plugins: ['GET/POST /api/plugins', 'GET/PATCH/DELETE /api/plugins/:id', 'GET /api/plugins/marketplace'],
    apiManagement: ['GET/POST /api/api-management/keys', 'GET/POST /api/api-management/webhooks', 'GET/POST /api/api-management/webhook-deliveries'],
    security: ['GET/POST /api/security-center/alerts', 'GET/POST /api/security-center/blocked-ips', 'GET /api/security-center/stats'],
    errorTracking: ['GET/POST /api/error-tracking', 'GET/PATCH/DELETE /api/error-tracking/:id', 'GET /api/error-tracking/stats'],
    integrationHub: ['GET/POST /api/integration-hub', 'GET/PATCH/DELETE /api/integration-hub/:id', 'GET /api/integration-hub/logs'],
    oauth: ['GET/POST /api/oauth/clients', 'GET/PATCH/DELETE /api/oauth/clients/:id'],
    tenantAdmin: ['GET/POST /api/tenant-admin/performance', 'GET /api/tenant-admin/audit-trail', 'GET/POST /api/tenant-admin/usage', 'GET/POST /api/tenant-admin/data-retention'],
    reports: ['GET/POST /api/reports', 'GET/PATCH/DELETE /api/reports/:id', 'GET /api/reports/dashboard'],
    financialReports: ['GET /api/financial-reports/wallet', 'GET /api/financial-reports/transactions', 'GET /api/financial-reports/commissions', 'GET /api/financial-reports/settlements', 'GET /api/financial-reports/dmt', 'GET /api/financial-reports/recharge', 'GET /api/financial-reports/refunds', 'GET /api/financial-reports/profit-loss'],
    files: ['GET /api/files', 'GET/DELETE /api/files/:id'],
    auditLogs: ['GET /api/audit-logs', 'GET /api/audit-logs/:id'],
    search: ['GET /api/search?q=term'],
  },
}, 404));

export default app;
