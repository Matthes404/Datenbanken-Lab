import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Order } from '../../entities/order.entity'
import { OrderPosition } from '../../entities/order-position.entity'
import {
  IOrder,
  IOrderRepository,
  IOrderQuery,
  IPaginatedOrders,
  ICreateOrder,
} from '../interfaces/order.repository.interface'

@Injectable()
export class PostgresOrderRepository implements IOrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
    @InjectRepository(OrderPosition)
    private readonly positionRepo: Repository<OrderPosition>
  ) {}

  private toInterface(entity: Order): IOrder {
    return {
      id: entity.id.toString(),
      customer_id: entity.customer?.id?.toString(),
      customer_name: entity.customer?.name,
      customer_gender: entity.customer?.gender,
      order_date: entity.order_date,
      positions: entity.positions?.map(p => ({
        id: p.id.toString(),
        product_id: p.product?.id,
        quantity: p.quantity,
        buying_price: p.buying_price,
        product: p.product ? {
          id: p.product.id,
          title: p.product.title,
          category: p.product.category,
          price: p.product.price,
          in_stock: p.product.in_stock,
        } : undefined,
      })) || [],
    }
  }

  async findAll(query: IOrderQuery): Promise<IPaginatedOrders> {
    const page = query.page ?? 1
    const pageSize = query.pageSize ?? 25

    const qb = this.repo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.positions', 'position')
      .leftJoinAndSelect('position.product', 'product')

    if (query.customerName) {
      qb.andWhere('LOWER(customer.name) LIKE LOWER(:customerName)', {
        customerName: `%${query.customerName.toLowerCase()}%`,
      })
    }

    if (query.orderDateFrom) {
      qb.andWhere('order.order_date >= :orderDateFrom', {
        orderDateFrom: query.orderDateFrom,
      })
    }

    if (query.orderDateTo) {
      qb.andWhere('order.order_date <= :orderDateTo', {
        orderDateTo: query.orderDateTo,
      })
    }

    qb.orderBy('order.order_date', 'DESC').addOrderBy('order.id', 'DESC')

    const [data, total] = await qb
      .take(pageSize)
      .skip((page - 1) * pageSize)
      .getManyAndCount()

    return {
      data: data.map(e => this.toInterface(e)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: pageSize === 0 ? 0 : Math.ceil(total / pageSize),
      },
    }
  }

  async findById(id: string): Promise<IOrder | null> {
    const entity = await this.repo.findOne({
      where: { id: parseInt(id) },
      relations: ['customer', 'positions', 'positions.product'],
    })
    return entity ? this.toInterface(entity) : null
  }

  async findByCustomerId(customerId: string): Promise<IOrder[]> {
    const entities = await this.repo.find({
      where: { customer: { id: parseInt(customerId) } },
      relations: ['customer', 'positions', 'positions.product'],
    })
    return entities.map(e => this.toInterface(e))
  }

  async create(data: ICreateOrder): Promise<IOrder> {
    return this.repo.manager.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Order)
      const positionRepo = manager.getRepository(OrderPosition)

      const order = orderRepo.create({
        order_date: data.order_date,
        customer: { id: parseInt(data.customer_id) },
      })
      const savedOrder = await orderRepo.save(order)

      if (data.positions?.length) {
        const positions = data.positions.map(p =>
          positionRepo.create({
            order: savedOrder,
            quantity: p.quantity,
            buying_price: p.buying_price,
            product: { id: p.product_id },
          })
        )
        await positionRepo.save(positions)
      }

      const result = await orderRepo.findOne({
        where: { id: savedOrder.id },
        relations: ['customer', 'positions', 'positions.product'],
      })
      return this.toInterface(result!)
    })
  }

  async update(id: string, data: Partial<IOrder>): Promise<IOrder | null> {
    const result = await this.repo.update(parseInt(id), {
      order_date: data.order_date,
    })
    if (result.affected === 0) return null
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(parseInt(id))
    return (result.affected ?? 0) > 0
  }
}