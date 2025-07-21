import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateAdminRequest {
  @ApiProperty({
    description: 'login',
    example: 'default.admin',
  })
  @IsString({ message: 'Login must be a string' })
  @IsNotEmpty({ message: 'Login is required' })
  login: string;
  @ApiProperty({
    description: 'oldPassword',
    example: '123456',
  })
  @IsString({ message: 'Old password must be a string' })
  oldPassword: string;
  @ApiProperty({
    description: 'newPassword',
    example: '123456',
  })
  @IsString({ message: 'new Password must be a string' })
  newPassword: string;
  @ApiProperty({
    description: 'email',
    example: 'admin@admin.com',
  })
  @IsString({ message: 'Email must be a string' })
  @IsNotEmpty({ message: 'Login is required' })
  @IsEmail({}, { message: 'Invalid mail format' })
  email: string;
}
