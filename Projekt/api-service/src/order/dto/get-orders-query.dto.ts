import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Order } from '../../entities/order.entity';

export class GetOrdersQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(100)
  @IsOptional()
  pageSize?: number = 25;

  @IsOptional()
  @IsDateString()
  orderDateFrom?: string;

  @IsOptional()
  @IsDateString()
  orderDateTo?: string;

  @IsOptional()
  @IsString()
  customerName?: string;
}

export interface PaginatedOrders {
  data: Order[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

