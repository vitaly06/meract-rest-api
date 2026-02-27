import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    description: 'text message',
    example: 'textttextetxetetetxeete',
    maxLength: 1000,
  })
  @IsString({ message: 'Message must be a string' })
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @MaxLength(1000, { message: 'Message is too long' })
  message: string;
}
