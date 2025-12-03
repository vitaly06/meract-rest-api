import { Module, forwardRef } from '@nestjs/common';
import { MainGateway } from './main.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from '../chat/chat.module';
import { GuildModule } from '../guild/guild.module';
import { ActModule } from '../act/act.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    PrismaModule,
    forwardRef(() => ChatModule),
    forwardRef(() => GuildModule),
    forwardRef(() => ActModule),
  ],
  providers: [MainGateway],
  exports: [MainGateway],
})
export class GatewayModule {}
