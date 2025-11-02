import { Module } from '@nestjs/common';
import { OutroService } from './outro.service';
import { OutroController } from './outro.controller';
import { diskStorage } from 'multer';
import * as path from 'path';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/outros',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  ],
  controllers: [OutroController],
  providers: [OutroService],
})
export class OutroModule {}
