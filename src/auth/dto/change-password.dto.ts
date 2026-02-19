import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ChangePasswordRequest {
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
