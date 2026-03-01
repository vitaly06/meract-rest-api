import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AwardGuildAchievementDto {
  @ApiProperty({ example: 1, description: 'ID достижения' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  achievementId: number;

  @ApiProperty({ example: 1, description: 'ID гильдии' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  guildId: number;
}
