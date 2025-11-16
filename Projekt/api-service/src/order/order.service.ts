import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderPosition } from '../entities/order-position.entity';
import { Product } from '../entities/product.entity';
import { Customer } from '../entities/customer.entity';
import {
  GetOrdersQueryDto,
  PaginatedOrders,
} from './dto/get-orders-query.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { StreamOrderDto } from './dto/stream-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findAll(query: GetOrdersQueryDto): Promise<PaginatedOrders> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const qb = this.repo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.positions', 'position')
      .leftJoinAndSelect('position.product', 'product');

    if (query.customerName) {
      qb.andWhere('LOWER(customer.name) LIKE LOWER(:customerName)', {
        customerName: `%${query.customerName.toLowerCase()}%`,
      });
    }

    if (query.orderDateFrom) {
      qb.andWhere('order.order_date >= :orderDateFrom', {
        orderDateFrom: query.orderDateFrom,
      });
    }

    if (query.orderDateTo) {
      qb.andWhere('order.order_date <= :orderDateTo', {
        orderDateTo: query.orderDateTo,
      });
    }

    qb.orderBy('order.order_date', 'DESC').addOrderBy('order.id', 'DESC');

    const [data, total] = await qb
      .take(pageSize)
      .skip((page - 1) * pageSize)
      .getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: pageSize === 0 ? 0 : Math.ceil(total / pageSize),
      },
    };
  }

  findOne(id: number) {
    return this.repo.findOne({
      where: { id },
      relations: ['customer', 'positions', 'positions.product'],
    });
  }

  async create(dto: CreateOrderDto) {
    // Ab hier Transaktion zum erstellen ".transaction..."
    return this.repo.manager.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const positionRepository = manager.getRepository(OrderPosition);

      const order = orderRepository.create({
        order_date: new Date(dto.orderDate),
        customer: { id: dto.customerId } as Customer,
      });
      const savedOrder = await orderRepository.save(order);

      const positions = dto.positions.map((position) =>
        positionRepository.create({
          order: savedOrder,
          quantity: position.quantity,
          buying_price: position.buyingPrice,
          product: { id: position.productId } as Product,
        }),
      );

      await positionRepository.save(positions);

      return orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: ['customer', 'positions', 'positions.product'],
      });
    });
  }

  async createFromStream(dto: StreamOrderDto) {
    const positions = await Promise.all( // Promise.all sorgt dafür, dass alle Produkt-Lookups parallel laufen
      dto.positions.map(async (incoming) => {
        const product = await this.productRepo.findOne({
          where: { title: incoming.product_title },
        });
        if (!product) {
          throw new Error(
            `Stream order rejected: unknown product title "${incoming.product_title}"`,
          );
        }
        return {
          productId: product.id,
          quantity: incoming.quantity,
          buyingPrice: Number(product.price),
        };
      }),
    );

    const createOrderDto: CreateOrderDto = {
      orderDate: new Date().toISOString(),
      customerId: dto.customer_id,
      positions,
    };

    return this.create(createOrderDto);
  }

  async update(id: number, dto: Partial<Order>) {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }
}
