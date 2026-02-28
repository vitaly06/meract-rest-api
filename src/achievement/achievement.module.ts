import { Module } from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { AchievementController } from './achievement.controller';
import { GatewayModule } from '../gateway/gateway.module';
import { S3Module } from 'src/s3/s3.module';

@Module({
  imports: [GatewayModule, S3Module],
  controllers: [AchievementController],
  providers: [AchievementService],
  exports: [AchievementService],
})
export class AchievementModule {}
