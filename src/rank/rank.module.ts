import { Module } from '@nestjs/common';
import { RankService } from './rank.service';
import { RankController } from './rank.controller';
import { GatewayModule } from '../gateway/gateway.module';
import { S3Module } from 'src/s3/s3.module';
import { IconPackModule } from 'src/icon-pack/icon-pack.module';

@Module({
  imports: [GatewayModule, S3Module, IconPackModule],
  controllers: [RankController],
  providers: [RankService],
})
export class RankModule {}
