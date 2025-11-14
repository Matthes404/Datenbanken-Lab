import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsString,
  ValidateNested,
  Min,
} from 'class-validator';

export class CreateOrderPositionDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  buyingPrice: number;
}

export class CreateOrderDto {
  @IsDateString()
  orderDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  customerId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderPositionDto)
  positions: CreateOrderPositionDto[];
}
