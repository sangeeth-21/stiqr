import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType } from './create-subscription.dto';

export enum DurationType {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export class RenewSubscriptionDto {
  @ApiPropertyOptional({ enum: PlanType })
  @IsOptional()
  @IsEnum(PlanType)
  plan?: PlanType;

  @ApiPropertyOptional({ enum: DurationType })
  @IsOptional()
  @IsEnum(DurationType)
  duration?: DurationType;
}
