import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateSequelDto {
  @ApiProperty({
    description: 'Название',
  })
  @IsString({
    message: 'Название должно быть строкой',
  })
  @IsNotEmpty({
    message: 'Название обязательно для заполнения',
  })
  title: string;
  @ApiProperty({
    description: 'Количество эпизодов',
  })
  @IsNumber({}, { message: 'Количество эпизодов должно быть числом' })
  @IsInt({ message: 'Количество эпизодов должно быть целым числом' })
  @IsPositive({
    message: 'Количество эпизодов должно быть положительным числом',
  })
  @Type(() => Number)
  episodes: number;
}
