import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsInt,
  IsPositive,
  MaxLength,
} from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    example: 'Привет!',
    required: false,
    description: 'Текст сообщения (необязательно, если отправляется файл)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  text?: string;

  @ApiProperty({
    example: 5,
    required: false,
    description: 'ID сообщения, на которое отвечаем',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  replyToId?: number;

  @ApiProperty({
    example: 10,
    required: false,
    description: 'ID сообщения, которое пересылаем',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  forwardedFromId?: number;
}
