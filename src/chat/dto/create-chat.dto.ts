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
    description: 'ID участников',
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  participantIds: number[]; 

  @ApiProperty({
    example: 5,
    description: 'ID акта (для стрим-группы)',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  actId?: number;

  @ApiProperty({
    example: 123,
    description: 'ID действия для аналитики',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  act_id?: number;
}