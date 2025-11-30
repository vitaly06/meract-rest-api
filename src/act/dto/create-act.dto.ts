import { ApiProperty } from '@nestjs/swagger';
import { ActFormat, ActType } from '@prisma/client';
import { Type, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { SelectionMethods } from '../enum/act.enum';

class TaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;
}

export class CreateActRequest {
  // @ApiProperty({
  //   description: 'title',
  //   example: 'CS 2 Faceit Stream',
  // })
  @IsString({ message: 'Stream name must be a string' })
  @IsNotEmpty({ message: 'Stream title is required' })
  title: string;

  // @ApiProperty({
  //   type: Number,
  //   description: 'SequelId',
  //   example: 1,
  // })
  @IsNumber({}, { message: 'Sequel id must be a number' })
  @IsPositive({ message: 'Sequel id must be a positive number' })
  @IsInt({ message: 'Sequel id must be an int' })
  @IsOptional()
  @Type(() => Number)
  sequelId?: number;

  // @ApiProperty({
  //   type: Number,
  //   description: 'SequelId',
  //   example: 1,
  // })
  @IsNumber({}, { message: 'Intro id must be a number' })
  @IsPositive({ message: 'Intro id must be a positive number' })
  @IsInt({ message: 'Intro id must be an int' })
  @Type(() => Number)
  introId: number;

  @IsNumber({}, { message: 'Outro id must be a number' })
  @IsPositive({ message: 'Outro id must be a positive number' })
  @IsInt({ message: 'Outro id must be an int' })
  @Type(() => Number)
  outroId: number;

  // @ApiProperty({
  //   type: [Number],
  //   description: 'Music IDs',
  //   example: [1, 2, 3],
  // })
  @Transform(({ value }) => {
    // Если это строка (например "[1,2,3]" или "1,2,3"), парсим её
    if (typeof value === 'string') {
      try {
        // Пробуем распарсить как JSON массив
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(Number) : [Number(value)];
      } catch {
        // Если не JSON, пробуем разделить по запятой
        return value.split(',').map((id) => Number(id.trim()));
      }
    }
    // Если уже массив, конвертируем каждый элемент в число
    if (Array.isArray(value)) {
      return value.map(Number);
    }
    // Если одиночное значение, делаем массив
    return [Number(value)];
  })
  @IsArray({ message: 'Music IDs must be an array' })
  @IsInt({ each: true, message: 'Each music id must be an integer' })
  @IsPositive({
    each: true,
    message: 'Each music id must be a positive number',
  })
  musicIds: number[];

  // @ApiProperty({
  //   description: 'Act type',
  //   example: ActType.SINGLE,
  //   enum: ActType,
  // })
  @IsEnum(ActType, { message: 'Invalid Act Type' })
  type: ActType;

  // @ApiProperty({
  //   description: 'Act format',
  //   example: ActFormat.SINGLE,
  //   enum: ActFormat,
  // })
  @IsEnum(ActFormat, { message: 'Invalid act format' })
  format: ActFormat;

  // @ApiProperty({
  //   description: 'Hero selection methods',
  //   example: SelectionMethods.VOTING,
  //   enum: SelectionMethods,
  // })
  @IsEnum(SelectionMethods, { message: 'Invalid hero selection methods' })
  heroMethods: SelectionMethods;

  // @ApiProperty({
  //   description: 'Navigator selection methods',
  //   example: SelectionMethods.VOTING,
  //   enum: SelectionMethods,
  // })
  @IsEnum(SelectionMethods, { message: 'Invalid navigator selection methods' })
  navigatorMethods: SelectionMethods;
  // @ApiProperty({})
  @IsString({ message: 'bidding time must be a string' })
  @IsNotEmpty({ message: 'bidding time must be not empty' })
  biddingTime: string;

  // Список задач для акта
  @IsArray({ message: 'Tasks must be an array' })
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  @IsOptional()
  tasks?: TaskDto[];

  // @ApiProperty({
  //   description: 'userId',
  //   example: 2,
  //   type: Number,
  // })
  // @Type(() => Number)
  // @IsNumber({}, { message: 'userId must be a number' })
  // @IsInt({ message: 'userId must be an integer' })
  // @IsPositive({ message: 'userId must be a positive number' })
  // userId: number;
  // @ApiProperty({
  //   description: 'categoryId',
  //   example: 2,
  //   type: Number,
  // })
  // @Type(() => Number)
  // @IsNumber({}, { message: 'categoryId must be a number' })
  // @IsInt({ message: 'categoryId must be an integer' })
  // @IsPositive({ message: 'categoryId must be a positive number' })
  // categoryId: number;
}
