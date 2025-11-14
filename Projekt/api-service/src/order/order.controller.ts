import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { GetOrdersQueryDto } from './dto/get-orders-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly service: OrderService) {}

  // REST Route 2 GET filtered, max 10
  @Get()
  getAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetOrdersQueryDto,
  ) {
    return this.service.findAll(query);
  }

  // REST Route 1 GET by id
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // REST Route 2 POST new
  @Post()
  create(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateOrderDto,
  ) {
    return this.service.create(dto);
  }

  // REST Route 1 PATCH existing
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.update(id, dto);
  }
}
