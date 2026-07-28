import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { SessionsModule } from './sessions/sessions.module';
import { OtpModule } from './otp/otp.module';
import { FilesModule } from './files/files.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { LoggingModule } from './logging/logging.module';
import { RedisModule } from './redis/redis.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { HealthModule } from './health/health.module';
import { ShopsModule } from './shops/shops.module';
import { SettingsModule } from './settings/settings.module';
import { TenantsModule } from './tenants/tenants.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { BranchesModule } from './branches/branches.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { EmployeesModule } from './employees/employees.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { UnitsModule } from './units/units.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { BarcodesModule } from './barcodes/barcodes.module';
import { ImeiModule } from './imei/imei.module';
import { PurchasesModule } from './purchases/purchases.module';
import { SalesModule } from './sales/sales.module';
import { PosModule } from './pos/pos.module';
import { PaymentsModule } from './payments/payments.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ExpensesModule } from './expenses/expenses.module';
import { IncomeModule } from './income/income.module';
import { AccountingModule } from './accounting/accounting.module';
import { TaxModule } from './tax/tax.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { ServiceRepairModule } from './service-repair/service-repair.module';
import { WarrantyModule } from './warranty/warranty.module';
import { ReportsModule } from './reports/reports.module';
import { KycModule } from './kyc/kyc.module';
import { BeneficiaryModule } from './beneficiary/beneficiary.module';
import { PaymentGatewayModule } from './payment-gateway/payment-gateway.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { RefundModule } from './refund/refund.module';
import { WalletsModule } from './wallets/wallets.module';
import { WalletTransactionsModule } from './wallet-transactions/wallet-transactions.module';
import { CommissionModule } from './commission/commission.module';
import { SettlementModule } from './settlement/settlement.module';
import { FinancialTransactionsModule } from './financial-transactions/financial-transactions.module';
import { DmtModule } from './dmt/dmt.module';
import { AepsModule } from './aeps/aeps.module';
import { BbpsModule } from './bbps/bbps.module';
import { RechargeModule } from './recharge/recharge.module';
import { FraudModule } from './fraud/fraud.module';
import { ProvidersModule } from './providers/providers.module';
import { FinancialReportsModule } from './financial-reports/financial-reports.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { OcrModule } from './ocr/ocr.module';
import { SearchModule } from './search/search.module';
import { AutomationModule } from './automation/automation.module';
import { BackupModule } from './backup/backup.module';
import { SystemAdminModule } from './system-admin/system-admin.module';
import { PluginsModule } from './plugins/plugins.module';
import { ApiManagementModule } from './api-management/api-management.module';
import { SecurityCenterModule } from './security-center/security-center.module';
import { ErrorTrackingModule } from './error-tracking/error-tracking.module';
import { IntegrationHubModule } from './integration-hub/integration-hub.module';
import { LocalizationModule } from './localization/localization.module';
import { TenantAdminModule } from './tenant-admin/tenant-admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    RolesModule,
    SessionsModule,
    OtpModule,
    FilesModule,
    NotificationsModule,
    AuditModule,
    LoggingModule,
    SchedulerModule,
    HealthModule,
    ShopsModule,
    SettingsModule,
    TenantsModule,
    SubscriptionsModule,
    BranchesModule,
    CustomersModule,
    SuppliersModule,
    EmployeesModule,
    CategoriesModule,
    BrandsModule,
    UnitsModule,
    ProductsModule,
    InventoryModule,
    WarehousesModule,
    BarcodesModule,
    ImeiModule,
    PurchasesModule,
    SalesModule,
    PosModule,
    PaymentsModule,
    InvoicesModule,
    ExpensesModule,
    IncomeModule,
    AccountingModule,
    TaxModule,
    LoyaltyModule,
    ServiceRepairModule,
    WarrantyModule,
    ReportsModule,
    KycModule,
    BeneficiaryModule,
    PaymentGatewayModule,
    ReconciliationModule,
    RefundModule,
    WalletsModule,
    WalletTransactionsModule,
    CommissionModule,
    SettlementModule,
    FinancialTransactionsModule,
    DmtModule,
    AepsModule,
    BbpsModule,
    RechargeModule,
    FraudModule,
    ProvidersModule,
    FinancialReportsModule,
    AnalyticsModule,
    AiAssistantModule,
    OcrModule,
    SearchModule,
    AutomationModule,
    BackupModule,
    SystemAdminModule,
    PluginsModule,
    ApiManagementModule,
    SecurityCenterModule,
    ErrorTrackingModule,
    IntegrationHubModule,
    LocalizationModule,
    TenantAdminModule,
  ],
})
export class AppModule {}
