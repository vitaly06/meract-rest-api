import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    enum: ['hero', 'navigator'],
    example: 'hero',
    description: 'Роль, которую назначаем',
  })
  @IsEnum(['hero', 'navigator'])
  roleType: 'hero' | 'navigator';

  @ApiProperty({
    example: 5,
    description:
      'ID кандидата (обязательно для MANUAL, опционально для остальных)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  candidateId?: number;
}
