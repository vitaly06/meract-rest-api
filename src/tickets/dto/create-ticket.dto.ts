import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({
    description: 'description',
    example: 'desc text',
    maxLength: 100,
  })
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title cannot be empty' })
  @MaxLength(100, { message: 'Title cannot exceed 100 characters' })
  @MinLength(3, { message: 'Title is too short' })
  title: string;

  @ApiProperty({
    description: 'description of problem',
    example: 'descriptionzxczxczxczxczxc',
    maxLength: 2000,
  })
  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description cannot be empty' })
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  description: string;

  @ApiProperty({
    description: 'base64(optional)',
    example: 'data:image/png;base64,iVBORw0KGgoAAA...',
    required: false,
  })
  @IsString({ message: 'Image must be a string' })
  @IsOptional() 
  img?: string;
}
