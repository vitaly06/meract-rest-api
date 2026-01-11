import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendWarningDto {
  @ApiProperty({
    description: 'Текст предупреждения для стримера',
    example: 'Пожалуйста, соблюдайте правила платформы',
  })
  @IsNotEmpty()
  @IsString()
  message: string;
}
