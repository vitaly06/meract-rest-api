import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRankDto {
  @ApiProperty({
    example: 'Бывалый',
  })
  @IsString({ message: 'Название должно быть строкой' })
  @IsNotEmpty({ message: 'Название обязательно для заполнения' })
  name: string;

  @ApiProperty({
    example: 42,
    description: 'ID иконки из активного пака. Либо это, либо загрузите photo.',
    required: false,
  })
  @IsOptional()
  iconPackItemId?: number;
}
