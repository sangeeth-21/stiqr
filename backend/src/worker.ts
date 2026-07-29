import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRoutes } from './cf/routes/auth';
import { coreRoutes } from './cf/routes/core';
import { adminRoutes } from './cf/routes/admin';
import { staffRoutes } from './cf/routes/staff';
import { subscriptionRoutes } from './cf/routes/subscriptions';

type Bindings = { DB: D1Database; JWT_SECRET: string };
type Variables = { userId: string; userRole: string; userEmail: string; shopId: string };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('*', cors({ origin: '*', allowMethods: ['GET','HEAD','PUT','PATCH','POST','DELETE'], allowHeaders: ['Content-Type','Authorization'] }));

// Welcome
app.get('/', (c) => c.json({
  name: 'StiQR Backend API',
  version: '2.0.0-cloudflare',
  status: 'online',
  platform: 'cloudflare-workers',
  modules: ['auth', 'users', 'roles', 'permissions', 'shops', 'staff', 'subscriptions', 'admin', 'notifications', 'audit', 'settings', 'health'],
  message: 'Hii! Welcome to StiQR Backend API',
}));

// Health
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0-cloudflare', platform: 'cloudflare-workers' }));

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
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
  await next();
});

coreRoutes(secure);
adminRoutes(secure);
staffRoutes(secure);
subscriptionRoutes(secure);

app.route('/', secure);

// 404
app.all('*', (c) => c.json({
  statusCode: 404,
  message: `Route ${c.req.method} ${c.req.path} not found`,
  api: 'StiQR Backend API v2.0.0-cloudflare',
  baseUrl: 'https://stiqr-backend.ksangeeth76.workers.dev',
}, 404));

export default app;
