import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class ApplySpotAgentDto {
  @ApiProperty({
    example: 1,
    description: 'Act ID to apply as spot agent',
  })
  @IsInt({ message: 'Act ID must be an integer' })
  @IsNotEmpty({ message: 'Act ID is required' })
  actId: number;
}
