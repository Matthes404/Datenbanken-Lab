import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findOne(id: string): Promise<Product | null> {
    return this.productRepo.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const product = await this.findOne(id);
    if (!product) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }

    const updated = this.productRepo.merge(product, data);
    return this.productRepo.save(updated);
  }

  async delete(id: string): Promise<void> {
    const res = await this.productRepo.delete(id);
    if (res.affected === 0) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }
  }
}
