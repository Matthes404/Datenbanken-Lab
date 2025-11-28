import { Module } from '@nestjs/common'
import { OrderService } from './order.service'
import { OrderController } from './order.controller'
import { OrderEventsListener } from './order-events.listener'
import { OrderResolver } from './order.resolver'

@Module({
  controllers: [OrderController],
  providers: [OrderService, OrderEventsListener, OrderResolver],
  exports: [OrderService],
})
export class OrderModule {}