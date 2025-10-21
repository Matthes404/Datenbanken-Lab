import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
  ) {}

  findAll(limit = 10) {
    return this.repo.find({
      take: limit,
      relations: ['customer', 'positions', 'positions.product'],
    });
  }

  findOne(id: number) {
    return this.repo.findOne({
      where: { id },
      relations: ['customer', 'positions', 'positions.product'],
    });
  }

  async create(dto: Partial<Order>) {
    const order = this.repo.create(dto);
    return this.repo.save(order);
  }

  async update(id: number, dto: Partial<Order>) {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }
}
