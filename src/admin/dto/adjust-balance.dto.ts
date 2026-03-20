import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber } from 'class-validator';

export class AdjustBalanceDto {
  @ApiProperty({ example: 1, description: 'ID пользователя' })
  @IsInt()
  userId: number;

  @ApiProperty({
    example: 500,
    description: 'Количество echo/баланс (может быть отрицательным)',
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
