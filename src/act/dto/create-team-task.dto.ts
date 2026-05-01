import { IsNotEmpty, IsString, IsOptional, IsNumber, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamTaskDto {
  @ApiProperty({ example: 1, description: 'Team ID' })
  @IsNotEmpty()
  @IsNumber()
  teamId: number;

  @ApiProperty({ example: 'Reach the checkpoint', description: 'Task description' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ example: '123 Main St', description: 'Task address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 55.751244, description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 37.618423, description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  lng?: number;
}
