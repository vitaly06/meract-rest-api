import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateAdminRequest {
  @ApiProperty({
    description: 'login',
    example: 'default.admin',
  })
  @IsString({ message: 'Login must be a string' })
  @IsNotEmpty({ message: 'Login is required' })
  login: string;
  @ApiProperty({
    description: 'password',
    example: '123456',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @Length(6, 20, {
    message: 'Password length must be between 6 and 20 characters',
  })
  password: string;
  @ApiProperty({
    description: 'email',
    example: 'admin@admin.com',
  })
  @IsString({ message: 'Email must be a string' })
  @IsNotEmpty({ message: 'Login is required' })
  @IsEmail({}, { message: 'Invalid mail format' })
  email: string;
}
