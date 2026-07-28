#!/bin/bash
BASE="https://stiqr-backend.ksangeeth76.workers.dev"

# Login
LOGIN=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@stiqr.com","password":"SuperAdmin@123"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
echo "Token obtained: ${TOKEN:0:40}..."

OK=0
FAIL=0

test_endpoint() {
  local method=$1 path=$2
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE$path" -H "Authorization: Bearer $TOKEN")
  if [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ]; then
    echo "  ✓ $method $path → $STATUS"
    OK=$((OK+1))
  else
    echo "  ✗ $method $path → $STATUS"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "=== Testing all endpoints ==="

# Auth
test_endpoint GET /api/auth/profile

# Core
test_endpoint GET /api/users
test_endpoint GET /api/roles
test_endpoint GET /api/permissions
test_endpoint GET /api/tenants
test_endpoint GET /api/settings
test_endpoint GET /api/notifications
test_endpoint GET /api/activity-logs

# Inventory
test_endpoint GET /api/products
test_endpoint GET /api/categories
test_endpoint GET /api/brands
test_endpoint GET /api/units
test_endpoint GET /api/stock
test_endpoint GET /api/stock-movements
test_endpoint GET /api/suppliers
test_endpoint GET /api/warehouses
test_endpoint GET /api/barcodes
test_endpoint GET /api/imei
test_endpoint GET /api/tax
test_endpoint GET /api/coupons
test_endpoint GET /api/inventory
test_endpoint GET /api/inventory/summary
test_endpoint GET /api/product-variants
test_endpoint GET /api/product-images

# POS / Sales
test_endpoint GET /api/sales
test_endpoint GET /api/sale-items
test_endpoint GET /api/purchases
test_endpoint GET /api/purchase-items
test_endpoint GET /api/invoices
test_endpoint GET /api/pos/sessions
test_endpoint GET /api/payments
test_endpoint GET /api/expenses
test_endpoint GET /api/income
test_endpoint GET /api/service-repair
test_endpoint GET /api/service-repair-items

# Financial
test_endpoint GET /api/wallets
test_endpoint GET /api/wallet-transactions
test_endpoint GET /api/wallet-ledgers
test_endpoint GET /api/commission/rules
test_endpoint GET /api/commission/slabs
test_endpoint GET /api/commission/ledger
test_endpoint GET /api/settlements
test_endpoint GET /api/dmt/senders
test_endpoint GET /api/dmt/beneficiaries
test_endpoint GET /api/dmt/transfers
test_endpoint GET /api/aeps/transactions
test_endpoint GET /api/bbps/billers
test_endpoint GET /api/bbps/payments
test_endpoint GET /api/recharges
test_endpoint GET /api/beneficiary
test_endpoint GET /api/kyc
test_endpoint GET /api/kyc/documents
test_endpoint GET /api/financial-transactions
test_endpoint GET /api/transaction-logs
test_endpoint GET /api/payment-gateway
test_endpoint GET /api/payment-webhooks
test_endpoint GET /api/reconciliations
test_endpoint GET /api/refunds
test_endpoint GET /api/fraud/rules
test_endpoint GET /api/fraud/alerts
test_endpoint GET /api/fraud/blacklist
test_endpoint GET /api/providers/configs
test_endpoint GET /api/providers/logs
test_endpoint GET /api/loyalty/programs
test_endpoint GET /api/loyalty/transactions
test_endpoint GET /api/subscriptions

# Analytics
test_endpoint GET /api/analytics/events
test_endpoint GET /api/analytics/dashboards
test_endpoint GET /api/analytics/widgets
test_endpoint GET /api/analytics/summary
test_endpoint GET /api/analytics/trends
test_endpoint GET /api/ai-assistant/conversations
test_endpoint GET /api/ai-assistant/predictions
test_endpoint GET /api/ocr
test_endpoint GET /api/automation/rules
test_endpoint GET /api/automation/executions
test_endpoint GET /api/automation/jobs
test_endpoint GET /api/automation/stats
test_endpoint GET /api/localization/translations
test_endpoint GET /api/backups
test_endpoint GET /api/system-admin/feature-flags
test_endpoint GET /api/system-admin/announcements
test_endpoint GET /api/system-admin/info

# Admin
test_endpoint GET /api/plugins
test_endpoint GET /api/api-management/keys
test_endpoint GET /api/api-management/webhooks
test_endpoint GET /api/api-management/webhook-deliveries
test_endpoint GET /api/security-center/alerts
test_endpoint GET /api/security-center/blocked-ips
test_endpoint GET /api/security-center/stats
test_endpoint GET /api/error-tracking
test_endpoint GET /api/error-tracking/stats
test_endpoint GET /api/integration-hub
test_endpoint GET /api/integration-hub/logs
test_endpoint GET /api/oauth/clients
test_endpoint GET /api/tenant-admin/performance
test_endpoint GET /api/tenant-admin/audit-trail
test_endpoint GET /api/tenant-admin/usage
test_endpoint GET /api/tenant-admin/data-retention
test_endpoint GET /api/audit-logs
test_endpoint GET /api/files
test_endpoint GET /api/reports
test_endpoint GET /api/reports/dashboard
test_endpoint GET /api/financial-reports/wallet
test_endpoint GET /api/financial-reports/transactions
test_endpoint GET /api/financial-reports/commissions
test_endpoint GET /api/financial-reports/settlements
test_endpoint GET /api/financial-reports/dmt
test_endpoint GET /api/financial-reports/recharge
test_endpoint GET /api/financial-reports/refunds
test_endpoint GET /api/financial-reports/profit-loss

echo ""
echo "=============================="
echo "RESULTS: $OK passed, $FAIL failed"
echo "TOTAL: $((OK+FAIL)) endpoints tested"
echo "=============================="
