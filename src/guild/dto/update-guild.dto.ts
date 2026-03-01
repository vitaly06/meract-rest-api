import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateGuildRequest {
  @ApiProperty({
    description: 'name',
    example: 'Gremlin',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'guild name must be a string' })
  name?: string;

  @ApiProperty({
    description: 'description',
    example: 'best guild of the world',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  description?: string;

  @ApiProperty({
    description: 'JSON array of tags',
    example: '["adventure","quest"]',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  tags?: string[];
}
