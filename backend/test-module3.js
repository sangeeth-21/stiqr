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
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(d); } catch { parsed = d; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function test(name, expected, actual) {
  const expArr = Array.isArray(expected) ? expected : [expected];
  if (expArr.includes(actual)) {
    console.log(`  ✅ ${name} (HTTP ${actual})`);
    passed++;
  } else {
    const msg = `  ❌ ${name} (expected ${expected}, got ${actual})`;
    console.log(msg);
    errors.push(msg);
    failed++;
  }
}

function section(name) {
  console.log(`\n--- ${name} ---`);
}

let tk, shopId, walletId, walletTxId, commissionRuleId, commissionSlabId;
let settlementId, finTxId, dmtSenderId, dmtBeneId, dmtTransferId;
let aepsId, billerId, bbpsPayId, rechargeId, pgTxId, kycId, kycDocId;
let beneficiaryId, reconciliationId, refundId, fraudRuleId, blacklistId;
let providerConfigId, providerLogId;

async function run() {
  console.log('==========================================================');
  console.log('  STIQR — MODULE 3: FinTech & Payments ENDPOINT TESTS');
  console.log('==========================================================');

  // --- Auth ---
  section('Auth');
  let r = await request('POST', '/auth/login', { email: 'admin@stiqr.com', password: 'SuperAdmin@123' });
  test('Login', 200, r.status);
  tk = r.body?.data?.accessToken;

  // --- Create Shop (prerequisite) ---
  section('Prerequisites');
  r = await request('POST', '/shops', { name: 'FinTech Shop', description: 'Module 3 test shop', address: '456 Finance St', phone: '9876543210' }, tk);
  test('POST /shops (create)', 201, r.status);
  shopId = r.body?.data?.id;
  console.log(`    → shopId: ${shopId}`);

  // ============================================================
  // WALLET
  // ============================================================
  section('Wallet');
  r = await request('POST', '/wallet', { shopId, holderType: 'SHOP', holderId: shopId }, tk);
  test('POST /wallet (create)', 201, r.status);
  walletId = r.body?.data?.id;
  console.log(`    → walletId: ${walletId}`);

  r = await request('GET', `/wallet?shopId=${shopId}`, null, tk);
  test('GET /wallet?shopId', 200, r.status);

  r = await request('GET', `/wallet/${walletId}`, null, tk);
  test('GET /wallet/:id', 200, r.status);

  r = await request('GET', `/wallet/balance/${walletId}`, null, tk);
  test('GET /wallet/balance/:id', 200, r.status);

  r = await request('POST', `/wallet/freeze/${walletId}`, null, tk);
  test('POST /wallet/freeze/:id', 201, r.status);

  r = await request('POST', `/wallet/unfreeze/${walletId}`, null, tk);
  test('POST /wallet/unfreeze/:id', 201, r.status);

  r = await request('GET', `/wallet/statement/${walletId}`, null, tk);
  test('GET /wallet/statement/:id', 200, r.status);

  // ============================================================
  // WALLET TRANSACTIONS
  // ============================================================
  section('Wallet Transactions');
  r = await request('POST', '/wallet-transactions', { walletId, type: 'CREDIT', amount: 10000, description: 'Initial deposit' }, tk);
  test('POST /wallet-transactions (credit)', 201, r.status);
  walletTxId = r.body?.data?.id;

  r = await request('POST', '/wallet-transactions', { walletId, type: 'CREDIT', amount: 5000, description: 'Second deposit', idempotencyKey: `idem-${Date.now()}` }, tk);
  test('POST /wallet-transactions (credit 2)', 201, r.status);

  r = await request('GET', `/wallet-transactions?walletId=${walletId}`, null, tk);
  test('GET /wallet-transactions', 200, r.status);

  r = await request('POST', '/wallet-transactions', { walletId, type: 'DEBIT', amount: 2000, description: 'Payment' }, tk);
  test('POST /wallet-transactions (debit)', 201, r.status);

  // ============================================================
  // COMMISSION
  // ============================================================
  section('Commission');
  r = await request('POST', '/commission/rules', { shopId, name: 'DMT Commission', serviceType: 'DMT', calculationType: 'PERCENTAGE', rate: 1, targetRole: 'RETAILER' }, tk);
  test('POST /commission/rules (create)', 201, r.status);
  commissionRuleId = r.body?.data?.id;

  r = await request('GET', `/commission/rules?shopId=${shopId}`, null, tk);
  test('GET /commission/rules', 200, r.status);

  r = await request('GET', `/commission/rules/${commissionRuleId}`, null, tk);
  test('GET /commission/rules/:id', 200, r.status);

  r = await request('POST', '/commission/slabs', { ruleId: commissionRuleId, minAmount: 0, maxAmount: 1000, rate: 1 }, tk);
  test('POST /commission/slabs (create)', 201, r.status);
  commissionSlabId = r.body?.data?.id;

  r = await request('GET', `/commission/slabs?ruleId=${commissionRuleId}`, null, tk);
  test('GET /commission/slabs', 200, r.status);

  r = await request('GET', `/commission/ledger?shopId=${shopId}`, null, tk);
  test('GET /commission/ledger', 200, r.status);

  r = await request('POST', `/commission/calculate?shopId=${shopId}&serviceType=DMT&amount=5000`, null, tk);
  test('POST /commission/calculate', 201, r.status);

  // ============================================================
  // SETTLEMENT
  // ============================================================
  section('Settlement');
  r = await request('POST', '/settlement', { shopId, walletId, amount: 5000, bankAccountNumber: '1234567890', ifscCode: 'SBIN0001234', accountHolderName: 'Test User' }, tk);
  test('POST /settlement (request)', 201, r.status);
  settlementId = r.body?.data?.id;

  r = await request('GET', `/settlement?shopId=${shopId}`, null, tk);
  test('GET /settlement', 200, r.status);

  r = await request('GET', `/settlement/${settlementId}`, null, tk);
  test('GET /settlement/:id', 200, r.status);

  r = await request('PATCH', `/settlement/${settlementId}/approve`, { processedBy: 'admin' }, tk);
  test('PATCH /settlement/:id/approve', 200, r.status);

  r = await request('PATCH', `/settlement/${settlementId}/process`, { utrNumber: `UTR${Date.now()}` }, tk);
  test('PATCH /settlement/:id/process', 200, r.status);

  r = await request('GET', `/settlement/history/${shopId}`, null, tk);
  test('GET /settlement/history/:shopId', 200, r.status);

  // ============================================================
  // FINANCIAL TRANSACTIONS
  // ============================================================
  section('Financial Transactions');
  r = await request('POST', '/financial-transactions', { shopId, type: 'DMT', amount: 1000, charges: 10, totalAmount: 1010, initiatedBy: 'admin' }, tk);
  test('POST /financial-transactions (create)', 201, r.status);
  finTxId = r.body?.data?.id;

  r = await request('GET', `/financial-transactions?shopId=${shopId}`, null, tk);
  test('GET /financial-transactions', 200, r.status);

  r = await request('GET', `/financial-transactions/${finTxId}`, null, tk);
  test('GET /financial-transactions/:id', 200, r.status);

  r = await request('GET', `/financial-transactions/${finTxId}/logs`, null, tk);
  test('GET /financial-transactions/:id/logs', 200, r.status);

  // ============================================================
  // DMT
  // ============================================================
  section('DMT');
  r = await request('POST', '/dmt/senders', { shopId, mobile: '9000012345', name: 'Ram Kumar' }, tk);
  test('POST /dmt/senders (register)', 201, r.status);
  dmtSenderId = r.body?.data?.id;

  r = await request('GET', `/dmt/senders?shopId=${shopId}`, null, tk);
  test('GET /dmt/senders', 200, r.status);

  r = await request('GET', `/dmt/senders/${dmtSenderId}`, null, tk);
  test('GET /dmt/senders/:id', 200, r.status);

  r = await request('PATCH', `/dmt/senders/${dmtSenderId}/verify`, { otp: '123456' }, tk);
  test('PATCH /dmt/senders/:id/verify', [200, 400], r.status);

  r = await request('POST', '/dmt/beneficiaries', { senderId: dmtSenderId, name: 'Shyam Das', bankName: 'SBI', accountNumber: '9876543210', ifscCode: 'SBIN0001234' }, tk);
  test('POST /dmt/beneficiaries (add)', 201, r.status);
  dmtBeneId = r.body?.data?.id;

  r = await request('GET', `/dmt/beneficiaries?senderId=${dmtSenderId}`, null, tk);
  test('GET /dmt/beneficiaries', 200, r.status);

  r = await request('PATCH', `/dmt/beneficiaries/${dmtBeneId}/verify`, {}, tk);
  test('PATCH /dmt/beneficiaries/:id/verify', [200, 400], r.status);

  r = await request('POST', '/dmt/transfers', { senderId: dmtSenderId, beneficiaryId: dmtBeneId, shopId, amount: 1000, charges: 10 }, tk);
  test('POST /dmt/transfers (create)', 201, r.status);
  dmtTransferId = r.body?.data?.id;

  r = await request('GET', `/dmt/transfers?shopId=${shopId}`, null, tk);
  test('GET /dmt/transfers', 200, r.status);

  r = await request('GET', `/dmt/transfers/${dmtTransferId}`, null, tk);
  test('GET /dmt/transfers/:id', 200, r.status);

  r = await request('POST', `/dmt/transfers/${dmtTransferId}/status`, { status: 'SUCCESS' }, tk);
  test('POST /dmt/transfers/:id/status', 201, r.status);

  // ============================================================
  // AEPS
  // ============================================================
  section('AEPS');
  r = await request('POST', '/aeps/transactions', { shopId, aadhaarNumber: '123456789012', biometricType: 'FINGERPRINT', transactionType: 'CASH_WITHDRAWAL', amount: 5000 }, tk);
  test('POST /aeps/transactions (create)', 201, r.status);
  aepsId = r.body?.data?.id;

  r = await request('GET', `/aeps/transactions?shopId=${shopId}`, null, tk);
  test('GET /aeps/transactions', 200, r.status);

  r = await request('GET', `/aeps/transactions/${aepsId}`, null, tk);
  test('GET /aeps/transactions/:id', 200, r.status);

  r = await request('POST', `/aeps/transactions/${aepsId}/status`, { status: 'SUCCESS' }, tk);
  test('POST /aeps/transactions/:id/status', 201, r.status);

  // ============================================================
  // BBPS
  // ============================================================
  section('BBPS');
  r = await request('POST', '/bbps/billers', { name: 'BESCOM', category: 'ELECTRICITY', providerCode: 'BESCOM01' }, tk);
  test('POST /bbps/billers (create)', 201, r.status);
  billerId = r.body?.data?.id;

  r = await request('GET', '/bbps/billers', null, tk);
  test('GET /bbps/billers', 200, r.status);

  r = await request('GET', `/bbps/billers/${billerId}`, null, tk);
  test('GET /bbps/billers/:id', 200, r.status);

  r = await request('POST', '/bbps/payments', { shopId, billerId, consumerNumber: '1234567890', billAmount: 2500, convenienceFee: 10, totalAmount: 2510, paymentMode: 'WALLET' }, tk);
  test('POST /bbps/payments (pay)', 201, r.status);
  bbpsPayId = r.body?.data?.id;

  r = await request('GET', `/bbps/payments?shopId=${shopId}`, null, tk);
  test('GET /bbps/payments', 200, r.status);

  // ============================================================
  // RECHARGE
  // ============================================================
  section('Recharge');
  r = await request('POST', '/recharge', { shopId, type: 'MOBILE', operator: 'Jio', mobileOrAccountNumber: '9000012345', amount: 399, totalDebited: 399 }, tk);
  test('POST /recharge (create)', 201, r.status);
  rechargeId = r.body?.data?.id;

  r = await request('GET', `/recharge?shopId=${shopId}`, null, tk);
  test('GET /recharge', 200, r.status);

  r = await request('GET', `/recharge/${rechargeId}`, null, tk);
  test('GET /recharge/:id', 200, r.status);

  r = await request('POST', `/recharge/${rechargeId}/status`, { status: 'SUCCESS' }, tk);
  test('POST /recharge/:id/status', 201, r.status);

  // ============================================================
  // PAYMENT GATEWAY
  // ============================================================
  section('Payment Gateway');
  r = await request('POST', '/payment-gateway/initiate', { shopId, amount: 999, paymentMethod: 'UPI', provider: 'RAZORPAY' }, tk);
  test('POST /payment-gateway/initiate', 201, r.status);
  pgTxId = r.body?.data?.id;

  r = await request('GET', `/payment-gateway?shopId=${shopId}`, null, tk);
  test('GET /payment-gateway', 200, r.status);

  r = await request('GET', `/payment-gateway/${pgTxId}`, null, tk);
  test('GET /payment-gateway/:id', 200, r.status);

  r = await request('POST', `/payment-gateway/${pgTxId}/verify`, {}, tk);
  test('POST /payment-gateway/:id/verify', 201, r.status);

  // ============================================================
  // KYC
  // ============================================================
  section('KYC');
  r = await request('POST', '/kyc', { shopId, holderType: 'SHOP', holderId: shopId, panNumber: 'ABCDE1234F' }, tk);
  test('POST /kyc (create)', 201, r.status);
  kycId = r.body?.data?.id;

  r = await request('GET', `/kyc?shopId=${shopId}`, null, tk);
  test('GET /kyc', 200, r.status);

  r = await request('GET', `/kyc/${kycId}`, null, tk);
  test('GET /kyc/:id', 200, r.status);

  r = await request('POST', `/kyc/${kycId}/documents`, { documentType: 'PAN', fileUrl: '/docs/pan.pdf' }, tk);
  test('POST /kyc/:id/documents', 201, r.status);
  kycDocId = r.body?.data?.id;

  r = await request('GET', `/kyc/${kycId}/documents`, null, tk);
  test('GET /kyc/:id/documents', 200, r.status);

  r = await request('PATCH', `/kyc/${kycId}/verify`, { verifiedBy: 'admin' }, tk);
  test('PATCH /kyc/:id/verify', 200, r.status);

  // ============================================================
  // BENEFICIARY
  // ============================================================
  section('Beneficiary');
  r = await request('POST', '/beneficiary', { shopId, name: 'Shyam Das', accountNumber: '9876543210', bankName: 'SBI', ifscCode: 'SBIN0001234' }, tk);
  test('POST /beneficiary (create)', 201, r.status);
  beneficiaryId = r.body?.data?.id;

  r = await request('GET', `/beneficiary?shopId=${shopId}`, null, tk);
  test('GET /beneficiary', 200, r.status);

  r = await request('GET', `/beneficiary/${beneficiaryId}`, null, tk);
  test('GET /beneficiary/:id', 200, r.status);

  r = await request('PATCH', `/beneficiary/${beneficiaryId}/favourite`, {}, tk);
  test('PATCH /beneficiary/:id/favourite', 200, r.status);

  r = await request('DELETE', `/beneficiary/${beneficiaryId}`, {}, tk);
  test('DELETE /beneficiary/:id', 200, r.status);

  // ============================================================
  // RECONCILIATION
  // ============================================================
  section('Reconciliation');
  r = await request('POST', '/reconciliation', { date: new Date().toISOString(), shopId, serviceType: 'DMT' }, tk);
  test('POST /reconciliation (start)', 201, r.status);
  reconciliationId = r.body?.data?.id;

  r = await request('GET', `/reconciliation?shopId=${shopId}`, null, tk);
  test('GET /reconciliation', 200, r.status);

  r = await request('GET', `/reconciliation/${reconciliationId}`, null, tk);
  test('GET /reconciliation/:id', 200, r.status);

  r = await request('POST', `/reconciliation/${reconciliationId}/complete`, {}, tk);
  test('POST /reconciliation/:id/complete', 201, r.status);

  // ============================================================
  // REFUND
  // ============================================================
  section('Refund');
  r = await request('POST', '/refund', { shopId, originalTransactionId: finTxId, refundType: 'PARTIAL', amount: 500, reason: 'Customer requested' }, tk);
  test('POST /refund (request)', 201, r.status);
  refundId = r.body?.data?.id;

  r = await request('GET', `/refund?shopId=${shopId}`, null, tk);
  test('GET /refund', 200, r.status);

  r = await request('GET', `/refund/${refundId}`, null, tk);
  test('GET /refund/:id', 200, r.status);

  r = await request('PATCH', `/refund/${refundId}/approve`, { approvedBy: 'admin' }, tk);
  test('PATCH /refund/:id/approve', 200, r.status);

  r = await request('PATCH', `/refund/${refundId}/process`, { utrNumber: `REF${Date.now()}` }, tk);
  test('PATCH /refund/:id/process', 200, r.status);

  // ============================================================
  // FRAUD
  // ============================================================
  section('Fraud');
  r = await request('POST', '/fraud/rules', { name: 'High Amount Alert', ruleType: 'LIMIT', config: JSON.stringify({ max: 50000 }), severity: 'HIGH', action: 'ALERT' }, tk);
  test('POST /fraud/rules (create)', 201, r.status);
  fraudRuleId = r.body?.data?.id;

  r = await request('GET', '/fraud/rules', null, tk);
  test('GET /fraud/rules', 200, r.status);

  r = await request('GET', `/fraud/rules/${fraudRuleId}`, null, tk);
  test('GET /fraud/rules/:id', 200, r.status);

  r = await request('POST', '/fraud/blacklist', { entityType: 'MOBILE', entityValue: '9000099999', reason: 'Suspicious activity' }, tk);
  test('POST /fraud/blacklist (add)', 201, r.status);
  blacklistId = r.body?.data?.id;

  r = await request('GET', '/fraud/blacklist', null, tk);
  test('GET /fraud/blacklist', 200, r.status);

  r = await request('POST', '/fraud/check', { entityType: 'MOBILE', entityValue: '9000099999' }, tk);
  test('POST /fraud/check', 201, r.status);

  r = await request('GET', '/fraud/alerts', null, tk);
  test('GET /fraud/alerts', 200, r.status);

  r = await request('DELETE', `/fraud/blacklist/${blacklistId}`, null, tk);
  test('DELETE /fraud/blacklist/:id', 200, r.status);

  r = await request('DELETE', `/fraud/rules/${fraudRuleId}`, null, tk);
  test('DELETE /fraud/rules/:id', 200, r.status);

  // ============================================================
  // PROVIDERS
  // ============================================================
  section('Providers');
  r = await request('POST', '/providers/config', { provider: 'RAZORPAY', serviceType: 'PAYMENT', isActive: true }, tk);
  test('POST /providers/config (create)', 201, r.status);
  providerConfigId = r.body?.data?.id;

  r = await request('GET', '/providers/config', null, tk);
  test('GET /providers/config', 200, r.status);

  r = await request('GET', `/providers/config/${providerConfigId}`, null, tk);
  test('GET /providers/config/:id', 200, r.status);

  r = await request('POST', '/providers/logs', { provider: 'RAZORPAY', statusCode: 200, latency: 150, success: true }, tk);
  test('POST /providers/logs (create)', 201, r.status);
  providerLogId = r.body?.data?.id;

  r = await request('GET', '/providers/logs?provider=RAZORPAY', null, tk);
  test('GET /providers/logs', 200, r.status);

  r = await request('GET', '/providers/status', null, tk);
  test('GET /providers/status', 200, r.status);

  // ============================================================
  // FINANCIAL REPORTS
  // ============================================================
  section('Financial Reports');
  r = await request('GET', `/financial-reports/wallet?shopId=${shopId}`, null, tk);
  test('GET /financial-reports/wallet', 200, r.status);

  r = await request('GET', `/financial-reports/transactions?shopId=${shopId}`, null, tk);
  test('GET /financial-reports/transactions', 200, r.status);

  r = await request('GET', `/financial-reports/commission?shopId=${shopId}`, null, tk);
  test('GET /financial-reports/commission', 200, r.status);

  r = await request('GET', `/financial-reports/settlement?shopId=${shopId}`, null, tk);
  test('GET /financial-reports/settlement', 200, r.status);

  r = await request('GET', `/financial-reports/dmt?shopId=${shopId}`, null, tk);
  test('GET /financial-reports/dmt', 200, r.status);

  r = await request('GET', `/financial-reports/recharge?shopId=${shopId}`, null, tk);
  test('GET /financial-reports/recharge', 200, r.status);

  r = await request('GET', `/financial-reports/refund?shopId=${shopId}`, null, tk);
  test('GET /financial-reports/refund', 200, r.status);

  r = await request('GET', `/financial-reports/profit?shopId=${shopId}`, null, tk);
  test('GET /financial-reports/profit', 200, r.status);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n==========================================================');
  console.log(`  MODULE 3 RESULTS: ${passed} passed, ${failed} failed`);
  console.log('==========================================================');
  if (errors.length > 0) {
    console.log('\nFailed tests:');
    errors.forEach(e => console.log('  ' + e));
  }
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
