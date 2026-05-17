import { Module, forwardRef } from '@nestjs/common';
import { MainGateway } from './main.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from '../chat/chat.module';
import { GuildModule } from '../guild/guild.module';
import { ActModule } from '../act/act.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PollModule } from '../poll/poll.module';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    PrismaModule,
    forwardRef(() => ChatModule),
    forwardRef(() => GuildModule),
    forwardRef(() => ActModule),
    forwardRef(() => PollModule),
    GeoModule,
  ],
  providers: [MainGateway],
  exports: [MainGateway],
})
export class GatewayModule {}
