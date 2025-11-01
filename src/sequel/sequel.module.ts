import { Module } from '@nestjs/common';
import { SequelService } from './sequel.service';
import { SequelController } from './sequel.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/sequels',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  ],
  controllers: [SequelController],
  providers: [SequelService],
})
export class SequelModule {}
