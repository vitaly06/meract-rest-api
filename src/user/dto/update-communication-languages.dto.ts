import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class UpdateCommunicationLanguagesDto {
  @ApiProperty({
    description: 'Список выбранных языков общения',
    example: ['English', 'Español'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  languages: string[];
}
