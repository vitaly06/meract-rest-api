import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  IsPositive,
  MaxLength,
} from 'class-validator';

export class CreateGroupChatDto {
  @ApiProperty({
    example: 'Команда А',
    description: 'Название группового чата',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: [1, 2, 3],
    description: 'ID участников (JSON-строка при multipart/form-data)',
    type: [Number],
  })
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
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  participantIds: number[];
}
