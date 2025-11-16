import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../entities/order.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderEventsListener } from './order-events.listener';
import { Product } from '../entities/product.entity';
import { OrderResolver } from './order.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Product])],
  controllers: [OrderController],
  providers: [OrderService, OrderEventsListener, OrderResolver],
  exports: [OrderService],
})
export class OrderModule {}
