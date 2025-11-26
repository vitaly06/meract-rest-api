import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AwardAchievementDto {
  @ApiProperty({
    example: 1,
  })
  @IsInt({ message: 'Achievement ID must be an integer' })
  @IsPositive({ message: 'Achievement ID must be a positive number' })
  @Type(() => Number)
  achievementId: number;
  @ApiProperty({
    example: 1,
  })
  @IsInt({ message: 'User ID must be an integer' })
  @IsPositive({ message: 'User ID must be a positive number' })
  @Type(() => Number)
  userId: number;
}
