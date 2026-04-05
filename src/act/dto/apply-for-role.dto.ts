import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class ApplyForRoleDto {
  @ApiProperty({
    enum: ['hero', 'navigator', 'spot_agent'],
    example: 'hero',
    description: 'Роль, на которую подаётся заявка',
  })
  @IsIn(['hero', 'navigator', 'spot_agent'])
  roleType: 'hero' | 'navigator' | 'spot_agent';

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
