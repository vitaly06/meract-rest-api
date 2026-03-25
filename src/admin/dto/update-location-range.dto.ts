import { PartialType } from '@nestjs/swagger';
import { CreateLocationRangeDto } from './create-location-range.dto';

export class UpdateLocationRangeDto extends PartialType(
  CreateLocationRangeDto,
) {}
