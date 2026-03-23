import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { IconPackType } from '@prisma/client';

export class CreateIconPackDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(IconPackType)
  type: IconPackType;
}
