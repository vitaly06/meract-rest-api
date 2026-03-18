import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateActDto {
  @ApiProperty({ example: 'Новое название', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ example: 'Новое описание', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 1, required: false, description: 'ID сиквела' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sequelId?: number;

  @ApiProperty({
    example: 2,
    required: false,
    description: 'ID главы (Chapter)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  chapterId?: number;

  @ApiProperty({
    example: '2026-05-05T15:00:00Z',
    required: false,
    description: 'Запланированная дата акта. Переводит статус в PLANNED.',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({
    example: ['приключение', 'квест'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
