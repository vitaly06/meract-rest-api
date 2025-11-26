import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAchievementDto {
  @ApiProperty({
    example: 'Набрать 100 просмотров',
  })
  @IsString({ message: 'Название должно быть строкой' })
  @IsNotEmpty({ message: 'Название обязательно для заполнения' })
  name: string;
}
