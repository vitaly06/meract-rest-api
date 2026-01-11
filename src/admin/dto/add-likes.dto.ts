import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddLikesDto {
  @ApiProperty({
    description: 'Количество лайков для добавления',
    example: 100,
    minimum: 1,
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  count: number;
}
