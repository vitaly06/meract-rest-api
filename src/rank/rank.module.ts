import { Module } from '@nestjs/common';
import { RankService } from './rank.service';
import { RankController } from './rank.controller';
import { RankGateway } from './rank.gateway';

@Module({
  controllers: [RankController],
  providers: [RankService, RankGateway],
})
export class RankModule {}
