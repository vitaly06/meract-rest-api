import { Module } from '@nestjs/common';
import { GuildService } from './guild.service';
import { GuildController } from './guild.controller';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GuildChatGateway } from './guild.gateway';
import { JwtModule } from '@nestjs/jwt';
import { S3Module } from 'src/s3/s3.module';

@Module({
  imports: [
    S3Module,
    JwtModule.register({}),
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [GuildController],
  providers: [GuildService, GuildChatGateway],
  exports: [GuildService, GuildChatGateway],
})
export class GuildModule {}
