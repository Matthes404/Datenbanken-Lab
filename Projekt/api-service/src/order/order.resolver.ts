import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { Order } from '../entities/order.entity';
import { OrderService } from './order.service';

@Resolver(() => Order)
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  // Query 1: Einzelne Bestellung
  @Query(() => Order, { name: 'order', nullable: true })
  getOrderById(@Args('id', { type: () => Int }) id: number) {
    return this.orderService.findOne(id);
  }

}
