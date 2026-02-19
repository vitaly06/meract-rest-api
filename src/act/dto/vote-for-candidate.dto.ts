import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class VoteForCandidateDto {
  @ApiProperty({
    example: 5,
    description: 'ID кандидата, за которого голосуем',
  })
  @IsInt()
  @IsPositive()
  candidateId: number;
}
