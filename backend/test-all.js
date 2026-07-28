const http = require('http');

let passed = 0;
let failed = 0;
let skipped = 0;
const errors = [];

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const fullPath = `/api${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, hostname: 'localhost', port: 4000, path: fullPath, headers };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
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

function test(name, expectedStatus, actualStatus, detail) {
  if (actualStatus === expectedStatus) {
    console.log(`  ✅ ${name} (HTTP ${actualStatus})`);
    passed++;
  } else {
    const msg = `  ❌ ${name} (expected ${expectedStatus}, got ${actualStatus})${detail ? ': ' + detail : ''}`;
    console.log(msg);
    errors.push(msg);
    failed++;
  }
}

function section(name) {
  console.log(`\n--- ${name} ---`);
}

let tk, refreshToken, userId, shopId, userToken, tenantId, branchId, customerId, supplierId, employeeId, categoryId, brandId, unitId, warehouseId, productId, purchaseId, saleId, posSessionId, paymentId, invoiceId, expenseId, incomeId, ledgerId, journalId, loyaltyProgramId, couponId, serviceRepairId, warrantyId, taxRuleId;

async function run() {
  console.log('==========================================================');
  console.log('  STIQR BACKEND — FULL MODULE 1 + MODULE 2 ENDPOINT TESTS');
  console.log('==========================================================');

  // ============================================================
  // MODULE 1: Core Infrastructure & Auth
  // ============================================================

  // --- 1. Health & Utilities ---
  section('MODULE 1: Health & Utilities');
  let r = await request('GET', '/health');
  test('GET /health', 200, r.status);
  r = await request('GET', '/health/database');
  test('GET /health/database', 200, r.status);
  r = await request('GET', '/health/redis');
  test('GET /health/redis (graceful fallback)', 200, r.status);
  r = await request('GET', '/health/metrics');
  test('GET /health/metrics', 200, r.status);
  r = await request('GET', '/health/version');
  test('GET /health/version', 200, r.status);
  r = await request('GET', '/health/status');
  test('GET /health/status', 200, r.status);

  // --- 2. Auth: Login (seeded super admin) ---
  section('MODULE 1: Auth — Login');
  r = await request('POST', '/auth/login', { email: 'admin@stiqr.com', password: 'SuperAdmin@123' });
  test('POST /auth/login (seeded admin)', 200, r.status);
  tk = r.body?.data?.accessToken;
  refreshToken = r.body?.data?.refreshToken;
  if (!tk) { console.log('    FATAL: no token'); process.exit(1); }

  // --- 3. Auth: Profile ---
  section('MODULE 1: Auth — Profile');
  r = await request('GET', '/auth/profile', null, tk);
  test('GET /auth/profile (with token)', 200, r.status);
  r = await request('GET', '/auth/profile');
  test('GET /auth/profile (no token → 401)', 401, r.status);

  // --- 4. Auth: Refresh Token ---
  section('MODULE 1: Auth — Refresh Token');
  r = await request('POST', '/auth/refresh', { refreshToken });
  test('POST /auth/refresh', 200, r.status);
  const newTk = r.body?.data?.accessToken;
  if (newTk) tk = newTk;

  // --- 5. Auth: Register ---
  section('MODULE 1: Auth — Register');
  r = await request('POST', '/auth/register', { name: 'Test User', email: 'testuser@example.com', password: 'Test123!' });
  test('POST /auth/register', 201, r.status);
  userId = r.body?.data?.user?.id;
  userToken = r.body?.data?.accessToken;
  const userRefresh = r.body?.data?.refreshToken;

  r = await request('POST', '/auth/register', { name: 'Dup', email: 'testuser@example.com', password: 'Test123!' });
  test('POST /auth/register duplicate → 409', 409, r.status);

  // --- 6. Auth: Login (new user) ---
  section('MODULE 1: Auth — Login (new user)');
  r = await request('POST', '/auth/login', { email: 'testuser@example.com', password: 'Test123!' });
  test('POST /auth/login (new user)', 200, r.status);
  userToken = r.body?.data?.accessToken;

  r = await request('POST', '/auth/login', { email: 'testuser@example.com', password: 'wrong' });
  test('POST /auth/login wrong password → 401', 401, r.status);

  // --- 7. Auth: Forgot Password ---
  section('MODULE 1: Auth — Forgot Password');
  r = await request('POST', '/auth/forgot-password', { email: 'admin@stiqr.com' });
  test('POST /auth/forgot-password', 200, r.status);

  // --- 8. Auth: Logout ---
  section('MODULE 1: Auth — Logout');
  r = await request('POST', '/auth/logout', null, tk);
  test('POST /auth/logout', 200, r.status);

  // Re-login after logout
  r = await request('POST', '/auth/login', { email: 'admin@stiqr.com', password: 'SuperAdmin@123' });
  tk = r.body?.data?.accessToken;

  // --- 9. OTP ---
  section('MODULE 1: OTP');
  r = await request('POST', '/otp/generate', { email: 'testuser@example.com', purpose: 'registration' });
  test('POST /otp/generate', 200, r.status);
  r = await request('POST', '/otp/verify', { email: 'testuser@example.com', code: '000000', purpose: 'registration' });
  test('POST /otp/verify (wrong code → 400)', 400, r.status);

  // --- 10. Shops ---
  section('MODULE 1: Shops');
  r = await request('POST', '/shops', { name: 'Test Shop', description: 'Best shop in town', address: '123 Main St', phone: '1234567890' });
  test('POST /shops (create)', 201, r.status);
  shopId = r.body?.data?.id;
  r = await request('GET', '/shops');
  test('GET /shops (list)', 200, r.status);
  if (shopId) {
    r = await request('GET', `/shops/${shopId}`);
    test('GET /shops/:id', 200, r.status);
  }

  // --- 11. Settings ---
  section('MODULE 1: Settings');
  r = await request('PUT', '/settings', { key: 'theme', value: 'dark' }, tk);
  test('PUT /settings', 200, r.status);
  r = await request('GET', '/settings', null, tk);
  test('GET /settings', 200, r.status);
  r = await request('GET', '/settings/theme', null, tk);
  test('GET /settings/theme', 200, r.status);

  // --- 12. Notifications ---
  section('MODULE 1: Notifications');
  r = await request('GET', '/notifications', null, tk);
  test('GET /notifications', 200, r.status);
  r = await request('GET', '/notifications/unread-count', null, tk);
  test('GET /notifications/unread-count', 200, r.status);

  // --- 13. Users ---
  section('MODULE 1: Users');
  r = await request('GET', '/users', null, tk);
  test('GET /users (admin → 200)', 200, r.status);
  r = await request('GET', '/users', null, userToken);
  test('GET /users (non-admin → 403)', 403, r.status);

  // --- 14. Roles ---
  section('MODULE 1: Roles');
  r = await request('GET', '/roles', null, tk);
  test('GET /roles', 200, r.status);
  r = await request('GET', '/roles/permissions', null, tk);
  test('GET /roles/permissions', 200, r.status);

  // ============================================================
  // MODULE 2: Business Management System
  // ============================================================

  // --- 15. Tenants ---
  section('MODULE 2: Tenants');
  r = await request('POST', '/tenants', { name: 'Acme Corp', email: 'acme@test.com' }, tk);
  test('POST /tenants (create)', 201, r.status);
  tenantId = r.body?.data?.id;
  if (!tenantId) {
    r = await request('GET', '/tenants', null, tk);
    tenantId = r.body?.data?.[0]?.id;
  }
  r = await request('GET', '/tenants', null, tk);
  test('GET /tenants (list)', 200, r.status);
  if (tenantId) {
    r = await request('GET', `/tenants/${tenantId}`, null, tk);
    test('GET /tenants/:id', 200, r.status);
    r = await request('PATCH', `/tenants/${tenantId}`, { name: 'Acme Corp Updated' }, tk);
    test('PATCH /tenants/:id (update)', 200, r.status);
  }

  // --- 16. Subscriptions ---
  section('MODULE 2: Subscriptions');
  if (tenantId) {
    r = await request('POST', '/subscriptions', { tenantId, plan: 'PRO', startDate: new Date().toISOString() }, tk);
    test('POST /subscriptions (create)', 201, r.status);
  }
  r = await request('GET', '/subscriptions', null, tk);
  test('GET /subscriptions (list)', 200, r.status);

  // --- 17. Branches ---
  section('MODULE 2: Branches');
  r = await request('POST', '/branches', { shopId, name: 'Main Branch', code: 'MB01', address: '456 Branch St' }, tk);
  test('POST /branches (create)', 201, r.status);
  branchId = r.body?.data?.id;
  if (!branchId) {
    r = await request('GET', '/branches', null, tk);
    branchId = r.body?.data?.data?.[0]?.id || r.body?.data?.[0]?.id;
  }
  r = await request('GET', '/branches', null, tk);
  test('GET /branches (list)', 200, r.status);
  if (branchId) {
    r = await request('GET', `/branches/${branchId}`, null, tk);
    test('GET /branches/:id', 200, r.status);
    r = await request('PATCH', `/branches/${branchId}`, { name: 'Main Branch Updated' }, tk);
    test('PATCH /branches/:id (update)', 200, r.status);
  }

  // --- 18. Customers ---
  section('MODULE 2: Customers');
  r = await request('POST', '/customers', { shopId, name: 'John Customer', email: 'john@test.com', phone: '9999999999', address: '789 Customer Ave' }, tk);
  test('POST /customers (create)', 201, r.status);
  customerId = r.body?.data?.id;
  if (!customerId) {
    r = await request('GET', '/customers', null, tk);
    customerId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/customers', null, tk);
  test('GET /customers (list)', 200, r.status);
  if (customerId) {
    r = await request('GET', `/customers/${customerId}`, null, tk);
    test('GET /customers/:id', 200, r.status);
    r = await request('PATCH', `/customers/${customerId}`, { name: 'John Customer Updated' }, tk);
    test('PATCH /customers/:id (update)', 200, r.status);
  }
  // Customer search
  r = await request('GET', '/customers?search=John', null, tk);
  test('GET /customers?search=John', 200, r.status);

  // --- 19. Suppliers ---
  section('MODULE 2: Suppliers');
  r = await request('POST', '/suppliers', { shopId, name: 'Best Supplier', email: 'supplier@test.com', phone: '8888888888' }, tk);
  test('POST /suppliers (create)', 201, r.status);
  supplierId = r.body?.data?.id;
  if (!supplierId) {
    r = await request('GET', '/suppliers', null, tk);
    supplierId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/suppliers', null, tk);
  test('GET /suppliers (list)', 200, r.status);
  if (supplierId) {
    r = await request('GET', `/suppliers/${supplierId}`, null, tk);
    test('GET /suppliers/:id', 200, r.status);
    r = await request('PATCH', `/suppliers/${supplierId}`, { name: 'Best Supplier Updated' }, tk);
    test('PATCH /suppliers/:id (update)', 200, r.status);
  }

  // --- 20. Employees ---
  section('MODULE 2: Employees');
  r = await request('POST', '/employees', { shopId, name: 'Jane Employee', email: 'jane@test.com', phone: '7777777777', designation: 'Manager', salary: 50000, joinDate: new Date().toISOString() }, tk);
  test('POST /employees (create)', 201, r.status);
  employeeId = r.body?.data?.id;
  if (!employeeId) {
    r = await request('GET', '/employees', null, tk);
    const list = r.body?.data?.data || r.body?.data || [];
    employeeId = Array.isArray(list) && list.length > 0 ? list[0]?.id : null;
  }
  r = await request('GET', '/employees', null, tk);
  test('GET /employees (list)', 200, r.status);
  if (employeeId) {
    r = await request('GET', `/employees/${employeeId}`, null, tk);
    test('GET /employees/:id', 200, r.status);
    r = await request('PATCH', `/employees/${employeeId}`, { designation: 'Senior Manager' }, tk);
    test('PATCH /employees/:id (update)', 200, r.status);
  }

  // --- 21. Categories ---
  section('MODULE 2: Categories');
  r = await request('POST', '/categories', { shopId, name: 'Electronics', slug: 'electronics' }, tk);
  test('POST /categories (create)', 201, r.status);
  categoryId = r.body?.data?.id;
  if (!categoryId) {
    r = await request('GET', '/categories', null, tk);
    categoryId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/categories', null, tk);
  test('GET /categories (list)', 200, r.status);
  if (categoryId) {
    r = await request('GET', `/categories/${categoryId}`, null, tk);
    test('GET /categories/:id', 200, r.status);
    r = await request('PATCH', `/categories/${categoryId}`, { name: 'Electronics Updated' }, tk);
    test('PATCH /categories/:id (update)', 200, r.status);
  }

  // --- 22. Brands ---
  section('MODULE 2: Brands');
  r = await request('POST', '/brands', { shopId, name: 'Samsung', slug: 'samsung' }, tk);
  test('POST /brands (create)', 201, r.status);
  brandId = r.body?.data?.id;
  if (!brandId) {
    r = await request('GET', '/brands', null, tk);
    brandId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/brands', null, tk);
  test('GET /brands (list)', 200, r.status);
  if (brandId) {
    r = await request('GET', `/brands/${brandId}`, null, tk);
    test('GET /brands/:id', 200, r.status);
    r = await request('PATCH', `/brands/${brandId}`, { name: 'Samsung Updated' }, tk);
    test('PATCH /brands/:id (update)', 200, r.status);
  }

  // --- 23. Units ---
  section('MODULE 2: Units');
  r = await request('POST', '/units', { shopId, name: 'Piece', symbol: 'pc' }, tk);
  test('POST /units (create)', 201, r.status);
  unitId = r.body?.data?.id;
  if (!unitId) {
    r = await request('GET', '/units', null, tk);
    unitId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/units', null, tk);
  test('GET /units (list)', 200, r.status);
  if (unitId) {
    r = await request('GET', `/units/${unitId}`, null, tk);
    test('GET /units/:id', 200, r.status);
    r = await request('PATCH', `/units/${unitId}`, { name: 'Box', symbol: 'box' }, tk);
    test('PATCH /units/:id (update)', 200, r.status);
  }

  // --- 24. Warehouses ---
  section('MODULE 2: Warehouses');
  r = await request('POST', '/warehouses', { shopId, name: 'Main Warehouse', address: 'Warehouse District' }, tk);
  test('POST /warehouses (create)', 201, r.status);
  warehouseId = r.body?.data?.id;
  if (!warehouseId) {
    r = await request('GET', '/warehouses', null, tk);
    const list = r.body?.data;
    warehouseId = Array.isArray(list) ? list[0]?.id : list?.data?.[0]?.id;
  }
  r = await request('GET', '/warehouses', null, tk);
  test('GET /warehouses (list)', 200, r.status);
  if (warehouseId) {
    r = await request('GET', `/warehouses/${warehouseId}`, null, tk);
    test('GET /warehouses/:id', 200, r.status);
    r = await request('PATCH', `/warehouses/${warehouseId}`, { name: 'Main Warehouse Updated' }, tk);
    test('PATCH /warehouses/:id (update)', 200, r.status);
  }

  // --- 25. Products ---
  section('MODULE 2: Products');
  r = await request('POST', '/products', { shopId, name: 'Galaxy S24', slug: 'galaxy-s24', categoryId, brandId, unitId, sellingPrice: 79999, purchasePrice: 60000, sku: 'SAM-S24-001', description: 'Samsung Galaxy S24' }, tk);
  test('POST /products (create)', 201, r.status);
  productId = r.body?.data?.id;
  if (!productId) {
    r = await request('GET', '/products', null, tk);
    productId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/products', null, tk);
  test('GET /products (list)', 200, r.status);
  if (productId) {
    r = await request('GET', `/products/${productId}`, null, tk);
    test('GET /products/:id', 200, r.status);
    r = await request('PATCH', `/products/${productId}`, { name: 'Galaxy S24 Ultra' }, tk);
    test('PATCH /products/:id (update)', 200, r.status);
  }
  // Product search
  r = await request('GET', '/products?search=Galaxy', null, tk);
  test('GET /products?search=Galaxy', 200, r.status);

  // --- 26. Inventory ---
  section('MODULE 2: Inventory');
  r = await request('GET', '/inventory', null, tk);
  test('GET /inventory (list)', 200, r.status);
  r = await request('GET', '/inventory/low-stock', null, tk);
  test('GET /inventory/low-stock', 200, r.status);

  // --- 27. Tax Rules ---
  section('MODULE 2: Tax Rules');
  r = await request('POST', '/tax/rules', { shopId, name: 'GST 18%', rate: 18, type: 'GST' }, tk);
  test('POST /tax/rules (create)', 201, r.status);
  taxRuleId = r.body?.data?.id;
  if (!taxRuleId) {
    r = await request('GET', '/tax/rules', null, tk);
    taxRuleId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/tax/rules', null, tk);
  test('GET /tax/rules (list)', 200, r.status);
  if (taxRuleId) {
    r = await request('GET', `/tax/rules/${taxRuleId}`, null, tk);
    test('GET /tax/rules/:id', 200, r.status);
    r = await request('PATCH', `/tax/rules/${taxRuleId}`, { rate: 20 }, tk);
    test('PATCH /tax/rules/:id (update)', 200, r.status);
  }
  // Tax calculation (GET with query params)
  r = await request('GET', `/tax/calculate?shopId=${shopId}&amount=1000`, null, tk);
  test('GET /tax/calculate', 200, r.status);

  // --- 28. Purchases ---
  section('MODULE 2: Purchases');
  r = await request('POST', '/purchases', { shopId, supplierId, warehouseId, invoiceNumber: 'PUR-' + Date.now(), date: new Date().toISOString(), subtotal: 100000, taxAmount: 18000, total: 118000, paidAmount: 50000, status: 'RECEIVED', paymentStatus: 'PARTIAL' }, tk);
  test('POST /purchases (create)', 201, r.status);
  purchaseId = r.body?.data?.id;
  if (!purchaseId) {
    r = await request('GET', '/purchases', null, tk);
    purchaseId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/purchases', null, tk);
  test('GET /purchases (list)', 200, r.status);
  if (purchaseId) {
    r = await request('GET', `/purchases/${purchaseId}`, null, tk);
    test('GET /purchases/:id', 200, r.status);
    r = await request('PATCH', `/purchases/${purchaseId}`, { status: 'RECEIVED' }, tk);
    test('PATCH /purchases/:id (update)', 200, r.status);
  }

  // --- 29. Sales ---
  section('MODULE 2: Sales');
  r = await request('POST', '/sales', { shopId, branchId, invoiceNumber: 'SAL-' + Date.now(), date: new Date().toISOString(), subtotal: 79999, taxAmount: 0, discount: 0, total: 79999, paidAmount: 79999, paymentMethod: 'CASH', customerId }, tk);
  test('POST /sales (create)', 201, r.status);
  saleId = r.body?.data?.id;
  if (!saleId) {
    r = await request('GET', '/sales', null, tk);
    saleId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/sales', null, tk);
  test('GET /sales (list)', 200, r.status);
  if (saleId) {
    r = await request('GET', `/sales/${saleId}`, null, tk);
    test('GET /sales/:id', 200, r.status);
  }

  // --- 30. POS ---
  section('MODULE 2: POS Sessions');
  r = await request('POST', '/pos/sessions', { shopId, branchId, cashierId: employeeId, openingBalance: 10000 }, tk);
  test('POST /pos/sessions (open)', 201, r.status);
  posSessionId = r.body?.data?.id;
  r = await request('GET', '/pos/sessions', null, tk);
  test('GET /pos/sessions (list)', 200, r.status);
  if (posSessionId) {
    r = await request('GET', `/pos/sessions/${posSessionId}`, null, tk);
    test('GET /pos/sessions/:id', 200, r.status);
    r = await request('PATCH', `/pos/sessions/${posSessionId}/close`, { closingBalance: 15000 }, tk);
    test('PATCH /pos/sessions/:id/close', 200, r.status);
  }

  // --- 31. Payments ---
  section('MODULE 2: Payments');
  r = await request('GET', '/payments', null, tk);
  test('GET /payments (list)', 200, r.status);

  // --- 32. Invoices ---
  section('MODULE 2: Invoices');
  r = await request('GET', '/invoices', null, tk);
  test('GET /invoices (list)', 200, r.status);

  // --- 33. Expenses ---
  section('MODULE 2: Expenses');
  r = await request('POST', '/expenses', { shopId, category: 'rent', description: 'Office rent - January', amount: 25000, paymentMethod: 'BANK', date: new Date().toISOString() }, tk);
  test('POST /expenses (create)', 201, r.status);
  expenseId = r.body?.data?.id;
  if (!expenseId) {
    r = await request('GET', '/expenses', null, tk);
    expenseId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/expenses', null, tk);
  test('GET /expenses (list)', 200, r.status);
  if (expenseId) {
    r = await request('GET', `/expenses/${expenseId}`, null, tk);
    test('GET /expenses/:id', 200, r.status);
  }

  // --- 34. Income ---
  section('MODULE 2: Income');
  r = await request('POST', '/income', { shopId, source: 'sales', description: 'Monthly sales revenue', amount: 500000, paymentMethod: 'BANK', date: new Date().toISOString() }, tk);
  test('POST /income (create)', 201, r.status);
  incomeId = r.body?.data?.id;
  if (!incomeId) {
    r = await request('GET', '/income', null, tk);
    incomeId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/income', null, tk);
  test('GET /income (list)', 200, r.status);
  if (incomeId) {
    r = await request('GET', `/income/${incomeId}`, null, tk);
    test('GET /income/:id', 200, r.status);
  }

  // --- 35. Accounting (Ledger & Journal) ---
  section('MODULE 2: Accounting');
  r = await request('GET', '/accounting/ledger', null, tk);
  test('GET /accounting/ledger (list)', 200, r.status);
  r = await request('GET', '/accounting/journal', null, tk);
  test('GET /accounting/journal (list)', 200, r.status);

  // --- 36. Loyalty Programs ---
  section('MODULE 2: Loyalty Programs');
  r = await request('POST', '/loyalty/programs', { shopId, name: 'Gold Tier', pointsPerRupee: 2, minPurchase: 1000 }, tk);
  test('POST /loyalty/programs (create)', 201, r.status);
  loyaltyProgramId = r.body?.data?.id;
  if (!loyaltyProgramId) {
    r = await request('GET', '/loyalty/programs', null, tk);
    loyaltyProgramId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/loyalty/programs', null, tk);
  test('GET /loyalty/programs (list)', 200, r.status);

  // --- 37. Coupons ---
  section('MODULE 2: Coupons');
  r = await request('POST', '/coupons', { shopId, code: 'SAVE' + Date.now(), type: 'percentage', value: 10, minPurchase: 500, maxDiscount: 2000, startDate: new Date().toISOString(), endDate: new Date(Date.now() + 30 * 86400000).toISOString() }, tk);
  test('POST /coupons (create)', 201, r.status);
  couponId = r.body?.data?.id;
  if (!couponId) {
    r = await request('GET', '/coupons', null, tk);
    couponId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/coupons', null, tk);
  test('GET /coupons (list)', 200, r.status);
  if (couponId) {
    r = await request('GET', `/coupons/${couponId}`, null, tk);
    test('GET /coupons/:id', 200, r.status);
  }

  // --- 38. Service & Repair ---
  section('MODULE 2: Service & Repair');
  r = await request('POST', '/service-repairs', { shopId, branchId, deviceType: 'Phone', deviceBrand: 'Samsung', deviceModel: 'Galaxy S24', ticketNumber: 'SR-' + Date.now(), issueDescription: 'Screen broken', estimatedCost: 5000 }, tk);
  test('POST /service-repairs (create)', 201, r.status);
  serviceRepairId = r.body?.data?.id;
  if (!serviceRepairId) {
    r = await request('GET', '/service-repairs', null, tk);
    serviceRepairId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/service-repairs', null, tk);
  test('GET /service-repairs (list)', 200, r.status);
  if (serviceRepairId) {
    r = await request('GET', `/service-repairs/${serviceRepairId}`, null, tk);
    test('GET /service-repairs/:id', 200, r.status);
    r = await request('PATCH', `/service-repairs/${serviceRepairId}`, { status: 'IN_PROGRESS', technicianId: employeeId }, tk);
    test('PATCH /service-repairs/:id (update/assign)', 200, r.status);
  }

  // --- 39. Warranties ---
  section('MODULE 2: Warranties');
  r = await request('POST', '/warranties', { shopId, productId, imei: '355789012345678', type: 'manufacturer', startDate: new Date().toISOString(), endDate: new Date(Date.now() + 365 * 86400000).toISOString() }, tk);
  test('POST /warranties (create)', 201, r.status);
  warrantyId = r.body?.data?.id;
  if (!warrantyId) {
    r = await request('GET', '/warranties', null, tk);
    warrantyId = r.body?.data?.data?.[0]?.id;
  }
  r = await request('GET', '/warranties', null, tk);
  test('GET /warranties (list)', 200, r.status);
  if (warrantyId) {
    r = await request('GET', `/warranties/${warrantyId}`, null, tk);
    test('GET /warranties/:id', 200, r.status);
  }

  // --- 40. Reports ---
  section('MODULE 2: Reports');
  r = await request('GET', '/reports/sales', null, tk);
  test('GET /reports/sales', 200, r.status);
  r = await request('GET', '/reports/inventory', null, tk);
  test('GET /reports/inventory', 200, r.status);
  r = await request('GET', '/dashboard', null, tk);
  test('GET /dashboard', 200, r.status);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n==========================================================');
  console.log(`  TOTAL: ${passed} passed, ${failed} failed`);
  console.log('==========================================================');
  if (errors.length > 0) {
    console.log('\nFAILED TESTS:');
    errors.forEach((e) => console.log(e));
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
