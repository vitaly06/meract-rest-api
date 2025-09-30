import { ApiProperty } from '@nestjs/swagger';
import { ActFormat, ActType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { SelectionMethods } from '../enum/act.enum';

export class CreateActRequest {
  @ApiProperty({
    description: 'title',
    example: 'CS 2 Faceit Stream',
  })
  @IsString({ message: 'Stream name must be a string' })
  @IsNotEmpty({ message: 'Stream title is required' })
  title: string;

  @ApiProperty({
    description: 'sequel',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'sequel must be a string' })
  sequel?: string;

  @ApiProperty({
    description: 'Act type',
    example: ActType.SINGLE,
    enum: ActType,
  })
  @IsEnum(ActType, { message: 'Invalid Act Type' })
  type: ActType;

  @ApiProperty({
    description: 'Act format',
    example: ActFormat.SINGLE,
    enum: ActFormat,
  })
  @IsEnum(ActFormat, { message: 'Invalid act format' })
  format: ActFormat;

  @ApiProperty({
    description: 'Hero selection methods',
    example: SelectionMethods.VOTING,
    enum: SelectionMethods,
  })
  @IsEnum(SelectionMethods, { message: 'Invalid hero selection methods' })
  heroMethods: SelectionMethods;

  @ApiProperty({
    description: 'Navigator selection methods',
    example: SelectionMethods.VOTING,
    enum: SelectionMethods,
  })
  @IsEnum(SelectionMethods, { message: 'Invalid navigator selection methods' })
  navigatorMethods: SelectionMethods;
  @ApiProperty({})
  @IsString({ message: 'bidding time must be a string' })
  @IsNotEmpty({ message: 'bidding time must be not empty' })
  biddingTime: string;

  @ApiProperty({
    description: 'userId',
    example: 2,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'userId must be a number' })
  @IsInt({ message: 'userId must be an integer' })
  @IsPositive({ message: 'userId must be a positive number' })
  userId: number;
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
