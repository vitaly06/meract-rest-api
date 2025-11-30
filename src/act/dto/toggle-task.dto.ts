import { IsInt } from 'class-validator';

export class ToggleTaskDto {
  @IsInt()
  taskId: number;
}
