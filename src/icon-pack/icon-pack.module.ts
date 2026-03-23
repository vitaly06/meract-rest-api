import { Module } from '@nestjs/common';
import { IconPackService } from './icon-pack.service';
import { IconPackController } from './icon-pack.controller';
import { S3Module } from 'src/s3/s3.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [S3Module, PrismaModule],
  controllers: [IconPackController],
  providers: [IconPackService],
  exports: [IconPackService],
})
export class IconPackModule {}
