import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateGuildRequest {
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

  @ApiProperty({
    description: 'Теги гильдии (JSON-массив строк в multipart)',
    example: '["adventure", "quest"]',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [value];
      }
    }
    return value;
  })
  tags?: string[];
}
