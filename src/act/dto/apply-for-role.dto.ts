import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class ApplyForRoleDto {
  @ApiProperty({
    enum: ['hero', 'navigator'],
    example: 'hero',
    description: 'Роль, на которую подаётся заявка',
  })
  @IsEnum(['hero', 'navigator'])
  roleType: 'hero' | 'navigator';

  @ApiProperty({
    example: 100,
    description: 'Сумма ставки (для метода BIDDING)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  bidAmount?: number;

  @ApiProperty({
    example: 'Обещаю выполнить задачу X',
    description: 'Текстовое обещание или артефакт (для метода BIDDING)',
    required: false,
  })
  @IsOptional()
  @IsString()
  bidItem?: string;
}
