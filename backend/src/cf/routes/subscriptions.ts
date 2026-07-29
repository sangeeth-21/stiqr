export function subscriptionRoutes(app: any) {
  app.get('/api/subscription', async (c) => {
    try {
      const sub = await c.env.DB.prepare('SELECT * FROM subscriptions WHERE tenantId = (SELECT tenantId FROM users WHERE id = ?) ORDER BY createdAt DESC LIMIT 1').bind(c.var.userId).first();
      if (!sub) return c.json({ data: { plan: 'NONE', status: 'INACTIVE' } });
      return c.json({ data: sub });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.post('/api/subscription/renew', async (c) => {
    try {
      const { plan, duration } = await c.req.json();
      const tenant = await c.env.DB.prepare('SELECT tenantId FROM users WHERE id = ?').bind(c.var.userId).first() as any;
      if (!tenant?.tenantId) return c.json({ error: 'Tenant not found' }, 404);
      const existing = await c.env.DB.prepare('SELECT * FROM subscriptions WHERE tenantId = ? ORDER BY createdAt DESC LIMIT 1').bind(tenant.tenantId).first() as any;
      const now = new Date(); const endDate = duration === 'YEARLY' ? new Date(now.setFullYear(now.getFullYear() + 1)) : new Date(now.setMonth(now.getMonth() + 1));
      const nowStr = new Date().toISOString();
      if (existing) {
        await c.env.DB.prepare('UPDATE subscriptions SET plan = COALESCE(?, plan), endDate = ?, status = ?, updatedAt = ? WHERE id = ?').bind(plan || existing.plan, endDate.toISOString(), 'ACTIVE', nowStr, existing.id).run();
        await c.env.DB.prepare('INSERT INTO subscription_history (id, subscriptionId, action, oldPlan, newPlan, oldEndDate, newEndDate, amount, createdAt) VALUES (?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), existing.id, 'RENEWED', existing.plan, plan || existing.plan, existing.endDate, endDate.toISOString(), 0, nowStr).run();
      } else {
        await c.env.DB.prepare('INSERT INTO subscriptions (id, tenantId, plan, status, startDate, endDate, autoRenew, createdAt, updatedAt) VALUES (?,?,?,?,?,?,0,?,?)').bind(crypto.randomUUID(), tenant.tenantId, plan || 'BASIC', 'ACTIVE', nowStr, endDate.toISOString(), nowStr, nowStr).run();
      }
      return c.json({ message: 'Subscription renewed', endDate: endDate.toISOString() });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/subscription/history', async (c) => {
    try {
      const tenant = await c.env.DB.prepare('SELECT tenantId FROM users WHERE id = ?').bind(c.var.userId).first() as any;
      if (!tenant?.tenantId) return c.json({ data: [] });
      const sub = await c.env.DB.prepare('SELECT id FROM subscriptions WHERE tenantId = ? ORDER BY createdAt DESC LIMIT 1').bind(tenant.tenantId).first() as any;
      if (!sub) return c.json({ data: [] });
      const { results } = await c.env.DB.prepare('SELECT * FROM subscription_history WHERE subscriptionId = ? ORDER BY createdAt DESC').bind(sub.id).all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });

  app.get('/api/subscription/plans', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM subscription_plans WHERE isActive = 1 ORDER BY monthlyPrice').all();
      return c.json({ data: results });
    } catch (err: any) { return c.json({ error: err.message }, 500); }
  });
}
