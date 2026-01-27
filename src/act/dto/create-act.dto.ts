import { ApiProperty } from '@nestjs/swagger';
import { ActFormat, ActType } from '@prisma/client';
import { Type, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { SelectionMethods } from '../enum/act.enum';

class TaskDto {
  @ApiProperty({ example: 'Reach Global Elite', description: 'Task title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;
}

class RoutePointDto {
  @ApiProperty({ example: 52.3676, description: 'Point latitude' })
  @IsNumber({}, { message: 'Latitude must be a number' })
  @Min(-90, { message: 'Latitude must be >= -90' })
  @Max(90, { message: 'Latitude must be <= 90' })
  latitude: number;

  @ApiProperty({ example: 4.9041, description: 'Point longitude' })
  @IsNumber({}, { message: 'Longitude must be a number' })
  @Min(-180, { message: 'Longitude must be >= -180' })
  @Max(180, { message: 'Longitude must be <= 180' })
  longitude: number;
}

export class CreateActRequest {
  // @ApiProperty({
  //   description: 'title',
  //   example: 'CS 2 Faceit Stream',
  // })
  @ApiProperty({ example: 'CS 2 Faceit Stream', description: 'Stream title' })
  @IsString({ message: 'Stream name must be a string' })
  @IsNotEmpty({ message: 'Stream title is required' })
  title: string;

  // @ApiProperty({
  //   type: Number,
  //   description: 'SequelId',
  //   example: 1,
  // })
  @ApiProperty({
    example: 1,
    required: false,
    description: 'Sequel ID (optional)',
  })
  @IsNumber({}, { message: 'Sequel id must be a number' })
  @IsPositive({ message: 'Sequel id must be a positive number' })
  @IsInt({ message: 'Sequel id must be an int' })
  @IsOptional()
  @Type(() => Number)
  sequelId?: number;

  // @ApiProperty({
  //   type: Number,
  //   description: 'SequelId',
  //   example: 1,
  // })
  @ApiProperty({ example: 1, description: 'Intro ID' })
  @IsNumber({}, { message: 'Intro id must be a number' })
  @IsPositive({ message: 'Intro id must be a positive number' })
  @IsInt({ message: 'Intro id must be an int' })
  @Type(() => Number)
  introId: number;

  @ApiProperty({ example: 1, description: 'Outro ID' })
  @IsNumber({}, { message: 'Outro id must be a number' })
  @IsPositive({ message: 'Outro id must be a positive number' })
  @IsInt({ message: 'Outro id must be an int' })
  @Type(() => Number)
  outroId: number;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'Effect ID (optional)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Effect id must be a number' })
  @IsPositive({ message: 'Effect id must be a positive number' })
  @IsInt({ message: 'Effect id must be an int' })
  @Type(() => Number)
  effectId?: number;

  // @ApiProperty({
  //   type: [Number],
  //   description: 'Music IDs',
  //   example: [1, 2, 3],
  // })
  @ApiProperty({ example: [1, 2, 3], description: 'Array of music track IDs' })
  @Transform(({ value }) => {
    // Если это строка (например "[1,2,3]" или "1,2,3"), парсим её
    let arr: any[] = [];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        arr = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        arr = value.split(',').map((id) => id.trim());
      }
    } else if (Array.isArray(value)) {
      arr = value;
    } else if (value !== undefined && value !== null) {
      arr = [value];
    }
    // Преобразуем к числам, фильтруем невалидные
    return arr.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  })
  @IsArray({ message: 'Music IDs must be an array' })
  @IsInt({ each: true, message: 'Each music id must be an integer' })
  @IsPositive({
    each: true,
    message: 'Each music id must be a positive number',
  })
  musicIds: number[];

  // @ApiProperty({
  //   description: 'Act type',
  //   example: ActType.SINGLE,
  //   enum: ActType,
  // })
  @ApiProperty({ example: 'SINGLE', enum: ActType, description: 'Act type' })
  @IsEnum(ActType, { message: 'Invalid Act Type' })
  type: ActType;

  // @ApiProperty({
  //   description: 'Act format',
  //   example: ActFormat.SINGLE,
  //   enum: ActFormat,
  // })
  @ApiProperty({
    example: 'SINGLE',
    enum: ActFormat,
    description: 'Act format',
  })
  @IsEnum(ActFormat, { message: 'Invalid act format' })
  format: ActFormat;

  // @ApiProperty({
  //   description: 'Hero selection methods',
  //   example: SelectionMethods.VOTING,
  //   enum: SelectionMethods,
  // })
  @ApiProperty({
    example: 'VOTING',
    enum: SelectionMethods,
    description: 'Hero selection method',
  })
  @IsEnum(SelectionMethods, { message: 'Invalid hero selection methods' })
  heroMethods: SelectionMethods;

  // @ApiProperty({
  //   description: 'Navigator selection methods',
  //   example: SelectionMethods.VOTING,
  //   enum: SelectionMethods,
  // })
  @ApiProperty({
    example: 'VOTING',
    enum: SelectionMethods,
    description: 'Navigator selection method',
  })
  @IsEnum(SelectionMethods, { message: 'Invalid navigator selection methods' })
  navigatorMethods: SelectionMethods;

  @ApiProperty({
    example: 'VOTING',
    enum: SelectionMethods,
    description: 'Spot Agent selection method',
  })
  @IsEnum(SelectionMethods, { message: 'Invalid spot agent selection methods' })
  spotAgentMethods: SelectionMethods;

  @ApiProperty({
    example: 3,
    description: 'Number of spot agents required',
    default: 0,
  })
  @IsInt({ message: 'Spot agent count must be an integer' })
  @Min(0, { message: 'Spot agent count must be >= 0' })
  @Type(() => Number)
  spotAgentCount: number;

  // @ApiProperty({})
  @ApiProperty({ example: '2025-09-15T12:00:00Z', description: 'Bidding time' })
  @IsString({ message: 'bidding time must be a string' })
  @IsNotEmpty({ message: 'bidding time must be not empty' })
  biddingTime: string;

  // Точки маршрута (заменяет старые поля координат)
  @ApiProperty({
    type: [RoutePointDto],
    required: false,
    description: 'Array of route points for the map',
    example: [
      { latitude: 52.3676, longitude: 4.9041 },
      { latitude: 52.37, longitude: 4.895 },
      { latitude: 52.375, longitude: 4.89 },
    ],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (
      !value ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return undefined;
    }
    // Если пришла строка JSON, парсим
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return value;
  })
  @IsArray({ message: 'Route points must be an array' })
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  routePoints?: RoutePointDto[];

  // Начальная позиция стримера (deprecated - используйте routePoints)
  @ApiProperty({
    example: 52.3675734,
    required: false,
    description:
      '[DEPRECATED] Streamer start latitude. Ignored if routePoints is provided. Use routePoints instead.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Start latitude must be a number' })
  startLatitude?: number;

  @ApiProperty({
    example: 4.9041389,
    required: false,
    description:
      '[DEPRECATED] Streamer start longitude. Ignored if routePoints is provided. Use routePoints instead.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Start longitude must be a number' })
  startLongitude?: number;

  // Целевая точка маршрута
  @ApiProperty({
    example: 52.370216,
    required: false,
    description:
      '[DEPRECATED] Destination latitude. Ignored if routePoints is provided. Use routePoints instead.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Destination latitude must be a number' })
  destinationLatitude?: number;

  @ApiProperty({
    example: 4.895168,
    required: false,
    description:
      '[DEPRECATED] Destination longitude. Ignored if routePoints is provided. Use routePoints instead.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Destination longitude must be a number' })
  destinationLongitude?: number;

  // Список задач для акта
  @ApiProperty({
    type: [TaskDto],
    required: false,
    description: 'Array of tasks for the act',
    example: [
      { title: 'Reach Global Elite' },
      { title: 'Win 10 games' },
      { title: 'Do 100 headshots' },
    ],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (
      !value ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return undefined;
    }
    // Если пришла строка JSON, парсим
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return value;
  })
  @IsArray({ message: 'Tasks must be an array' })
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks?: TaskDto[];

  // @ApiProperty({
  //   description: 'userId',
  //   example: 2,
  //   type: Number,
  // })
  // @Type(() => Number)
  // @IsNumber({}, { message: 'userId must be a number' })
  // @IsInt({ message: 'userId must be an integer' })
  // @IsPositive({ message: 'userId must be a positive number' })
  // userId: number;
  // @ApiProperty({
  //   description: 'categoryId',
  //   example: 2,
  //   type: Number,
  // })
  // @Type(() => Number)
  // @IsNumber({}, { message: 'categoryId must be a number' })
  // @IsInt({ message: 'categoryId must be an integer' })
  // @IsPositive({ message: 'categoryId must be a positive number' })
  // categoryId: number;
}
