import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { PRODUCT_REPOSITORY, IProduct } from '../repositories/interfaces/product.repository.interface'
import type { IProductRepository } from '../repositories/interfaces/product.repository.interface'

@Injectable()
export class ProductService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: IProductRepository
  ) {}

  async findOne(id: string): Promise<IProduct> {
    const product = await this.productRepo.findById(id)
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`)
    }
    return product
  }

  async update(id: string, data: Partial<IProduct>): Promise<IProduct> {
    const product = await this.productRepo.update(id, data)
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`)
    }
    return product
  }

  async delete(id: string): Promise<{ message: string }> {
    const deleted = await this.productRepo.delete(id)
    if (!deleted) {
      throw new NotFoundException(`Product with id "${id}" not found`)
    }
    return { message: `Product with id "${id}" deleted successfully` }
  }
}