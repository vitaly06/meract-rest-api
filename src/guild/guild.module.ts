import { Module } from '@nestjs/common';
import { GuildService } from './guild.service';
import { GuildController } from './guild.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { GuildChatGateway } from './guild.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/guilds',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
    JwtModule.register({}),
  ],
  controllers: [GuildController],
  providers: [GuildService, GuildChatGateway],
  exports: [GuildService, GuildChatGateway],
})
export class GuildModule {}
