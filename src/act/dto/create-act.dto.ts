import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  IsPositive,
  IsDateString,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';

// в”Ђв”Ђв”Ђ Task inside a team в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

export class ActTeamTaskDto {
  @ApiProperty({ example: 'Р”РѕР№С‚Рё РґРѕ С‚РѕС‡РєРё A', description: 'РћРїРёСЃР°РЅРёРµ Р·Р°РґР°РЅРёСЏ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiProperty({
    example: 'СѓР». Р›РµРЅРёРЅР°, 1',
    required: false,
    description: 'РђРґСЂРµСЃ (РѕРїС†РёРѕРЅР°Р»СЊРЅРѕ)',
  })
  @IsOptional()
  @IsString()
  address?: string;
}

// в”Ђв”Ђв”Ђ Role config (hero / navigator / spot_agent) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

export class ActTeamRoleConfigDto {
  @ApiProperty({
    enum: ['hero', 'navigator', 'spot_agent'],
    example: 'hero',
    description: 'Р РѕР»СЊ: hero | navigator | spot_agent',
  })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({
    example: false,
    description: 'true вЂ” РѕС‚РєСЂС‹С‚РѕРµ РіРѕР»РѕСЃРѕРІР°РЅРёРµ; false вЂ” РєРѕРЅРєСЂРµС‚РЅС‹Рµ РєР°РЅРґРёРґР°С‚С‹',
  })
  @IsBoolean()
  openVoting: boolean;

  @ApiProperty({
    example: '2026-03-01T10:00:00Z',
    required: false,
    description: 'РќР°С‡Р°Р»Рѕ РіРѕР»РѕСЃРѕРІР°РЅРёСЏ (РїСЂРё openVoting=true)',
  })
  @IsOptional()
  @IsDateString()
  votingStartAt?: string;

  @ApiProperty({
    example: 24,
    required: false,
    description: 'Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ РіРѕР»РѕСЃРѕРІР°РЅРёСЏ РІ С‡Р°СЃР°С… (РїСЂРё openVoting=true)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  votingDurationHours?: number;

  @ApiProperty({
    example: [1, 2, 3],
    required: false,
    description: 'ID РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№-РєР°РЅРґРёРґР°С‚РѕРІ (РїСЂРё openVoting=false)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  candidateUserIds?: number[];
}

// в”Ђв”Ђв”Ђ Team inside an act в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

export class ActTeamDto {
  @ApiProperty({ example: 'РљРѕРјР°РЅРґР° 1', description: 'РќР°Р·РІР°РЅРёРµ РєРѕРјР°РЅРґС‹' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    type: [ActTeamRoleConfigDto],
    description: 'РљРѕРЅС„РёРіСѓСЂР°С†РёРё СЂРѕР»РµР№ (hero, navigator, spot_agent)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActTeamRoleConfigDto)
  roles: ActTeamRoleConfigDto[];

  @ApiProperty({
    type: [ActTeamTaskDto],
    required: false,
    description: 'Р—Р°РґР°РЅРёСЏ РєРѕРјР°РЅРґС‹',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActTeamTaskDto)
  tasks?: ActTeamTaskDto[];
}

// в”Ђв”Ђв”Ђ Main DTO в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

export class CreateActRequest {
  @ApiProperty({ example: 'Very Strange Things', description: 'РќР°Р·РІР°РЅРёРµ Р°РєС‚Р°' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'РћРїРёСЃР°РЅРёРµ Р°РєС‚Р°',
    required: false,
    description: 'РћРїРёСЃР°РЅРёРµ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'Sequel ID (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sequelId?: number;

  @ApiProperty({
    description: 'РљРѕРјР°РЅРґС‹ Р°РєС‚Р°. JSON-СЃС‚СЂРѕРєР° РїСЂРё multipart/form-data',
    example:
      '[{"name":"РљРѕРјР°РЅРґР° 1","roles":[{"role":"hero","openVoting":false,"candidateUserIds":[1,2]},{"role":"navigator","openVoting":true,"votingStartAt":"2026-03-01T10:00:00Z","votingDurationHours":24},{"role":"spot_agent","openVoting":false,"candidateUserIds":[3]}],"tasks":[{"description":"Р—Р°РґР°РЅРёРµ 1","address":"СѓР». Р›РµРЅРёРЅР°, 1"}]}]',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActTeamDto)
  teams: ActTeamDto[];
}

