import { Hono } from 'hono';
import { crud } from '../main';

type Bindings = { DB: D1Database; JWT_SECRET: string };
type Variables = { userId: string; userRole: string; userEmail: string };

export function financialRoutes(app: Hono<{ Bindings: Bindings; Variables: Variables }>) {

  // ─── 1. Wallets ─────────────────────────────────────
  app.route('/api/wallets', crud('wallets', {
    updatable: ['status', 'dailyLimit', 'monthlyLimit'],
  }));

  app.get('/api/wallets/:id/balance', async (c) => {
    try {
      const row = await c.env.DB
        .prepare('SELECT id, balance, dailyLimit, monthlyLimit, status FROM wallets WHERE id = ? ')
        .bind(c.req.param('id'))
        .first();
      if (!row) return c.json({ statusCode: 404, error: 'Wallet not found' }, 404);
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  app.post('/api/wallets/:id/freeze', async (c) => {
    try {
      const id = c.req.param('id');
      const now = new Date().toISOString();
      await c.env.DB
        .prepare("UPDATE wallets SET status = 'FROZEN', updatedAt = ? WHERE id = ? ")
        .bind(now, id)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM wallets WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  app.post('/api/wallets/:id/unfreeze', async (c) => {
    try {
      const id = c.req.param('id');
      const now = new Date().toISOString();
      await c.env.DB
        .prepare("UPDATE wallets SET status = 'ACTIVE', updatedAt = ? WHERE id = ? ")
        .bind(now, id)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM wallets WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 2. Wallet Transactions ─────────────────────────
  app.route('/api/wallet-transactions', crud('wallet_transactions', {
    searchable: ['reference'],
  }));

  app.post('/api/wallet-transactions/credit', async (c) => {
    try {
      const body = await c.req.json();
      const { walletId, amount, reference, description } = body;
      if (!walletId || !amount) return c.json({ statusCode: 400, error: 'walletId and amount are required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB
        .prepare(
          'INSERT INTO wallet_transactions (id, walletId, type, amount, reference, description, status, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(id, walletId, 'CREDIT', amount, reference || null, description || null, 'COMPLETED', c.get('userId'), now, now)
        .run();
      await c.env.DB
        .prepare("UPDATE wallets SET balance = balance + ?, updatedAt = ? WHERE id = ? ")
        .bind(amount, now, walletId)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM wallet_transactions WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 201, data: row }, 201);
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  app.post('/api/wallet-transactions/debit', async (c) => {
    try {
      const body = await c.req.json();
      const { walletId, amount, reference, description } = body;
      if (!walletId || !amount) return c.json({ statusCode: 400, error: 'walletId and amount are required' }, 400);
      const wallet = await c.env.DB
        .prepare('SELECT id, balance, status FROM wallets WHERE id = ? ')
        .bind(walletId)
        .first() as any;
      if (!wallet) return c.json({ statusCode: 404, error: 'Wallet not found' }, 404);
      if (wallet.status !== 'ACTIVE') return c.json({ statusCode: 400, error: 'Wallet is not active' }, 400);
      if (wallet.balance < amount) return c.json({ statusCode: 400, error: 'Insufficient balance' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB
        .prepare(
          'INSERT INTO wallet_transactions (id, walletId, type, amount, reference, description, status, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(id, walletId, 'DEBIT', amount, reference || null, description || null, 'COMPLETED', c.get('userId'), now, now)
        .run();
      await c.env.DB
        .prepare("UPDATE wallets SET balance = balance - ?, updatedAt = ? WHERE id = ? ")
        .bind(amount, now, walletId)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM wallet_transactions WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 201, data: row }, 201);
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  app.post('/api/wallet-transactions/reverse', async (c) => {
    try {
      const body = await c.req.json();
      const { transactionId } = body;
      if (!transactionId) return c.json({ statusCode: 400, error: 'transactionId is required' }, 400);
      const original = await c.env.DB
        .prepare('SELECT * FROM wallet_transactions WHERE id = ? ')
        .bind(transactionId)
        .first() as any;
      if (!original) return c.json({ statusCode: 404, error: 'Transaction not found' }, 404);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const reverseType = original.type === 'CREDIT' ? 'DEBIT' : 'CREDIT';
      await c.env.DB
        .prepare(
          'INSERT INTO wallet_transactions (id, walletId, type, amount, reference, description, status, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(id, original.walletId, reverseType, original.amount, `REVERSAL:${original.id}`, `Reversal of ${original.id}`, 'COMPLETED', c.get('userId'), now, now)
        .run();
      const balanceChange = reverseType === 'CREDIT' ? original.amount : -original.amount;
      await c.env.DB
        .prepare("UPDATE wallets SET balance = balance + ?, updatedAt = ? WHERE id = ? ")
        .bind(balanceChange, now, original.walletId)
        .run();
      await c.env.DB
        .prepare("UPDATE wallet_transactions SET status = 'REVERSED', updatedAt = ? WHERE id = ?")
        .bind(now, transactionId)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM wallet_transactions WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 201, data: row }, 201);
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 3. Wallet Ledgers ──────────────────────────────
  app.get('/api/wallet-ledgers', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB
        .prepare('SELECT * FROM wallet_ledgers ORDER BY createdAt DESC LIMIT ? OFFSET ?')
        .bind(limit, offset)
        .all();
      return c.json({ statusCode: 200, data: results });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  app.get('/api/wallet-ledgers/:id', async (c) => {
    try {
      const row = await c.env.DB
        .prepare('SELECT * FROM wallet_ledgers WHERE id = ? ')
        .bind(c.req.param('id'))
        .first();
      if (!row) return c.json({ statusCode: 404, error: 'Not found' }, 404);
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 4. Commission Rules ────────────────────────────
  app.route('/api/commission/rules', crud('commission_rules'));

  // ─── 5. Commission Slabs ────────────────────────────
  app.route('/api/commission/slabs', crud('commission_slabs'));

  // ─── 6. Commission Ledgers ──────────────────────────
  app.get('/api/commission/ledger', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB
        .prepare('SELECT * FROM commission_ledgers ORDER BY createdAt DESC LIMIT ? OFFSET ?')
        .bind(limit, offset)
        .all();
      return c.json({ statusCode: 200, data: results });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  app.get('/api/commission/ledger/:id', async (c) => {
    try {
      const row = await c.env.DB
        .prepare('SELECT * FROM commission_ledgers WHERE id = ? ')
        .bind(c.req.param('id'))
        .first();
      if (!row) return c.json({ statusCode: 404, error: 'Not found' }, 404);
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 7. Commission Calculate ────────────────────────
  app.post('/api/commission/calculate', async (c) => {
    try {
      const body = await c.req.json();
      const { amount, ruleId } = body;
      if (!amount) return c.json({ statusCode: 400, error: 'amount is required' }, 400);

      let rule: any = null;
      if (ruleId) {
        rule = await c.env.DB
          .prepare('SELECT * FROM commission_rules WHERE id = ? ')
          .bind(ruleId)
          .first();
      } else {
        rule = await c.env.DB
          .prepare("SELECT * FROM commission_rules WHERE isActive = 1  ORDER BY createdAt DESC LIMIT 1")
          .first();
      }
      if (!rule) return c.json({ statusCode: 404, error: 'No active commission rule found' }, 404);

      const slabs = await c.env.DB
        .prepare('SELECT * FROM commission_slabs WHERE ruleId = ?  ORDER BY minAmount ASC')
        .bind(rule.id)
        .all() as any;

      let commission = 0;
      for (const slab of (slabs.results || slabs)) {
        if (amount >= slab.minAmount && (!slab.maxAmount || amount <= slab.maxAmount)) {
          commission = amount * (slab.percentage / 100);
          break;
        }
      }

      if (commission === 0 && rule.defaultPercentage) {
        commission = amount * (rule.defaultPercentage / 100);
      }

      return c.json({ statusCode: 200, data: { amount, commission, ruleId: rule.id, ruleName: rule.name } });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 8. Settlements ─────────────────────────────────
  app.route('/api/settlements', crud('settlements', {
    updatable: ['status', 'notes'],
  }));

  app.post('/api/settlements/:id/approve', async (c) => {
    try {
      const id = c.req.param('id');
      const now = new Date().toISOString();
      await c.env.DB
        .prepare("UPDATE settlements SET status = 'APPROVED', approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ? ")
        .bind(c.get('userId'), now, now, id)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM settlements WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  app.post('/api/settlements/:id/process', async (c) => {
    try {
      const id = c.req.param('id');
      const now = new Date().toISOString();
      await c.env.DB
        .prepare("UPDATE settlements SET status = 'PROCESSED', processedAt = ?, updatedAt = ? WHERE id = ? ")
        .bind(now, now, id)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM settlements WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 9. DMT Senders ─────────────────────────────────
  app.route('/api/dmt/senders', crud('dmt_senders'));

  app.patch('/api/dmt/senders/:id/verify', async (c) => {
    try {
      const id = c.req.param('id');
      const now = new Date().toISOString();
      await c.env.DB
        .prepare('UPDATE dmt_senders SET isVerified = 1, verifiedAt = ?, updatedAt = ? WHERE id = ? ')
        .bind(now, now, id)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM dmt_senders WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 10. DMT Beneficiaries ──────────────────────────
  app.route('/api/dmt/beneficiaries', crud('dmt_beneficiaries'));

  app.patch('/api/dmt/beneficiaries/:id/verify', async (c) => {
    try {
      const id = c.req.param('id');
      const now = new Date().toISOString();
      await c.env.DB
        .prepare('UPDATE dmt_beneficiaries SET isVerified = 1, verifiedAt = ?, updatedAt = ? WHERE id = ? ')
        .bind(now, now, id)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM dmt_beneficiaries WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 11. DMT Transfers ──────────────────────────────
  app.route('/api/dmt/transfers', crud('dmt_transfers', {
    updatable: ['status'],
  }));

  app.post('/api/dmt/transfers/:id/status', async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const { status } = body;
      if (!status) return c.json({ statusCode: 400, error: 'status is required' }, 400);
      const now = new Date().toISOString();
      await c.env.DB
        .prepare('UPDATE dmt_transfers SET status = ?, updatedAt = ? WHERE id = ? ')
        .bind(status, now, id)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM dmt_transfers WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 12. AEPS Transactions ──────────────────────────
  app.route('/api/aeps/transactions', crud('aeps_transactions', {
    updatable: ['status', 'remarks'],
  }));

  // ─── 13. BBPS Billers ───────────────────────────────
  app.route('/api/bbps/billers', crud('bbps_billers'));

  // ─── 14. BBPS Bill Payments ─────────────────────────
  app.route('/api/bbps/payments', crud('bbps_bill_payments'));

  app.post('/api/bbps/payments/:id/status', async (c) => {
    try {
      const id = c.req.param('id');
      const body = await c.req.json();
      const { status } = body;
      if (!status) return c.json({ statusCode: 400, error: 'status is required' }, 400);
      const now = new Date().toISOString();
      await c.env.DB
        .prepare('UPDATE bbps_bill_payments SET status = ?, updatedAt = ? WHERE id = ? ')
        .bind(status, now, id)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM bbps_bill_payments WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 15. Recharges ──────────────────────────────────
  app.route('/api/recharges', crud('recharges', {
    searchable: ['referenceNumber'],
    updatable: ['status'],
  }));

  // ─── 16. Beneficiaries ──────────────────────────────
  app.route('/api/beneficiary', crud('beneficiaries'));

  app.patch('/api/beneficiary/:id/favourite', async (c) => {
    try {
      const id = c.req.param('id');
      const now = new Date().toISOString();
      const row = await c.env.DB
        .prepare('SELECT id, isFavourite FROM beneficiaries WHERE id = ? ')
        .bind(id)
        .first() as any;
      if (!row) return c.json({ statusCode: 404, error: 'Not found' }, 404);
      const newVal = row.isFavourite ? 0 : 1;
      await c.env.DB
        .prepare('UPDATE beneficiaries SET isFavourite = ?, updatedAt = ? WHERE id = ?')
        .bind(newVal, now, id)
        .run();
      const updated = await c.env.DB.prepare('SELECT * FROM beneficiaries WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 200, data: updated });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 17. KYC Documents ──────────────────────────────
  app.route('/api/kyc/documents', crud('kyc_documents'));

  // ─── 18. KYC ────────────────────────────────────────
  app.route('/api/kyc', crud('kycs', {
    updatable: ['status', 'remarks'],
  }));

  app.get('/api/kyc/:id/documents', async (c) => {
    try {
      const { results } = await c.env.DB
        .prepare('SELECT * FROM kyc_documents WHERE kycId = ? ')
        .bind(c.req.param('id'))
        .all();
      return c.json({ statusCode: 200, data: results });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 19. Financial Transactions ─────────────────────
  app.route('/api/financial-transactions', crud('financial_transactions', {
    searchable: ['reference'],
  }));

  app.get('/api/financial-transactions/:id/logs', async (c) => {
    try {
      const { results } = await c.env.DB
        .prepare('SELECT * FROM transaction_logs WHERE transactionId = ? ')
        .bind(c.req.param('id'))
        .all();
      return c.json({ statusCode: 200, data: results });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 20. Transaction Logs ───────────────────────────
  app.get('/api/transaction-logs', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB
        .prepare('SELECT * FROM transaction_logs ORDER BY createdAt DESC LIMIT ? OFFSET ?')
        .bind(limit, offset)
        .all();
      return c.json({ statusCode: 200, data: results });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 21. Payment Gateway ────────────────────────────
  app.get('/api/payment-gateway', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB
        .prepare('SELECT * FROM payment_gateway_transactions ORDER BY createdAt DESC LIMIT ? OFFSET ?')
        .bind(limit, offset)
        .all();
      return c.json({ statusCode: 200, data: results });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  app.post('/api/payment-gateway/initiate', async (c) => {
    try {
      const body = await c.req.json();
      const { amount, provider, currency, description, returnUrl } = body;
      if (!amount || !provider) return c.json({ statusCode: 400, error: 'amount and provider are required' }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const reference = `PG-${Date.now()}-${id.slice(0, 6)}`;
      await c.env.DB
        .prepare(
          'INSERT INTO payment_gateway_transactions (id, userId, amount, provider, currency, description, reference, status, returnUrl, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(id, c.get('userId'), amount, provider, currency || 'INR', description || null, reference, 'INITIATED', returnUrl || null, now, now)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM payment_gateway_transactions WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 201, data: row }, 201);
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  app.get('/api/payment-gateway/:id', async (c) => {
    try {
      const row = await c.env.DB
        .prepare('SELECT * FROM payment_gateway_transactions WHERE id = ? ')
        .bind(c.req.param('id'))
        .first();
      if (!row) return c.json({ statusCode: 404, error: 'Not found' }, 404);
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  app.post('/api/payment-gateway/:id/verify', async (c) => {
    try {
      const id = c.req.param('id');
      const now = new Date().toISOString();
      await c.env.DB
        .prepare("UPDATE payment_gateway_transactions SET status = 'VERIFIED', verifiedAt = ?, updatedAt = ? WHERE id = ? ")
        .bind(now, now, id)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM payment_gateway_transactions WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 22. Payment Webhooks ───────────────────────────
  app.get('/api/payment-webhooks', async (c) => {
    try {
      const { results } = await c.env.DB.prepare('SELECT * FROM payment_webhooks LIMIT 50').all();
      return c.json({ statusCode: 200, data: results });
    } catch { return c.json({ statusCode: 200, data: [] }); }
  });

  app.post('/api/payment-webhooks', async (c) => {
    try {
      const body = await c.req.json();
      const { provider, eventType, payload, reference } = body;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await c.env.DB
        .prepare(
          'INSERT INTO payment_webhooks (id, provider, eventType, payload, reference, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(id, provider || null, eventType || null, JSON.stringify(payload || {}), reference || null, 'RECEIVED', now, now)
        .run();
      return c.json({ statusCode: 201, data: { id, status: 'RECEIVED' } }, 201);
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 23. Reconciliations ────────────────────────────
  app.route('/api/reconciliations', crud('reconciliations'));

  app.get('/api/reconciliations/:id/logs', async (c) => {
    try {
      const { results } = await c.env.DB
        .prepare('SELECT * FROM reconciliation_logs WHERE reconciliationId = ? ')
        .bind(c.req.param('id'))
        .all();
      return c.json({ statusCode: 200, data: results });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 24. Refunds ────────────────────────────────────
  app.route('/api/refunds', crud('refunds', {
    updatable: ['status', 'notes'],
  }));

  app.post('/api/refunds/:id/approve', async (c) => {
    try {
      const id = c.req.param('id');
      const now = new Date().toISOString();
      await c.env.DB
        .prepare("UPDATE refunds SET status = 'APPROVED', approvedBy = ?, approvedAt = ?, updatedAt = ? WHERE id = ? ")
        .bind(c.get('userId'), now, now, id)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM refunds WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  app.post('/api/refunds/:id/process', async (c) => {
    try {
      const id = c.req.param('id');
      const now = new Date().toISOString();
      await c.env.DB
        .prepare("UPDATE refunds SET status = 'PROCESSED', processedAt = ?, updatedAt = ? WHERE id = ? ")
        .bind(now, now, id)
        .run();
      const row = await c.env.DB.prepare('SELECT * FROM refunds WHERE id = ?').bind(id).first();
      return c.json({ statusCode: 200, data: row });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 25. Fraud Rules ────────────────────────────────
  app.route('/api/fraud/rules', crud('fraud_rules'));

  // ─── 26. Fraud Alerts ───────────────────────────────
  app.route('/api/fraud/alerts', crud('fraud_alerts', {
    updatable: ['status', 'resolution'],
  }));

  // ─── 27. Blacklists ─────────────────────────────────
  app.route('/api/fraud/blacklist', crud('blacklists'));

  // ─── 28. Provider Configs ───────────────────────────
  app.route('/api/providers/configs', crud('provider_configs'));

  // ─── 29. Provider Logs ──────────────────────────────
  app.get('/api/providers/logs', async (c) => {
    try {
      const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
      const offset = parseInt(c.req.query('offset') || '0');
      const { results } = await c.env.DB
        .prepare('SELECT * FROM provider_logs ORDER BY createdAt DESC LIMIT ? OFFSET ?')
        .bind(limit, offset)
        .all();
      return c.json({ statusCode: 200, data: results });
    } catch (err: any) {
      return c.json({ statusCode: 500, error: err.message }, 500);
    }
  });

  // ─── 30. Loyalty Programs ───────────────────────────
  app.route('/api/loyalty/programs', crud('loyalty_programs'));

  // ─── 31. Loyalty Transactions ───────────────────────
  app.route('/api/loyalty/transactions', crud('loyalty_transactions'));

  // ─── 32. Subscriptions ──────────────────────────────
  app.route('/api/subscriptions', crud('subscriptions', {
    updatable: ['status'],
  }));
}
