import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateStreamRequest {
  @ApiProperty({
    description: 'name',
    example: 'CS 2 Faceit Stream',
  })
  @IsString({ message: 'Stream name must be a string' })
  @IsNotEmpty({ message: 'Stream title is required' })
  name: string;
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
  @ApiProperty({
    description: 'categoryId',
    example: 2,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'categoryId must be a number' })
  @IsInt({ message: 'categoryId must be an integer' })
  @IsPositive({ message: 'categoryId must be a positive number' })
  categoryId: number;
}
