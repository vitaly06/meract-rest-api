import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { ActionChargeService } from './action-charge.service';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, ActionChargeService],
  exports: [ActionChargeService],
})
export class PaymentModule {}
