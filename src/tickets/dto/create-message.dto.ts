import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'text message',
    example: 'textttextetxetetetxeete',
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Message must be a string' })
  @MaxLength(1000, { message: 'Message is too long' })
  message?: string;
}
