import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AwardRankDto {
  @ApiProperty({
    example: 1,
  })
  @IsInt({ message: 'Rank ID must be an integer' })
  @IsPositive({ message: 'Rank ID must be a positive number' })
  @Type(() => Number)
  rankId: number;
  @ApiProperty({
    example: 1,
  })
  @IsInt({ message: 'User ID must be an integer' })
  @IsPositive({ message: 'User ID must be a positive number' })
  @Type(() => Number)
  userId: number;
}
