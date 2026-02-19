import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class SignUpRequest {
  @ApiProperty({
    description: 'login',
    example: 'vitaly.sadikov1',
  })
  @IsString({ message: 'Login must be a string' })
  @IsNotEmpty({ message: 'Login must be not empty' })
  login: string;
  @ApiProperty({
    description: 'full name',
    example: 'Vitaly Sadikov',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'FullName must be a string' })
  fullName?: string;
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
  @ApiProperty({
    description: 'repassword',
    example: '123456',
  })
  @IsString({ message: 'Repassword must be a string' })
  @Length(5, 20, {
    message: 'The repassword length must be from 5 to 20 characters.',
  })
  repassword: string;
}
