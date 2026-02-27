import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangeUsernameDto {
  @ApiProperty({
    description: 'login',
    example: 'sadikov.vd2194',
  })
  @IsString({ message: 'login must be a string' })
  @IsNotEmpty({ message: 'login is required' })
  @MinLength(6, { message: 'The minimum login length is 6 characters.' })
  login: string;
}
