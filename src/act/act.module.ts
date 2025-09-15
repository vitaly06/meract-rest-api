import { Module } from '@nestjs/common';
import { ActService } from './act.service';
import { ActController } from './act.controller';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot(), // Добавили для загрузки .env
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/acts',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  ],
  controllers: [ActController],
  providers: [ActService],
})
export class ActModule {}
