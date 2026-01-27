import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class VoteSpotAgentDto {
  @ApiProperty({
    example: 1,
    description: 'Candidate ID to vote for',
  })
  @IsInt({ message: 'Candidate ID must be an integer' })
  @IsNotEmpty({ message: 'Candidate ID is required' })
  candidateId: number;
}
