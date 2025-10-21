import { Controller, Get, Post, Patch, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly service: OrderService) {}

  // REST Route 2 GET filtered, max 10
  @Get()
  getAll(@Query('limit') limit?: number) {
    return this.service.findAll(limit ?? 10);
  }

  // REST Route 1 GET by id
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // REST Route 2 POST new
  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  // REST Route 1 PATCH existing
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.update(id, dto);
  }
}
