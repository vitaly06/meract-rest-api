import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLocationRangeDto {
  @ApiProperty({ example: 'Город', description: 'Метка диапазона' })
  @IsString()
  label: string;

  @ApiProperty({ example: 0, description: 'Минимальное расстояние (км)' })
  @IsNumber()
  @Min(0)
  minKm: number;

  @ApiProperty({ example: 30, description: 'Максимальное расстояние (км)' })
  @IsNumber()
  @Min(0)
  maxKm: number;

  @ApiPropertyOptional({ example: 0, description: 'Порядок отображения' })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ example: true, description: 'Активен ли диапазон' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
