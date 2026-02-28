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

// ─── Задание внутри команды ────────────────────────────────────────────────

export class ActTeamTaskDto {
  @ApiProperty({
    example: 'Дойти до точки A',
    description: 'Описание задания',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiProperty({
    example: 'ул. Ленина, 1',
    required: false,
    description: 'Адрес (опционально)',
  })
  @IsOptional()
  @IsString()
  address?: string;
}

// ─── Конфигурация роли (hero / navigator / spot_agent) ─────────────────────

export class ActTeamRoleConfigDto {
  @ApiProperty({
    enum: ['hero', 'navigator', 'spot_agent'],
    example: 'hero',
    description: 'Роль: hero | navigator | spot_agent',
  })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({
    example: false,
    description: 'true — открытое голосование; false — конкретные кандидаты',
  })
  @IsBoolean()
  openVoting: boolean;

  @ApiProperty({
    example: '2026-03-01T10:00:00Z',
    required: false,
    description: 'Дата начала голосования (при openVoting = true)',
  })
  @IsOptional()
  @IsDateString()
  votingStartAt?: string;

  @ApiProperty({
    example: 24,
    required: false,
    description: 'Длительность голосования в часах (при openVoting = true)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  votingDurationHours?: number;

  @ApiProperty({
    example: [1, 2, 3],
    required: false,
    description: 'ID пользователей-кандидатов (при openVoting = false)',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  candidateUserIds?: number[];
}

// ─── Команда внутри акта ───────────────────────────────────────────────────

export class ActTeamDto {
  @ApiProperty({
    example: 'Команда 1',
    description: 'Название команды',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    type: [ActTeamRoleConfigDto],
    description: 'Конфигурации ролей (hero, navigator, spot_agent)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActTeamRoleConfigDto)
  roles: ActTeamRoleConfigDto[];

  @ApiProperty({
    type: [ActTeamTaskDto],
    required: false,
    description: 'Задания команды',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActTeamTaskDto)
  tasks?: ActTeamTaskDto[];
}

// ─── Основной DTO для создания акта ────────────────────────────────────────

export class CreateActRequest {
  @ApiProperty({
    example: 'Очень Странные Дела',
    description: 'Название акта',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'Описание акта',
    required: false,
    description: 'Описание акта',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'ID сиквела (опционально)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sequelId?: number;

  @ApiProperty({
    description:
      'Массив команд акта. Передаётся как строка JSON при multipart/form-data',
    example:
      '[{"name":"Команда 1","roles":[{"role":"hero","openVoting":false,"candidateUserIds":[1,2]},{"role":"navigator","openVoting":true,"votingStartAt":"2026-03-01T10:00:00Z","votingDurationHours":24},{"role":"spot_agent","openVoting":false,"candidateUserIds":[3]}],"tasks":[{"description":"Задание 1","address":"ул. Ленина, 1"}]}]',
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

  @ApiProperty({
    example: ['приключение', 'квест', 'улицы'],
    description: 'Теги акта (для поиска и фильтрации)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
