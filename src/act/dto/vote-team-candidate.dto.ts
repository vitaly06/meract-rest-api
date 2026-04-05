import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class VoteTeamCandidateDto {
  @ApiProperty({
    example: 5,
    description: 'ID кандидата (ActTeamCandidate.id)',
  })
  @IsInt()
  @IsPositive()
  candidateId: number;
}
