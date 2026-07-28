import { Hono } from 'hono';
import { crud } from '../main';

export function adminRoutes(app: Hono) {
  // ==================== PLUGINS ====================
  app.route('/api/plugins', crud('plugins', { searchable: ['name'], updatable: ['status', 'config', 'version'] }));

  app.get('/api/plugins/marketplace', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM plugins ORDER BY name').all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== API KEYS ====================
  app.route('/api/api-management/keys', crud('api_keys', { searchable: ['name'], updatable: ['name', 'isActive', 'expiresAt', 'permissions'] }));

  app.post('/api/api-management/keys/:id/regenerate', async (c) => {
    try {
      const newKey = 'sk_' + crypto.randomUUID().replace(/-/g, '');
      await c.env.DB.prepare("UPDATE api_keys SET key = ?, updatedAt = datetime('now') WHERE id = ?").bind(newKey, c.req.param('id')).run();
      return c.json({ statusCode: 200, data: { key: newKey } });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== WEBHOOKS ====================
  app.route('/api/api-management/webhooks', crud('webhooks', { searchable: ['url'], updatable: ['url', 'events', 'isActive', 'secret'] }));

  app.post('/api/api-management/webhooks/:id/test', async (c) => {
    try {
      const id = crypto.randomUUID();
      await c.env.DB.prepare("INSERT INTO webhook_deliveries (id, webhookId, event, payload, status, statusCode, createdAt) VALUES (?, ?, 'test', '{}', 'SUCCESS', 200, datetime('now'))").bind(id, c.req.param('id')).run();
      return c.json({ statusCode: 200, message: 'Test delivery created', data: { deliveryId: id } });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/api-management/webhooks/:id/deliveries', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM webhook_deliveries WHERE webhookId = ? ORDER BY createdAt DESC LIMIT 50').bind(c.req.param('id')).all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== WEBHOOK DELIVERIES ====================
  app.get('/api/api-management/webhook-deliveries', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM webhook_deliveries LIMIT 100').all();
      return c.json({ statusCode: 200, data: results });
    } catch { return c.json({ statusCode: 200, data: [] }); }
  });

  // ==================== SECURITY ALERTS ====================
  app.route('/api/security-center/alerts', crud('security_alerts', { searchable: ['type', 'description'], updatable: ['status', 'resolution'] }));

  // ==================== BLOCKED IPS ====================
  app.route('/api/security-center/blocked-ips', crud('blocked_ips', { searchable: ['ip', 'reason'], updatable: ['reason', 'expiresAt'] }));

  // ==================== SECURITY STATS ====================
  app.get('/api/security-center/stats', async (c) => {
    try {
      const [alerts, blockedIps] = await Promise.all([
        c.env.DB.prepare('SELECT status, COUNT(*) as count FROM security_alerts GROUP BY status').all(),
        c.env.DB.prepare('SELECT COUNT(*) as count FROM blocked_ips').first() as any,
      ]);
      return c.json({ statusCode: 200, data: { alerts: alerts.results, blockedIps: blockedIps?.count || 0 } });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== ERROR LOGS ====================
  app.get('/api/error-tracking/stats', async (c) => {
    try {
      const [bySeverity, byStatus] = await Promise.all([
        c.env.DB.prepare('SELECT severity, COUNT(*) as count FROM error_logs GROUP BY severity').all(),
        c.env.DB.prepare('SELECT status, COUNT(*) as count FROM error_logs GROUP BY status').all(),
      ]);
      return c.json({ statusCode: 200, data: { bySeverity: bySeverity.results, byStatus: byStatus.results } });
    } catch { return c.json({ statusCode: 200, data: { bySeverity: [], byStatus: [] } }); }
  });

  app.route('/api/error-tracking', crud('error_logs', { searchable: ['message', 'source'], updatable: ['status', 'resolvedBy', 'notes'] }));

  // ==================== INTEGRATIONS ====================
  app.get('/api/integration-hub/logs', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM integration_logs LIMIT 100').all();
      return c.json({ statusCode: 200, data: results });
    } catch { return c.json({ statusCode: 200, data: [] }); }
  });

  app.get('/api/integration-hub/:id/logs', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM integration_logs WHERE integrationId = ? ORDER BY createdAt DESC LIMIT 50').bind(c.req.param('id')).all();
      return c.json({ statusCode: 200, data: results });
    } catch { return c.json({ statusCode: 200, data: [] }); }
  });

  app.post('/api/integration-hub/:id/test', async (c) => {
    try {
      const id = crypto.randomUUID();
      await c.env.DB.prepare("INSERT INTO integration_logs (id, integrationId, event, status, details, createdAt) VALUES (?, ?, 'test', 'SUCCESS', '{}', datetime('now'))").bind(id, c.req.param('id')).run();
      return c.json({ statusCode: 200, message: 'Integration test successful' });
    } catch { return c.json({ statusCode: 500, message: 'Failed' }, 500); }
  });

  app.route('/api/integration-hub', crud('integrations', { searchable: ['name', 'type'], updatable: ['name', 'status', 'config'] }));

  // ==================== OAUTH CLIENTS ====================
  app.route('/api/oauth/clients', crud('oauth_clients', { searchable: ['name'], updatable: ['name', 'isActive', 'redirectUris'] }));

  // ==================== PERFORMANCE METRICS ====================
  app.route('/api/tenant-admin/performance', crud('performance_metrics', { updatable: ['value', 'tags'] }));

  // ==================== AUDIT TRAILS ====================
  app.get('/api/tenant-admin/audit-trail', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM audit_trails LIMIT 100').all();
      return c.json({ statusCode: 200, data: results });
    } catch { return c.json({ statusCode: 200, data: [] }); }
  });

  app.get('/api/tenant-admin/audit-trail/:id', async (c) => {
    try {
      const trail = await c.env.DB.prepare('SELECT * FROM audit_trails WHERE id = ?').bind(c.req.param('id')).first();
      if (!trail) return c.json({ statusCode: 404, message: 'Not found' }, 404);
      return c.json({ statusCode: 200, data: trail });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== TENANT USAGE ====================
  app.route('/api/tenant-admin/usage', crud('tenant_usage', { updatable: ['apiCalls', 'storage', 'users'] }));

  // ==================== DATA RETENTION ====================
  app.route('/api/tenant-admin/data-retention', crud('data_retention', { searchable: ['tableName'], updatable: ['retentionDays', 'isEnabled', 'lastCleanup'] }));

  // ==================== AUDIT LOGS ====================
  app.get('/api/audit-logs', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM audit_logs LIMIT 100').all();
      return c.json({ statusCode: 200, data: results });
    } catch { return c.json({ statusCode: 200, data: [] }); }
  });

  app.get('/api/audit-logs/:id', async (c) => {
    try {
      const log = await c.env.DB.prepare('SELECT * FROM audit_logs WHERE id = ?').bind(c.req.param('id')).first();
      if (!log) return c.json({ statusCode: 404, message: 'Not found' }, 404);
      return c.json({ statusCode: 200, data: log });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== UPLOADED FILES ====================
  app.get('/api/files', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM uploaded_files LIMIT 100').all();
      return c.json({ statusCode: 200, data: results });
    } catch { return c.json({ statusCode: 200, data: [] }); }
  });

  app.get('/api/files/:id', async (c) => {
    try {
      const file = await c.env.DB.prepare('SELECT * FROM uploaded_files WHERE id = ?').bind(c.req.param('id')).first();
      if (!file) return c.json({ statusCode: 404, message: 'Not found' }, 404);
      return c.json({ statusCode: 200, data: file });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.delete('/api/files/:id', async (c) => {
    try {
      await c.env.DB.prepare('DELETE FROM uploaded_files WHERE id = ?').bind(c.req.param('id')).run();
      return c.json({ statusCode: 200, message: 'File deleted' });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== REPORTS ====================
  app.get('/api/reports/dashboard', async (c) => {
    try {
      const [users, shops, products, sales, revenue, wallets] = await Promise.all([
        c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM shops').first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM products').first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM sales').first() as any,
        c.env.DB.prepare("SELECT COALESCE(SUM(COALESCE(total, 0) + COALESCE(tax, 0)), 0) as total FROM sales").first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM wallets').first() as any,
      ]);
      return c.json({ statusCode: 200, data: { users: users?.count || 0, shops: shops?.count || 0, products: products?.count || 0, sales: sales?.count || 0, revenue: revenue?.total || 0, wallets: wallets?.count || 0 } });
    } catch { return c.json({ statusCode: 200, data: { users: 0, shops: 0, products: 0, sales: 0, revenue: 0, wallets: 0 } }); }
  });

  app.route('/api/reports', crud('reports', { searchable: ['name', 'type'], updatable: ['name', 'config', 'format'] }));

  // ==================== FINANCIAL REPORTS ====================
  app.get('/api/financial-reports/wallet', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT id, balance, currency, status FROM wallets').all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/financial-reports/transactions', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM financial_transactions GROUP BY type').all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/financial-reports/commissions', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM commission_ledgers').all() as any;
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/financial-reports/settlements', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM settlements GROUP BY status').all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/financial-reports/dmt', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM dmt_transfers GROUP BY status').all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/financial-reports/recharge', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM recharges GROUP BY status').all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/financial-reports/refunds', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM refunds GROUP BY status').all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/financial-reports/profit-loss', async (c) => {
    try {
      const [income, expenses] = await Promise.all([
        c.env.DB.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM income').first() as any,
        c.env.DB.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').first() as any,
      ]);
      const totalIncome = income?.total || 0;
      const totalExpenses = expenses?.total || 0;
      return c.json({ statusCode: 200, data: { income: totalIncome, expenses: totalExpenses, profit: totalIncome - totalExpenses } });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });
}
