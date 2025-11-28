import { Injectable, Inject } from '@nestjs/common'
import {
  ORDER_REPOSITORY,
  IOrder,
  IPaginatedOrders,
} from '../repositories/interfaces/order.repository.interface'
import type { IOrderRepository } from '../repositories/interfaces/order.repository.interface'
import { PRODUCT_REPOSITORY } from '../repositories/interfaces/product.repository.interface'
import type { IProductRepository } from '../repositories/interfaces/product.repository.interface'
import { CreateOrderDto } from './dto/create-order.dto'
import { StreamOrderDto } from './dto/stream-order.dto'
import { GetOrdersQueryDto } from './dto/get-orders-query.dto'

@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: IProductRepository
  ) {}

  findAll(query: GetOrdersQueryDto): Promise<IPaginatedOrders> {
    return this.orderRepo.findAll({
      page: query.page,
      pageSize: query.pageSize,
      customerName: query.customerName,
      orderDateFrom: query.orderDateFrom,
      orderDateTo: query.orderDateTo,
    })
  }

  findOne(id: string): Promise<IOrder | null> {
    return this.orderRepo.findById(id)
  }

  create(dto: CreateOrderDto): Promise<IOrder> {
    return this.orderRepo.create({
      order_date: new Date(dto.orderDate),
      customer_id: dto.customerId.toString(),
      positions: dto.positions.map(p => ({
        product_id: p.productId,
        quantity: p.quantity,
        buying_price: p.buyingPrice,
      })),
    })
  }

  async createFromStream(dto: StreamOrderDto): Promise<IOrder> {
    const positions = await Promise.all(
      dto.positions.map(async (incoming) => {
        const product = await this.productRepo.findByTitle(incoming.product_title)
        if (!product) {
          throw new Error(
            `Stream order rejected: unknown product title "${incoming.product_title}"`
          )
        }
        return {
          product_id: product.id,
          quantity: incoming.quantity,
          buying_price: product.price,
        }
      })
    )

    return this.orderRepo.create({
      order_date: new Date(),
      customer_id: dto.customer_id.toString(),
      positions,
    })
  }

  async update(id: string, dto: Partial<{ order_date: Date }>): Promise<IOrder | null> {
    return this.orderRepo.update(id, dto)
  }
}