import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAdminTaskDto {
  @ApiProperty({ example: 'Проверить жалобы', description: 'Название задачи' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Просмотреть все жалобы за неделю', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '2026-03-25T23:59:00.000Z',
    required: false,
    description: 'Дедлайн (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiProperty({
    example: 2,
    description: 'ID администратора, которому назначается задача',
  })
  @IsInt()
  assigneeId: number;
}
