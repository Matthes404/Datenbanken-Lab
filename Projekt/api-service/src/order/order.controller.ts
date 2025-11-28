import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ValidationPipe,
} from '@nestjs/common'
import { OrderService } from './order.service'
import { GetOrdersQueryDto } from './dto/get-orders-query.dto'
import { CreateOrderDto } from './dto/create-order.dto'

@Controller('orders')
export class OrderController {
  constructor(private readonly service: OrderService) {}

  @Get()
  getAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetOrdersQueryDto,
  ) {
    return this.service.findAll(query)
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post()
  create(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateOrderDto,
  ) {
    return this.service.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto)
  }
}