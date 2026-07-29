import { PartialType } from '@nestjs/swagger';
import { AdminCreateSubscriptionDto } from './create-admin-subscription.dto';

export class AdminUpdateSubscriptionDto extends PartialType(AdminCreateSubscriptionDto) {}
