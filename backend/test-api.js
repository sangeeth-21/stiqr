const http = require('http');

const BASE = 'http://localhost:4000/api';
let passed = 0;
let failed = 0;

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const fullPath = `/api${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, hostname: 'localhost', port: 4000, path: fullPath, headers };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function test(name, expectedStatus, actualStatus) {
  if (actualStatus === expectedStatus) {
    console.log(`  ✅ ${name} (HTTP ${actualStatus})`);
    passed++;
  } else {
    console.log(`  ❌ ${name} (expected ${expectedStatus}, got ${actualStatus})`);
    failed++;
  }
}

async function run() {
  console.log('============================================');
  console.log('  STIQR BACKEND - MODULE 1 ENDPOINT TESTS');
  console.log('============================================\n');

  // --- Health ---
  console.log('--- 1. Health & Utility Endpoints ---');
  let r = await request('GET', '/health');
  test('GET /health', 200, r.status);

  r = await request('GET', '/health/database');
  test('GET /health/database', 200, r.status);

  r = await request('GET', '/health/redis');
  test('GET /health/redis', 200, r.status);

  r = await request('GET', '/health/metrics');
  test('GET /health/metrics', 200, r.status);

  r = await request('GET', '/health/version');
  test('GET /health/version', 200, r.status);

  r = await request('GET', '/health/status');
  test('GET /health/status', 200, r.status);

  // --- Login with seeded super admin ---
  console.log('\n--- 2. Auth: Login (seeded admin) ---');
  r = await request('POST', '/auth/login', { email: 'admin@stiqr.com', password: 'SuperAdmin@123' });
  test('POST /auth/login (seeded admin)', 200, r.status);
  const superAdminToken = r.body?.data?.accessToken;
  const superAdminRefresh = r.body?.data?.refreshToken;
  if (r.status !== 200) console.log('    Error:', JSON.stringify(r.body));

  // --- Profile ---
  console.log('\n--- 3. Auth: Profile ---');
  r = await request('GET', '/auth/profile', null, superAdminToken);
  test('GET /auth/profile (with token)', 200, r.status);

  r = await request('GET', '/auth/profile');
  test('GET /auth/profile (no token)', 401, r.status);

  // --- Refresh Token ---
  console.log('\n--- 4. Auth: Refresh Token ---');
  r = await request('POST', '/auth/refresh', { refreshToken: superAdminRefresh });
  test('POST /auth/refresh', 200, r.status);
  const refreshedToken = r.body?.data?.accessToken;

  // --- Register new user ---
  console.log('\n--- 5. Auth: Register ---');
  r = await request('POST', '/auth/register', { name: 'John Doe', email: 'john@example.com', password: 'John123!' });
  test('POST /auth/register', 201, r.status);
  const userToken = r.body?.data?.accessToken;
  const userRefresh = r.body?.data?.refreshToken;

  // --- Duplicate Register ---
  console.log('\n--- 6. Auth: Duplicate Register ---');
  r = await request('POST', '/auth/register', { name: 'Dup', email: 'john@example.com', password: 'John123!' });
  test('POST /auth/register duplicate', 409, r.status);

  // --- Login with new user ---
  console.log('\n--- 7. Auth: Login (new user) ---');
  r = await request('POST', '/auth/login', { email: 'john@example.com', password: 'John123!' });
  test('POST /auth/login (new user)', 200, r.status);

  // --- Wrong Password ---
  console.log('\n--- 8. Auth: Wrong Password ---');
  r = await request('POST', '/auth/login', { email: 'john@example.com', password: 'wrong' });
  test('POST /auth/login wrong password', 401, r.status);

  // --- Forgot Password ---
  console.log('\n--- 9. Auth: Forgot Password ---');
  r = await request('POST', '/auth/forgot-password', { email: 'admin@stiqr.com' });
  test('POST /auth/forgot-password', 200, r.status);

  // --- Logout ---
  console.log('\n--- 10. Auth: Logout ---');
  r = await request('POST', '/auth/logout', null, refreshedToken || superAdminToken);
  test('POST /auth/logout', 200, r.status);

  // --- OTP ---
  console.log('\n--- 11. OTP ---');
  r = await request('POST', '/otp/generate', { email: 'john@example.com', purpose: 'registration' });
  test('POST /otp/generate', 200, r.status);
  const otpId = r.body?.data?.id;

  r = await request('POST', '/otp/verify', { email: 'john@example.com', code: '000000', purpose: 'registration' });
  test('POST /otp/verify (wrong code)', 400, r.status);

  // --- Shops ---
  console.log('\n--- 12. Shops ---');
  r = await request('POST', '/shops', { name: 'My Shop', description: 'Best shop' });
  test('POST /shops (create)', 201, r.status);
  const shopId = r.body?.data?.id;
  r = await request('GET', '/shops');
  test('GET /shops', 200, r.status);
  if (shopId) {
    r = await request('GET', `/shops/${shopId}`);
    test('GET /shops/:id', 200, r.status);
  }

  // --- Settings ---
  console.log('\n--- 13. Settings ---');
  const adminToken = refreshedToken || superAdminToken;
  r = await request('PUT', '/settings', { key: 'theme', value: 'dark' }, adminToken);
  test('PUT /settings', 200, r.status);
  r = await request('GET', '/settings', null, adminToken);
  test('GET /settings', 200, r.status);
  r = await request('GET', '/settings/theme', null, adminToken);
  test('GET /settings/theme', 200, r.status);

  // --- Notifications ---
  console.log('\n--- 14. Notifications ---');
  r = await request('GET', '/notifications', null, adminToken);
  test('GET /notifications', 200, r.status);
  r = await request('GET', '/notifications/unread-count', null, adminToken);
  test('GET /notifications/unread-count', 200, r.status);

  // --- Users (requires SUPER_ADMIN) ---
  console.log('\n--- 15. Users ---');
  r = await request('GET', '/users', null, adminToken);
  test('GET /users', 200, r.status);
  r = await request('GET', '/users', null, userToken);
  test('GET /users (non-admin)', 403, r.status);

  // --- Roles ---
  console.log('\n--- 16. Roles ---');
  r = await request('GET', '/roles', null, adminToken);
  test('GET /roles', 200, r.status);
  r = await request('GET', '/roles/permissions', null, adminToken);
  test('GET /roles/permissions', 200, r.status);

  // --- Summary ---
  console.log('\n============================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('============================================');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
