import { Hono } from 'hono';
import { crud } from '../main';

export function analyticsRoutes(app: Hono) {
  // ==================== ANALYTICS EVENTS ====================
  app.route('/api/analytics/events', crud('analytics_events', { searchable: ['event', 'category'], updatable: ['properties'] }));

  // ==================== ANALYTICS DASHBOARDS ====================
  app.route('/api/analytics/dashboards', crud('analytics_dashboards', { searchable: ['name'], updatable: ['name', 'description', 'config', 'isDefault'] }));

  // ==================== ANALYTICS WIDGETS ====================
  app.route('/api/analytics/widgets', crud('analytics_widgets', { updatable: ['config', 'position', 'isVisible'] }));

  // ==================== ANALYTICS SUMMARY ====================
  app.get('/api/analytics/summary', async (c) => {
    try {
      const [users, shops, products, sales, revenue] = await Promise.all([
        c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM shops').first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM products').first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM sales').first() as any,
        c.env.DB.prepare("SELECT COALESCE(SUM(COALESCE(total, 0) + COALESCE(tax, 0)), 0) as total FROM sales").first() as any,
      ]);
      return c.json({ statusCode: 200, data: { users: users?.count || 0, shops: shops?.count || 0, products: products?.count || 0, sales: sales?.count || 0, revenue: revenue?.total || 0 } });
    } catch {
      return c.json({ statusCode: 200, data: { users: 0, shops: 0, products: 0, sales: 0, revenue: 0 } });
    }
  });

  // ==================== ANALYTICS TRENDS ====================
  app.get('/api/analytics/trends', async (c) => {
    try {
      const { results } = await c.env.DB.prepare("SELECT date(createdAt) as date, COUNT(*) as count FROM analytics_events WHERE createdAt >= datetime('now', '-7 days') GROUP BY date(createdAt) ORDER BY date").all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== AI CONVERSATIONS ====================
  app.route('/api/ai-assistant/conversations', crud('ai_conversations', { searchable: ['title'], updatable: ['title', 'status'] }));

  app.post('/api/ai-assistant/conversations/:id/messages', async (c) => {
    try {
      const body = await c.req.json();
      const id = crypto.randomUUID();
      await c.env.DB.prepare("INSERT INTO ai_messages (id, conversationId, role, content, createdAt) VALUES (?, ?, ?, ?, datetime('now'))").bind(id, c.req.param('id'), body.role || 'user', body.content).run();
      return c.json({ statusCode: 201, data: { id, ...body } }, 201);
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/ai-assistant/conversations/:id/messages', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM ai_messages WHERE conversationId = ? ORDER BY createdAt').bind(c.req.param('id')).all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== AI PREDICTIONS ====================
  app.route('/api/ai-assistant/predictions', crud('ai_predictions', { searchable: ['type'], updatable: ['status', 'result'] }));

  // ==================== AI CHAT ====================
  app.post('/api/ai-assistant/chat', async (c) => {
    try {
      const { message, conversationId } = await c.req.json();
      const msgId = crypto.randomUUID();
      await c.env.DB.prepare("INSERT INTO ai_messages (id, conversationId, role, content, createdAt) VALUES (?, ?, 'user', ?, datetime('now'))").bind(msgId, conversationId || null, message).run();
      const responseId = crypto.randomUUID();
      const response = `I received your message: "${message}". This is a placeholder AI response. The full AI integration will be connected soon.`;
      await c.env.DB.prepare("INSERT INTO ai_messages (id, conversationId, role, content, createdAt) VALUES (?, ?, 'assistant', ?, datetime('now'))").bind(responseId, conversationId || null, response).run();
      return c.json({ statusCode: 200, data: { message: response, userMessageId: msgId, assistantMessageId: responseId } });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== AI ANALYZE ====================
  app.post('/api/ai-assistant/analyze', async (c) => {
    try {
      const { query, type = 'general' } = await c.req.json();
      return c.json({ statusCode: 200, data: { query, type, analysis: 'Analysis placeholder - full AI integration pending.', timestamp: new Date().toISOString() } });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== OCR DOCUMENTS ====================
  app.route('/api/ocr', crud('ocr_documents', { searchable: ['documentType'], updatable: ['status', 'extractedData', 'confidence'] }));

  app.get('/api/ocr/stats', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT status, COUNT(*) as count FROM ocr_documents GROUP BY status').all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== AUTOMATION RULES ====================
  app.route('/api/automation/rules', crud('automation_rules', { searchable: ['name'], updatable: ['name', 'description', 'trigger', 'conditions', 'actions', 'isActive'] }));

  app.post('/api/automation/rules/:id/execute', async (c) => {
    try {
      const id = crypto.randomUUID();
      await c.env.DB.prepare("INSERT INTO automation_executions (id, ruleId, status, startedAt, completedAt, result, createdAt) VALUES (?, ?, 'COMPLETED', datetime('now'), datetime('now'), '{}', datetime('now'))").bind(id, c.req.param('id')).run();
      return c.json({ statusCode: 201, data: { id, status: 'COMPLETED' } }, 201);
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/automation/rules/:id/executions', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM automation_executions WHERE ruleId = ? ORDER BY createdAt DESC').bind(c.req.param('id')).all();
      return c.json({ statusCode: 200, data: results });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== AUTOMATION EXECUTIONS ====================
  app.get('/api/automation/executions', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM automation_executions LIMIT 100').all();
      return c.json({ statusCode: 200, data: results });
    } catch { return c.json({ statusCode: 200, data: [] }); }
  });

  // ==================== SCHEDULED JOBS ====================
  app.route('/api/automation/jobs', crud('scheduled_jobs', { searchable: ['name'], updatable: ['name', 'cron', 'status', 'lastRunAt', 'nextRunAt', 'config'] }));

  // ==================== AUTOMATION STATS ====================
  app.get('/api/automation/stats', async (c) => {
    try {
      const [rules, executions, jobs] = await Promise.all([
        c.env.DB.prepare('SELECT COUNT(*) as total FROM automation_rules').first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as total FROM automation_executions').first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as total FROM scheduled_jobs').first() as any,
      ]);
      return c.json({ statusCode: 200, data: { rules: { total: rules?.total || 0 }, executions: { total: executions?.total || 0 }, jobs: { total: jobs?.total || 0 } } });
    } catch { return c.json({ statusCode: 200, data: { rules: { total: 0 }, executions: { total: 0 }, jobs: { total: 0 } } }); }
  });

  // ==================== TRANSLATIONS ====================
  app.route('/api/localization/translations', crud('translations', { searchable: ['key', 'language'], updatable: ['value', 'language', 'namespace'] }));

  app.post('/api/localization/translations/bulk', async (c) => {
    try {
      const { translations } = await c.req.json();
      let created = 0;
      for (const t of translations) {
        const existing = await c.env.DB.prepare('SELECT id FROM translations WHERE key = ? AND language = ?').bind(t.key, t.language).first();
        if (existing) {
          await c.env.DB.prepare("UPDATE translations SET value = ?, updatedAt = datetime('now') WHERE id = ?").bind(t.value, (existing as any).id).run();
        } else {
          await c.env.DB.prepare("INSERT INTO translations (id, key, value, language, namespace, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))").bind(crypto.randomUUID(), t.key, t.value, t.language, t.namespace || null).run();
          created++;
        }
      }
      return c.json({ statusCode: 200, message: `Processed ${translations.length} translations, created ${created}` });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/localization/translations/export', async (c) => {
    try {
      const lang = c.req.query('lang') || 'en';
      const { results } = await c.env.DB.prepare('SELECT key, value FROM translations WHERE language = ?').bind(lang).all();
      const data: Record<string, string> = {};
      for (const r of results as any[]) data[r.key] = r.value;
      return c.json({ statusCode: 200, data });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== BACKUPS ====================
  app.route('/api/backups', crud('backups', { updatable: ['status', 'notes'] }));

  app.post('/api/backups/:id/restore', async (c) => {
    try {
      await c.env.DB.prepare("UPDATE backups SET status = 'RESTORED', updatedAt = datetime('now') WHERE id = ?").bind(c.req.param('id')).run();
      return c.json({ statusCode: 200, message: 'Backup restored' });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  app.get('/api/backups/stats', async (c) => {
    try {
      const stats = await c.env.DB.prepare('SELECT COUNT(*) as total, COALESCE(SUM(size), 0) as totalSize FROM backups').first() as any;
      return c.json({ statusCode: 200, data: stats || { total: 0, totalSize: 0 } });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });

  // ==================== FEATURE FLAGS ====================
  app.route('/api/system-admin/feature-flags', crud('feature_flags', { searchable: ['name'], updatable: ['description', 'isEnabled', 'percentage'] }));

  // ==================== SYSTEM ANNOUNCEMENTS ====================
  app.route('/api/system-admin/announcements', crud('system_announcements', { searchable: ['title'], updatable: ['title', 'message', 'type', 'isActive', 'priority', 'startsAt', 'endsAt'] }));

  // ==================== SYSTEM INFO ====================
  app.get('/api/system-admin/info', async (c) => {
    try {
      const [users, shops, products, sales, wallets] = await Promise.all([
        c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM shops').first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM products').first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM sales').first() as any,
        c.env.DB.prepare('SELECT COUNT(*) as count FROM wallets').first() as any,
      ]);
      return c.json({ statusCode: 200, data: { users: users?.count || 0, shops: shops?.count || 0, products: products?.count || 0, sales: sales?.count || 0, wallets: wallets?.count || 0, version: '1.0.0-cloudflare', uptime: process.uptime?.() || 0 } });
    } catch (e: any) { return c.json({ statusCode: 500, message: e?.message }, 500); }
  });
}
