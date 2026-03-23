import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAchievementDto {
  @ApiProperty({
    example: 'Набрать 100 просмотров',
  })
  @IsString({ message: 'Название должно быть строкой' })
  @IsNotEmpty({ message: 'Название обязательно для заполнения' })
  name: string;

  @ApiProperty({
    example: 42,
    description:
      'ID иконки из активного пака. Используйте либо это поле, либо загрузите photo.',
    required: false,
  })
  @IsOptional()
  iconPackItemId?: number;
}
