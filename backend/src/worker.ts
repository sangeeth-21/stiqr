import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './cf/routes/auth';
import { coreRoutes } from './cf/routes/core';
import { adminRoutes } from './cf/routes/admin';
import { staffRoutes } from './cf/routes/staff';
import { subscriptionRoutes } from './cf/routes/subscriptions';
import { uploadRoutes } from './cf/routes/upload';
import { catalogRoutes } from './cf/routes/module2/m2-catalog';
import { inventoryRoutes } from './cf/routes/module2/m2-inventory';
import { crmRoutes } from './cf/routes/module2/m2-crm';
import { transactionRoutes } from './cf/routes/module2/m2-transactions';
import { financeRoutes } from './cf/routes/module2/m2-finance';
import { reportsRoutes } from './cf/routes/module2/m2-reports';
import { servicesRoutes } from './cf/routes/module3/m3-services';
import { serviceReportsRoutes } from './cf/routes/module3/m3-reports';

type Bindings = { DB: D1Database; JWT_SECRET: string };
type Variables = { userId: string; userRole: string; userEmail: string; shopId: string; tenantId: string };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('*', cors({ origin: '*', allowMethods: ['GET','HEAD','PUT','PATCH','POST','DELETE'], allowHeaders: ['Content-Type','Authorization'] }));

// Welcome
app.get('/', (c) => c.json({
  name: 'StiQR Backend API',
  version: '2.0.0-cloudflare',
  status: 'online',
  platform: 'cloudflare-workers',
    modules: ['auth', 'users', 'roles', 'permissions', 'shops', 'staff', 'subscriptions', 'admin', 'notifications', 'audit', 'settings', 'health', 'products', 'categories', 'brands', 'variants', 'inventory', 'barcode', 'imei', 'customers', 'suppliers', 'purchases', 'sales', 'pos', 'payments', 'expenses', 'income', 'coupons', 'warranty', 'dashboard', 'reports', 'services', 'job-cards', 'device-checkin', 'technicians', 'repair', 'service-parts', 'estimates', 'approvals', 'service-invoices', 'communications', 'deliveries', 'service-payments', 'service-timeline', 'tracking', 'service-dashboard', 'service-reports'],
  message: 'Hii! Welcome to StiQR Backend API',
}));

// Health (public)
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0-cloudflare', platform: 'cloudflare-workers' }));

app.get('/api/health/database', async (c) => {
  try { await c.env.DB.prepare('SELECT 1').all(); return c.json({ status: 'ok', database: 'connected' }); }
  catch (err: any) { return c.json({ status: 'error', message: err.message }, 500); }
});

app.get('/api/health/cache', (c) => c.json({ status: 'ok', cache: 'available', provider: 'cloudflare-workers', ttl: 300 }));

app.get('/api/health/storage', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM uploaded_files').all();
    return c.json({ status: 'ok', storage: 'available', totalFiles: (results as any)[0]?.total || 0 });
  } catch (err: any) { return c.json({ status: 'error', message: err.message }, 500); }
});

// Public routes
authRoutes(app);

// Protected routes
const secure = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Root welcome (no auth)
secure.get('/', (c) => c.json({ message: 'Hii! Welcome to StiQR Backend API' }));

// Auth middleware
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
    c.set('shopId', payload.shopId as string || '');
    c.set('tenantId', payload.tenantId as string || '');
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
  await next();
});

coreRoutes(secure);
adminRoutes(secure);
staffRoutes(secure);
subscriptionRoutes(secure);
uploadRoutes(secure);
catalogRoutes(secure);
inventoryRoutes(secure);
crmRoutes(secure);
transactionRoutes(secure);
financeRoutes(secure);
reportsRoutes(secure);
servicesRoutes(secure);
serviceReportsRoutes(secure);

app.route('/', secure);

// 404
app.all('*', (c) => c.json({
  statusCode: 404,
  message: `Route ${c.req.method} ${c.req.path} not found`,
  api: 'StiQR Backend API v2.0.0-cloudflare',
  baseUrl: 'https://stiqr-backend.ksangeeth76.workers.dev',
}, 404));

export default app;
