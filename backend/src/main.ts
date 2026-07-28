import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Stiqr API')
    .setDescription('Stiqr Enterprise SaaS Backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('roles', 'Role & permission management')
    .addTag('shops', 'Shop management')
    .addTag('sessions', 'Session management')
    .addTag('otp', 'OTP verification')
    .addTag('files', 'File upload')
    .addTag('notifications', 'Notification management')
    .addTag('health', 'Health monitoring')
    .addTag('tenants', 'Tenant management')
    .addTag('subscriptions', 'Subscription management')
    .addTag('branches', 'Branch management')
    .addTag('customers', 'Customer management')
    .addTag('suppliers', 'Supplier management')
    .addTag('employees', 'Employee management')
    .addTag('categories', 'Category management')
    .addTag('brands', 'Brand management')
    .addTag('units', 'Unit management')
    .addTag('products', 'Product management')
    .addTag('inventory', 'Inventory management')
    .addTag('warehouses', 'Warehouse management')
    .addTag('barcodes', 'Barcode & QR management')
    .addTag('imei', 'IMEI / Serial number management')
    .addTag('purchases', 'Purchase management')
    .addTag('sales', 'Sales management')
    .addTag('pos', 'POS billing')
    .addTag('payments', 'Payment management')
    .addTag('invoices', 'Invoice management')
    .addTag('expenses', 'Expense management')
    .addTag('income', 'Income management')
    .addTag('accounting', 'Accounting & ledgers')
    .addTag('tax', 'GST & Tax management')
    .addTag('loyalty', 'Loyalty & coupon management')
    .addTag('service-repair', 'Service & repair management')
    .addTag('warranty', 'Warranty management')
    .addTag('reports', 'Reports & dashboard')
    .addTag('wallet', 'Digital wallet management')
    .addTag('wallet-transactions', 'Wallet credit/debit transactions')
    .addTag('commission', 'Commission engine')
    .addTag('settlement', 'Settlement engine')
    .addTag('financial-transactions', 'Financial transaction processing')
    .addTag('dmt', 'Domestic Money Transfer')
    .addTag('aeps', 'Aadhaar Enabled Payment System')
    .addTag('bbps', 'Bill Payment System')
    .addTag('recharge', 'Recharge services')
    .addTag('payment-gateway', 'Payment gateway integration')
    .addTag('kyc', 'KYC management')
    .addTag('beneficiary', 'Beneficiary management')
    .addTag('reconciliation', 'Transaction reconciliation')
    .addTag('refund', 'Refund management')
    .addTag('fraud', 'Fraud detection & security')
    .addTag('providers', 'Provider integration')
    .addTag('financial-reports', 'Financial reports & analytics')
    .addTag('analytics', 'Analytics & business intelligence')
    .addTag('ai', 'AI assistant & predictions')
    .addTag('ocr', 'OCR & document processing')
    .addTag('search', 'Global search')
    .addTag('automation', 'Automation engine')
    .addTag('backup', 'Backup & restore')
    .addTag('admin', 'System administration')
    .addTag('plugins', 'Plugin management')
    .addTag('api-management', 'API keys, webhooks & OAuth')
    .addTag('security', 'Security center')
    .addTag('errors', 'Error tracking')
    .addTag('integrations', 'Integration hub')
    .addTag('localization', 'Multi-language support')
    .addTag('tenant-admin', 'Tenant administration & audit')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Stiqr Backend is running on http://localhost:${port}/api`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();
