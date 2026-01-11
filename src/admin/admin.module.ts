import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { GatewayModule } from 'src/gateway/gateway.module';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [GatewayModule, ChatModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
