import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateGuildRequest {
  @ApiProperty({
    description: 'name',
    example: 'Gremlin',
  })
  @IsNotEmpty({ message: 'Guild name is required' })
  @IsString({ message: 'guild name must be a string' })
  name: string;

  @ApiProperty({
    description: 'description',
    example: 'best guild of the world',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  description?: string;
}
