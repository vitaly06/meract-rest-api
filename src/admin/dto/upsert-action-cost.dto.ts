import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString, MaxLength, Min } from 'class-validator';

export class UpsertActionCostDto {
  @ApiProperty({ example: 'CREATE_ACT' })
  @IsString()
  @MaxLength(64)
  actionKey: string;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsInt()
  @Min(0)
  amount: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}

