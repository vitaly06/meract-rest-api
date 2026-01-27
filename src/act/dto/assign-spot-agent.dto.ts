import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AssignSpotAgentDto {
  @ApiProperty({
    example: 1,
    description: 'Act ID',
  })
  @IsInt({ message: 'Act ID must be an integer' })
  @IsNotEmpty({ message: 'Act ID is required' })
  actId: number;

  @ApiProperty({
    example: 5,
    description: 'User ID to assign as spot agent',
  })
  @IsInt({ message: 'User ID must be an integer' })
  @IsNotEmpty({ message: 'User ID is required' })
  userId: number;

  @ApiProperty({
    example: 'Выйти из угла и подать бумагу',
    description: 'Task description for the spot agent',
    required: false,
  })
  @IsString({ message: 'Task must be a string' })
  @IsOptional()
  task?: string;
}
