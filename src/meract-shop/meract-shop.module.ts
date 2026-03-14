import { Module } from '@nestjs/common';
import { MeractShopService } from './meract-shop.service';
import { MeractShopController } from './meract-shop.controller';
import { S3Module } from 'src/s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [MeractShopController],
  providers: [MeractShopService],
})
export class MeractShopModule {}
