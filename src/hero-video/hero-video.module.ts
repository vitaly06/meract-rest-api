import { Module } from '@nestjs/common';
import { HeroVideoController } from './hero-video.controller';
import { HeroVideoService } from './hero-video.service';
import { S3Module } from 'src/s3/s3.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [S3Module, PrismaModule],
  controllers: [HeroVideoController],
  providers: [HeroVideoService],
})
export class HeroVideoModule {}
