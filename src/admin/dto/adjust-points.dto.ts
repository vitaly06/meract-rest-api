import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber } from 'class-validator';

export class AdjustPointsDto {
  @ApiProperty({ example: 1, description: 'ID пользователя' })
  @IsInt()
  userId: number;

  @ApiProperty({
    example: 100,
    description: 'Количество импульсов (может быть отрицательным)',
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
