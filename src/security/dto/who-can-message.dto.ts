import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class WhoCanMessageDto {
  @ApiProperty({
    enum: ['all', 'act_participants', 'guild_members'],
    example: 'all',
  })
  @IsIn(['all', 'act_participants', 'guild_members'])
  setting: string;
}
