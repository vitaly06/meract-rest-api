import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ example: 'Reach Global Elite', description: 'Task title' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;
}
