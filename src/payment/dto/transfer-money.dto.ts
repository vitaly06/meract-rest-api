import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class TransferMoneyDto {
  @ApiProperty({
    description: 'amount of money',
    example: 500,
  })
  @IsNumber({}, { message: 'The amount of money must be a number' })
  @IsNotEmpty({ message: 'The amount of money is required' })
  @IsPositive({ message: 'The amount of money must be a positive number' })
  sum: number;
  @ApiProperty({
    description: 'Username or email for the transfer',
  })
  @IsString({
    message: 'The username or email for the transfer must be a string.',
  })
  @IsNotEmpty({ message: 'User is required' })
  user: string;
}
