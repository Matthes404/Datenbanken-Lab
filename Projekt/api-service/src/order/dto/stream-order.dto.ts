import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class StreamOrderPositionDto {
  @IsString()
  product_title: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class StreamOrderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  customer_id: number;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => StreamOrderPositionDto)
  positions: StreamOrderPositionDto[];
}

