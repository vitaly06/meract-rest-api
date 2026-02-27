import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChangeFullNameDto {
  @ApiProperty({
    description: 'fullName',
    example: 'Sadikov Vitaly Dmitrievich',
  })
  @IsString({ message: 'Full name must be a string' })
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;
}
