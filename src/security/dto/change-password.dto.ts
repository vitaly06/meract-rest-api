import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  password: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  repassword: string;
}
