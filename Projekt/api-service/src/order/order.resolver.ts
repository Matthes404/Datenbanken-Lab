import { Resolver, Query, Args, ID } from '@nestjs/graphql'
import { Order } from '../entities/order.entity'
import { OrderService } from './order.service'

@Resolver(() => Order)
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  @Query(() => Order, { name: 'order', nullable: true })
  getOrderById(@Args('id', { type: () => ID }) id: string) {
    return this.orderService.findOne(id)
  }
}