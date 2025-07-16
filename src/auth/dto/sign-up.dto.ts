import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class SignUpRequest {
  @ApiProperty({
    description: 'email',
    example: 'vitaly.sadikov1@yandex.ru',
  })
  @IsString({ message: 'Email must be a string' })
  @IsEmail({}, { message: 'Invalid mail format' })
  email: string;
  @ApiProperty({
    description: 'password',
    example: '123456',
  })
  @IsString({ message: 'Password must be a string' })
  @Length(5, 20, {
    message: 'The password length must be from 5 to 20 characters.',
  })
  password: string;
}
