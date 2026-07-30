import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = join(__dirname, 'backend/src/cf/routes');
const OUTPUT = join(__dirname, 'stiqr-backend.postman_collection.json');
const BASE_URL_VAR = '{{baseUrl}}';

const files = [
  'auth.ts', 'admin.ts', 'core.ts', 'staff.ts', 'subscriptions.ts', 'upload.ts',
  'module2/m2-catalog.ts', 'module2/m2-crm.ts', 'module2/m2-finance.ts',
  'module2/m2-inventory.ts', 'module2/m2-reports.ts', 'module2/m2-transactions.ts',
  'module3/m3-reports.ts', 'module3/m3-services.ts',
  'module4/m4-ai-health-platform-integrations.ts',
  'module4/m4-branches-files-backup.ts',
  'module4/m4-dashboard-reports.ts',
  'module4/m4-notifications-subscriptions.ts',
  'module4/m4-scheduler-import-export-license.ts',
  'module4/m4-support-settings-apikeys-webhooks.ts',
];

// [pathRegex, topFolder, subFolder]
const RULES = [
  // Auth
  [/^\/api\/auth\//, '🔐 Authentication', null],

  // Users
  [/^\/api\/users/, '👤 Users', 'Users'],
  [/^\/api\/roles/, '👤 Users', 'Roles'],
  [/^\/api\/permissions/, '👤 Users', 'Permissions'],
  [/^\/api\/staff/, '👤 Users', 'Staff'],

  // Platform Admin
  [/^\/api\/admin\/dashboard/, '🏢 Platform Admin', 'Dashboard'],
  [/^\/api\/admin\/shops\//, '🏢 Platform Admin', 'Shops'],
  [/^\/api\/admin\/shops$/, '🏢 Platform Admin', 'Shops'],
  [/^\/api\/admin\/subscriptions/, '🏢 Platform Admin', 'Subscriptions'],
  [/^\/api\/admin\/login-credentials/, '🏢 Platform Admin', 'Login Credentials'],
  [/^\/api\/admin\/payments/, '🏢 Platform Admin', 'Payments'],
  [/^\/api\/platform\/dashboard/, '🏢 Platform Admin', 'Dashboard'],
  [/^\/api\/platform\/shops\//, '🏢 Platform Admin', 'Shops'],
  [/^\/api\/platform\/shops$/, '🏢 Platform Admin', 'Shops'],
  [/^\/api\/platform\/revenue/, '🏢 Platform Admin', 'Platform Reports'],
  [/^\/api\/platform\/users/, '🏢 Platform Admin', 'Platform Reports'],
  [/^\/api\/platform\/subscriptions/, '🏢 Platform Admin', 'Subscriptions'],
  [/^\/api\/platform\/maintenance/, '🏢 Platform Admin', 'Platform Settings'],
  [/^\/api\/platform\/features/, '🏢 Platform Admin', 'Platform Settings'],
  [/^\/api\/platform\/analytics/, '🏢 Platform Admin', 'Platform Reports'],
  [/^\/api\/platform\/logs/, '🏢 Platform Admin', 'Platform Reports'],

  // Shop
  [/^\/api\/shop\/settings/, '🏪 Shop', 'Shop Settings'],
  [/^\/api\/shop\/business-hours/, '🏪 Shop', 'Business Hours'],
  [/^\/api\/shop\/tax/, '🏪 Shop', 'GST'],
  [/^\/api\/shop\/invoice/, '🏪 Shop', 'Invoice'],
  [/^\/api\/shop\/printer/, '🏪 Shop', 'Printer'],
  [/^\/api\/shop\/logo/, '🏪 Shop', 'Branding'],
  [/^\/api\/shop$/, '🏪 Shop', 'Shop Profile'],
  [/^\/api\/shop\//, '🏪 Shop', 'Shop Settings'],

  // Branches
  [/^\/api\/branches/, '🏬 Branches', null],

  // Categories
  [/^\/api\/categories/, '📦 Categories', null],

  // Brands
  [/^\/api\/brands/, '🏷 Brands', null],
  [/^\/api\/units/, '📱 Products', 'Variants'],
  [/^\/api\/tax-rules/, '🏪 Shop', 'Shop Settings'],

  // Products
  [/^\/api\/products\/images/, '📱 Products', 'Images'],
  [/^\/api\/products\/import/, '📱 Products', 'Bulk Import'],
  [/^\/api\/products\/export/, '📱 Products', 'Bulk Export'],
  [/^\/api\/products\/search/, '📱 Products', 'Search'],
  [/^\/api\/products\/barcode/, '📱 Products', 'Barcode'],
  [/^\/api\/products/, '📱 Products', 'CRUD'],

  // Variants
  [/^\/api\/variants/, '📱 Products', 'Variants'],

  // IMEI
  [/^\/api\/imei/, '📱 IMEI & Serial Numbers', null],

  // Inventory
  [/^\/api\/inventory\/adjustments/, '📊 Inventory', 'Adjustments'],
  [/^\/api\/inventory\/transfers/, '📊 Inventory', 'Transfers'],
  [/^\/api\/inventory\/damage/, '📊 Inventory', 'Damage'],
  [/^\/api\/inventory\/returns/, '📊 Inventory', 'Returns'],
  [/^\/api\/warehouses/, '📊 Inventory', 'Warehouse'],
  [/^\/api\/inventory\/warehouse/, '📊 Inventory', 'Warehouse'],
  [/^\/api\/inventory\/count/, '📊 Inventory', 'Stock Count'],
  [/^\/api\/qr\//, '📊 Inventory', 'Stock'],
  [/^\/api\/inventory/, '📊 Inventory', 'Stock'],
  [/^\/api\/barcode/, '📊 Inventory', 'Stock'],

  // Purchases
  [/^\/api\/purchases\/orders/, '🛒 Purchases', 'Purchase Orders'],
  [/^\/api\/purchases\/receiving/, '🛒 Purchases', 'Receiving'],
  [/^\/api\/purchases\/returns/, '🛒 Purchases', 'Returns'],
  [/^\/api\/purchases\/payments/, '🛒 Purchases', 'Payments'],
  [/^\/api\/purchases\/invoices/, '🛒 Purchases', 'Invoices'],
  [/^\/api\/purchases/, '🛒 Purchases', 'Purchase Orders'],

  // Customers
  [/^\/api\/customers\/addresses/, '👥 Customers', 'Addresses'],
  [/^\/api\/customers\/credit/, '👥 Customers', 'Credit'],
  [/^\/api\/customers\/loyalty/, '👥 Customers', 'Loyalty'],
  [/^\/api\/customers\/purchases/, '👥 Customers', 'Purchase History'],
  [/^\/api\/customers\/services/, '👥 Customers', 'Service History'],
  [/^\/api\/customers/, '👥 Customers', 'Customer CRUD'],

  // Suppliers
  [/^\/api\/suppliers/, '🚚 Suppliers', null],

  // Sales
  [/^\/api\/sales\/returns/, '💳 Sales', 'Returns'],
  [/^\/api\/sales\/refunds/, '💳 Sales', 'Refunds'],
  [/^\/api\/sales\/invoices/, '💳 Sales', 'Invoice'],
  [/^\/api\/sales/, '💳 Sales', 'POS'],
  [/^\/api\/pos/, '💳 Sales', 'POS'],
  [/^\/api\/payments/, '💳 Sales', 'Payments'],
  [/^\/api\/discounts/, '💳 Sales', 'Discounts'],
  [/^\/api\/coupons/, '💳 Sales', 'Coupons'],
  [/^\/api\/warranties/, '💳 Sales', 'Warranty'],
  [/^\/api\/warranty/, '💳 Sales', 'Warranty'],

  // Income
  [/^\/api\/income/, '💰 Income', null],

  // Expenses
  [/^\/api\/expenses/, '💸 Expenses', null],

  // Service Center
  [/^\/api\/services\/checkin/, '🔧 Service Center', 'Device Check-In'],
  [/^\/api\/device-checkin/, '🔧 Service Center', 'Device Check-In'],
  [/^\/api\/services\/job-cards/, '🔧 Service Center', 'Job Cards'],
  [/^\/api\/job-cards/, '🔧 Service Center', 'Job Cards'],
  [/^\/api\/services\/estimates/, '🔧 Service Center', 'Estimates'],
  [/^\/api\/estimates/, '🔧 Service Center', 'Estimates'],
  [/^\/api\/services\/approvals/, '🔧 Service Center', 'Customer Approval'],
  [/^\/api\/approvals/, '🔧 Service Center', 'Customer Approval'],
  [/^\/api\/services\/repair/, '🔧 Service Center', 'Repair Workflow'],
  [/^\/api\/repair\//, '🔧 Service Center', 'Repair Workflow'],
  [/^\/api\/services\/parts/, '🔧 Service Center', 'Spare Parts'],
  [/^\/api\/service-parts/, '🔧 Service Center', 'Spare Parts'],
  [/^\/api\/services\/invoices/, '🔧 Service Center', 'Service Invoice'],
  [/^\/api\/service-invoices/, '🔧 Service Center', 'Service Invoice'],
  [/^\/api\/services\/payments/, '🔧 Service Center', 'Service Payment'],
  [/^\/api\/service-payments/, '🔧 Service Center', 'Service Payment'],
  [/^\/api\/services\/delivery/, '🔧 Service Center', 'Delivery'],
  [/^\/api\/deliveries/, '🔧 Service Center', 'Delivery'],
  [/^\/api\/services\/timeline/, '🔧 Service Center', 'Timeline'],
  [/^\/api\/service-timeline/, '🔧 Service Center', 'Timeline'],
  [/^\/api\/services\/tracking/, '🔧 Service Center', 'Timeline'],
  [/^\/api\/tracking/, '🔧 Service Center', 'Timeline'],
  [/^\/api\/services\/dashboard/, '🔧 Service Center', 'Timeline'],
  [/^\/api\/service-dashboard/, '🔧 Service Center', 'Timeline'],
  [/^\/api\/services\/reports/, '🔧 Service Center', 'Timeline'],
  [/^\/api\/service-reports/, '🔧 Service Center', 'Timeline'],
  [/^\/api\/services\/communication/, '🔧 Service Center', 'Timeline'],
  [/^\/api\/communications/, '🔧 Service Center', 'Timeline'],
  [/^\/api\/services\//, '🔧 Service Center', 'Service Tickets'],
  [/^\/api\/services$/, '🔧 Service Center', 'Service Tickets'],

  // Technicians
  [/^\/api\/technicians/, '👨‍🔧 Technicians', null],

  // Notifications
  [/^\/api\/notifications/, '📢 Notifications', null],

  // File Manager
  [/^\/api\/upload/, '📁 File Manager', null],
  [/^\/api\/files/, '📁 File Manager', null],

  // AI Assistant
  [/^\/api\/ai\/chat/, '🤖 AI Assistant', 'Chat'],
  [/^\/api\/ai\/ocr/, '🤖 AI Assistant', 'OCR'],
  [/^\/api\/ai\/forecast/, '🤖 AI Assistant', 'Forecast'],
  [/^\/api\/ai\/search/, '🤖 AI Assistant', 'Product Search'],
  [/^\/api\/ai\/history/, '🤖 AI Assistant', 'AI History'],
  [/^\/api\/ai\//, '🤖 AI Assistant', 'Chat'],

  // Reports
  [/^\/api\/reports-advanced/, '📊 Reports', null],
  [/^\/api\/dashboard-analytics/, '📊 Reports', null],
  [/^\/api\/dashboard\//, '📈 Dashboard', null],
  [/^\/api\/dashboard$/, '📈 Dashboard', null],
  [/^\/api\/reports\//, '📊 Reports', null],
  [/^\/api\/reports$/, '📊 Reports', null],

  // Import/Export
  [/^\/api\/import/, '🔄 Import & Export', null],
  [/^\/api\/export/, '🔄 Import & Export', null],

  // Integrations
  [/^\/api\/integrations/, '🔗 Integrations', null],
  [/^\/api\/webhooks/, '🔗 Integrations', null],

  // API Keys
  [/^\/api\/api-keys/, '🔑 API Keys', null],

  // Settings
  [/^\/api\/settings-advanced/, '⚙ System Settings', null],
  [/^\/api\/settings/, '⚙ System Settings', null],

  // Subscriptions
  [/^\/api\/subscriptions/, '💼 Subscription & Licensing', null],
  [/^\/api\/subscription/, '💼 Subscription & Licensing', null],

  // Support
  [/^\/api\/support/, '🎫 Support Tickets', null],

  // Audit
  [/^\/api\/audit/, '📝 Audit Logs', null],

  // Activity
  [/^\/api\/activity/, '📋 Activity Logs', null],

  // Scheduler
  [/^\/api\/scheduler/, '📅 Scheduler & Automation', null],

  // Health
  [/^\/api\/health/, '❤️ Health Monitoring', null],

  // Backup
  [/^\/api\/backup/, '💾 Backup & Restore', null],

  // License
  [/^\/api\/license/, '💼 Subscription & Licensing', null],
];

function getBody(method, path) {
  const bodies = {
    'POST /api/auth/login': JSON.stringify({ email: 'admin@example.com', password: 'yourpassword' }, null, 2),
    'POST /api/auth/register': JSON.stringify({ shopName: 'MyShop', ownerName: 'Owner Name', email: 'owner@example.com', mobile: '9999999999', password: 'Secure@123' }, null, 2),
    'POST /api/auth/forgot-password': JSON.stringify({ email: 'user@example.com' }, null, 2),
    'POST /api/auth/reset-password': JSON.stringify({ token: 'reset-token-here', password: 'NewPass@123' }, null, 2),
    'POST /api/auth/refresh': JSON.stringify({ refreshToken: 'your-refresh-token' }, null, 2),
    'PATCH /api/auth/change-password': JSON.stringify({ oldPassword: 'current-password', newPassword: 'new-password' }, null, 2),
    'POST /api/auth/send-otp': JSON.stringify({ email: 'user@example.com', mobile: '9999999999' }, null, 2),
    'POST /api/auth/verify-otp': JSON.stringify({ email: 'user@example.com', code: '123456' }, null, 2),
  };
  return bodies[`${method} ${path}`] || null;
}

function getFolder(path) {
  for (const [re, top, sub] of RULES) {
    if (re.test(path)) return { top, sub };
  }
  const seg = path.split('/')[2];
  const name = seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : 'Other';
  return { top: name, sub: null };
}

function classifyFileAuth(fileName, middlewareText) {
  if (fileName === 'auth.ts') {
    const hasAuth = middlewareText.includes('requireAuth');
    return hasAuth ? { needsAuth: true, role: '', headerType: 'jwt' } : { needsAuth: false, role: '', headerType: 'none' };
  }
  if (fileName === 'admin.ts') {
    return { needsAuth: true, role: 'SUPER_ADMIN', headerType: 'adminJwt' };
  }
  const isSuperAdmin = middlewareText.includes("requireRoles('SUPER_ADMIN')") || middlewareText.includes('requireRoles("SUPER_ADMIN")') || middlewareText.includes("requireOrgRole('SUPER_ADMIN')");
  const isPlatformAdmin = middlewareText.includes("requireRoles('PLATFORM_ADMIN')") || middlewareText.includes('requireRoles("PLATFORM_ADMIN")') || middlewareText.includes("requireOrgRole('PLATFORM_ADMIN')");
  const hasLocalAdminMiddleware = /\b\w*[Aa]dmin\b/.test(middlewareText);
  if (isSuperAdmin) return { needsAuth: true, role: 'SUPER_ADMIN', headerType: 'adminJwt' };
  if (isPlatformAdmin || hasLocalAdminMiddleware) return { needsAuth: true, role: 'PLATFORM_ADMIN', headerType: 'adminJwt' };
  return { needsAuth: true, role: '', headerType: 'jwt' };
}

function parseFile(filePath, baseName) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const endpoints = [];
  let commentBuffer = '';
  const routeStartRe = /(?:\bapp|router|r)\s*\.\s*(get|post|put|patch|delete)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cMatch = line.match(/^\s*\/\/\s*(.+)/);
    if (cMatch) {
      commentBuffer = (commentBuffer + ' ' + cMatch[1]).trim();
      if (commentBuffer.length > 150) commentBuffer = '';
      continue;
    }
    const startMatch = line.match(routeStartRe);
    if (!startMatch) continue;
    const method = startMatch[1].toUpperCase();
    const routeStartIdx = line.indexOf(startMatch[0]);
    const afterCall = line.slice(routeStartIdx + startMatch[0].length);
    const pathMatch = afterCall.match(/^\s*'(\/api\/[^']+)'\s*,?\s*/) || afterCall.match(/^\s*"(\/api\/[^"]+)"\s*,?\s*/);
    if (!pathMatch) continue;
    const path = pathMatch[1];
    let afterPath = afterCall.slice(pathMatch[0].length);
    let middlewareText = '';
    let handlerStartIdx = afterPath.search(/\basync\s*\(/);
    if (handlerStartIdx >= 0) {
      middlewareText = afterPath.slice(0, handlerStartIdx);
    } else {
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        const hIdx = nextLine.search(/\basync\s*\(/);
        if (hIdx >= 0) { middlewareText += '\n' + nextLine.slice(0, hIdx); break; }
        middlewareText += '\n' + nextLine;
        j++;
      }
    }
    const auth = classifyFileAuth(baseName, middlewareText);
    const { top, sub } = getFolder(path);
    const name = commentBuffer || `${method} ${path}`;
    commentBuffer = '';
    endpoints.push({ method, path, name, folder: top, sub, ...auth });
  }
  return endpoints;
}

function buildRequest(ep) {
  const headers = [];
  if (ep.headerType === 'adminJwt') headers.push({ key: 'Authorization', value: 'Bearer {{adminJwtToken}}', type: 'text' });
  else if (ep.headerType === 'jwt') headers.push({ key: 'Authorization', value: 'Bearer {{jwtToken}}', type: 'text' });
  const roleStr = ep.role ? ` | Role: ${ep.role}` : '';
  const authStr = ep.headerType === 'none' ? 'Public' : `JWT Required${ep.role ? ` (${ep.role})` : ''}`;
  const body = getBody(ep.method, ep.path);
  const req = {
    method: ep.method,
    header: headers.length > 0 ? headers : undefined,
    url: { raw: `${BASE_URL_VAR}${ep.path}`, host: [BASE_URL_VAR], path: ep.path.split('/').filter(Boolean) },
    description: `Method: ${ep.method}\nPath: ${ep.path}\nAuth: ${authStr}`
  };
  if (body) {
    req.body = {
      mode: 'raw',
      raw: body,
      options: { raw: { language: 'json' } }
    };
  }
  return { name: `${ep.method} ${ep.path}`, request: req, response: [] };
}

function buildCollection() {
  const allEndpoints = [];
  let total = 0;
  for (const file of files) {
    const fullPath = join(ROUTES_DIR, file);
    if (!existsSync(fullPath)) continue;
    const result = parseFile(fullPath, file);
    if (result.length === 0) continue;
    total += result.length;
    console.log(`  ${file}: ${result.length} endpoints`);
    allEndpoints.push(...result);
  }

  // Group by top folder then subfolder
  const groups = {};
  for (const ep of allEndpoints) {
    const key = ep.folder;
    if (!groups[key]) groups[key] = {};
    const subKey = ep.sub || '__main__' ;
    if (!groups[key][subKey]) groups[key][subKey] = [];
    groups[key][subKey].push(ep);
  }

  const folderOrder = [
    '🔐 Authentication',
    '👤 Users',
    '🏢 Platform Admin',
    '🏪 Shop',
    '🏬 Branches',
    '📦 Categories',
    '🏷 Brands',
    '📱 Products',
    '📱 IMEI & Serial Numbers',
    '📊 Inventory',
    '🛒 Purchases',
    '👥 Customers',
    '🚚 Suppliers',
    '💳 Sales',
    '💰 Income',
    '💸 Expenses',
    '🔧 Service Center',
    '👨‍🔧 Technicians',
    '📢 Notifications',
    '📁 File Manager',
    '🤖 AI Assistant',
    '📈 Dashboard',
    '📊 Reports',
    '🔄 Import & Export',
    '🔗 Integrations',
    '🔑 API Keys',
    '⚙ System Settings',
    '💼 Subscription & Licensing',
    '🎫 Support Tickets',
    '📝 Audit Logs',
    '📋 Activity Logs',
    '📅 Scheduler & Automation',
    '❤️ Health Monitoring',
    '💾 Backup & Restore',
  ];

  const subFolderOrder = {
    '👤 Users': ['Users', 'Roles', 'Permissions', 'Staff'],
    '🏢 Platform Admin': ['Dashboard', 'Shops', 'Subscriptions', 'Login Credentials', 'Payments', 'Platform Reports', 'Platform Settings'],
    '🏪 Shop': ['Shop Profile', 'Shop Settings', 'Business Hours', 'GST', 'Invoice', 'Printer', 'Branding'],
    '📱 Products': ['CRUD', 'Images', 'Bulk Import', 'Bulk Export', 'Search', 'Barcode', 'Variants'],
    '📊 Inventory': ['Stock', 'Adjustments', 'Transfers', 'Damage', 'Returns', 'Warehouse', 'Stock Count'],
    '🛒 Purchases': ['Purchase Orders', 'Receiving', 'Returns', 'Payments', 'Invoices'],
    '👥 Customers': ['Customer CRUD', 'Addresses', 'Credit', 'Loyalty', 'Purchase History', 'Service History'],
    '💳 Sales': ['POS', 'Invoice', 'Returns', 'Refunds', 'Payments', 'Coupons', 'Discounts', 'Warranty'],
    '🔧 Service Center': ['Service Tickets', 'Device Check-In', 'Job Cards', 'Estimates', 'Customer Approval', 'Repair Workflow', 'Spare Parts', 'Service Invoice', 'Service Payment', 'Delivery', 'Timeline'],
    '🤖 AI Assistant': ['Chat', 'OCR', 'Forecast', 'Product Search', 'AI History'],
  };

  const items = [];
  const used = new Set();

  for (const folder of folderOrder) {
    if (!groups[folder]) continue;
    used.add(folder);
    const subMap = groups[folder];
    const order = subFolderOrder[folder] || [];
    const subItems = [];

    for (const sub of order) {
      if (!subMap[sub]) continue;
      const eps = subMap[sub];
      const reqs = eps.map(ep => buildRequest(ep));
      subItems.push({ name: sub, item: reqs });
    }

    // Unmatched items (no subfolder) go directly in the folder
    if (subMap['__main__']) {
      const eps = subMap['__main__'];
      const reqs = eps.map(ep => buildRequest(ep));
      subItems.unshift(...reqs);
    }

    items.push({ name: folder, item: subItems });
  }

  return { total, items };
}

function main() {
  console.log('Generating Postman collection...\n');
  const { total, items } = buildCollection();
  console.log(`\nTotal endpoints: ${total}`);

  const collection = {
    info: {
      name: 'StiQR Backend API',
      description: `StiQR Backend API Collection — Cloudflare Workers Deployment

Base URL: https://stiqr-backend.ksangeeth76.workers.dev

Authentication:
- Most endpoints require JWT in Authorization header: Bearer {{jwtToken}}
- Admin endpoints require {{adminJwtToken}} with appropriate role (SUPER_ADMIN or PLATFORM_ADMIN)
- Public endpoints (register, login, forgot/reset password, OTP): no auth required

Variables:
- baseUrl: https://stiqr-backend.ksangeeth76.workers.dev
- jwtToken: Your JWT token (regular user auth)
- adminJwtToken: Your JWT token with admin role`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      _exporter_id: 'stiqr'
    },
    item: items,
    variable: [
      { key: 'baseUrl', value: 'https://stiqr-backend.ksangeeth76.workers.dev', type: 'string' },
      { key: 'jwtToken', value: '', type: 'string' },
      { key: 'adminJwtToken', value: '', type: 'string' }
    ]
  };

  writeFileSync(OUTPUT, JSON.stringify(collection, null, 2), 'utf-8');
  console.log(`Collection written to: ${OUTPUT}`);
}

main();
