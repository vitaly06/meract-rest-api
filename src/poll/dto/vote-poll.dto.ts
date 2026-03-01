import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class VotePollDto {
  @ApiProperty({ example: 1, description: 'ID варианта ответа' })
  @IsInt()
  @IsPositive()
  optionId: number;
}
