import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
  ) {}

  async findOne(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    return product;
  }

  async update(id: string, data: Partial<Product>) {
    const result = await this.productRepo.update(id, data);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    return this.findOne(id);
  }

  async delete(id: string) {
    try {
      const result = await this.productRepo.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Product with id "${id}" not found`);
      }
      return { message: `Product with id "${id}" deleted successfully` };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
