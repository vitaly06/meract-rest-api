import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class AddProductDto {
  @IsNotEmpty({ message: 'Price is required' })
  @IsNumber({}, { message: 'The price must be a number' })
  @IsPositive({ message: 'The price must be a positive number.' })
  @Type(() => Number)
  price: number;

  @IsNotEmpty({ message: 'Currency is required' })
  @IsNumber({}, { message: 'The currency must be a number' })
  @IsPositive({ message: 'The currency must be a positive number.' })
  @Type(() => Number)
  currency: number;

  @IsOptional()
  @IsNumber({}, { message: 'The price must be a number' })
  @IsPositive({ message: 'The price must be a positive number.' })
  @Type(() => Number)
  oldPrice?: number;
}
