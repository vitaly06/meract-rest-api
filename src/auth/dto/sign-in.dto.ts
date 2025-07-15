import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class SignInRequest {
  @ApiProperty({
    description: 'login',
    example: 'vitaly.sadikov',
  })
  @IsString({ message: 'Login must be a string' })
  @Length(5, 20, {
    message: 'The login length must be from 5 to 20 characters.',
  })
  login: string;
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
