import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreatePollDto {
  @ApiProperty({ example: 'Какой маршрут выбрать?' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Голосуйте за лучший вариант', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: ['Налево', 'Направо', 'Прямо'],
    type: [String],
    description: 'От 2 до 5 вариантов ответа',
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  options: string[];

  @ApiProperty({
    example: 5,
    description: 'Время голосования в минутах (от 1 до 60)',
  })
  @IsInt()
  @Min(1)
  @Max(60)
  biddingTime: number;
}
