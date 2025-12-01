import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hello everyone!',
    maxLength: 500,
  })
  @IsString({ message: 'Message must be a string' })
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @MaxLength(500, { message: 'Message cannot exceed 500 characters' })
  message: string;

  @ApiProperty({
    description: 'Act ID',
    example: 1,
    required: false,
  })
  actId?: number;
}
