import { Module } from '@nestjs/common';
import { MainGateway } from './main.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from '../chat/chat.module';
import { GuildModule } from '../guild/guild.module';
import { ActModule } from '../act/act.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    ChatModule,
    GuildModule,
    ActModule,
  ],
  providers: [MainGateway],
  exports: [MainGateway],
})
export class GatewayModule {}
