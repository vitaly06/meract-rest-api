import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendGuildMessageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  message: string;
}
