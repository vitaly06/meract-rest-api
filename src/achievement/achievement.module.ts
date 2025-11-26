import { Module } from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { AchievementController } from './achievement.controller';
import { AchievementGateway } from './achievement.gateway';

@Module({
  controllers: [AchievementController],
  providers: [AchievementService, AchievementGateway],
  exports: [AchievementService, AchievementGateway],
})
export class AchievementModule {}
