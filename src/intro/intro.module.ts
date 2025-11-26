import { Module } from '@nestjs/common';
import { IntroService } from './intro.service';
import { IntroController } from './intro.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/intros',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
    AuthModule,
  ],
  controllers: [IntroController],
  providers: [IntroService],
})
export class IntroModule {}
