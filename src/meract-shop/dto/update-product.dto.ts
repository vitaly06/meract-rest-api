import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsNumber({}, { message: 'The price must be a number' })
  @IsPositive({ message: 'The price must be a positive number.' })
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsNumber({}, { message: 'The currency must be a number' })
  @IsPositive({ message: 'The currency must be a positive number.' })
  @Type(() => Number)
  currency?: number;

  @IsOptional()
  @IsNumber({}, { message: 'The oldPrice must be a number' })
  @IsPositive({ message: 'The oldPrice must be a positive number.' })
  @Type(() => Number)
  oldPrice?: number;
}
