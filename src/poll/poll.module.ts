import { Module, forwardRef } from '@nestjs/common';
import { PollService } from './poll.service';
import { PollController } from './poll.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GatewayModule } from 'src/gateway/gateway.module';
import { PaymentModule } from 'src/payment/payment.module';

@Module({
  imports: [PrismaModule, forwardRef(() => GatewayModule), PaymentModule],
  controllers: [PollController],
  providers: [PollService],
  exports: [PollService],
})
export class PollModule {}
