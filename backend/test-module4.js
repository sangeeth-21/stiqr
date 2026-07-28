const http = require('http');

let passed = 0;
let failed = 0;
const errors = [];

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const fullPath = `/api${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const data = body ? JSON.stringify(body) : '';
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request({ method, hostname: 'localhost', port: 4000, path: fullPath, headers }, (res) => {
      let d = '';
      res.on('data', (chunk) => (d += chunk));
      res.on('end', () => { let p; try { p = JSON.parse(d); } catch { p = d; } resolve({ status: res.statusCode, body: p }); });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function test(name, expected, actual) {
  const arr = Array.isArray(expected) ? expected : [expected];
  if (arr.includes(actual)) { console.log(`  ✅ ${name} (HTTP ${actual})`); passed++; }
  else { const msg = `  ❌ ${name} (expected ${expected}, got ${actual})`; console.log(msg); errors.push(msg); failed++; }
}

function section(name) { console.log(`\n--- ${name} ---`); }

let tk, shopId;

async function run() {
  console.log('==========================================================');
  console.log('  STIQR — MODULE 4: Enterprise Services ENDPOINT TESTS');
  console.log('==========================================================');

  let r = await request('POST', '/auth/login', { email: 'admin@stiqr.com', password: 'SuperAdmin@123' });
  test('Login', 200, r.status);
  tk = r.body?.data?.accessToken;

  r = await request('POST', '/shops', { name: 'Enterprise Shop', description: 'Module 4 test' }, tk);
  test('Create shop', 201, r.status);
  shopId = r.body?.data?.id;

  // ANALYTICS
  section('Analytics');
  r = await request('POST', '/analytics/events', { shopId, eventType: 'PURCHASE', category: 'SALES', action: 'buy', value: 100 }, tk);
  test('POST /analytics/events', 201, r.status);
  r = await request('GET', `/analytics/events?shopId=${shopId}`, null, tk);
  test('GET /analytics/events', 200, r.status);
  r = await request('POST', '/analytics/dashboards', { name: 'Main Dashboard', isDefault: true }, tk);
  test('POST /analytics/dashboards', 201, r.status);
  const dashId = r.body?.data?.id;
  r = await request('GET', '/analytics/dashboards', null, tk);
  test('GET /analytics/dashboards', 200, r.status);
  r = await request('GET', `/analytics/dashboards/${dashId}`, null, tk);
  test('GET /analytics/dashboards/:id', 200, r.status);
  r = await request('POST', '/analytics/widgets', { dashboardId: dashId, name: 'Sales Chart', widgetType: 'CHART', dataSource: 'SALES' }, tk);
  test('POST /analytics/widgets', 201, r.status);
  const widgetId = r.body?.data?.id;
  r = await request('PATCH', `/analytics/widgets/${widgetId}`, { name: 'Revenue Chart' }, tk);
  test('PATCH /analytics/widgets/:id', 200, r.status);
  r = await request('GET', '/analytics/summary', null, tk);
  test('GET /analytics/summary', 200, r.status);
  r = await request('GET', '/analytics/trends', null, tk);
  test('GET /analytics/trends', 200, r.status);

  // AI ASSISTANT
  section('AI Assistant');
  r = await request('POST', '/ai/conversations', { shopId, title: 'Business Analysis' }, tk);
  test('POST /ai/conversations', 201, r.status);
  const convId = r.body?.data?.id;
  r = await request('GET', '/ai/conversations', null, tk);
  test('GET /ai/conversations', 200, r.status);
  r = await request('GET', `/ai/conversations/${convId}`, null, tk);
  test('GET /ai/conversations/:id', 200, r.status);
  r = await request('POST', `/ai/conversations/${convId}/messages`, { content: 'How is my business doing?' }, tk);
  test('POST /ai/conversations/:id/messages', 201, r.status);
  r = await request('POST', '/ai/chat', { message: 'Show me sales trends', shopId }, tk);
  test('POST /ai/chat', 201, r.status);
  r = await request('POST', '/ai/predictions', { shopId, type: 'SALES', period: 'MONTHLY', predictedValue: 50000, confidence: 0.85, startDate: new Date().toISOString(), endDate: new Date().toISOString() }, tk);
  test('POST /ai/predictions', 201, r.status);
  r = await request('GET', '/ai/predictions', null, tk);
  test('GET /ai/predictions', 200, r.status);
  r = await request('POST', '/ai/analyze', { text: 'Sales increased by 20% this quarter' }, tk);
  test('POST /ai/analyze', 201, r.status);

  // OCR
  section('OCR');
  r = await request('POST', '/ocr/documents', { shopId, documentType: 'INVOICE', originalUrl: '/uploads/invoice.pdf' }, tk);
  test('POST /ocr/documents', 201, r.status);
  const ocrId = r.body?.data?.id;
  r = await request('GET', '/ocr/documents', null, tk);
  test('GET /ocr/documents', 200, r.status);
  r = await request('GET', `/ocr/documents/${ocrId}`, null, tk);
  test('GET /ocr/documents/:id', 200, r.status);
  r = await request('POST', `/ocr/documents/${ocrId}/process`, null, tk);
  test('POST /ocr/documents/:id/process', 201, r.status);
  r = await request('GET', '/ocr/stats', null, tk);
  test('GET /ocr/stats', 200, r.status);

  // SEARCH
  section('Search');
  r = await request('GET', '/search?q=test', null, tk);
  test('GET /search', 200, r.status);
  r = await request('GET', '/search/suggest?q=test', null, tk);
  test('GET /search/suggest', 200, r.status);
  r = await request('GET', '/search/stats?q=test', null, tk);
  test('GET /search/stats', 200, r.status);

  // AUTOMATION
  section('Automation');
  r = await request('POST', '/automation/rules', { shopId, name: 'Auto Report', triggerType: 'SCHEDULE', actionType: 'NOTIFICATION', triggerConfig: '0 9 * * *' }, tk);
  test('POST /automation/rules', 201, r.status);
  const ruleId = r.body?.data?.id;
  r = await request('GET', '/automation/rules', null, tk);
  test('GET /automation/rules', 200, r.status);
  r = await request('GET', `/automation/rules/${ruleId}`, null, tk);
  test('GET /automation/rules/:id', 200, r.status);
  r = await request('POST', `/automation/rules/${ruleId}/execute`, null, tk);
  test('POST /automation/rules/:id/execute', 201, r.status);
  r = await request('GET', `/automation/rules/${ruleId}/executions`, null, tk);
  test('GET /automation/rules/:id/executions', 200, r.status);
  r = await request('POST', '/automation/jobs', { name: 'Daily Cleanup', jobType: 'CLEANUP', schedule: '0 2 * * *' }, tk);
  test('POST /automation/jobs', 201, r.status);
  r = await request('GET', '/automation/jobs', null, tk);
  test('GET /automation/jobs', 200, r.status);
  r = await request('GET', '/automation/stats', null, tk);
  test('GET /automation/stats', 200, r.status);

  // BACKUP
  section('Backup');
  r = await request('POST', '/backup', { type: 'FULL', encrypted: true }, tk);
  test('POST /backup', 201, r.status);
  const backupId = r.body?.data?.id;
  r = await request('GET', '/backup', null, tk);
  test('GET /backup', 200, r.status);
  r = await request('GET', `/backup/${backupId}`, null, tk);
  test('GET /backup/:id', 200, r.status);
  r = await request('POST', `/backup/${backupId}/restore`, null, tk);
  test('POST /backup/:id/restore', 201, r.status);
  r = await request('GET', '/backup/stats', null, tk);
  test('GET /backup/stats', 200, r.status);

  // SYSTEM ADMIN
  section('System Admin');
  r = await request('POST', '/admin/feature-flags', { key: 'dark_mode', name: 'Dark Mode', isEnabled: true }, tk);
  test('POST /admin/feature-flags', 201, r.status);
  const flagId = r.body?.data?.id;
  r = await request('GET', '/admin/feature-flags', null, tk);
  test('GET /admin/feature-flags', 200, r.status);
  r = await request('GET', `/admin/feature-flags/${flagId}`, null, tk);
  test('GET /admin/feature-flags/:id', 200, r.status);
  r = await request('GET', '/admin/feature-flags/check/dark_mode', null, tk);
  test('GET /admin/feature-flags/check/:key', 200, r.status);
  r = await request('PATCH', `/admin/feature-flags/${flagId}`, { isEnabled: false }, tk);
  test('PATCH /admin/feature-flags/:id', 200, r.status);
  r = await request('POST', '/admin/announcements', { title: 'Maintenance', message: 'System maintenance tonight', type: 'MAINTENANCE', severity: 'HIGH' }, tk);
  test('POST /admin/announcements', 201, r.status);
  const annId = r.body?.data?.id;
  r = await request('GET', '/admin/announcements', null, tk);
  test('GET /admin/announcements', 200, r.status);
  r = await request('GET', `/admin/announcements/${annId}`, null, tk);
  test('GET /admin/announcements/:id', 200, r.status);
  r = await request('GET', '/admin/system-info', null, tk);
  test('GET /admin/system-info', 200, r.status);

  // PLUGINS
  section('Plugins');
  r = await request('POST', '/plugins', { name: 'razorpay', displayName: 'Razorpay', version: '2.0', category: 'PAYMENT' }, tk);
  test('POST /plugins', 201, r.status);
  const pluginId = r.body?.data?.id;
  r = await request('GET', '/plugins', null, tk);
  test('GET /plugins', 200, r.status);
  r = await request('GET', `/plugins/${pluginId}`, null, tk);
  test('GET /plugins/:id', 200, r.status);
  r = await request('POST', `/plugins/${pluginId}/enable`, null, tk);
  test('POST /plugins/:id/enable', 201, r.status);
  r = await request('POST', `/plugins/${pluginId}/disable`, null, tk);
  test('POST /plugins/:id/disable', 201, r.status);
  r = await request('GET', '/plugins/marketplace', null, tk);
  test('GET /plugins/marketplace', 200, r.status);

  // API MANAGEMENT
  section('API Management');
  r = await request('POST', '/api-management/keys', { shopId, name: 'Mobile App Key' }, tk);
  test('POST /api-management/keys', 201, r.status);
  const apiKeyId = r.body?.data?.id;
  r = await request('GET', '/api-management/keys', null, tk);
  test('GET /api-management/keys', 200, r.status);
  r = await request('GET', `/api-management/keys/${apiKeyId}`, null, tk);
  test('GET /api-management/keys/:id', 200, r.status);
  r = await request('DELETE', `/api-management/keys/${apiKeyId}`, null, tk);
  test('DELETE /api-management/keys/:id', 200, r.status);
  r = await request('POST', '/api-management/webhooks', { shopId, name: 'Order Hook', url: 'https://example.com/hook', events: '["order.created"]' }, tk);
  test('POST /api-management/webhooks', 201, r.status);
  const hookId = r.body?.data?.id;
  r = await request('GET', '/api-management/webhooks', null, tk);
  test('GET /api-management/webhooks', 200, r.status);
  r = await request('GET', `/api-management/webhooks/${hookId}`, null, tk);
  test('GET /api-management/webhooks/:id', 200, r.status);
  r = await request('POST', `/api-management/webhooks/${hookId}/test`, null, tk);
  test('POST /api-management/webhooks/:id/test', 201, r.status);
  r = await request('GET', `/api-management/webhooks/${hookId}/deliveries`, null, tk);
  test('GET /api-management/webhooks/:id/deliveries', 200, r.status);

  // SECURITY CENTER
  section('Security Center');
  r = await request('POST', '/security/alerts', { shopId, alertType: 'BRUTE_FORCE', title: 'Multiple failed logins', severity: 'HIGH', ipAddress: '192.168.1.100' }, tk);
  test('POST /security/alerts', 201, r.status);
  const alertId = r.body?.data?.id;
  r = await request('GET', '/security/alerts', null, tk);
  test('GET /security/alerts', 200, r.status);
  r = await request('GET', `/security/alerts/${alertId}`, null, tk);
  test('GET /security/alerts/:id', 200, r.status);
  r = await request('PATCH', `/security/alerts/${alertId}`, { status: 'RESOLVED', resolvedBy: 'admin' }, tk);
  test('PATCH /security/alerts/:id', 200, r.status);
  r = await request('POST', '/security/block-ip', { ipAddress: '10.0.0.1', reason: 'Suspicious activity', blockedBy: 'system' }, tk);
  test('POST /security/block-ip', 201, r.status);
  const blockId = r.body?.data?.id;
  r = await request('GET', '/security/blocked-ips', null, tk);
  test('GET /security/blocked-ips', 200, r.status);
  r = await request('DELETE', `/security/blocked-ips/${blockId}`, null, tk);
  test('DELETE /security/blocked-ips/:id', 200, r.status);
  r = await request('GET', '/security/stats', null, tk);
  test('GET /security/stats', 200, r.status);

  // ERROR TRACKING
  section('Error Tracking');
  r = await request('POST', '/errors', { shopId, errorType: 'DATABASE', severity: 'ERROR', message: 'Connection timeout', source: 'prisma' }, tk);
  test('POST /errors', 201, r.status);
  const errId = r.body?.data?.id;
  r = await request('GET', '/errors', null, tk);
  test('GET /errors', 200, r.status);
  r = await request('GET', `/errors/${errId}`, null, tk);
  test('GET /errors/:id', 200, r.status);
  r = await request('PATCH', `/errors/${errId}`, { resolved: true, resolvedBy: 'admin' }, tk);
  test('PATCH /errors/:id', 200, r.status);
  r = await request('GET', '/errors/stats', null, tk);
  test('GET /errors/stats', 200, r.status);

  // INTEGRATION HUB
  section('Integration Hub');
  r = await request('POST', '/integrations', { shopId, name: 'Twilio SMS', type: 'SMS', provider: 'TWILIO' }, tk);
  test('POST /integrations', 201, r.status);
  const intId = r.body?.data?.id;
  r = await request('GET', '/integrations', null, tk);
  test('GET /integrations', 200, r.status);
  r = await request('GET', `/integrations/${intId}`, null, tk);
  test('GET /integrations/:id', 200, r.status);
  r = await request('POST', `/integrations/${intId}/test`, null, tk);
  test('POST /integrations/:id/test', 201, r.status);
  r = await request('GET', `/integrations/${intId}/logs`, null, tk);
  test('GET /integrations/:id/logs', 200, r.status);
  r = await request('GET', '/integrations/stats', null, tk);
  test('GET /integrations/stats', 200, r.status);

  // LOCALIZATION
  section('Localization');
  r = await request('POST', '/localization/translations', { language: 'en', key: 'common.save', value: 'Save' }, tk);
  test('POST /localization/translations', 201, r.status);
  r = await request('POST', '/localization/translations/bulk', { language: 'hi', translations: [{ key: 'common.save', value: 'सहेजें' }, { key: 'common.cancel', value: 'रद्द करें' }] }, tk);
  test('POST /localization/translations/bulk', 201, r.status);
  r = await request('GET', '/localization/translations?language=en', null, tk);
  test('GET /localization/translations', 200, r.status);
  r = await request('GET', '/localization/languages', null, tk);
  test('GET /localization/languages', 200, r.status);
  r = await request('GET', '/localization/export/en', null, tk);
  test('GET /localization/export/:language', 200, r.status);
  r = await request('GET', '/localization/stats', null, tk);
  test('GET /localization/stats', 200, r.status);

  // TENANT ADMIN
  section('Tenant Admin');
  r = await request('POST', '/tenant-admin/usage', { tenantId: 'tenant-1', period: '2026-01', apiCalls: 5000, transactions: 200, revenue: 15000 }, tk);
  test('POST /tenant-admin/usage', 201, r.status);
  const usageId = r.body?.data?.id;
  r = await request('GET', '/tenant-admin/usage', null, tk);
  test('GET /tenant-admin/usage', 200, r.status);
  r = await request('GET', `/tenant-admin/usage/${usageId}`, null, tk);
  test('GET /tenant-admin/usage/:id', 200, r.status);
  r = await request('POST', '/tenant-admin/metrics', { metricType: 'CPU', name: 'server-1', value: 45.5, unit: '%' }, tk);
  test('POST /tenant-admin/metrics', 201, r.status);
  r = await request('GET', '/tenant-admin/metrics', null, tk);
  test('GET /tenant-admin/metrics', 200, r.status);
  r = await request('GET', '/tenant-admin/metrics/latest', null, tk);
  test('GET /tenant-admin/metrics/latest', 200, r.status);
  r = await request('POST', '/tenant-admin/audit', { shopId, action: 'CREATE', resource: 'customer', resourceId: 'cust-1' }, tk);
  test('POST /tenant-admin/audit', 201, r.status);
  r = await request('GET', '/tenant-admin/audit', null, tk);
  test('GET /tenant-admin/audit', 200, r.status);
  r = await request('POST', '/tenant-admin/retention', { dataType: 'AUDIT_LOGS', retentionDays: 180 }, tk);
  test('POST /tenant-admin/retention', 201, r.status);
  r = await request('GET', '/tenant-admin/retention', null, tk);
  test('GET /tenant-admin/retention', 200, r.status);

  console.log('\n==========================================================');
  console.log(`  MODULE 4 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('==========================================================');
  if (errors.length > 0) { console.log('\nFailed:'); errors.forEach(e => console.log('  ' + e)); }
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
