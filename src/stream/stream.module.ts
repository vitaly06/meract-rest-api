import { Module } from '@nestjs/common';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { ConfigModule } from '@nestjs/config'; // Добавили для загрузки .env

@Module({
  imports: [
    ConfigModule.forRoot(), // Добавили для загрузки .env
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/streams',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  ],
  controllers: [StreamController],
  providers: [StreamService],
})
export class StreamModule {}