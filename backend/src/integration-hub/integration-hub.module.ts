import { Module } from '@nestjs/common';
import { IntegrationHubService } from './integration-hub.service';
import { IntegrationHubController } from './integration-hub.controller';

@Module({
  controllers: [IntegrationHubController],
  providers: [IntegrationHubService],
  exports: [IntegrationHubService],
})
export class IntegrationHubModule {}
